// Debug helper: print the frames and cards before and after one op frame. node dbg.ts <source:session#n> <turn> <label>
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { loadSessions } from '../../src/inputs.ts';
import type { SourceId } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout } from '../../src/layouts.ts';
const [sidArg, turn, label] = process.argv.slice(2);
const src = sidArg.split(":")[0]; const sid = sidArg;
const catalog = loadCatalog();
const mod = await loadLayout('spikes/layout-bench/variants/topdown.ts');
const trace = buildTrace(loadSessions([src as SourceId], catalog, { ops: 'content' }), catalog, 'op');
const dump = (l: LayoutState) => {
  for (const f of Object.values(l.frames)) console.log(`  F ${f.id} ${f.kind} (${f.x},${f.y}) ${f.w}x${f.h}`);
  for (const c of Object.values(l.cards)) console.log(`  C ${c.id} ${c.slot} (${c.x},${c.y})`);
};
for (const st of trace.sessions) {
  if (`${st.spec.id}` !== sid) continue;
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const next = mod.layoutGraph(f.display, catalog, prev, { canvas: { w: 1040, h: 800 } });
    if (f.turn + 1 === Number(turn) && f.label === label) { console.log('PREV'); if (prev) dump(prev); console.log('NEXT'); dump(next); break; }
    prev = next;
  }
}
