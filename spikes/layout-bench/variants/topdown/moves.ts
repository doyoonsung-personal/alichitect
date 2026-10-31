// Debug helper for the topdown variant (not part of the layout): replays sessions one op per batch and prints every
// batch with an unrelated move: the op, the moved cards with their slots, and the slots that changed.
//   node spikes/layout-bench/variants/topdown/moves.ts [--sources final,baseline] [--canvas 1040x800] [--layout <variant.ts>] [--max 20]
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout } from '../../src/layouts.ts';
import { classifyMoves } from '../../src/metrics/stability.ts';

const argv = process.argv.slice(2);
const flag = (k: string): string | undefined => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const sources = (flag('sources')?.split(',') ?? ALL_SOURCES) as SourceId[];
const [cw, ch] = (flag('canvas') ?? '1040x800').split('x').map(Number);
const max = Number(flag('max') ?? 20);
const catalog = loadCatalog();
const mod = await loadLayout(flag('layout') ?? 'spikes/layout-bench/variants/topdown.ts');
const trace = buildTrace(loadSessions(sources, catalog, { ops: 'content' }), catalog, 'op');
let shown = 0;
let total = 0;
for (const st of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const next = mod.layoutGraph(f.display, catalog, prev, { canvas: { w: cw, h: ch } });
    if (prev && f.count && f.kind !== 'base') {
      const m = classifyMoves(prev, next);
      const un = m.moved.filter((x) => x.cls === 'unrelated');
      total += un.length;
      if (un.length && shown < max) {
        shown++;
        const entered = Object.keys(next.cards).filter((id) => !prev!.cards[id]).map((id) => `${id}@${next.cards[id].slot}`);
        const exited = Object.keys(prev.cards).filter((id) => !next.cards[id]).map((id) => `${id}@${prev!.cards[id].slot}`);
        console.log(`${st.spec.id} T${f.turn + 1} ${f.first ? 'first' : 'follow'} ${f.label}`);
        console.log(`   entered ${entered.join(' ') || '-'} | exited ${exited.join(' ') || '-'}`);
        for (const u of un) {
          const a = prev.cards[u.id];
          const b = next.cards[u.id];
          console.log(`   moved ${u.id} ${u.px}px  ${a.slot}  (${a.x},${a.y}) -> (${b.x},${b.y})`);
        }
      }
    }
    prev = next;
  }
}
console.log(`unrelated moves: ${total}`);
