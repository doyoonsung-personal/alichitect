// Analysis helper for the adaptive variant (not part of the layout): where do route segments run along frame borders?
//   node spikes/layout-bench/variants/adaptive/borders.ts [--layout <variant.ts>] [--libavoid]   (from the repo root)
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout } from '../../src/layouts.ts';
import { planEdges } from '../../src/routing/plan.ts';
import { routeChannels } from '../../src/routing/channel.ts';
import { createAvoidState, routeWithAvoid } from '../../src/routing/avoid.ts';
import { libavoidUrl } from '../../src/browser.ts';

const argv = process.argv.slice(2);
const li = argv.indexOf('--layout');
const spec = li >= 0 ? argv[li + 1] : 'spikes/layout-bench/variants/adaptive.ts';
const useAvoid = argv.includes('--libavoid');
let avoidState: ReturnType<typeof createAvoidState> | null = null;
if (useAvoid) {
  const { AvoidLib } = await import(libavoidUrl());
  await AvoidLib.load();
  avoidState = createAvoidState(AvoidLib.getInstance());
}
const catalog = loadCatalog();
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const mod = await loadLayout(spec);
const tally = new Map<string, number>();
let total = 0;
let n = 0;
const ex = new Map<string, string>();
for (const s of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of s.frames) {
    const l = mod.layoutGraph(f.display, catalog, prev, { canvas: { w: 1040, h: 800 } });
    prev = l;
    if (f.kind !== 'commit' || !f.count) continue;
    const req = planEdges(f.display, l, catalog);
    const routes = avoidState ? routeWithAvoid(avoidState, req).routes : routeChannels(req).routes;
    n++;
    for (const e of req.edges) {
      const pts = routes[e.id];
      if (!pts) continue;
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const h = Math.abs(a.y - b.y) < 0.5;
        const lo = h ? Math.min(a.x, b.x) : Math.min(a.y, b.y);
        const hi = h ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
        const at = h ? a.y : a.x;
        total += hi - lo;
        for (const fr of Object.values(l.frames)) {
          if (fr.kind === 'lane') continue;
          const lines = h ? [fr.y, fr.y + fr.h] : [fr.x, fr.x + fr.w];
          const flo = h ? fr.x : fr.y;
          const fhi = h ? fr.x + fr.w : fr.y + fr.h;
          for (const ln of lines) {
            if (Math.abs(at - ln) > 6) continue;
            const o = Math.min(hi, fhi) - Math.max(lo, flo);
            if (o <= 0) continue;
            const key = `${fr.kind} ${h ? 'horizontal' : 'vertical'} ${ln === lines[0] ? 'first' : 'second'}-border off${Math.round(at - ln)}`;
            tally.set(key, (tally.get(key) ?? 0) + o);
            if (!ex.has(key)) ex.set(key, `${s.spec.id} T${f.turn + 1} edge ${e.id} frame ${fr.id}`);
          }
        }
      }
    }
  }
}
console.log('states', n, 'route length', Math.round(total));
for (const [k, v] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(Math.round(v)).padStart(8), k, '|', ex.get(k));
