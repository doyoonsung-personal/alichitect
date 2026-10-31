// Analysis helper for the stacked variant (not part of the layout): per-call layout time on the largest real states,
// repeated so machine noise averages out, next to core. Also the share of titles that need a second line or do not
// fit in two lines, and the fit-to-width text size for tall states. Run from the repo root:
//   node spikes/layout-bench/variants/stacked/timing.ts
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import { layoutGraph as coreLayout } from '../../../../packages/core/src/layout.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { textWidth } from '../../src/text.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { bboxOf, fitZoom } from '../../src/metrics/size.ts';
import { pct } from '../../src/stats.ts';
import { METRICS, cardText } from '../stacked.ts';
import { layoutStacked } from './layout.ts';

const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const canvas = { w: 1040, h: 800 };

// ---- timing on states with 25 or more cards, prev = the previous frame's layout
interface Case {
  id: string;
  display: Parameters<typeof layoutStacked>[0];
  prevS: LayoutState | undefined;
  prevC: LayoutState | undefined;
  cards: number;
}
const cases: Case[] = [];
for (const st of trace.sessions) {
  let ps: LayoutState | undefined;
  let pc: LayoutState | undefined;
  for (const f of st.frames) {
    const s = layoutStacked(f.display, catalog, ps, { canvas });
    const c = coreLayout(f.display, catalog, pc);
    const n = Object.keys(s.cards).length;
    if (f.kind === 'commit' && n >= 25) cases.push({ id: `${st.spec.id} T${f.turn + 1}`, display: f.display, prevS: ps, prevC: pc, cards: n });
    ps = s;
    pc = c;
  }
}
const REPS = 300;
const per = (fn: () => void): { p50: number; p95: number; max: number } => {
  for (let i = 0; i < 30; i++) fn(); // warm-up
  const xs: number[] = [];
  for (let i = 0; i < REPS; i++) {
    const t0 = performance.now();
    fn();
    xs.push(performance.now() - t0);
  }
  return { p50: pct(xs, 0.5), p95: pct(xs, 0.95), max: Math.max(...xs) };
};
const rowsS: number[] = [];
const rowsC: number[] = [];
for (const c of cases) {
  const s = per(() => layoutStacked(c.display, catalog, c.prevS, { canvas }));
  const k = per(() => coreLayout(c.display, catalog, c.prevC));
  rowsS.push(s.p95);
  rowsC.push(k.p95);
  console.log(`${c.id} cards ${c.cards}: stacked p50 ${s.p50.toFixed(3)} p95 ${s.p95.toFixed(3)} max ${s.max.toFixed(3)} ms | core p50 ${k.p50.toFixed(3)} p95 ${k.p95.toFixed(3)} ms`);
}
console.log(`timing: ${cases.length} turn-end states with >= 25 cards, ${REPS} calls each; worst per-state p95 stacked ${Math.max(...rowsS).toFixed(3)} ms, core ${Math.max(...rowsC).toFixed(3)} ms`);

// ---- title lines: greedy word wrap into the text column, at the variant's title size
const room = METRICS.cardW - 60;
const fitsLine = (s: string): boolean => textWidth(table, 'title', s, METRICS.titlePx) <= room + 0.01;
function linesNeeded(title: string): number {
  if (fitsLine(title)) return 1;
  const words = title.split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 1;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (fitsLine(next)) line = next;
    else if (!line) {
      // a single word wider than the column breaks by characters
      let chunk = '';
      for (const ch of w) {
        if (fitsLine(chunk + ch)) chunk += ch;
        else {
          lines++;
          chunk = ch;
        }
      }
      line = chunk;
    } else {
      lines++;
      line = w;
      if (!fitsLine(w)) lines += Math.ceil(textWidth(table, 'title', w, METRICS.titlePx) / room) - 1;
    }
  }
  return lines;
}
let cards = 0;
let two = 0;
let more = 0;
const over: Map<string, number> = new Map();
const scroll: number[] = [];
const fitW: number[] = [];
for (const st of trace.sessions) {
  let ps: LayoutState | undefined;
  for (const f of st.frames) {
    const s = layoutStacked(f.display, catalog, ps, { canvas });
    ps = s;
    if (f.kind !== 'commit' || !f.count) continue;
    for (const c of Object.values(s.cards)) {
      const n = linesNeeded(cardText(c, f.display, catalog).title);
      cards++;
      if (n === 2) two++;
      if (n > 2) {
        more++;
        const t = cardText(c, f.display, catalog).title;
        over.set(t, (over.get(t) ?? 0) + 1);
      }
    }
    const b = bboxOf(s);
    if (b.w > 0) {
      const zW = Math.min((canvas.w - 48) / b.w, 1.25);
      fitW.push(METRICS.titlePx * zW);
      scroll.push(b.h * zW > canvas.h - 48 ? 1 : 0);
    }
    void fitZoom;
  }
}
console.log(`titles at ${METRICS.titlePx}px in ${room}px: one line ${cards - two - more}, two lines ${two} (${((two / cards) * 100).toFixed(1)}%), more than two ${more} (${((more / cards) * 100).toFixed(2)}%): ${[...over.entries()].map(([k, v]) => `"${k}" x${v}`).join(', ')}`);
console.log(`fit to width at ${canvas.w}x${canvas.h}: title p50 ${pct(fitW, 0.5).toFixed(2)} min ${Math.min(...fitW).toFixed(2)} px; states that would scroll vertically ${scroll.filter((x) => x).length} of ${scroll.length}`);
