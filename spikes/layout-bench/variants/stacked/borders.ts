// Analysis helper for the stacked variant (not part of the layout): where routes run along frame borders and where
// near-parallel pairs sit, broken down by frame kind and side, for both routers. Turn-end states at 1040x800.
//   node spikes/layout-bench/variants/stacked/borders.ts [core|stacked] [sources]
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
import type { Pt } from '../../src/routing/types.ts';
import { layoutStacked } from './layout.ts';

const which = process.argv[2] ?? 'stacked';
const sources = (process.argv[3] ?? 'final,baseline').split(',') as SourceId[];
const catalog = loadCatalog();
const trace = buildTrace(loadSessions(sources, catalog, { ops: 'content' }), catalog, 'op');
const { AvoidLib } = (await import(libavoidUrl())) as { AvoidLib: { load(): Promise<void>; getInstance(): unknown } };
await AvoidLib.load();
const lib = AvoidLib.getInstance();
const lay = (g: Parameters<typeof coreLayout>[0], p: LayoutState | undefined): LayoutState => (which === 'core' ? coreLayout(g, catalog, p) : layoutStacked(g, catalog, p, { canvas: { w: 1040, h: 800 } }));

const tally: Record<string, Record<string, number>> = { channel: {}, libavoid: {} };
const total: Record<string, number> = { channel: 0, libavoid: 0 };
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
      for (const pts of Object.values(routes)) {
        for (let i = 0; i + 1 < pts.length; i++) {
          const p = pts[i];
          const q = pts[i + 1];
          const h = Math.abs(p.y - q.y) < 0.01;
          const v = Math.abs(p.x - q.x) < 0.01;
          if (h === v) continue;
          total[name] += Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
          const lo = h ? Math.min(p.x, q.x) : Math.min(p.y, q.y);
          const hi = h ? Math.max(p.x, q.x) : Math.max(p.y, q.y);
          const at = h ? p.y : p.x;
          for (const fr of Object.values(L.frames)) {
            if (fr.kind === 'lane') continue;
            const sides = h ? [['top', fr.y], ['bottom', fr.y + fr.h]] : [['left', fr.x], ['right', fr.x + fr.w]];
            const flo = h ? fr.x : fr.y;
            const fhi = h ? fr.x + fr.w : fr.y + fr.h;
            for (const [side, ln] of sides as Array<[string, number]>) {
              if (Math.abs(at - ln) > 6) continue;
              const o = Math.min(hi, fhi) - Math.max(lo, flo);
              if (o > 0) tally[name][`${fr.kind}.${side}`] = (tally[name][`${fr.kind}.${side}`] ?? 0) + o;
            }
          }
        }
      }
    }
  }
}
for (const name of ['channel', 'libavoid']) {
  const t = tally[name];
  console.log(`${which} ${name}: route length ${Math.round(total[name])}; along borders by frame side: ${Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)} (${((v / total[name]) * 100).toFixed(1)}%)`).join(', ')}`);
}
