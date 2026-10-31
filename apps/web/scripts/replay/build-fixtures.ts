// Builds apps/web/src/replay/fixtures/*.json: recorded conversations as wire events with their timings.
//
// The recordings are model output (NDJSON content lines) from eval/results and research/probes/streams.json, which
// are read and never modified. Each recorded model reply is fed, delta by delta, through the SAME code the server runs
// (apps/server executeTurn -> core runTurn) with a fake upstream, so every event in a fixture is exactly what
// POST /api/turn emits for that reply: say (partial and final), op, warn, done, status, commit with the new memory.
// Timings come from the recording: per-line times for the probe streams, and times synthesized from the run's stats
// (firstSayMs, firstOpMs, firstNodeMs, totalMs) for eval runs, which stored content without per-line times.
//
//   npm run replay:build            (from apps/web)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SessionMemory, TurnRequest } from '@ali/core/types.ts';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import { buildSystemPrompt, createMemory } from '@ali/core/prompt.ts';
import { createCacheTracker } from '@ali/core/llm.ts';
import { constraintChecker } from '@ali/core/validate.ts';
import { executeTurn } from '../../../server/src/turn.ts';
import type { WireEvent as ServerWire } from '../../../server/src/turn.ts';
import { FATAL_COPY, STATUS_COPY } from '../../../server/src/messages.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '../..');
const ROOT = path.resolve(WEB, '../..');
const OUT = path.join(WEB, 'src/replay/fixtures');

export interface FixtureTurn {
  ask: string;
  /** [ms since the ask, wire event] */
  ev: Array<[number, ServerWire]>;
}

export interface Fixture {
  id: string;
  title: string;
  lang: 'en' | 'ko' | 'zh';
  recordedAt: string;
  source: string;
  model: string;
  note: string;
  /** Built by hand from a recorded reply, to reach a state no recording has (fatal, fallback, network drop). */
  synthetic: boolean;
  turns: FixtureTurn[];
}

// ---------- sources ----------

interface TimedLine {
  t: number;
  line: string;
}
interface SourceTurn {
  ask: string;
  lines: TimedLine[];
  repair?: TimedLine[];
  /** The warnings the record says were handed to the repair turn: streamed as warn events before the repair status. */
  findings?: unknown[];
}
interface Source {
  id: string;
  title: string;
  lang: Fixture['lang'];
  source: string;
  model: string;
  recordedAt: string;
  note: string;
  /** Check pinned constraints with the full checker, as the eval run did (the server default now exempts client nodes). */
  strictConstraints?: boolean;
  turns: SourceTurn[];
}

const readJson = <T>(p: string): T => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8')) as T;

interface RunTurnRec {
  ask: string;
  content: string;
  says: string[];
  graph: { nodes: Record<string, Record<string, unknown>> };
  stats: {
    firstSayMs: number | null;
    firstOpMs: number | null;
    firstNodeMs: number | null;
    totalMs: number;
    repair?: { content: string; firstOpMs: number | null; totalMs: number; findings: Array<{ ids: string[]; severity?: string }> } | null;
  };
}
interface RunRec {
  id: string;
  lang: Fixture['lang'];
  model: string;
  startedAt: string;
  turns: RunTurnRec[];
}

const runCache = new Map<string, RunRec[]>();
function runs(dir: string): RunRec[] {
  let r = runCache.get(dir);
  if (!r) {
    r = readFileSync(path.join(ROOT, 'eval/results', dir, 'runs.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as RunRec);
    runCache.set(dir, r);
  }
  return r;
}

/** Times for lines that were stored without them, from the run's own stats: say, then ops up to the first node, then the rest. */
export function synthTimes(lines: string[], st: { firstSayMs: number | null; firstOpMs: number | null; firstNodeMs: number | null; totalMs: number }): TimedLine[] {
  const n = lines.length;
  if (!n) return [];
  const firstOp = st.firstOpMs ?? st.firstSayMs ?? 1200;
  const total = Math.max(st.totalMs, firstOp + 40 * n);
  const nodeAt = Math.min(Math.max(st.firstNodeMs ?? firstOp, firstOp), total);
  const firstNode = Math.max(
    1,
    lines.findIndex((l) => /"t"\s*:\s*"(node|insert)"/.test(l)),
  );
  const out: TimedLine[] = [];
  for (let i = 0; i < n; i++) {
    let t: number;
    if (i === 0) t = st.firstSayMs ?? firstOp;
    else if (i < firstNode) t = firstOp + ((nodeAt - firstOp) * (i - 1)) / Math.max(1, firstNode - 1);
    else t = nodeAt + ((total - nodeAt) * (i - firstNode)) / Math.max(1, n - 1 - firstNode);
    out.push({ t: Math.round(Math.max(t, (out[i - 1]?.t ?? 0) + 30)), line: lines[i] });
  }
  return out;
}

/**
 * The eval records keep the follow-up turn's timings and its say line (in `says`) but not its content. Rebuilds the
 * content from what the record does keep: the extra say line, and a node line (from the recorded final graph) for each
 * node the findings named. Fixtures built this way say so in their note.
 */
function reconstructRepair(t: RunTurnRec, mainLines: string[]): string[] {
  const mainSays = mainLines.filter((l) => /^\s*\{\s*"t"\s*:\s*"say"/.test(l)).length;
  const extra = t.says.slice(mainSays);
  const ids = [...new Set((t.stats.repair?.findings ?? []).flatMap((f) => f.ids))];
  const out: string[] = [];
  if (extra.length) out.push(JSON.stringify({ t: 'say', text: extra.join(' ') }));
  for (const id of ids) {
    const n = Object.hasOwn(t.graph.nodes, id) ? t.graph.nodes[id] : undefined;
    if (n) out.push(JSON.stringify({ t: 'node', id: n.id, product: n.product, label: n.label, group: n.group, ...(n.zones ? { zones: n.zones } : {}), ...(n.attachTo ? { attachTo: n.attachTo } : {}), ...(n.why ? { why: n.why } : {}) }));
  }
  out.push(JSON.stringify({ t: 'done', summary: '' }));
  return out;
}

function fromRun(spec: { id: string; title: string; dir: string; run: string; note: string; strictConstraints?: boolean }): Source {
  const r = runs(spec.dir).find((x) => x.id === spec.run);
  if (!r) throw new Error(`run ${spec.run} not found in ${spec.dir}`);
  return {
    id: spec.id,
    title: spec.title,
    lang: r.lang,
    source: `eval/results/${spec.dir} ${spec.run}`,
    model: r.model,
    recordedAt: r.startedAt.slice(0, 10),
    note: spec.note,
    strictConstraints: spec.strictConstraints,
    turns: r.turns.map((t) => {
      const lines = t.content.split('\n').filter((l) => l.trim());
      const rep = t.stats.repair;
      let repLines = rep ? rep.content.split('\n').filter((l) => l.trim()) : [];
      if (rep && !repLines.length) repLines = reconstructRepair(t, lines);
      return {
        ask: t.ask,
        lines: synthTimes(lines, t.stats),
        findings: rep ? rep.findings.filter((f) => f.severity !== 'info') : undefined,
        repair: rep ? synthTimes(repLines, { firstSayMs: rep.firstOpMs, firstOpMs: rep.firstOpMs, firstNodeMs: rep.firstOpMs, totalMs: rep.totalMs }) : undefined,
      };
    }),
  };
}

interface ProbeStream {
  label: string;
  model: string;
  lineTimes: Array<[number, string]>;
}
interface ProbeFile {
  note: string;
  ask: string;
  streams: ProbeStream[];
}

/** The probe streams use underscored ids from the probe mini catalog; the protocol team's map turns them into catalog ids. */
function probeMapper(map: Record<string, string>): (line: string) => string {
  const m = (p: unknown): unknown => (typeof p === 'string' && Object.hasOwn(map, p) ? map[p] : p);
  return (line) => {
    try {
      const o = JSON.parse(line) as Record<string, unknown>;
      if (typeof o.product === 'string') o.product = m(o.product);
      if (Array.isArray(o.products)) o.products = o.products.map(m);
      return JSON.stringify(o);
    } catch {
      return line;
    }
  };
}

function fromProbes(spec: { id: string; title: string; note: string; turns: Array<{ label: string; ask?: string }> }): Source {
  const file = readJson<ProbeFile>('research/probes/streams.json');
  const idMap = readJson<Record<string, string>>('packages/core/test/fixtures/probe-id-map.json');
  const map = probeMapper(idMap);
  return {
    id: spec.id,
    title: spec.title,
    lang: 'en',
    source: 'research/probes/streams.json ' + spec.turns.map((t) => t.label).join(' + '),
    model: 'qwen3.8-max',
    recordedAt: '2026-10-30',
    note: spec.note,
    turns: spec.turns.map((tt) => {
      const s = file.streams.find((x) => x.label === tt.label);
      if (!s) throw new Error('probe stream ' + tt.label);
      return { ask: tt.ask ?? file.ask, lines: s.lineTimes.map(([t, line]) => ({ t, line: map(line) })) };
    }),
  };
}

// The Phase 1 full run uses the shipping prompt (req ops carry regions and avoid lists), so its pinned requirements are
// machine-checkable; the Phase 0 run predates that.
const P1 = '2026-10-31T08-01-35-p1-full';
const P0 = P1;

function sources(): Source[] {
  return [
    fromProbes({
      id: 'ecommerce',
      title: 'Cross-border e-commerce, then "oh i also want waf"',
      note: 'The Phase 0 canvas spike scenario F with its WAF follow-up (WAF was already drawn, so Qwen says so and changes nothing). Real per-line timings.',
      turns: [{ label: 'F_max_nothink' }, { label: 'B2_followup_waf_nothink', ask: 'oh i also want waf' }],
    }),
    fromProbes({
      id: 'ecommerce-k8s',
      title: 'Cross-border e-commerce, then Kubernetes instead of ECS',
      note: 'Scenario F with the Kubernetes swap: a removal and an add in one lane, a replacement line, ghosts and moved edges. Real per-line timings.',
      turns: [{ label: 'F_max_nothink' }, { label: 'B3_k8s', ask: 'Run the app tier on Kubernetes instead of ECS.' }],
    }),
    fromRun({ id: 'ha', title: 'Highly available web architecture', dir: P0, run: 'pat-01-web-ha#1', note: 'One turn, the landing example "High availability".' }),
    fromRun({
      id: 'residency',
      title: 'Singapore fintech: data must stay in Singapore, then four follow-ups',
      dir: P0,
      run: 'mt-03-data-in-singapore#1',
      note: 'Four revisions: a pinned data-residency requirement, disaster recovery, an AI chatbot, and a question that needs no change. Timings synthesized from the run stats.',
    }),
    fromRun({ id: 'ai-agent', title: 'An AI agent my team of 15 developers can use', dir: P0, run: 'need-01-dev-team#1', note: 'A product need: the answer is a solution map with recommendations, not infrastructure.' }),
    fromRun({ id: 'korean', title: '음식 배달 앱 백엔드 (Korean, three revisions)', dir: P0, run: 'ko-mt-01-avoid-k8s#1', note: 'Korean asks and notes; the user rules out Kubernetes in revision 1.' }),
    fromRun({ id: 'chinese', title: '外卖应用后端 (Chinese, three revisions)', dir: P0, run: 'zh-mt-01-avoid-k8s#1', note: 'Chinese asks and notes; the user rules out Kubernetes in revision 1.' }),
    fromRun({
      id: 'chinese-fix',
      title: '澳大利亚客户, 数据留在新加坡 (Chinese, repaired before commit)',
      dir: P1,
      run: 'zh-trap-08-sydney#1',
      strictConstraints: true,
      note: 'The turn labelled users "Australian customers", which the pinned region check read as data in Sydney; the repair turn relabelled them. Shows Checking, the FixBlock and Held by a fix. The eval run checked constraints with the full checker, which also reads client labels; the server default now exempts them, so this repair no longer happens live. The findings the record says were handed to the repair turn are streamed as warn events before the repair status, as the stream contract in the spec expects (the server does not emit them yet). The eval record does not keep the repair turn content, so its say line and node op are rebuilt from the record own say list and final graph.',
    }),
  ];
}

// ---------- the fake upstream ----------

const enc = (x: unknown): string => `data: ${JSON.stringify(x)}\n\n`;
const setImm = (): Promise<void> => new Promise((r) => setImmediate(r));
const drain = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await setImm();
};

/** Splits a reply into deltas with the time each arrives: say lines type in, other lines arrive whole. */
export function deltasOf(lines: TimedLine[]): Array<{ t: number; text: string }> {
  const out: Array<{ t: number; text: string }> = [];
  let prev = 0;
  for (const { t, line } of lines) {
    const isSay = /^\s*\{\s*"t"\s*:\s*"say"/.test(line);
    const text = line + '\n';
    if (isSay && text.length > 24) {
      const win = Math.max(80, Math.min(t - prev, text.length * 16));
      const parts: string[] = [];
      for (let i = 0; i < text.length; i += 14) parts.push(text.slice(i, i + 14));
      parts.forEach((p, k) => out.push({ t: Math.round(t - win + (win * (k + 1)) / parts.length), text: p }));
    } else out.push({ t, text });
    prev = t;
  }
  // monotonic
  for (let i = 1; i < out.length; i++) if (out[i].t < out[i - 1].t) out[i].t = out[i - 1].t;
  return out;
}

async function recordTurn(memory: SessionMemory, turn: SourceTurn, catalog: ReturnType<typeof loadCatalog>, sessionId: string, strict = false): Promise<{ ev: Array<[number, ServerWire]>; memory: SessionMemory }> {
  const events: Array<[number, ServerWire]> = [];
  let clock = 0;
  const replies: Array<TimedLine[]> = [turn.lines, ...(turn.repair ? [turn.repair] : [])];
  let call = 0;
  const offsets: number[] = [0];
  const fetchImpl = (async (): Promise<Response> => {
    const i = call++;
    const reply = replies[i];
    if (!reply) throw new Error('fixture builder: the run asked for an extra model call');
    const base = i === 0 ? 0 : offsets[i];
    let ctl!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start: (c) => void (ctl = c) });
    const te = new TextEncoder();
    void (async () => {
      ctl.enqueue(te.encode(enc({ choices: [{ index: 0, delta: { role: 'assistant', content: '' } }] })));
      for (const d of deltasOf(reply)) {
        clock = base + d.t;
        ctl.enqueue(te.encode(enc({ choices: [{ index: 0, delta: { content: d.text } }] })));
        await drain();
      }
      clock = base + (reply[reply.length - 1]?.t ?? 0) + 5;
      ctl.enqueue(te.encode(enc({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }) + enc({ choices: [], usage: { prompt_tokens: 12000, completion_tokens: 400, prompt_tokens_details: { cached_tokens: 11500 } } }) + 'data: [DONE]\n\n'));
      ctl.close();
    })();
    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }) as typeof fetch;

  const last = (): number => turn.lines[turn.lines.length - 1]?.t ?? 0;
  const emit = (e: ServerWire): void => {
    // the follow-up call starts after the main stream: its times continue from the main stream's end
    if (e.type === 'status' && (e.code === 'repair' || e.code === 'continue')) {
      offsets[1] = last() + 600;
      clock = last() + 60;
      // the findings that triggered the repair turn arrive as warn events first (spec 8, W4)
      if (e.code === 'repair') for (const w of turn.findings ?? []) events.push([Math.round(clock - 5), { type: 'warn', phase: 'main', warning: w } as unknown as ServerWire]);
    }
    if (e.type === 'usage') return;
    events.push([Math.round(clock), e]);
  };
  const req: TurnRequest = { sessionId, ask: turn.ask, memory };
  let committed: SessionMemory | null = null;
  const outcome = await executeTurn(
    req,
    {
      apiKey: 'fixture-key',
      catalog,
      system: buildSystemPrompt(catalog),
      model: 'qwen3.8-max',
      fallbackModel: null,
      baseUrl: 'http://fixture.invalid/v1',
      tracker: createCacheTracker(),
      fetchImpl,
      checkConstraints: strict ? constraintChecker : undefined,
      turnOptions: { retries: 0, backoffMs: 0, summarize: false },
    },
    (e) => {
      if (e.type === 'commit') {
        clock += 25;
        committed = e.memory;
      }
      emit(e);
    },
    new AbortController().signal,
  );
  if (outcome.outcome !== 'commit' || !committed) throw new Error(`turn "${turn.ask.slice(0, 40)}" ended with ${outcome.outcome} ${outcome.fatalCode ?? ''}`);
  return { ev: events, memory: committed };
}

// ---------- synthetic fixtures ----------

const shift = (ev: Array<[number, ServerWire]>, from: number, by: number): Array<[number, ServerWire]> => ev.map(([t, e]) => [t >= from ? t + by : t, e]);

function synthetic(base: Fixture): Fixture[] {
  const t0 = base.turns[0];
  const mk = (id: string, title: string, note: string, ev: Array<[number, ServerWire]>): Fixture => ({
    ...base,
    id,
    title,
    note,
    synthetic: true,
    source: `built from the recorded turn of "${base.id}"; ${note}`,
    turns: [{ ask: t0.ask, ev }],
  });
  const firstNodeAt = t0.ev.find(([, e]) => e.type === 'op' && (e.op.t === 'node' || e.op.t === 'insert'))?.[0] ?? 3000;
  const cut = t0.ev.filter(([t]) => t < firstNodeAt + 3500);
  const out: Fixture[] = [];
  out.push(
    mk('stub-fallback', 'Stub: the model stalls and the server switches to a backup', 'Adds the server\'s fallback status line before the first token.', [
      [600, { type: 'status', code: 'fallback', text: STATUS_COPY.fallback.en }],
      ...shift(t0.ev, 0, 3200),
    ]),
  );
  out.push(mk('stub-fatal', 'Stub: the answer stops partway and the server reports a fatal', 'Ends the recorded turn partway with the server\'s idle-timeout fatal.', [...cut, [firstNodeAt + 4200, { type: 'fatal', code: 'idle-timeout', message: FATAL_COPY['idle-timeout'].en, retryable: true }]]));
  out.push(mk('stub-filtered', 'Stub: the content filter declines the request', 'A fatal with the content-filtered code, which has its own message and no Try again.', [[900, { type: 'fatal', code: 'content-filtered', message: FATAL_COPY['content-filtered'].en, retryable: false }]]));
  out.push(mk('stub-network', 'Stub: the connection drops mid-stream', 'The stream ends with no commit and no fatal; the player reports a network drop.', cut));
  const lastTurn = t0;
  const commit = lastTurn.ev.find(([, e]) => e.type === 'commit');
  if (commit) {
    const end = commit[0];
    out.push(
      mk('stub-summary', 'Stub: older revisions are summarized after the commit', 'Adds the summary status and a summary event after the commit, as the server sends them when history overflows.', [
        ...t0.ev,
        [end + 300, { type: 'status', code: 'summary', text: STATUS_COPY.summary.en }],
        [end + 2600, { type: 'summary', summary: 'Stub summary: the earlier revisions chose the edge, compute, data and logging tiers.' }],
      ]),
    );
  }
  return out;
}

// ---------- main ----------

async function main(): Promise<void> {
  const catalog = loadCatalog();
  mkdirSync(OUT, { recursive: true });
  const manifest: Array<Record<string, unknown>> = [];
  const built = new Map<string, Fixture>();
  for (const src of sources()) {
    let memory: SessionMemory = createMemory();
    const turns: FixtureTurn[] = [];
    for (const [i, turn] of src.turns.entries()) {
      const r = await recordTurn(memory, turn, catalog, `fixture-${src.id}`, !!src.strictConstraints);
      memory = r.memory;
      turns.push({ ask: turn.ask, ev: r.ev });
      process.stdout.write(`  ${src.id} turn ${i + 1}: ${r.ev.length} events, ${r.ev[r.ev.length - 1][0]} ms\n`);
    }
    const fx: Fixture = { id: src.id, title: src.title, lang: src.lang, recordedAt: src.recordedAt, source: src.source, model: src.model, note: src.note, synthetic: false, turns };
    built.set(fx.id, fx);
  }
  const all: Fixture[] = [...built.values(), ...synthetic(built.get('ha')!)];
  for (const fx of all) {
    writeFileSync(path.join(OUT, `${fx.id}.json`), JSON.stringify(fx));
    manifest.push({
      id: fx.id,
      title: fx.title,
      lang: fx.lang,
      recordedAt: fx.recordedAt,
      synthetic: fx.synthetic,
      turns: fx.turns.length,
      ask: fx.turns[0].ask,
      durationMs: fx.turns.reduce((s, t) => s + (t.ev[t.ev.length - 1]?.[0] ?? 0), 0),
      note: fx.note,
    });
  }
  writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(manifest, null, 1));
  process.stdout.write(`wrote ${all.length} fixtures to ${path.relative(ROOT, OUT)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(path.join(ROOT, 'eval/results', P0))) throw new Error('missing ' + P0);
  main().catch((e) => {
    process.stderr.write(String((e as Error).stack ?? e) + '\n');
    process.exit(1);
  });
}
