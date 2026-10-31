// Contact sheets for eyeballing the icon set, rendered to PNG with puppeteer-core and the local Chrome.
//   node apps/web/scripts/icons/contact.ts [--out <dir>] [--only catalog,official,fallback]
// catalog:  every catalog entry at 16, 24 and 40 px on white, on a light card and on a dark card, labelled with id,
//           name, source, confidence and icon key (pages of 48 entries).
// official: every official icon at 40 px and 16 px with its key and source name (pages of 72).
// fallback: every fallback glyph at 96, 40, 24 and 16 px beside official neighbours, for style matching.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { iconFor, iconSvg, hasOwnIcon, LOGOS } from '../../src/icons/index.ts';
import * as O from '../../src/icons/official.generated.ts';
import * as F from '../../src/icons/fallback.generated.ts';
import type { IconGeometry } from '../../src/icons/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '../..');
const repo = resolve(web, '../..');
const argv = process.argv.slice(2);
const arg = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const outDir = resolve(arg('--out') ?? join(here, 'contact-sheets'));
const only = new Set((arg('--only') ?? 'catalog,official,fallback').split(','));
mkdirSync(outDir, { recursive: true });

const ORANGE = '#FF6A00';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const geometryOf = (key: string): IconGeometry | undefined =>
  (O as unknown as Record<string, IconGeometry>)[key] ?? (F as unknown as Record<string, IconGeometry>)[key];

const page = (title: string, width: number, body: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{font:12px/1.3 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;color:#1f2329;background:#fff;width:${width}px;padding:16px}
  h1{font-size:15px;font-weight:600;margin:0 0 12px}
  .grid{display:grid;gap:8px}
  .cell{border:1px solid #e5e7eb;border-radius:6px;padding:8px;display:flex;gap:10px;align-items:center;min-width:0}
  .sw{display:flex;gap:6px;align-items:center;padding:6px;border-radius:5px}
  .white{background:#fff;border:1px solid #eef0f2}.card{background:#f4f5f7}.dark{background:#1f232a;color:#ff7a1a}
  .meta{min-width:0;overflow:hidden}
  .id{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .nm{color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tag{font-size:11px;color:#6b7280;white-space:nowrap}
  .fallback .tag b{color:#b45309}.generic .tag b{color:#b91c1c}.close .tag b{color:#7c3aed}
  .ok b{color:#047857}
</style></head><body><h1>${esc(title)}</h1>${body}</body></html>`;

interface Entry { id: string; name: string; icon: string; status: string }
function catalogEntries(): Entry[] {
  const out: Entry[] = [];
  for (const f of ['products.json', 'offerings.json']) {
    const doc = JSON.parse(readFileSync(join(repo, 'packages/core/catalog', f), 'utf8')) as { entries: Entry[] };
    out.push(...doc.entries);
  }
  return out;
}

function catalogPages(): Array<{ name: string; html: string; width: number }> {
  const entries = catalogEntries();
  const per = 48, width = 1560;
  const pages: Array<{ name: string; html: string; width: number }> = [];
  for (let p = 0; p * per < entries.length; p++) {
    const slice = entries.slice(p * per, (p + 1) * per);
    const cells = slice.map((e) => {
      const ic = iconFor(e.id, e.icon);
      const own = hasOwnIcon(e.id);
      const sizes = [16, 24, 40];
      const sw = (cls: string, color: string) => `<div class="sw ${cls}">${sizes.map((s) => iconSvg(ic.geometry, { size: s, color })).join('')}</div>`;
      const cls = `${ic.source} ${ic.confidence === 'exact' && ic.source === 'official' ? 'ok' : ic.confidence}`;
      return `<div class="cell ${cls}">${sw('white', ORANGE)}${sw('card', ORANGE)}${sw('dark', '#ff7a1a')}<div class="meta"><div class="id">${esc(e.id)}${e.status !== 'ga' ? ` <span class="tag">(${esc(e.status)})</span>` : ''}</div><div class="nm">${esc(e.name)}</div><div class="tag"><b>${ic.source}</b> · ${ic.confidence} · ${esc(ic.key)}${own ? '' : ' · FAMILY DEFAULT'}</div></div></div>`;
    }).join('');
    const n = String(p + 1).padStart(2, '0');
    pages.push({ name: `catalog-${n}.png`, width, html: page(`Catalog icons ${p * per + 1}-${p * per + slice.length} of ${entries.length} · 16 / 24 / 40 px on white, light card, dark card`, width, `<div class="grid" style="grid-template-columns:repeat(3,1fr)">${cells}</div>`) });
  }
  return pages;
}

function officialPages(): Array<{ name: string; html: string; width: number }> {
  const keys = O.OFFICIAL_KEYS;
  const per = 72, width = 1500;
  const pages: Array<{ name: string; html: string; width: number }> = [];
  for (let p = 0; p * per < keys.length; p++) {
    const slice = keys.slice(p * per, (p + 1) * per);
    const cells = slice.map((k) => {
      const g = geometryOf(k)!;
      const name = (g as unknown as { name: string }).name;
      return `<div class="cell"><div class="sw white">${iconSvg(g, { size: 40, color: ORANGE })}${iconSvg(g, { size: 16, color: ORANGE })}</div><div class="meta"><div class="id">${esc(k)}</div><div class="nm">${esc(name)}</div></div></div>`;
    }).join('');
    const n = String(p + 1).padStart(2, '0');
    pages.push({ name: `official-${n}.png`, width, html: page(`Official icons ${p * per + 1}-${p * per + slice.length} of ${keys.length}`, width, `<div class="grid" style="grid-template-columns:repeat(6,1fr)">${cells}</div>`) });
  }
  return pages;
}

function fallbackPages(): Array<{ name: string; html: string; width: number }> {
  const width = 1500;
  const neighbours = ['ecs', 'oss', 'vpc', 'polardb', 'waf', 'kvstore'].filter((k) => geometryOf(k));
  const row = (g: IconGeometry, label: string, sub: string) => `<div class="cell"><div class="sw white">${[96, 40, 24, 16].map((s) => iconSvg(g, { size: s, color: ORANGE })).join('')}</div><div class="sw dark">${[40, 16].map((s) => iconSvg(g, { size: s, color: '#ff7a1a' })).join('')}</div><div class="meta"><div class="id">${esc(label)}</div><div class="nm">${esc(sub)}</div></div></div>`;
  const ref = neighbours.map((k) => row(geometryOf(k)!, `official: ${k}`, (geometryOf(k) as unknown as { name: string }).name)).join('');
  const fb = F.FALLBACK_KEYS.map((k) => row(geometryOf(k)!, `fallback: ${k}`, (geometryOf(k) as unknown as { name: string }).name)).join('');
  const logos = (['en', 'zh'] as const).map((l) => `<div class="cell" style="grid-column:1/-1"><div class="sw white"><img src="${pathToFileURL(join(web, 'public', LOGOS[l].file)).href}" style="height:40px"><img src="${pathToFileURL(join(web, 'public', LOGOS[l].file)).href}" style="height:20px"></div><div class="sw dark"><img src="${pathToFileURL(join(web, 'public', LOGOS[l].file)).href}" style="height:28px"></div><div class="meta"><div class="id">logo ${l}</div><div class="nm">${esc(LOGOS[l].file)} · ${LOGOS[l].colors.join(', ')}</div></div></div>`).join('');
  return [{ name: 'fallback.png', width, html: page(`Fallback glyphs (${F.FALLBACK_KEYS.length}) beside official references, 96 / 40 / 24 / 16 px; logos`, width, `<div class="grid" style="grid-template-columns:repeat(2,1fr)">${logos}${ref}${fb}</div>`) }];
}

async function main() {
  const req = createRequire(join(repo, 'spikes/canvas/package.json'));
  const mod = (await import(pathToFileURL(req.resolve('puppeteer-core')).href)) as { default: { launch(o: object): Promise<any> } };
  const puppeteer = mod.default;
  const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].filter(Boolean) as string[];
  const { existsSync } = await import('node:fs');
  const executablePath = candidates.find((c) => existsSync(c));
  if (!executablePath) throw new Error('Chrome not found; set CHROME_PATH');
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--allow-file-access-from-files'] });
  try {
    const pages = [
      ...(only.has('catalog') ? catalogPages() : []),
      ...(only.has('official') ? officialPages() : []),
      ...(only.has('fallback') ? fallbackPages() : []),
    ];
    const written: string[] = [];
    const htmlDir = mkdtempSync(join(tmpdir(), 'icon-contact-'));
    for (const p of pages) {
      const tab = await browser.newPage();
      await tab.setViewport({ width: p.width, height: 800, deviceScaleFactor: 1 });
      const htmlPath = join(htmlDir, p.name.replace(/\.png$/, '.html'));
      writeFileSync(htmlPath, p.html);
      await tab.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
      const file = join(outDir, p.name);
      await tab.screenshot({ path: file, fullPage: true });
      await tab.close();
      written.push(file);
    }
    rmSync(htmlDir, { recursive: true, force: true });
    console.log(written.join('\n'));
  } finally {
    await browser.close();
  }
}

await main();
