// Analysis helper for the adaptive variant (not part of the layout): titles that do not fit on one line, and those that
// still do not fit after wrapping to two lines (the bench's text check counts only the one-line case).
//   node spikes/layout-bench/variants/adaptive/cuts.ts   (from the repo root)
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout } from '../../src/layouts.ts';
import { titleComplete, wrapTitle } from '../adaptive.ts';

const catalog = loadCatalog();
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const mod = await loadLayout('spikes/layout-bench/variants/adaptive.ts');
let total = 0;
let oneLineCut = 0;
let twoLineCut = 0;
const still = new Map<string, number>();
for (const s of trace.sessions) {
  for (const f of s.frames) {
    if (f.kind !== 'commit' || !f.count) continue;
    const l = mod.layoutGraph(f.display, catalog, undefined, { canvas: { w: 1040, h: 800 } });
    for (const c of Object.values(l.cards)) {
      const t = mod.cardText!(c, f.display, catalog).title;
      total++;
      const lines = wrapTitle(t);
      if (lines.length > 1) oneLineCut++;
      if (!titleComplete(t)) {
        twoLineCut++;
        still.set(t, (still.get(t) ?? 0) + 1);
      }
    }
  }
}
console.log(`titles ${total}; need a second line ${oneLineCut} (${((100 * oneLineCut) / total).toFixed(1)}%); still clipped after two lines ${twoLineCut}`);
for (const [k, n] of still) console.log(n, JSON.stringify(k));
