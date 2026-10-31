// Analysis helper for the stacked variant (not part of the layout): prints the turn-end layout of one session turn,
// frame by frame with the cards inside, as an ASCII outline.
//   node spikes/layout-bench/variants/stacked/dump.ts <source> <sessionId> <turn> [canvasW]
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { layoutGraph } from '../stacked.ts';

const [src, sid, turnArg, cwArg] = process.argv.slice(2);
const cw = Number(cwArg ?? 1040);
const canvas = cw === 880 ? { w: 880, h: 720 } : cw === 1520 ? { w: 1520, h: 940 } : { w: 1040, h: 800 };
const catalog = loadCatalog();
const trace = buildTrace(loadSessions([src as SourceId], catalog, { ops: 'content' }), catalog, 'op');
const st = trace.sessions.find((s) => s.spec.id === sid || s.spec.id === `${src}:${sid}`);
if (!st) throw new Error('no session ' + sid);
let prev: LayoutState | undefined;
let out: LayoutState | undefined;
let g;
for (const f of st.frames) {
  const next = layoutGraph(f.display, catalog, prev, { canvas });
  if (f.kind === 'commit' && String(f.turn + 1) === turnArg) { out = next; g = f.display; }
  prev = next;
}
if (!out || !g) throw new Error('no such turn');
console.log(`${sid} T${turnArg}: ${out.width}x${out.height}, ${Object.keys(out.cards).length} cards`);
for (const fr of Object.values(out.frames).sort((a, b) => a.depth - b.depth || a.y - b.y || a.x - b.x)) {
  const cs = Object.values(out.cards).filter((c) => c.frame === fr.id).sort((a, b) => a.x - b.x || a.y - b.y);
  console.log(`${'  '.repeat(fr.depth)}${fr.kind} ${fr.id} "${fr.label}" @${Math.round(fr.x)},${Math.round(fr.y)} ${Math.round(fr.w)}x${Math.round(fr.h)}${fr.empty ? ' EMPTY' : ''}`);
  for (const c of cs) console.log(`${'  '.repeat(fr.depth + 1)}- ${c.id} (${c.product}) ${c.slot} @${Math.round(c.x)},${Math.round(c.y)}`);
}
