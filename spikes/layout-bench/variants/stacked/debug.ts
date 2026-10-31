// Analysis helper for the stacked variant (not part of the layout): prints one session frame by frame around a batch.
//   node spikes/layout-bench/variants/stacked/debug.ts <source> <sessionId> [turn]
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { classifyMoves } from '../../src/metrics/stability.ts';
import { layoutStacked } from './layout.ts';
import type { StackedState } from './layout.ts';

const [src, sid, turnArg] = process.argv.slice(2);
const catalog = loadCatalog();
const trace = buildTrace(loadSessions([src as SourceId], catalog, { ops: 'content' }), catalog, 'op');
const st = trace.sessions.find((s) => s.spec.id === sid || s.spec.id === `${src}:${sid}`);
if (!st) throw new Error('no session ' + sid);
let prev: LayoutState | undefined;
for (const f of st.frames) {
  const next = layoutStacked(f.display, catalog, prev, { canvas: { w: 1040, h: 800 } }) as StackedState;
  if (turnArg === undefined || String(f.turn + 1) === turnArg) {
    const m = prev ? classifyMoves(prev, next) : null;
    const un = m ? m.moved.filter((x) => x.cls === 'unrelated').map((x) => x.id) : [];
    console.log(`T${f.turn + 1} ${f.kind} [${f.label}] h ${next.height} tops ${JSON.stringify(next.stacked.tops)} shelves ${JSON.stringify(next.shelves)}${un.length ? ' UNRELATED ' + un.join(',') : ''}`);
  }
  prev = next;
}
