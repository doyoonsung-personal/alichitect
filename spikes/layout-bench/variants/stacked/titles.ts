// Analysis helper for the stacked variant (not part of the layout): the distribution of card title widths (em of the
// title style) over every turn-end state, and how many titles fit in one line or two lines of a given text column.
//   node spikes/layout-bench/variants/stacked/titles.ts
import { readFileSync } from 'node:fs';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { textWidth } from '../../src/text.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { METRICS, cardText, layoutGraph } from '../stacked.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { wrapLines } from './wrap.ts';

const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const ems: number[] = [];
const titles: string[] = [];
for (const st of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const next = layoutGraph(f.display, catalog, prev, { canvas: { w: 1040, h: 800 } });
    if (f.kind === 'commit' && f.count) {
      for (const c of Object.values(next.cards)) {
        const t = cardText(c, f.display, catalog).title;
        titles.push(t);
        ems.push(textWidth(table, 'title', t, 1));
      }
    }
    prev = next;
  }
}
ems.sort((a, b) => a - b);
const q = (p: number): string => ems[Math.min(ems.length - 1, Math.floor(p * ems.length))].toFixed(2);
console.log(`titles ${ems.length}; em p50 ${q(0.5)} p90 ${q(0.9)} p95 ${q(0.95)} p99 ${q(0.99)} max ${q(1)}`);
for (const em of [7, 7.5, 7.71, 8, 8.5, 9, 10]) console.log(`  one line at ${em} em: ${(100 * ems.filter((e) => e <= em + 1e-9).length / ems.length).toFixed(1)}%`);
const room = (METRICS.cardW - 60);
let two = 0;
const bad = new Map<string, number>();
for (const t of titles) {
  const lines = wrapLines(table, 'title', t, METRICS.titlePx, room);
  if (lines.length <= 2) two++;
  else bad.set(t, (bad.get(t) ?? 0) + 1);
}
console.log(`two lines of ${room}px at ${METRICS.titlePx}px: ${two} of ${titles.length} fit (${(100 * two / titles.length).toFixed(2)}%)`);
for (const [t, n] of [...bad.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${n} x "${t}" -> ${JSON.stringify(wrapLines(table, 'title', t, METRICS.titlePx, room))}`);
