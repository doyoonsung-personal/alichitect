// Analysis helper for the adaptive variant (not part of the layout): lists every batch with an unrelated move.
//   node spikes/layout-bench/variants/adaptive/moves.ts [--canvas 1040x800] [--followups] [--layout <variant.ts>]
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout } from '../../src/layouts.ts';
import { classifyMoves } from '../../src/metrics/stability.ts';

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const [cw, ch] = opt('--canvas', '1040x800').split('x').map(Number);
const onlyFollow = argv.includes('--followups');
const catalog = loadCatalog();
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, opt('--batch', 'op') as 'op' | 'turn');
const mod = await loadLayout(opt('--layout', 'spikes/layout-bench/variants/adaptive.ts'));
let total = 0;
for (const st of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const next = mod.layoutGraph(f.display, catalog, prev, { canvas: { w: cw, h: ch } });
    if (prev && f.count && f.kind !== 'base' && (!onlyFollow || !f.first)) {
      const un = classifyMoves(prev, next).moved.filter((mv) => mv.cls === 'unrelated');
      if (un.length) {
        total += un.length;
        console.log(`${st.spec.id} T${f.turn + 1}${f.first ? ' first' : ''} [${f.label}] ${un.map((mv) => `${mv.id}@${prev!.cards[mv.id].slot}:${mv.px}`).join(' ')}`);
      }
    }
    prev = next;
  }
}
console.log('unrelated', total);
