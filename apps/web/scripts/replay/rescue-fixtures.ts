// Four synthetic replay fixtures for a turn Model Studio's content filter stops and a second pass finishes (or not). The
// browser is never told who the second pass is: the wire has only the neutral 'finish' status, no error event for the
// filter stop, and a neutral fatal when it fails. The server's wire for each case is composed by hand from the recorded "ha" turn, with the event shapes that
// apps/server emits (packages/core/src/llm.ts runTurn), and the memories are built with the same core code the server runs
// (applyOp, repairGraph, diffGraphs), so every graph in them is the real shape.
//
//   stub-rescue-continue    Qwen drew the first half (users, DNS, ESA, the frames, ALB, WAF, ECS) and the filter stopped
//                           it at about 10 s. The second pass continues from the partial diagram: statuses finish and
//                           continue, then its ops in phase 'repair', then the commit.
//   stub-rescue-whole       The filter stopped Qwen before it drew anything. One finish status, then the second pass
//                           runs the whole turn in phase 'main'.
//   stub-rescue-incomplete  As the first, but the second pass declines. The partial diagram is committed with a
//                           reply-incomplete warning.
//   stub-rescue-failed      The filter stopped Qwen before it drew anything and the second pass failed too: the turn
//                           ends as a not-completed fatal, memory unchanged.
//
// Run: npm run replay:rescue (from apps/web). It rewrites only these fixtures and their manifest entries.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Graph, SessionMemory, Warning } from '@ali/core/types.ts';
import { applyOp, createCtx, emptyGraph } from '@ali/core/reducer.ts';
import { diffGraphs } from '@ali/core/diff.ts';
import { compactChanges } from '@ali/core/prompt.ts';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import { repairGraph } from '@ali/core/validate.ts';
import { FATAL_COPY, STATUS_COPY } from '../../../server/src/messages.ts';
import type { Fixture, FixtureTurn } from './build-fixtures.ts';

type Wire = FixtureTurn['ev'][number][1];
type Ev = [number, Wire];

const TIMINGS = { headersMs: 0, firstByteMs: 0, firstContentMs: 0, firstSayMs: 1, firstOpMs: 1, firstNodeMs: 1, lastOpMs: 3, totalMs: 3, maxGapMs: 0, hedgeAtMs: null };
/** Qwen's filter stop in the recorded turn: after the ECS node, at about 10 s. */
const CUT_AT = 10498;

// The filter stop of the first pass: the server holds back its error event when a backup is configured, so only the cut-off done arrives.
const filtered = (at: number, phase: 'main' | 'repair'): Ev[] => [[at + 8, { type: 'done', summary: '', timings: TIMINGS, finishReason: 'content_filter', truncated: true, phase } as Wire]];

// The statuses of the second pass: 'finish' starts it, 'continue' follows when it continues a partial diagram; both read the same line.
const status = (at: number, code: 'finish' | 'continue'): Ev => [at, { type: 'status', code, text: STATUS_COPY.finish.en } as Wire];

/** The recorded turn's events before the cut and after it. */
function split(ha: Fixture): { head: Ev[]; tail: Ev[]; ask: string; commit: Extract<Wire, { type: 'commit' }> } {
  const ev = ha.turns[0].ev as Ev[];
  const commit = ev.find(([, e]) => e.type === 'commit')![1] as Extract<Wire, { type: 'commit' }>;
  const body = ev.filter(([, e]) => e.type !== 'commit' && e.type !== 'usage' && e.type !== 'summary' && e.type !== 'status');
  return { head: body.filter(([t]) => t <= CUT_AT), tail: body.filter(([t]) => t > CUT_AT), ask: ha.turns[0].ask, commit };
}

/** Moves events later by `by` ms and puts them in `phase`; a say line gets the id it has in the new phase (the second pass's ids restart at 0). */
function retime(events: Ev[], by: number, phase: 'main' | 'repair', sayBase = 0): Ev[] {
  const ids = [...new Set(events.filter(([, e]) => e.type === 'say').map(([, e]) => (e as { id: number }).id))].sort((a, b) => a - b);
  return events.map(([t, e]) => {
    const out = { ...e } as Record<string, unknown>;
    if ('phase' in out) out.phase = phase;
    if (out.type === 'say') out.id = sayBase + ids.indexOf(out.id as number);
    return [t + by, out as unknown as Wire];
  });
}

/** The partial graph the server commits when the second pass cannot finish: the ops drawn before the cut, repaired as the server does. */
function partial(head: Ev[], catalog: ReturnType<typeof loadCatalog>, ask: string): SessionMemory {
  const ctx = createCtx();
  let graph: Graph = emptyGraph();
  const says: string[] = [];
  for (const [, e] of head) {
    if (e.type !== 'op') continue;
    if (e.op.t === 'say') says.push(e.op.text);
    if (e.op.t === 'say' || e.op.t === 'done') continue;
    graph = applyOp(graph, e.op, ctx).graph;
  }
  const finalGraph = repairGraph(graph, catalog, {}).graph;
  const changes = compactChanges([diffGraphs(emptyGraph(), finalGraph)]);
  return { turns: [{ role: 'user', text: ask }, { role: 'assistant', text: says.join('\n'), changes }], requirements: [], graph: finalGraph, tombstones: [] };
}

export function rescueFixtures(ha: Fixture): Fixture[] {
  const catalog = loadCatalog();
  const { head, tail, ask, commit } = split(ha);
  const base = { lang: 'en' as const, recordedAt: '2026-11-01', model: 'qwen3.8-max', synthetic: true };
  const source = 'composed by apps/web/scripts/replay/rescue-fixtures.ts from the recorded "ha" turn; the filter stop and the finishing statuses are hand-written in the shapes the server emits';

  // 1. Qwen drew half, the second pass continues from the partial diagram. Its first op lands about 3.9 s after the status.
  const stopAt = CUT_AT + 450;
  const continueStatusAt = stopAt + 220;
  const shiftB = continueStatusAt + 3900 - tail[0][0];
  const continued: Ev[] = [...head, ...filtered(stopAt, 'main'), status(stopAt + 200, 'finish'), status(continueStatusAt, 'continue'), ...retime(tail, shiftB, 'repair')];
  const commitAtB = (tail[tail.length - 1][0] as number) + shiftB + 25;
  continued.push([commitAtB, commit]);

  // 2. Nothing drawn: the second pass runs the whole turn in phase 'main', its first op about 1.5 s after the status.
  const wholeStatusAt = 2400;
  const shiftA = wholeStatusAt + 1500 - head[0][0];
  const all = [...head, ...tail];
  const whole: Ev[] = [...filtered(1900, 'main'), status(wholeStatusAt, 'finish'), ...retime(all, shiftA, 'main')];
  whole.push([(all[all.length - 1][0] as number) + shiftA + 25, commit]);

  // 3. The second pass declines after Qwen drew half: the partial diagram is committed with the reply-incomplete warning.
  const memory = partial(head, catalog, ask);
  const warning: Warning = {
    code: 'reply-incomplete',
    ids: [],
    severity: 'warn',
    repaired: false,
    msg: 'The reply is incomplete. The diagram keeps what was drawn.',
  };
  const refusedAt = continueStatusAt + 2600;
  const incomplete: Ev[] = [
    ...head,
    ...filtered(stopAt, 'main'),
    status(stopAt + 200, 'finish'),
    status(continueStatusAt, 'continue'),
    // the second pass's own error event stays in the server log; its done event carries no finish reason
    [refusedAt + 6, { type: 'done', summary: '', timings: TIMINGS, finishReason: null, truncated: true, phase: 'repair' } as Wire],
    [refusedAt + 40, { type: 'commit', memory, changes: memory.turns[1].changes ?? '', warnings: [warning] } as unknown as Wire],
  ];

  // 4. Nothing drawn and the second pass fails too: the server ends the turn with the neutral not-completed fatal.
  const failed: Ev[] = [
    ...filtered(1900, 'main'),
    status(wholeStatusAt, 'finish'),
    [wholeStatusAt + 1706, { type: 'done', summary: '', timings: TIMINGS, finishReason: null, truncated: true, phase: 'main' } as Wire],
    [wholeStatusAt + 1730, { type: 'fatal', code: 'not-completed', message: FATAL_COPY['not-completed'].en, retryable: true } as Wire],
  ];

  const mk = (id: string, title: string, note: string, ev: Ev[]): Fixture => ({
    id,
    title,
    ...base,
    source,
    note,
    turns: [{ ask, ev: ev as FixtureTurn['ev'] }],
  });
  return [
    mk('stub-rescue-continue', 'Stub: the answer stops halfway and is finished', 'Qwen draws the edge, ALB, WAF and ECS; the filter stops it. A second pass continues from the partial diagram and commits.', continued),
    mk('stub-rescue-whole', 'Stub: the answer stops before it draws and is finished', 'Nothing was drawn when the filter stopped Qwen, so the second pass runs the whole turn.', whole),
    mk('stub-rescue-incomplete', 'Stub: the answer stops and cannot be finished', 'The second pass declines; the partial diagram is committed with a reply-incomplete warning.', incomplete),
    mk('stub-rescue-failed', 'Stub: the answer stops before it draws and cannot be finished', 'Nothing was drawn and the second pass could not answer either: the revision ends as not-completed, memory unchanged.', failed),
  ];
}

// ---------- npm run replay:rescue ----------

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/replay/fixtures');
  const ha = JSON.parse(readFileSync(path.join(dir, 'ha.json'), 'utf8')) as Fixture;
  const fixtures = rescueFixtures(ha);
  const indexPath = path.join(dir, 'index.json');
  const manifest = (JSON.parse(readFileSync(indexPath, 'utf8')) as Array<{ id: string }>).filter((m) => !fixtures.some((f) => f.id === m.id));
  for (const fx of fixtures) {
    writeFileSync(path.join(dir, `${fx.id}.json`), JSON.stringify(fx));
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
    } as { id: string });
    process.stdout.write(`  ${fx.id}: ${fx.turns[0].ev.length} events, ${fx.turns[0].ev[fx.turns[0].ev.length - 1][0]} ms\n`);
  }
  writeFileSync(indexPath, JSON.stringify(manifest, null, 1));
}
