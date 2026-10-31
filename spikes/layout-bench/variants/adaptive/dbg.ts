// Debug helper (not part of the layout): prints the frames of the layouts before and after a batch.
//   node spikes/layout-bench/variants/adaptive/dbg.ts <sessionId> <label substring> [--canvas 1040x800]
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout } from '../../src/layouts.ts';

const argv = process.argv.slice(2);
const ci = argv.indexOf('--canvas');
const [cw, ch] = (ci >= 0 ? argv.splice(ci, 2)[1] : '1040x800').split('x').map(Number);
const [sid, lab] = argv;
const catalog = loadCatalog();
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }).filter((s) => s.id === sid), catalog, 'op');
const mod = await loadLayout('spikes/layout-bench/variants/adaptive.ts');
const dump = (l: LayoutState): string[] => [
  ...Object.values(l.frames).map((f) => `F ${f.id.padEnd(26)} ${f.kind.padEnd(7)} x${f.x} y${f.y} ${f.w}x${f.h}`),
  ...Object.values(l.cards).map((c) => `C ${c.id.padEnd(26)} ${c.slot.padEnd(30)} x${c.x} y${c.y} h${c.h}`),
];
let prev: LayoutState | undefined;
for (const f of trace.sessions[0].frames) {
  const next = mod.layoutGraph(f.display, catalog, prev, { canvas: { w: cw, h: ch } });
  if (prev && f.label.includes(lab)) {
    const a = new Set(dump(prev));
    const b = new Set(dump(next));
    console.log('BATCH', f.label, 'turn', f.turn, 'first', f.first);
    for (const s of a) if (!b.has(s)) console.log('-', s);
    for (const s of b) if (!a.has(s)) console.log('+', s);
    console.log('adaptive prev', JSON.stringify((prev as any).adaptive.res).slice(0, 600)); console.log('order prev', JSON.stringify(Object.fromEntries(Object.entries(prev.order).filter(([k]) => k.startsWith('c1')))), 'next', JSON.stringify(Object.fromEntries(Object.entries(next.order).filter(([k]) => k.startsWith('c1')))));
  }
  prev = next;
}
