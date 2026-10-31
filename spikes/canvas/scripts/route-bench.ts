// Route bench (Node): replays every scenario batch by batch through the real pipeline, routes each state with both
// routers (libavoid-js with one incremental router per scenario, and the channel router), and measures time and
// route quality. Writes screenshots/route-bench.json.  Run: node scripts/route-bench.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AvoidLib } from 'libavoid-js';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { SCENARIOS, prepareScenario } from '../src/replay/scenarios.ts';
import type { ScenarioData } from '../src/replay/scenarios.ts';
import { forkSession, runStream } from '../src/replay/pipeline.ts';
import { planEdges } from '../src/routing/plan.ts';
import { routeChannels } from '../src/routing/channel.ts';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../src/routing/avoid.ts';
import { routeMetrics } from '../src/routing/metrics.ts';
import type { RouteMetrics } from '../src/routing/metrics.ts';

const root = new URL('../../../', import.meta.url);
const read = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));
const data: ScenarioData = {
  recorded: read('research/probes/streams.json') as ScenarioData['recorded'],
  synthetic: read('spikes/canvas/src/replay/synthetic.json') as ScenarioData['synthetic'],
  idMap: read('packages/core/test/fixtures/probe-id-map.json') as Record<string, string>,
};
const catalog = loadCatalog();
await AvoidLib.load();
const A = AvoidLib.getInstance();

interface Sample {
  ms: number;
  solveMs?: number;
  m: RouteMetrics;
  failed: number;
}
const stats = (xs: number[]): { mean: number; p95: number; max: number } => {
  const s = [...xs].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  return { mean: +mean.toFixed(2), p95: +(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] ?? 0).toFixed(2), max: +(s[s.length - 1] ?? 0).toFixed(2) };
};

const out: Record<string, unknown> = {};
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
for (const def of SCENARIOS) {
  if (only && !only.includes(def.id)) continue;
  const prep = prepareScenario(def.id, data, catalog);
  const s = forkSession(prep.base);
  const batches = runStream(s, catalog, prep.lines, prep.mapRaw);
  const avoidOpts = process.env.AVOID_OPTS ? JSON.parse(process.env.AVOID_OPTS) : {};
  const avoid = createAvoidState(A, avoidOpts);
  const per: Record<'libavoid' | 'channel', Sample[]> = { libavoid: [], channel: [] };
  // route the base state first (the incremental router starts warm, as in the app), then every batch state
  const states = [...(prep.base.layout ? [{ g: prep.base.display, l: prep.base.layout }] : []), ...batches.map((b) => ({ g: b.display, l: b.layout }))];
  for (const { g, l } of states) {
    const req = planEdges(g, l, catalog);
    const c = routeChannels(req);
    per.channel.push({ ms: c.ms, m: routeMetrics(req.edges, c.routes, req.obstacles), failed: c.failed.length });
    const a = routeWithAvoid(avoid, req);
    per.libavoid.push({ ms: a.ms, solveMs: a.solveMs, m: routeMetrics(req.edges, a.routes, req.obstacles), failed: a.failed.length });
  }
  // a cold libavoid run on the final state (fresh router), to compare with the incremental timings
  const cold = createAvoidState(A, avoidOpts);
  const finalReq = planEdges(s.display, s.layout!, catalog);
  const coldRes = routeWithAvoid(cold, finalReq);
  disposeAvoidState(cold);
  disposeAvoidState(avoid);
  const last = (k: 'libavoid' | 'channel'): Sample => per[k][per[k].length - 1];
  out[def.id] = {
    title: def.title,
    batches: batches.length,
    cards: Object.keys(s.layout!.cards).length,
    plannedRoutes: finalReq.edges.length,
    graphEdges: Object.keys(s.display.edges).length,
    aggregated: finalReq.edges.filter((e) => e.bar).map((e) => `${e.id} (${e.edges.length} edges)`),
    final: { libavoid: { ...last('libavoid').m, failed: last('libavoid').failed }, channel: { ...last('channel').m, failed: last('channel').failed } },
    timing: {
      libavoidIncremental: stats(per.libavoid.map((x) => x.ms)),
      libavoidSolve: stats(per.libavoid.map((x) => x.solveMs ?? 0)),
      libavoidColdFinal: +coldRes.ms.toFixed(2),
      channel: stats(per.channel.map((x) => x.ms)),
    },
  };
  const f = out[def.id] as { final: Record<string, RouteMetrics>; timing: Record<string, { mean: number; max: number }> };
  console.log(
    `${def.id.padEnd(3)} routes ${String(finalReq.edges.length).padStart(2)} | libavoid hits ${f.final.libavoid.edgeNodeIntersections} cross ${f.final.libavoid.crossings} overlap ${f.final.libavoid.overlapPx}px bends ${f.final.libavoid.bends} len ${f.final.libavoid.lengthPx} ${f.timing.libavoidIncremental.mean}/${f.timing.libavoidIncremental.max} ms (cold ${coldRes.ms.toFixed(1)}) | channel hits ${f.final.channel.edgeNodeIntersections} cross ${f.final.channel.crossings} overlap ${f.final.channel.overlapPx}px bends ${f.final.channel.bends} len ${f.final.channel.lengthPx} ${f.timing.channel.mean}/${f.timing.channel.max} ms`,
  );
}
// Stress: the repaired F diagram copied into three regions (shared clients and edge), plus cross-region links, to
// approach the research target of 60 nodes and 80 edges. Routed cold and incrementally after one card moves.
{
  const prep = prepareScenario('a', data, catalog);
  const s = forkSession(prep.base);
  runStream(s, catalog, prep.lines, prep.mapRaw);
  const g0 = s.display;
  const shared = new Set(['users', 'dns', 'esa', 'cdn', 'anti-ddos', 'security-center']);
  const sharedGroups = new Set(['ext', 'edge']);
  const g = { groups: { ...g0.groups }, nodes: { ...g0.nodes }, edges: { ...g0.edges }, recs: [] as typeof g0.recs };
  for (const k of [2, 3]) {
    const sfx = (id: string): string => (shared.has(id) || sharedGroups.has(id) ? id : `${id}-${k}`);
    for (const gr of Object.values(g0.groups)) if (!sharedGroups.has(gr.id)) g.groups[sfx(gr.id)] = { ...gr, id: sfx(gr.id), label: gr.kind === 'region' ? `${gr.label} copy ${k}` : gr.label, parent: gr.parent ? sfx(gr.parent) : null };
    for (const n of Object.values(g0.nodes)) if (!shared.has(n.id)) g.nodes[sfx(n.id)] = { ...n, id: sfx(n.id), group: n.group ? sfx(n.group) : null, attachTo: n.attachTo ? sfx(n.attachTo) : undefined };
    for (const e of Object.values(g0.edges)) {
      const id = sfx(e.id);
      if (id === e.id) continue;
      g.edges[id] = { ...e, id, from: sfx(e.from), to: sfx(e.to) };
    }
    for (const [a, z] of [['polardb', `polardb-${k}`], ['oss', `oss-${k}`], ['sls', `sls-${k}`], ['tair', `tair-${k}`], ['rocketmq', `rocketmq-${k}`], ['ecs-a', `opensearch-${k}`], ['model-studio', `model-studio-${k}`], ['arms', `arms-${k}`]]) g.edges[`x-${a}-${z}`] = { id: `x-${a}-${z}`, from: a, to: z, kind: 'async' };
  }
  const { layoutGraph } = await import('../../../packages/core/src/layout.ts');
  const layout = layoutGraph(g, catalog);
  const req = planEdges(g, layout, catalog);
  const st = createAvoidState(A, process.env.AVOID_OPTS ? JSON.parse(process.env.AVOID_OPTS) : {});
  const cold = routeWithAvoid(st, req);
  // move one card down a row and reroute incrementally
  const moved = structuredClone(layout);
  moved.cards['rocketmq'].y += 76;
  const req2 = planEdges(g, moved, catalog);
  const warm = routeWithAvoid(st, req2);
  disposeAvoidState(st);
  const ch = routeChannels(req);
  const mA = routeMetrics(req.edges, cold.routes, req.obstacles);
  const mC = routeMetrics(req.edges, ch.routes, req.obstacles);
  out.stress = { nodes: Object.keys(g.nodes).length, cards: Object.keys(layout.cards).length, edges: Object.keys(g.edges).length, routes: req.edges.length, size: `${layout.width}x${layout.height}`, libavoid: { coldMs: +cold.ms.toFixed(1), solveMs: +(cold.solveMs ?? 0).toFixed(1), incrementalMs: +warm.ms.toFixed(1), ...mA, failed: cold.failed.length }, channel: { ms: +ch.ms.toFixed(1), ...mC, failed: ch.failed.length } };
  console.log(`stress nodes ${Object.keys(g.nodes).length} edges ${Object.keys(g.edges).length} routes ${req.edges.length} | libavoid cold ${cold.ms.toFixed(1)} ms incremental ${warm.ms.toFixed(1)} ms hits ${mA.edgeNodeIntersections} cross ${mA.crossings} | channel ${ch.ms.toFixed(1)} ms hits ${mC.edgeNodeIntersections} cross ${mC.crossings} overlap ${mC.overlapPx}px`);
}
mkdirSync(new URL('../screenshots/', import.meta.url), { recursive: true });
if (!process.env.AVOID_OPTS) writeFileSync(new URL('../screenshots/route-bench.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), node: process.version, scenarios: out }, null, 2));
