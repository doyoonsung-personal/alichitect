// Three synthetic replay fixtures for the Claude backup (a turn Model Studio's content filter stops, finished or not by
// Claude). The server's wire for each case is composed by hand from the recorded "ha" turn, with the event shapes that
// apps/server emits (packages/core/src/llm.ts runTurn), and the memories are built with the same core code the server runs
// (applyOp, repairGraph, diffGraphs), so every graph in them is the real shape.
//
//   stub-rescue-continue    Qwen drew the first half (users, DNS, ESA, the frames, ALB, WAF, ECS) and the filter stopped
//                           it at about 10 s. Claude continues from the partial diagram: statuses fallback and continue
//                           (provider 'claude'), then its ops in phase 'repair', then the commit.
//   stub-rescue-whole       The filter stopped Qwen before it drew anything. One fallback status (provider 'claude'), then
//                           Claude runs the whole turn in phase 'main'.
//   stub-rescue-incomplete  As the first, but Claude refuses. The partial diagram is committed with a reply-incomplete
//                           warning.
//   stub-rescue-failed      The filter stopped Qwen before it drew anything and Claude failed too: the turn ends as a
//                           content-filtered fatal, memory unchanged.
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
import { BACKUP_STATUS_COPY, FATAL_COPY } from '../../../server/src/messages.ts';
import type { Fixture, FixtureTurn } from './build-fixtures.ts';

type Wire = FixtureTurn['ev'][number][1];
type Ev = [number, Wire];

const TIMINGS = { headersMs: 0, firstByteMs: 0, firstContentMs: 0, firstSayMs: 1, firstOpMs: 1, firstNodeMs: 1, lastOpMs: 3, totalMs: 3, maxGapMs: 0, hedgeAtMs: null };
/** Qwen's filter stop in the recorded turn: after the ECS node, at about 10 s. */
const CUT_AT = 10498;

const filtered = (at: number, phase: 'main' | 'repair'): Ev[] => [
  [at, { type: 'error', error: { code: 'content-filtered', message: 'Output data may contain inappropriate content (data_inspection_failed).', retryable: false }, phase } as Wire],
  [at + 8, { type: 'done', summary: '', timings: TIMINGS, finishReason: 'content_filter', truncated: true, phase } as Wire],
];

const status = (at: number, code: 'fallback' | 'continue'): Ev => [at, { type: 'status', code, text: BACKUP_STATUS_COPY[code]!.en, provider: 'claude' } as Wire];

/** The recorded turn's events before the cut and after it. */
function split(ha: Fixture): { head: Ev[]; tail: Ev[]; ask: string; commit: Extract<Wire, { type: 'commit' }> } {
  const ev = ha.turns[0].ev as Ev[];
  const commit = ev.find(([, e]) => e.type === 'commit')![1] as Extract<Wire, { type: 'commit' }>;
  const body = ev.filter(([, e]) => e.type !== 'commit' && e.type !== 'usage' && e.type !== 'summary' && e.type !== 'status');
  return { head: body.filter(([t]) => t <= CUT_AT), tail: body.filter(([t]) => t > CUT_AT), ask: ha.turns[0].ask, commit };
}

/** Moves events later by `by` ms and puts them in `phase`; a say line gets the id it has in the new phase (Claude's ids restart at 0). */
function retime(events: Ev[], by: number, phase: 'main' | 'repair', sayBase = 0): Ev[] {
  const ids = [...new Set(events.filter(([, e]) => e.type === 'say').map(([, e]) => (e as { id: number }).id))].sort((a, b) => a - b);
  return events.map(([t, e]) => {
    const out = { ...e } as Record<string, unknown>;
    if ('phase' in out) out.phase = phase;
    if (out.type === 'say') out.id = sayBase + ids.indexOf(out.id as number);
    return [t + by, out as unknown as Wire];
  });
}

/** The partial graph the server commits when Claude cannot finish: the ops drawn before the cut, repaired as the server does. */
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
  const source = 'composed by apps/web/scripts/replay/rescue-fixtures.ts from the recorded "ha" turn; the filter stop and the Claude statuses are hand-written in the shapes the server emits';

  // 1. Qwen drew half, Claude continues from the partial diagram. Its first op lands about 3.9 s after the status.
  const stopAt = CUT_AT + 450;
  const continueStatusAt = stopAt + 220;
  const shiftB = continueStatusAt + 3900 - tail[0][0];
  const continued: Ev[] = [...head, ...filtered(stopAt, 'main'), status(stopAt + 200, 'fallback'), status(continueStatusAt, 'continue'), ...retime(tail, shiftB, 'repair')];
  const commitAtB = (tail[tail.length - 1][0] as number) + shiftB + 25;
  continued.push([commitAtB, commit]);

  // 2. Nothing drawn: Claude runs the whole turn in phase 'main', its first op about 1.5 s after the status.
  const wholeStatusAt = 2400;
  const shiftA = wholeStatusAt + 1500 - head[0][0];
  const all = [...head, ...tail];
  const whole: Ev[] = [...filtered(1900, 'main'), status(wholeStatusAt, 'fallback'), ...retime(all, shiftA, 'main')];
  whole.push([(all[all.length - 1][0] as number) + shiftA + 25, commit]);

  // 3. Claude refuses after Qwen drew half: the partial diagram is committed with the reply-incomplete warning.
  const memory = partial(head, catalog, ask);
  const warning: Warning = {
    code: 'reply-incomplete',
    ids: [],
    severity: 'warn',
    repaired: false,
    msg: "The reply is incomplete: Model Studio's content filter stopped qwen3.8-max and the Claude backup (claude-opus-5-5) could not finish it (it declined). The diagram keeps what was drawn.",
  };
  const refusedAt = continueStatusAt + 2600;
  const incomplete: Ev[] = [
    ...head,
    ...filtered(stopAt, 'main'),
    status(stopAt + 200, 'fallback'),
    status(continueStatusAt, 'continue'),
    [refusedAt, { type: 'error', error: { code: 'refusal', message: 'The model declined to continue this reply.', retryable: false }, phase: 'repair' } as Wire],
    [refusedAt + 6, { type: 'done', summary: '', timings: TIMINGS, finishReason: 'refusal', truncated: true, phase: 'repair' } as Wire],
    [refusedAt + 40, { type: 'commit', memory, changes: memory.turns[1].changes ?? '', warnings: [warning] } as unknown as Wire],
  ];

  // 4. Nothing drawn and Claude fails too: the server ends the turn as it does without a backup.
  const failed: Ev[] = [
    ...filtered(1900, 'main'),
    status(wholeStatusAt, 'fallback'),
    [wholeStatusAt + 1700, { type: 'error', error: { code: 'refusal', message: 'The model declined this request.', retryable: false }, phase: 'main' } as Wire],
    [wholeStatusAt + 1706, { type: 'done', summary: '', timings: TIMINGS, finishReason: 'refusal', truncated: true, phase: 'main' } as Wire],
    [wholeStatusAt + 1730, { type: 'fatal', code: 'content-filtered', message: FATAL_COPY['content-filtered'].en, retryable: false } as Wire],
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
    mk('stub-rescue-continue', 'Stub: the content filter stops Qwen halfway and Claude finishes', 'Qwen draws the edge, ALB, WAF and ECS; the filter stops it. Claude continues from the partial diagram and commits.', continued),
    mk('stub-rescue-whole', 'Stub: the content filter stops Qwen before it draws, and Claude answers', 'Nothing was drawn when the filter stopped Qwen, so Claude runs the whole turn.', whole),
    mk('stub-rescue-incomplete', 'Stub: the filter stops Qwen and Claude declines to finish', 'Claude refuses; the partial diagram is committed with a reply-incomplete warning.', incomplete),
    mk('stub-rescue-failed', 'Stub: the filter stops Qwen before it draws and Claude fails too', 'Nothing was drawn and Claude could not answer either: the revision ends as content-filtered, memory unchanged.', failed),
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
