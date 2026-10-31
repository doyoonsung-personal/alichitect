// Analysis helper for the stacked variant (not part of the layout): lists libavoid routes that pass through a card
// on turn-end states, with the edge, the card hit and both endpoints' slots.
//   node spikes/layout-bench/variants/stacked/hits.ts [sources]
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { planEdges } from '../../src/routing/plan.ts';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../../src/routing/avoid.ts';
import { libavoidUrl } from '../../src/browser.ts';
import { layoutGraph } from '../stacked.ts';

const sources = (process.argv[2] ?? 'final,baseline').split(',') as SourceId[];
const catalog = loadCatalog();
const trace = buildTrace(loadSessions(sources, catalog, { ops: 'content' }), catalog, 'op');
const { AvoidLib } = (await import(libavoidUrl())) as { AvoidLib: { load(): Promise<void>; getInstance(): unknown } };
await AvoidLib.load();
const lib = AvoidLib.getInstance();
const inside = (x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean => x > r.x + 0.5 && x < r.x + r.w - 0.5 && y > r.y + 0.5 && y < r.y + r.h - 0.5;
for (const st of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const L = layoutGraph(f.display, catalog, prev, { canvas: { w: 1040, h: 800 } });
    prev = L;
    if (f.kind !== 'commit' || !f.count) continue;
    const req = planEdges(f.display, L, catalog);
    if (!req.edges.length) continue;
    const a = createAvoidState(lib);
    let routes;
    try {
      routes = routeWithAvoid(a, req).routes;
    } finally {
      disposeAvoidState(a);
    }
    for (const e of req.edges) {
      const pts = routes[e.id];
      if (!pts) continue;
      for (const o of req.obstacles) {
        if (o.kind !== 'card' || o.id === e.from || o.id === e.to) continue;
        let hit = false;
        for (let i = 0; i + 1 < pts.length && !hit; i++) {
          const p = pts[i];
          const q = pts[i + 1];
          const n = Math.ceil((Math.abs(p.x - q.x) + Math.abs(p.y - q.y)) / 2);
          for (let k = 0; k <= n && !hit; k++) hit = inside(p.x + ((q.x - p.x) * k) / Math.max(1, n), p.y + ((q.y - p.y) * k) / Math.max(1, n), o);
        }
        if (hit) console.log(`${st.spec.id} T${f.turn + 1}: ${e.id} ${e.from}(${L.cards[e.from]?.slot ?? '?'}) -> ${e.to}(${L.cards[e.to]?.slot ?? '?'}) hits ${o.id}(${L.cards[o.id]?.slot ?? '?'}) pts ${JSON.stringify(pts.map((p) => [Math.round(p.x), Math.round(p.y)]))}`);
      }
    }
  }
}
