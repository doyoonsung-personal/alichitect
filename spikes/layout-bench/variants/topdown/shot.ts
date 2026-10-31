// Inspection helper for the topdown variant (not part of the layout): renders chosen turn-end states with the bench's
// SVG renderer and libavoid routes, and writes SVG and PNG files to --out.
//   node spikes/layout-bench/variants/topdown/shot.ts --out <dir> [--layout <variant.ts>] [--canvas 1040x800] <session@turn> ...
// A key is `${sessionId}@${turnIndex}` (0-based) or `${sessionId}@base`.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import { ALL_SOURCES, loadSessions } from '../../src/inputs.ts';
import { buildTrace } from '../../src/trace.ts';
import { loadLayout } from '../../src/layouts.ts';
import { cardText as canvasText } from '../../src/text.ts';
import type { AdvanceTable } from '../../src/text.ts';
import { planEdges } from '../../src/routing/plan.ts';
import { routeChannels } from '../../src/routing/channel.ts';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from '../../src/routing/avoid.ts';
import { interFontFace, launchBrowser, libavoidUrl } from '../../src/browser.ts';
import { renderSvg } from '../../src/render/svg.ts';
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const flags = new Map<string, string>();
const keys: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags.set(argv[i].slice(2), argv[++i]);
  else keys.push(argv[i]);
}
const out = path.resolve(flags.get('out') ?? 'shots');
mkdirSync(out, { recursive: true });
const [cw, ch] = (flags.get('canvas') ?? '1040x800').split('x').map(Number);
const canvas = { w: cw, h: ch };
const catalog = loadCatalog();
const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
const mod = await loadLayout(flags.get('layout') ?? 'spikes/layout-bench/variants/topdown.ts');
const sessions = new Set(keys.map((k) => k.slice(0, k.lastIndexOf('@'))));
const specs = loadSessions(ALL_SOURCES, catalog, { ops: 'content' }).filter((s) => sessions.has(s.id));
const trace = buildTrace(specs, catalog, 'op');
const { AvoidLib } = await import(libavoidUrl());
await AvoidLib.load();
const avoid = AvoidLib.getInstance();
const browser = await launchBrowser();
const page = await browser.newPage();
await page.setViewport({ width: canvas.w, height: canvas.h, deviceScaleFactor: 1 });
for (const st of trace.sessions) {
  let prev: LayoutState | undefined;
  for (const f of st.frames) {
    const next = mod.layoutGraph(f.display, catalog, prev, { canvas });
    prev = next;
    const key = f.kind === 'base' ? `${st.spec.id}@base` : f.kind === 'commit' ? `${st.spec.id}@${f.turn}` : '';
    if (!key || !keys.includes(key)) continue;
    const req = planEdges(f.display, next, catalog);
    let routes = routeChannels(req).routes;
    if (flags.get('router') !== 'channel') {
      const s = createAvoidState(avoid);
      try {
        routes = routeWithAvoid(s, req).routes;
      } finally {
        disposeAvoidState(s);
      }
    }
    const r = renderSvg({ layout: next, display: f.display, catalog, edges: req.edges, routes, metrics: mod.METRICS, canvas, table, cardText: mod.cardText ?? canvasText, fontFace: interFontFace() });
    const base = key.replace(/[^a-z0-9@#-]+/gi, '_').replace(/[@#]/g, '_') + `-${canvas.w}x${canvas.h}`;
    writeFileSync(path.join(out, base + '.svg'), r.svg);
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:#f3f5f8}</style></head><body>${r.svg}</body></html>`, { waitUntil: 'load' });
    await page.evaluate('document.fonts.ready.then(() => true)');
    await page.screenshot({ path: path.join(out, base + '.png'), type: 'png' });
    console.log(`${key}: ${Object.keys(next.cards).length} cards, bbox ${r.bbox.w}x${r.bbox.h}, zoom ${r.zoom.toFixed(3)}, title ${(mod.METRICS.titlePx * r.zoom).toFixed(1)} px -> ${base}.png`);
  }
}
await browser.close();
