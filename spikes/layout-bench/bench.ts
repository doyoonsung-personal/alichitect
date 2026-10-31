// Layout replay bench: replays real model output through the core pipeline and judges a layout on stability, size
// and legibility, text, frames and routes, then renders snapshots. Usage in README.md.
//   node spikes/layout-bench/bench.ts --layout core
//   node spikes/layout-bench/bench.ts --layout spikes/layout-bench/variants/<name>.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';
import type { Catalog } from '../../packages/core/src/types.ts';
import { ALL_SOURCES, loadSessions } from './src/inputs.ts';
import type { SessionSpec, SourceId } from './src/inputs.ts';
import { buildTrace } from './src/trace.ts';
import type { BatchMode, Carry, Trace } from './src/trace.ts';
import { loadLayout } from './src/layouts.ts';
import type { Canvas, LayoutModule } from './src/layouts.ts';
import { CANVASES, canvasKey } from './src/metrics/size.ts';
import { aggregateStability } from './src/metrics/stability.ts';
import { runLayout } from './src/runner.ts';
import type { RunResult } from './src/runner.ts';
import { canvasSection, printTable, routerReport } from './src/aggregate.ts';
import type { RouterReport } from './src/aggregate.ts';
import type { AdvanceTable } from './src/text.ts';
import { libavoidUrl } from './src/browser.ts';
import { renderAll, renderTargets } from './src/render/render.ts';
import { round } from './src/stats.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIMARY: Canvas = { w: 1040, h: 800 };

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const a: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) a[k.slice(2)] = true;
    else {
      a[k.slice(2)] = v;
      i++;
    }
  }
  return a;
}

const HELP = `node spikes/layout-bench/bench.ts [options]
  --layout core|<variant.ts>   layout under test (default core)
  --sources a,b                final,baseline,heldout-baseline,heldout-final,probes (default all)
  --batch op|turn|both         batching for stability (default both; size, text and routes use op)
  --routes batch|turn|none     route every frame or turn-end states only (default batch)
  --no-avoid                   skip libavoid-js (channel router only)
  --no-render                  skip SVG and PNG snapshots and the browser text check
  --no-png                     write SVG snapshots but no PNG
  --reconcile                  also replay the final run the reviewer's way and print the reconciliation
  --quick                      final run only, turn-end routing, no render (a fast check while iterating)
  --out <dir>                  output root (default spikes/layout-bench/out)
  --dpr <n>                    PNG device pixel ratio (default 1: the canvas's real pixels)`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  const t0 = performance.now();
  const quick = !!args.quick;
  const layout = await loadLayout(typeof args.layout === 'string' ? args.layout : 'core');
  const sources = (typeof args.sources === 'string' ? args.sources.split(',') : quick ? ['final'] : ALL_SOURCES) as SourceId[];
  for (const s of sources) if (!ALL_SOURCES.includes(s)) throw new Error(`unknown source ${s}`);
  const batch = typeof args.batch === 'string' ? args.batch : 'both';
  const routes = (typeof args.routes === 'string' ? args.routes : quick ? 'turn' : 'batch') as 'batch' | 'turn' | 'none';
  const render = !args['no-render'] && !quick;
  const outRoot = typeof args.out === 'string' ? path.resolve(args.out) : path.join(HERE, 'out');
  const outDir = path.join(outRoot, layout.name);
  mkdirSync(outDir, { recursive: true });

  const catalog = loadCatalog();
  const table = JSON.parse(readFileSync(path.join(HERE, 'data', 'inter-advances.json'), 'utf8')) as AdvanceTable;
  let avoid: unknown = null;
  if (!args['no-avoid'] && routes !== 'none') {
    try {
      const { AvoidLib } = await import(libavoidUrl());
      await AvoidLib.load();
      avoid = AvoidLib.getInstance();
    } catch (e) {
      console.warn(`libavoid-js did not load in Node (${String(e).slice(0, 120)}); channel router only`);
    }
  }
  const timings: Record<string, number> = {};
  const lap = (k: string, since: number): number => {
    const t = performance.now();
    timings[k] = round((t - since) / 1000, 2);
    return t;
  };

  let t = performance.now();
  const specs = loadSessions(sources, catalog, { ops: 'content' });
  const opTrace = buildTrace(specs, catalog, 'op');
  const turnTrace = batch === 'op' ? null : buildTrace(specs, catalog, 'turn');
  t = lap('replay', t);

  const targets = renderTargets(opTrace);
  const keys = new Set(targets.flatMap((x) => x.keys));
  const runs: RunResult[] = [];
  for (const c of CANVASES) {
    const primary = c.w === PRIMARY.w && c.h === PRIMARY.h;
    runs.push(runLayout(opTrace, layout, catalog, table, c, { routes: primary ? routes : 'none', avoid: primary ? avoid : null, snapshots: keys }));
  }
  t = lap('layout+routes', t);
  const turnRun = turnTrace && batch !== 'op' ? runLayout(turnTrace, layout, catalog, table, PRIMARY, { routes: 'none', avoid: null, snapshots: new Set() }) : null;
  t = lap('turn-batches', t);

  const sections = runs.map(canvasSection);
  const primaryRun = runs.find((r) => r.canvas.w === PRIMARY.w)!;
  const routers: Record<string, RouterReport> = {};
  const routesBySource: Record<string, Record<string, RouterReport>> = {};
  for (const [k, d] of Object.entries(primaryRun.routers)) {
    if (!d) continue;
    routers[k] = routerReport(d);
    for (const src of sources) (routesBySource[src] ??= {})[k] = routerReport(d, (id) => id.startsWith(src + ':'));
  }
  const turnStability = turnRun ? aggregateStability(turnRun.stability) : null;
  const stabilityBySource = Object.fromEntries(sources.map((src) => [src, aggregateStability(primaryRun.stability.filter((r) => r.session.startsWith(src + ':')))]));

  let reconcile: Reconcile | null = null;
  if (args.reconcile) {
    reconcile = runReconcile(catalog, table, layout, avoid);
    t = lap('reconcile', t);
  }

  let renderInfo: unknown = null;
  if (render) {
    renderInfo = await renderAll({ layout, catalog, table, runs, targets, outDir, png: !args['no-png'], dpr: typeof args.dpr === 'string' ? Number(args.dpr) : 1, avoid, trace: opTrace });
    t = lap('render', t);
  }

  const metrics = {
    generatedAt: new Date().toISOString(),
    node: process.version,
    layout: { name: layout.name, source: layout.source, metrics: layout.METRICS },
    inputs: {
      sources,
      sessions: specs.length,
      turns: specs.reduce((s, x) => s + x.turns.filter((y) => y.count).length, 0),
      ops: opTrace.ops,
      frames: { op: opTrace.sessions.reduce((s, x) => s + x.frames.length, 0), turn: turnTrace ? turnTrace.sessions.reduce((s, x) => s + x.frames.length, 0) : null },
      exceptions: [...opTrace.exceptions, ...(turnTrace?.exceptions ?? [])],
      perSource: Object.fromEntries(sources.map((s) => [s, specs.filter((x) => x.source === s).length])),
    },
    pipeline: 'content -> createLineParser -> validateOp (one ctx per session) -> applyOp; mid-turn display = display rule over repairGraph(working); turn end commits repairGraph(endTurn(working))',
    canvases: CANVASES.map(canvasKey),
    primaryCanvas: canvasKey(PRIMARY),
    stabilityTurnBatches: turnStability,
    stabilityBySource,
    sections: Object.fromEntries(sections.map((s) => [s.canvas, s])),
    routes: routers,
    routesBySource,
    routing: { every: routes, libavoid: !!avoid },
    reconcile,
    render: renderInfo,
    timingsSec: { ...timings, total: round((performance.now() - t0) / 1000, 2) },
  };
  writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 1) + '\n');
  console.log(printTable(layout.name, sections, canvasKey(PRIMARY), routers, turnStability));
  console.log(`-- unrelated moves by source (one op per batch): ${Object.entries(stabilityBySource).map(([k, v]) => `${k} ${v.all.unrelated} in ${v.all.casesWithUnrelated.length} cases (max ${v.all.maxUnrelatedPx} px)`).join('; ')}`);
  if (reconcile) console.log(formatReconcile(reconcile));
  if (opTrace.exceptions.length) console.log(`exceptions: ${opTrace.exceptions.length}; first: ${opTrace.exceptions.slice(0, 3).join(' | ')}`);
  console.log(`inputs: ${specs.length} sessions, ${metrics.inputs.turns} counted turns, ${opTrace.ops} ops, ${metrics.inputs.frames.op} op frames; wrote ${path.relative(process.cwd(), path.join(outDir, 'metrics.json'))}; timings s ${JSON.stringify(metrics.timingsSec)}`);
}

// ---------- reconciliation with the reviewer's replay (spikes/REVIEW.md section 5) ----------

interface ReconcileRow {
  setup: string;
  ops: 'stored' | 'content';
  carry: Carry;
  batch: BatchMode;
  batches: number;
  moved: number;
  unrelated: number;
  batchesWithUnrelated: number;
  cases: number;
  maxPx: number;
  firstTurnsUnrelated: number;
  followUpsUnrelated: number;
}

interface Reconcile {
  stability: ReconcileRow[];
  /** The reviewer routed turn-end states only, one incremental libavoid router per conversation. */
  routesTurnEnd: Record<string, RouterReport>;
}

function runReconcile(catalog: Catalog, table: AdvanceTable, layout: LayoutModule, avoid: unknown): Reconcile {
  const rows: ReconcileRow[] = [];
  const setups: Array<{ setup: string; ops: 'stored' | 'content'; carry: Carry; batch: BatchMode }> = [
    { setup: 'reviewer: stored t.ops, raw graph carried', ops: 'stored', carry: 'raw', batch: 'op' },
    { setup: 'parsed content, raw graph carried', ops: 'content', carry: 'raw', batch: 'op' },
    { setup: 'bench: parsed content, repaired graph committed', ops: 'content', carry: 'repaired', batch: 'op' },
    { setup: 'reviewer, one batch per turn', ops: 'stored', carry: 'raw', batch: 'turn' },
    { setup: 'bench, one batch per turn', ops: 'content', carry: 'repaired', batch: 'turn' },
  ];
  const cache = new Map<string, SessionSpec[]>();
  for (const s of setups) {
    if (!cache.has(s.ops)) cache.set(s.ops, loadSessions(['final'], catalog, { ops: s.ops }));
    const tr: Trace = buildTrace(cache.get(s.ops)!, catalog, s.batch, s.carry);
    const r = runLayout(tr, layout, catalog, table, PRIMARY, { routes: 'none', avoid: null, snapshots: new Set() });
    const st = aggregateStability(r.stability);
    rows.push({ ...s, batches: st.all.batches, moved: st.all.moved, unrelated: st.all.unrelated, batchesWithUnrelated: st.all.batchesWithUnrelated, cases: st.all.casesWithUnrelated.length, maxPx: st.all.maxUnrelatedPx, firstTurnsUnrelated: st.firstTurns.unrelated, followUpsUnrelated: st.followUps.unrelated });
  }
  const tr = buildTrace(cache.get('content')!, catalog, 'op', 'repaired');
  const r = runLayout(tr, layout, catalog, table, PRIMARY, { routes: 'turn', avoid, snapshots: new Set() });
  const routesTurnEnd: Record<string, RouterReport> = {};
  for (const [k, d] of Object.entries(r.routers)) if (d) routesTurnEnd[k] = routerReport(d);
  return { stability: rows, routesTurnEnd };
}

function formatReconcile(rec: Reconcile): string {
  const rows = rec.stability;
  const L = ['-- reconciliation with spikes/REVIEW.md section 5 (final run, 240 conversations)'];
  for (const [k, r] of Object.entries(rec.routesTurnEnd)) {
    L.push(`   ${k} on turn-end states only: ${r.states} states; card hits in ${r.statesWithCardHits}, label hits in ${r.statesWithLabelHits}, failed in ${r.statesWithFailed}, overlap in ${r.statesWithOverlap} (p95 over >=8 cards ${r.overlapPx8.p95} px); ms p50 ${r.ms.p50} p95 ${r.ms.p95} max ${r.ms.max}${r.solveMs ? `, solve p50 ${r.solveMs.p50} p95 ${r.solveMs.p95}` : ''}, over 50 ms ${r.over50ms}; crossings (>=8 cards, ${r.crossings8.states} states) none ${r.crossings8.none}, >=5 ${r.crossings8.ge5}, >=10 ${r.crossings8.ge10}, >=20 ${r.crossings8.ge20}, max ${r.crossings8.max}`);
  }
  for (const r of rows) L.push(`   ${r.setup.padEnd(50)} batches ${String(r.batches).padStart(5)}  moved ${String(r.moved).padStart(4)}  unrelated ${String(r.unrelated).padStart(4)} in ${String(r.batchesWithUnrelated).padStart(3)} batches, ${String(r.cases).padStart(2)} cases, max ${r.maxPx} px (first ${r.firstTurnsUnrelated} / follow-up ${r.followUpsUnrelated})`);
  return L.join('\n');
}

await main();
