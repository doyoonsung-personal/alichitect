// Analysis helper for the stacked variant (not part of the layout): where near-parallel route pairs (< 10 px apart,
// sharing 12 px or more) sit, by router, on turn-end states at 1040x800. A pair is located by the frame region its
// overlap lies in: left columns, the VPC, the channel between the VPC and the shelf, the shelf, or elsewhere.
//   node spikes/layout-bench/variants/stacked/near.ts [core|stacked] [sources]
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { layoutGraph as coreLayout } from '../../../../packages/core/src/layout.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { planEdges } from '../../src/routing/plan.ts';
import { routeChannels } from '../../src/routing/channel.ts';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../../src/routing/avoid.ts';
import { libavoidUrl } from '../../src/browser.ts';
import type { PlannedEdge, Pt } from '../../src/routing/types.ts';
import { layoutGraph } from '../stacked.ts';

const which = process.argv[2] ?? 'stacked';
const sources = (process.argv[3] ?? 'final,baseline').split(',') as SourceId[];
const catalog = loadCatalog();
const trace = buildTrace(loadSessions(sources, catalog, { ops: 'content' }), catalog, 'op');
const { AvoidLib } = (await import(libavoidUrl())) as { AvoidLib: { load(): Promise<void>; getInstance(): unknown } };
await AvoidLib.load();
const lib = AvoidLib.getInstance();
const lay = (g: Parameters<typeof coreLayout>[0], p: LayoutState | undefined): LayoutState => (which === 'core' ? coreLayout(g, catalog, p) : layoutGraph(g, catalog, p, { canvas: { w: 1040, h: 800 } }));

interface S { route: string; from: string; to: string; h: boolean; a: Pt; b: Pt }
function segs(e: PlannedEdge, pts: Pt[]): S[] {
  const out: S[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const h = Math.abs(a.y - b.y) < 0.01;
    if (h === (Math.abs(a.x - b.x) < 0.01)) continue;
    out.push({ route: e.id, from: e.from, to: e.to, h, a, b });
  }
  return out;
}
function where(L: LayoutState, x: number, y: number): string {
  const inF = (k: string): boolean => Object.values(L.frames).some((f) => f.kind === k && x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h);
  if (inF('lane')) return 'shelf-block';
  if (inF('vpc')) return 'vpc';
  if (inF('region')) return 'region-outside-vpc';
  if (inF('edge') || inF('external') || inF('outside')) return 'left-frame';
  if (x < 0) return 'left-gap';
  return 'outside';
}
const tally: Record<string, Record<string, number>> = { channel: {}, libavoid: {} };
const tallyU: Record<string, Record<string, number>> = { channel: {}, libavoid: {} };
for (const st of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const L = lay(f.display, prev);
    prev = L;
    if (f.kind !== 'commit' || !f.count) continue;
    const req = planEdges(f.display, L, catalog);
    if (!req.edges.length) continue;
    const a = createAvoidState(lib);
    let av: Record<string, Pt[]>;
    try {
      av = routeWithAvoid(a, req).routes;
    } finally {
      disposeAvoidState(a);
    }
    for (const [name, routes] of [['channel', routeChannels(req).routes], ['libavoid', av]] as const) {
      const all = req.edges.flatMap((e) => (routes[e.id] ? segs(e, routes[e.id]) : []));
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const p = all[i];
          const q = all[j];
          if (p.route === q.route || p.h !== q.h) continue;
          const gap = p.h ? Math.abs(p.a.y - q.a.y) : Math.abs(p.a.x - q.a.x);
          if (gap < 0.5 || gap >= 10) continue;
          const lo = Math.max(p.h ? Math.min(p.a.x, p.b.x) : Math.min(p.a.y, p.b.y), q.h ? Math.min(q.a.x, q.b.x) : Math.min(q.a.y, q.b.y));
          const hi = Math.min(p.h ? Math.max(p.a.x, p.b.x) : Math.max(p.a.y, p.b.y), q.h ? Math.max(q.a.x, q.b.x) : Math.max(q.a.y, q.b.y));
          if (hi - lo < 12) continue;
          const mid = (lo + hi) / 2;
          const k = `${p.h ? 'H' : 'V'} ${where(L, p.h ? mid : p.a.x, p.h ? p.a.y : mid)}`;
          tally[name][k] = (tally[name][k] ?? 0) + 1;
          const shared = p.from === q.from || p.to === q.to || p.from === q.to || p.to === q.from;
          if (!shared) tallyU[name][k] = (tallyU[name][k] ?? 0) + 1;
        }
      }
    }
  }
}
for (const name of ['channel', 'libavoid']) {
  console.log(`${which} ${name} near pairs: ${Object.entries(tally[name]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`${which} ${name} unrelated: ${Object.entries(tallyU[name]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
