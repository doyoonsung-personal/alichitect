// Analysis helper for the topdown variant (not part of the layout). Replays every source through a layout and prints
// the legibility misses against the Phase 1 targets, the two-line title fit, and layout time by card count.
//   node spikes/layout-bench/variants/topdown/analyze.ts [--layout <variant.ts>|core] [--list n]   (from the repo root)
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout, textWidthOf } from '../../src/layouts.ts';
import { cardText as canvasText, textWidth } from '../../src/text.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { bboxOf, fitZoom } from '../../src/metrics/size.ts';
import { twoLineFit } from './wrap.ts';

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : undefined;
};
const spec = opt('layout') ?? 'spikes/layout-bench/variants/topdown.ts';
const listN = Number(opt('list') ?? 12);
const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const mod = await loadLayout(spec);
const M = mod.METRICS;
const room = textWidthOf(M);
const rule = mod.cardText ?? canvasText;

interface Row {
  key: string;
  cards: number;
  w: number;
  h: number;
  t880: number;
  t1040: number;
  bind1040: 'w' | 'h' | 'cap';
}

const rows: Row[] = [];
const ms: Array<{ cards: number; ms: number }> = [];
let titles = 0;
let cut1 = 0;
let cut2 = 0;
const cut2Ex = new Map<string, number>();
for (const canvas of [{ w: 1040, h: 800 }]) {
  for (const st of trace.sessions) {
    let prev: LayoutState | undefined;
    for (const f of st.frames) {
      const t0 = performance.now();
      const next = mod.layoutGraph(f.display, catalog, prev, { canvas });
      ms.push({ cards: Object.keys(next.cards).length, ms: performance.now() - t0 });
      prev = next;
      if (f.kind !== 'commit' || !f.count) continue;
      const n = Object.keys(next.cards).length;
      if (!n) continue;
      // the bench sizes each canvas with its own replay; this layout ignores opts.canvas apart from tie-breaks, so the
      // 880x720 figure is recomputed from a separate replay below only when it differs
      const b = bboxOf(next);
      const z1040 = fitZoom(b.w, b.h, canvas);
      const zw = (canvas.w - 48) / b.w;
      const zh = (canvas.h - 48) / b.h;
      rows.push({ key: `${st.spec.id}@T${f.turn + 1}`, cards: n, w: Math.round(b.w), h: Math.round(b.h), t880: 0, t1040: M.titlePx * z1040, bind1040: z1040 >= 1.25 ? 'cap' : zw < zh ? 'w' : 'h' });
      for (const c of Object.values(next.cards)) {
        const t = rule(c, f.display, catalog);
        titles++;
        if (textWidth(table, 'title', t.title, M.titlePx) > room + 0.01) cut1++;
        if (!twoLineFit(table, t.title, M.titlePx, room)) {
          cut2++;
          cut2Ex.set(t.title, (cut2Ex.get(t.title) ?? 0) + 1);
        }
      }
    }
  }
}
// 880x720: a separate replay, since a variant may adapt to the canvas
{
  const canvas = { w: 880, h: 720 };
  const byKey = new Map(rows.map((r) => [r.key, r]));
  for (const st of trace.sessions) {
    let prev: LayoutState | undefined;
    for (const f of st.frames) {
      const next = mod.layoutGraph(f.display, catalog, prev, { canvas });
      prev = next;
      if (f.kind !== 'commit' || !f.count) continue;
      const r = byKey.get(`${st.spec.id}@T${f.turn + 1}`);
      if (!r) continue;
      const b = bboxOf(next);
      r.t880 = M.titlePx * fitZoom(b.w, b.h, canvas);
    }
  }
}

const pctS = (a: number, b: number): string => `${a} of ${b} (${((100 * a) / Math.max(1, b)).toFixed(1)}%)`;
const miss1040 = rows.filter((r) => r.cards <= 24 && r.t1040 < 12 - 1e-9);
const miss880 = rows.filter((r) => r.cards <= 20 && r.t880 < 11 - 1e-9);
const evalOnly = (r: Row): boolean => /^(final|baseline):/.test(r.key);
console.log(`layout ${mod.name}: ${rows.length} turn-end states`);
console.log(`1040x800, <=24 cards, title < 12 px: ${pctS(miss1040.length, rows.filter((r) => r.cards <= 24).length)}; eval runs ${miss1040.filter(evalOnly).length}; min ${Math.min(...rows.filter((r) => r.cards <= 24).map((r) => r.t1040)).toFixed(2)}`);
console.log(`880x720, <=20 cards, title < 11 px: ${pctS(miss880.length, rows.filter((r) => r.cards <= 20).length)}; eval runs ${miss880.filter(evalOnly).length}; min ${Math.min(...rows.filter((r) => r.cards <= 20).map((r) => r.t880)).toFixed(2)}`);
const big = rows.filter((r) => r.cards > 24);
console.log(`>24 cards: ${big.length} states; title px at 1040 ${big.map((r) => r.t1040.toFixed(1)).join(', ')}`);
const bind = { w: 0, h: 0, cap: 0 };
for (const r of rows) bind[r.bind1040]++;
console.log(`binding dimension at 1040x800: width ${bind.w}, height ${bind.h}, zoom cap ${bind.cap}`);
const asp = rows.filter((r) => r.cards >= 8).map((r) => r.w / r.h).sort((a, b) => a - b);
console.log(`aspect (>=8 cards, ${asp.length} states): p10 ${asp[Math.floor(asp.length * 0.1)].toFixed(2)} p50 ${asp[Math.floor(asp.length / 2)].toFixed(2)} p90 ${asp[Math.floor(asp.length * 0.9)].toFixed(2)}; in 1.1-1.7: ${pctS(asp.filter((a) => a >= 1.1 && a <= 1.7).length, asp.length)}`);
console.log(`titles: ${titles}; cut on one line ${pctS(cut1, titles)}; cut on two lines ${pctS(cut2, titles)}`);
if (cut2Ex.size) console.log(`  two-line cuts: ${[...cut2Ex.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `"${k}" x${v}`).join('; ')}`);
const show = (title: string, list: Row[], key: 't1040' | 't880'): void => {
  console.log(title);
  for (const r of [...list].sort((a, b) => a[key] - b[key]).slice(0, listN)) console.log(`  ${r.key.padEnd(44)} cards ${String(r.cards).padStart(2)}  ${r.w}x${r.h}  title ${r[key].toFixed(2)} px  (binds ${r.bind1040})`);
};
show('-- misses at 1040x800', miss1040, 't1040');
show('-- misses at 880x720', miss880, 't880');
const buckets = [[0, 10], [11, 20], [21, 25], [26, 99]];
console.log(`layout ms by card count: ${buckets.map(([lo, hi]) => {
  const xs = ms.filter((x) => x.cards >= lo && x.cards <= hi).map((x) => x.ms).sort((a, b) => a - b);
  return xs.length ? `${lo}-${hi}: n ${xs.length} p50 ${xs[Math.floor(xs.length / 2)].toFixed(3)} p95 ${xs[Math.floor(xs.length * 0.95)].toFixed(3)} max ${xs[xs.length - 1].toFixed(3)}` : '';
}).join('; ')}`);
