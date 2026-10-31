// Times the real in-browser export of a 25-plus-card diagram (headless Chrome, this machine): from the call to the PDF
// bytes, including the font fetches, libavoid in its worker, and the two drawing passes. Run against a Vite dev server
// or a preview of the build (the dev server serves source modules, so use it only for the page's own import() calls):
//   node scripts/export/e2e-perf.mjs [http://localhost:5185] [runs]
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] ?? 'http://localhost:5185';
const runs = Number(process.argv[3] ?? 3);
const lang = process.argv[4] ?? 'en';
const fixture = lang === 'ko' ? 'korean' : lang === 'zh' ? 'chinese' : 'ecommerce';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.evaluateOnNewDocument(() => localStorage.clear());
await page.goto(`${base}/?replay=${fixture}&speed=instant&lang=${lang}`, { waitUntil: 'networkidle0' });
await page.waitForSelector('.cv-card');

const result = await page.evaluate(
  async (runs) => {
    const { exportProposalPdf } = await import('/src/export/browser.ts');
    const { layoutFor } = await import('/src/canvas/layout.ts');
    const { catalog } = await import('/src/catalog/catalog.ts');
    const st = window.__ab.store.getState();
    const graph = structuredClone(st.display.graph);
    const extra = ['ack', 'polardb', 'rocketmq', 'mse', 'sae', 'fc', 'arms', 'dts', 'maxcompute', 'opensearch', 'tair', 'nas', 'actiontrail', 'ram', 'pai', 'hologres', 'dataworks', 'elasticsearch', 'security-center', 'kms', 'cloud-backup', 'sls'];
    const have = new Set(Object.values(graph.nodes).map((n) => n.product));
    const alb = Object.values(graph.nodes).find((n) => n.product === 'alb');
    let layout = layoutFor(graph, catalog, undefined, { w: 1040, h: 800 });
    let i = 0;
    for (const p of extra) {
      if (Object.keys(layout.cards).length >= 26) break;
      if (have.has(p) || !catalog.byId.has(p)) continue;
      const id = `x-${p}-${i++}`;
      graph.nodes[id] = { id, product: p, label: catalog.byId.get(p).short, group: null, why: 'Added for the speed check.' };
      if (alb) graph.edges['e-' + id] = { id: 'e-' + id, from: alb.id, to: id, label: 'traffic' };
      layout = layoutFor(graph, catalog, undefined, { w: 1040, h: 800 });
    }
    const state = { ...st, display: { ...st.display, graph, layout } };
    const times = [];
    let last = null;
    for (let r = 0; r < runs; r++) {
      const t0 = performance.now();
      last = await exportProposalPdf({ state, catalog, title: 'Large design', customer: '' });
      times.push(Math.round(performance.now() - t0));
    }
    return { cards: Object.keys(layout.cards).length, times, report: last.report, bytes: last.bytes.length, sample: Array.from(last.bytes.slice(0, 5)) };
  },
  runs,
);
console.log(JSON.stringify({ lang, ...result, report: { pages: result.report.pages, router: result.report.router, routeMs: result.report.routeMs, fontsMs: result.report.fontsMs, drawMs: result.report.drawMs, faces: result.report.faces, fontBytes: result.report.fontBytes, passes: result.report.passes } }, null, 1));
console.log('errors:', errors.length ? errors.join('; ') : 'none');
writeFileSync(path.resolve(here, '../../screenshots/export/browser/perf-' + lang + '.json'), JSON.stringify(result.times));
await browser.close();
if (result.cards < 25 || Math.max(...result.times) >= 3000) process.exit(1);
