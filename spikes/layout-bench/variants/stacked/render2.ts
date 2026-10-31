// Two-line title renders and text check for the stacked variant (not part of the layout). The bench's renderer draws
// one title line and ellipsizes it; the stacked cards are 60 px tall so a title may wrap to two lines. This script
// renders the bench's snapshot targets with the bench's own renderer (same routes, frames, glyphs and palette), then
// re-sets each card's title and subtitle as the stacked canvas would: the title word-wrapped into up to two lines of
// the 108 px text column (shrunk in 0.5 px steps only when two lines at 14 px are not enough), the subtitle on one line.
// It also reports, over every turn-end state, how many titles need a second line, a shrink, or neither.
//   node spikes/layout-bench/variants/stacked/render2.ts [--no-png] [--out dir]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutCard, LayoutState } from '../../../../packages/core/src/layout.ts';
import type { Graph } from '../../../../packages/core/src/types.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { runLayout } from '../../src/runner.ts';
import type { LayoutModule } from '../../src/layouts.ts';
import { textWidth } from '../../src/text.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { renderTargets } from '../../src/render/render.ts';
import { renderSvg } from '../../src/render/svg.ts';
import { planEdges } from '../../src/routing/plan.ts';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../../src/routing/avoid.ts';
import { interFontFace, launchBrowser, libavoidUrl } from '../../src/browser.ts';
import { METRICS, cardText, layoutGraph } from '../stacked.ts';
import { wrapLines } from './wrap.ts';

const arg = (k: string, d: string): string => {
  const i = process.argv.indexOf('--' + k);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const outDir = path.resolve(arg('out', 'spikes/layout-bench/out/stacked/render-2line'));
const png = !process.argv.includes('--no-png');
const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }), catalog, 'op');
const mod: LayoutModule = { name: 'stacked', source: 'stacked', METRICS, cardText, layoutGraph };
const ROOM = METRICS.cardW - 60;
const LH_T = (px: number): number => Math.round(px * 1.28);
const LH_S = Math.round(METRICS.subtitlePx * 1.27);
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (x: number): string => (Math.round(x * 100) / 100).toString();
const baseline = (top: number, lineH: number, px: number): number => top + (lineH - 1.21 * px) / 2 + 0.969 * px;

/** Title lines and the size they are set at: 14 px in one or two lines, else the largest 0.5 px step that fits two. */
export function titleSet(title: string): { lines: string[]; px: number } {
  for (let px = METRICS.titlePx; px >= 9; px -= 0.5) {
    const lines = wrapLines(table, 'title', title, px, ROOM);
    const wordsFit = title.split(/\s+/).every((w) => /[ᄀ-￿]/.test(w) || textWidth(table, 'title', w, px) <= ROOM + 0.01);
    if (lines.length <= 2 && wordsFit) return { lines, px };
  }
  return { lines: wrapLines(table, 'title', title, 9, ROOM).slice(0, 2), px: 9 };
}

/** Replaces the renderer's one-line title (and moves the subtitle) on every card, in the renderer's card order. */
function twoLine(svg: string, layout: LayoutState, display: Graph): string {
  const cards = Object.values(layout.cards);
  const texts = cards.map((c) => cardText(c, display, catalog));
  let ci = 0;
  let wantSub = false;
  return svg.replace(/<text class="(ct|cs)"[^>]*>[^<]*<\/text>/g, (m, cls: string) => {
    if (cls === 'cs') {
      if (!wantSub) return m;
      wantSub = false;
      return ''; // re-emitted with the title below
    }
    const c: LayoutCard = cards[ci];
    const t = texts[ci];
    ci++;
    wantSub = !!t.subtitle;
    const set = titleSet(t.title);
    const x = c.x + 10 + Math.min(30, c.h - 12) + 10;
    const lhT = LH_T(set.px);
    const block = set.lines.length * lhT + (t.subtitle ? 1 + LH_S : 0);
    let top = c.y + (c.h - block) / 2;
    const out: string[] = [];
    for (const line of set.lines) {
      out.push(`<text class="ct" x="${n2(x)}" y="${n2(baseline(top, lhT, set.px))}" font-size="${set.px}">${esc(line)}</text>`);
      top += lhT;
    }
    if (t.subtitle) out.push(`<text class="cs" x="${n2(x)}" y="${n2(baseline(top + 1, LH_S, METRICS.subtitlePx))}" font-size="${METRICS.subtitlePx}">${esc(t.subtitle)}</text>`);
    return out.join('');
  });
}

// ----- text check over every turn-end state (1040x800 layout; card text does not depend on the canvas) -----
let states = 0;
let titles = 0;
let two = 0;
let shrunk = 0;
let minPx = METRICS.titlePx;
const shrunkList = new Map<string, number>();
for (const st of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const next = layoutGraph(f.display, catalog, prev, { canvas: { w: 1040, h: 800 } });
    prev = next;
    if (f.kind !== 'commit' || !f.count) continue;
    states++;
    for (const c of Object.values(next.cards)) {
      const t = cardText(c, f.display, catalog);
      const s = titleSet(t.title);
      titles++;
      if (s.px < METRICS.titlePx) {
        shrunk++;
        minPx = Math.min(minPx, s.px);
        shrunkList.set(`${t.title} @${s.px}`, (shrunkList.get(`${t.title} @${s.px}`) ?? 0) + 1);
      } else if (s.lines.length === 2) two++;
    }
  }
}
const textSummary = {
  states,
  titles,
  oneLine: titles - two - shrunk,
  twoLines: two,
  shrunkToFitTwoLines: shrunk,
  minTitlePxAtZoom1: minPx,
  shrunk: [...shrunkList.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} x ${k}`),
};
console.log(JSON.stringify(textSummary, null, 1));

// ----- renders -----
mkdirSync(outDir, { recursive: true });
const targets = renderTargets(trace);
const keys = new Set(targets.flatMap((t) => t.keys));
const { AvoidLib } = (await import(libavoidUrl())) as { AvoidLib: { load(): Promise<void>; getInstance(): unknown } };
await AvoidLib.load();
const lib = AvoidLib.getInstance();
const face = interFontFace();
const shots: Array<{ file: string; canvas: string; title: string; zoom: number; titlePx: number }> = [];
for (const canvas of [{ w: 880, h: 720 }, { w: 1040, h: 800 }, { w: 1520, h: 940 }]) {
  const r = runLayout(trace, mod, catalog, table, canvas, { routes: 'none', avoid: null, snapshots: keys });
  for (const t of targets) {
    for (const s of t.states) {
      const snap = r.snapshots.get(s.key);
      if (!snap) continue;
      const req = planEdges(snap.display, snap.layout, catalog);
      const a = createAvoidState(lib);
      let routes;
      try {
        routes = routeWithAvoid(a, req).routes;
      } finally {
        disposeAvoidState(a);
      }
      const out = renderSvg({ layout: snap.layout, display: snap.display, catalog, edges: req.edges, routes, metrics: METRICS, canvas, table, cardText, fontFace: face });
      const file = `${t.name}${s.suffix}-${canvas.w}x${canvas.h}.svg`;
      writeFileSync(path.join(outDir, file), twoLine(out.svg, snap.layout, snap.display));
      shots.push({ file, canvas: `${canvas.w}x${canvas.h}`, title: t.title + (s.suffix ? ` (${s.suffix.slice(1)})` : ''), zoom: Math.round(out.zoom * 1000) / 1000, titlePx: Math.round(METRICS.titlePx * out.zoom * 10) / 10 });
    }
  }
}
if (png) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    for (const s of shots) {
      const [w, h] = s.canvas.split('x').map(Number);
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      const svg = readFileSync(path.join(outDir, s.file), 'utf8');
      await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:#f3f5f8}</style></head><body>${svg}</body></html>`, { waitUntil: 'load' });
      await page.evaluate('document.fonts.ready.then(() => true)');
      await page.screenshot({ path: path.join(outDir, s.file.replace(/\.svg$/, '.png')), type: 'png' });
    }
    await page.close();
  } finally {
    await browser.close();
  }
}
const rowsHtml = shots.map((s) => `<figure><figcaption>${esc(s.title)} · ${s.canvas} · zoom ${s.zoom} · title ${s.titlePx} px</figcaption><img src="${png ? s.file.replace(/\.svg$/, '.png') : s.file}" width="${s.canvas.split('x')[0]}"></figure>`).join('\n');
writeFileSync(path.join(outDir, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Stacked: two-line titles</title><style>body{font:14px system-ui;margin:16px;background:#fff}figure{margin:0 0 24px}img{border:1px solid #ddd;max-width:100%}</style></head><body><h1>Stacked layout, two-line titles</h1>\n${rowsHtml}\n</body></html>\n`);
writeFileSync(path.join(outDir, 'text-2line.json'), JSON.stringify({ ...textSummary, shots }, null, 1) + '\n');
console.log(`wrote ${shots.length} snapshots to ${outDir}`);
