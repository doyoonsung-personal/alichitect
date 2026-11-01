// Live verification of the Claude backup (packages/core/src/claude.ts) against the real Anthropic API.
//
//   node eval/claude-check.ts --mode format [--cases a,b,c] [--concurrency 3] [--budget 8] [--label name]
//   node eval/claude-check.ts --mode rescue [--cuts 2,3,4,6,8] [--cases a,b,c,d,e] [--budget 8] [--label name]
//
// format: Claude as the PRIMARY model. Each turn runs through runTurn exactly as the product does, with the Claude backup
//   attached and a fetch that answers every Model Studio request at once with the content-filter rejection (HTTP 400
//   DataInspectionFailed), so nothing is drawn by Qwen and the backup runs the whole turn (rescue kind 'turn'): the same code
//   path as production, with no Qwen spend. Machine assertions are those of eval/lib.ts evaluateTurn.
// rescue: a REAL Qwen stream is cut after N complete NDJSON lines by a fetch wrapper, which then emits Model Studio's error
//   event (data: {"error":{"code":"DataInspectionFailed",...}}). runTurn must continue the partial diagram on Claude.
//
// ANTHROPIC_API_KEY (Claude) and DASHSCOPE_API_KEY (rescue mode only) are read from the environment and never printed or
// written. Every call is booked in eval/results/ledger.jsonl at list price (label starts with "cc-"); the run stops when the
// Claude spend booked under that prefix passes --budget (default USD 8).
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadCatalog } from '../packages/core/src/catalog-node.ts';
import { buildSystemPrompt, createMemory } from '../packages/core/src/prompt.ts';
import { createCacheTracker, runTurn, DEFAULT_MODEL, FALLBACK_MODEL } from '../packages/core/src/llm.ts';
import type { RunTurnResult, RunStatus } from '../packages/core/src/llm.ts';
import { claudeModelOf, createClaudeBackup } from '../packages/core/src/claude.ts';
import type { Graph, SessionMemory } from '../packages/core/src/types.ts';
import { RESULTS_DIR, appendLedger, askText, evaluateTurn, loadBase, loadCases, productNamePattern, spentUsd, percentile } from './lib.ts';
import type { EvalCase, TurnView } from './lib.ts';
import type { RunRecord } from './records.ts';

const FILTER_BODY = '{"code":"DataInspectionFailed","message":"Input data may contain inappropriate content."}';
const FILTER_EVENT = 'data: {"error":{"code":"DataInspectionFailed","message":"Output data may contain inappropriate content."}}\n\n';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[a.slice(2)] = true;
    else {
      out[a.slice(2)] = next;
      i++;
    }
  }
  return out;
}
const list = (v: string | boolean | undefined): string[] => (typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);

/** Answers every Model Studio request with the content-filter rejection (input inspection), before anything streams. */
export function filterAllFetch(): typeof fetch {
  return (async () => new Response(FILTER_BODY, { status: 400, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
}

export interface CutInfo {
  /** Complete NDJSON lines forwarded before the cut. */
  lines: number;
  /** ms from the request start to the cut. */
  cutAtMs: number | null;
  cut: boolean;
}

/**
 * Wraps the real fetch: the SSE body is forwarded unchanged until `afterLines` complete NDJSON lines of the model's text
 * have been delivered; then the upstream is cancelled and Model Studio's DataInspectionFailed error event is emitted
 * in its place, as the live filter does. Only the first request is cut; later ones (there should be none) pass through.
 */
export function cuttingFetch(real: typeof fetch, afterLines: number, info: CutInfo): typeof fetch {
  let used = false;
  return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const t0 = performance.now();
    const res = await real(input, init);
    if (used || !res.ok || !res.body) return res;
    used = true;
    const upstream = res.body.getReader();
    const dec = new TextDecoder();
    const enc = new TextEncoder();
    let pending = '';
    let text = '';
    let cutDone = false;
    const body = new ReadableStream<Uint8Array>({
      async pull(ctl) {
        if (cutDone) return;
        const { value, done } = await upstream.read();
        if (done) {
          ctl.close();
          return;
        }
        // Count completed text lines in the SSE deltas of this chunk (a coarse parse of "content" fields).
        pending += dec.decode(value, { stream: true });
        let cutAt = -1;
        let idx: number;
        let consumed = 0;
        while ((idx = pending.indexOf('\n\n', consumed)) >= 0) {
          const ev = pending.slice(consumed, idx);
          consumed = idx + 2;
          const d = ev.split('\n').find((l) => l.startsWith('data:'));
          if (!d) continue;
          const data = d.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const j = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const c = j.choices?.[0]?.delta?.content;
            if (c) text += c;
          } catch {
            /* ignore */
          }
          info.lines = (text.match(/\n/g) ?? []).length;
          if (info.lines >= afterLines) {
            cutAt = consumed;
            break;
          }
        }
        if (cutAt >= 0) {
          // Forward the events up to and including the one that completed the Nth line, then the error event.
          const head = pending.slice(0, cutAt);
          pending = '';
          cutDone = true;
          info.cut = true;
          info.cutAtMs = Math.round(performance.now() - t0);
          ctl.enqueue(enc.encode(head));
          ctl.enqueue(enc.encode(FILTER_EVENT));
          ctl.close();
          upstream.cancel().catch(() => undefined);
          return;
        }
        pending = pending.slice(consumed);
        ctl.enqueue(value);
      },
      cancel() {
        upstream.cancel().catch(() => undefined);
      },
    });
    return new Response(body, { status: 200, headers: res.headers });
  }) as typeof fetch;
}

// ---------- one conversation ----------

interface Ctx {
  label: string;
  catalog: ReturnType<typeof loadCatalog>;
  system: string;
  names: RegExp;
  signal: AbortSignal;
  claudeKey: string;
  qwenKey: string;
  claudeModel: string;
  mode: 'format' | 'rescue';
  cutAfter: number;
  onSpend: (usd: number) => void;
}

interface Extra {
  cut?: CutInfo;
  statusTimes: Array<{ code: string; provider?: string; atMs: number }>;
}

type CheckRun = RunRecord & { extra: Extra[] };

async function runOne(c: EvalCase, run: number, ctx: Ctx): Promise<CheckRun> {
  const started = Date.now();
  const lang = c.lang ?? 'en';
  let memory: SessionMemory = c.base ? loadBase(c.base, ctx.catalog).memory : createMemory();
  const userTexts: string[] = memory.turns.filter((t) => t.role === 'user').map((t) => t.text);
  const rec: CheckRun = { id: `${c.id}#${run}`, case: c.id, category: c.category, lang, run, model: ctx.mode === 'format' ? ctx.claudeModel : DEFAULT_MODEL + '+' + ctx.claudeModel, startedAt: new Date(started).toISOString(), wallMs: 0, pass: true, turns: [], costUsd: 0, extra: [] };
  const tracker = createCacheTracker();
  for (let i = 0; i < c.turns.length; i++) {
    const turn = c.turns[i];
    const ask = askText(turn);
    userTexts.push(ask);
    const before: Graph = memory.graph;
    const extra: Extra = { statusTimes: [] };
    const t0 = performance.now();
    const backup = createClaudeBackup({ apiKey: ctx.claudeKey, model: ctx.claudeModel });
    let fetchImpl: typeof fetch;
    if (ctx.mode === 'format') fetchImpl = filterAllFetch();
    else {
      extra.cut = { lines: 0, cutAtMs: null, cut: false };
      fetchImpl = cuttingFetch(globalThis.fetch, ctx.cutAfter, extra.cut);
    }
    let r: RunTurnResult;
    try {
      r = await runTurn(memory, ask, ctx.catalog, {
        apiKey: ctx.qwenKey || 'unused',
        model: DEFAULT_MODEL,
        fallbackModel: ctx.mode === 'rescue' ? FALLBACK_MODEL : null,
        backup,
        system: ctx.system,
        tracker,
        signal: ctx.signal,
        retries: ctx.mode === 'format' ? 0 : 2,
        backoffMs: 3000,
        fetchImpl,
        onStatus: (s: RunStatus) => extra.statusTimes.push({ code: s.code, ...(s.provider ? { provider: s.provider } : {}), atMs: Math.round(performance.now() - t0) }),
        onCost: (x) => {
          appendLedger({ ts: new Date().toISOString(), label: ctx.label, model: x.model, phase: x.phase, costUsd: x.costUsd, estimated: x.estimated, usage: x.usage ?? undefined, case: rec.id });
          rec.costUsd += x.costUsd;
          if (x.model.startsWith('claude')) ctx.onSpend(x.costUsd);
        },
      });
    } catch (e) {
      rec.pass = false;
      rec.apiError = `turn ${i + 1}: exception ${(e as Error).message}`.slice(0, 300);
      break;
    }
    const view: TurnView = {
      ask,
      ops: r.ops,
      says: r.says,
      reqs: r.reqs,
      gaps: r.gaps,
      rawProducts: r.rawProducts,
      graph: r.memory.graph,
      before,
      requirements: r.memory.requirements,
      constraints: r.memory.constraints ?? [],
      assumptions: r.memory.assumptions ?? [],
      questions: r.memory.questions ?? [],
      stats: r.stats,
      userTexts: [...userTexts],
    };
    const assertions = evaluateTurn(view, turn, lang, ctx.names, ctx.catalog);
    const pass = assertions.every((a) => a.pass);
    rec.turns.push({
      index: i,
      ask,
      content: r.content,
      ops: r.ops,
      says: r.says,
      reqs: r.reqs,
      gaps: r.gaps,
      rawProducts: r.rawProducts,
      changes: r.changes,
      graph: r.memory.graph,
      requirements: r.memory.requirements,
      constraints: r.memory.constraints ?? [],
      assumptions: r.memory.assumptions ?? [],
      questions: r.memory.questions ?? [],
      summary: r.memory.summary,
      stats: r.stats.repair ? { ...r.stats, repair: { ...r.stats.repair, content: '', ops: [] } } : r.stats,
      assertions,
      pass,
    });
    rec.extra.push(extra);
    if (!pass) rec.pass = false;
    if (r.stats.error && r.stats.ops === 0) {
      rec.apiError = `turn ${i + 1}: ${r.stats.error.code}: ${r.stats.error.message}`.slice(0, 300);
      break;
    }
    memory = r.memory;
  }
  rec.wallMs = Date.now() - started;
  return rec;
}

async function pool<T>(items: T[], concurrency: number, fn: (x: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
}

export const FORMAT_CASES = [
  // patterns
  'pat-02-k8s', 'pat-04-rag', 'pat-08-global', 'pat-12-ecommerce-security',
  // needs
  'need-03-ambiguous-team', 'need-04-claude-code', 'need-08-contractor-desktops',
  // traps
  'trap-01-lingma', 'trap-04-apsaradb-redis', 'trap-08-sydney',
  // edits
  'edit-01-insert-waf', 'edit-03-swap-k8s', 'edit-06-restore',
  // multi-turn
  'mt-01-avoid-k8s', 'mt-02-serverless-first', 'mt-03-data-in-singapore',
  // Korean
  'ko-pat-04-rag', 'ko-trap-08-sydney', 'ko-mt-01-avoid-k8s',
  // Chinese
  'zh-pat-04-rag', 'zh-trap-08-sydney', 'zh-need-02-whole-company',
  // AI
  'ai-04-rag-eas', 'ai-07-training-residency', 'ai-ko-02-acs-agent-hosting',
  // asks
  'as-01-vague-company', 'as-03-fully-stated', 'as-05-flip-internal',
  // scope
  'sc-01-rds-aws', 'sc-03-waf-cdn-gcp',
];

export const RESCUE_CASES = ['pat-04-rag', 'pat-02-k8s', 'pat-01-web-ha', 'pat-05-data-platform', 'pat-12-ecommerce-security'];

async function main(): Promise<number> {
  const a = parseArgs(process.argv.slice(2));
  const mode = a.mode === 'rescue' ? 'rescue' : 'format';
  const claudeKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (!claudeKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return 1;
  }
  const qwenKey = process.env.DASHSCOPE_API_KEY ?? '';
  if (mode === 'rescue' && !qwenKey) {
    console.error('DASHSCOPE_API_KEY is not set');
    return 1;
  }
  const catalog = loadCatalog();
  const all = loadCases();
  const wanted = list(a.cases).length ? list(a.cases) : mode === 'format' ? FORMAT_CASES : RESCUE_CASES;
  const cases = wanted.map((id) => {
    const c = all.find((x) => x.id === id);
    if (!c) throw new Error(`unknown case ${id}`);
    return c;
  });
  const cuts = list(a.cuts).map(Number);
  const budget = Number(a.budget ?? 8);
  const concurrency = Math.max(1, Number(a.concurrency ?? (mode === 'format' ? 3 : 1)));
  const system = buildSystemPrompt(catalog);
  const claudeModel = claudeModelOf(process.env.CLAUDE_BACKUP_MODEL);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(RESULTS_DIR, `${stamp}-${typeof a.label === 'string' ? a.label : 'claude-' + mode}`);
  mkdirSync(dir, { recursive: true });
  const label = 'cc-' + path.basename(dir);
  const runsFile = path.join(dir, 'runs.jsonl');
  const totalTurns = cases.reduce((s, c) => s + c.turns.length, 0);
  console.log(`${path.basename(dir)}: mode ${mode}, ${cases.length} cases, ${totalTurns} turns, claude ${claudeModel}, budget USD ${budget}, concurrency ${concurrency}`);
  if (a.dry) return 0;

  const spentAtStart = spentUsd((e) => e.label.startsWith('cc-') && e.model.startsWith('claude'));
  let session = 0;
  const stop = new AbortController();
  const onSpend = (usd: number): void => {
    session += usd;
    if (spentAtStart + session > budget && !stop.signal.aborted) {
      console.error(`budget guard: Claude spend passed USD ${budget}; stopping`);
      stop.abort();
    }
  };
  writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ startedAt: new Date().toISOString(), mode, claudeModel, cases: cases.map((c) => c.id), cuts, budget, concurrency, systemPromptChars: system.length }, null, 2));
  const names = productNamePattern(catalog);
  const units = cases.map((c, i) => ({ c, cut: cuts.length ? cuts[i % cuts.length] : 4 }));
  let finished = 0;
  await pool(units, concurrency, async ({ c, cut }) => {
    if (stop.signal.aborted) return;
    const ctx: Ctx = { label, catalog, system, names, signal: stop.signal, claudeKey, qwenKey, claudeModel, mode, cutAfter: cut, onSpend };
    const rec = await runOne(c, 1, ctx);
    if (stop.signal.aborted && rec.apiError) return;
    appendFileSync(runsFile, JSON.stringify(rec) + '\n');
    finished++;
    const failed = rec.turns.flatMap((t) => t.assertions.filter((x) => !x.pass).map((x) => x.type));
    const first = rec.turns[0]?.stats;
    console.log(`[${finished}/${units.length}] ${rec.id} ${rec.pass ? 'PASS' : 'FAIL'} ${rec.turns.length}/${c.turns.length} turns ${(rec.wallMs / 1000).toFixed(0)}s $${rec.costUsd.toFixed(3)} firstOp ${first?.firstOpMs ?? '-'}ms${mode === 'rescue' ? ` cut@${cut} rescue ${first?.rescue ? first.rescue.kind + ' ok=' + first.rescue.ok : 'none'}` : ''}${failed.length ? ' failed: ' + [...new Set(failed)].join(',') : ''}${rec.apiError ? ' API: ' + rec.apiError : ''}`);
  });
  console.log(`\nresults: ${dir}\nClaude spend this run: USD ${session.toFixed(3)}`);
  return stop.signal.aborted ? 2 : 0;
}

// ---------- reporting ----------

export function readJsonl<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

export { percentile };

if (process.argv[1] && path.basename(process.argv[1]) === 'claude-check.ts') {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    },
  );
}
