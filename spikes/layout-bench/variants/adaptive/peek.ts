// Analysis helper for the adaptive variant (not part of the layout): renders chosen turn-end states to PNG.
//   node spikes/layout-bench/variants/adaptive/peek.ts --out <dir> [--layout <variant.ts>] [--canvas 1040x800] <session@turn> ...
// session@turn: a session id from the bench (for example final:pat-08-global#1) and a 1-based turn number.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout } from '../../src/layouts.ts';
import { cardText } from '../../src/text.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { planEdges } from '../../src/routing/plan.ts';
import { routeChannels } from '../../src/routing/channel.ts';
import { renderSvg } from '../../src/render/svg.ts';
import { interFontFace, launchBrowser } from '../../src/browser.ts';

const argv = process.argv.slice(2);
const opt = (k: string, d: string): string => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv.splice(i, 2)[1] : d;
};
const out = opt('--out', '.');
const spec = opt('--layout', 'spikes/layout-bench/variants/adaptive.ts');
const [cw, ch] = opt('--canvas', '1040x800').split('x').map(Number);
const keys = argv;
const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const want = new Set(keys.map((k) => k.slice(0, k.lastIndexOf('@'))));
const trace = buildTrace(loadSessions(ALL_SOURCES, catalog, { ops: 'content' }).filter((s) => want.has(s.id)), catalog, 'op');
const mod = await loadLayout(spec);
mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const page = await browser.newPage();
await page.setViewport({ width: cw, height: ch, deviceScaleFactor: 1 });
for (const key of keys) {
  const sid = key.slice(0, key.lastIndexOf('@'));
  const turn = Number(key.slice(key.lastIndexOf('@') + 1)) - 1;
  const st = trace.sessions.find((s) => s.spec.id === sid);
  if (!st) {
    console.log('no session', sid);
    continue;
  }
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const l = mod.layoutGraph(f.display, catalog, prev, { canvas: { w: cw, h: ch } });
    prev = l;
    if (f.kind === 'commit' && f.turn === turn) {
      const req = planEdges(f.display, l, catalog);
      const r = renderSvg({ layout: l, display: f.display, catalog, edges: req.edges, routes: routeChannels(req).routes, metrics: mod.METRICS, canvas: { w: cw, h: ch }, table, cardText: mod.cardText ?? cardText, fontFace: interFontFace() });
      const file = path.join(out, `${sid.replace(/[^a-z0-9-]+/gi, '_')}-T${turn + 1}-${cw}x${ch}`);
      writeFileSync(file + '.svg', r.svg);
      await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:#f3f5f8}</style></head><body>${r.svg}</body></html>`, { waitUntil: 'load' });
      await page.evaluate('document.fonts.ready.then(() => true)');
      await page.screenshot({ path: file + '.png', type: 'png' });
      console.log(`${file}.png  ${r.bbox.w}x${r.bbox.h} zoom ${r.zoom.toFixed(3)} title ${(mod.METRICS.titlePx * r.zoom).toFixed(1)} px, ${Object.keys(l.cards).length} cards`);
      break;
    }
  }
}
await browser.close();
