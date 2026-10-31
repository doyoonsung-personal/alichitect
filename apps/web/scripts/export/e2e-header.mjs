// The export control in the header at the widths the app supports: no wrapping, no overlap, the dialog inside the window.
//   node scripts/export/e2e-header.mjs [http://localhost:5185]
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] ?? 'http://localhost:5185';
const out = path.resolve(here, '../../screenshots/export/browser');
mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
let bad = 0;
for (const [lang, fixture] of [['en', 'ha'], ['ko', 'korean'], ['zh', 'chinese']]) {
  for (const width of [1280, 1024, 760, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 720 });
    await page.evaluateOnNewDocument(() => localStorage.clear());
    await page.goto(`${base}/?replay=${fixture}&speed=instant&lang=${lang}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.cv-card', { timeout: 20000 });
    await sleep(500);
    const m = await page.evaluate(() => {
      const b = document.querySelector('.xp > button');
      const h = document.querySelector('.header');
      const r = b.getBoundingClientRect();
      const hr = h.getBoundingClientRect();
      const kids = [...document.querySelectorAll('.header__right > *')].map((e) => e.getBoundingClientRect());
      let overlap = false;
      for (let i = 1; i < kids.length; i++) if (kids[i].left < kids[i - 1].right - 0.5) overlap = true;
      return { x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), headerH: Math.round(hr.height), right: Math.round(r.right), overlap, scrollX: document.documentElement.scrollWidth > innerWidth, label: b.textContent, vis: getComputedStyle(b.querySelector('span')).position };
    });
    await page.click('.xp > button');
    await page.waitForSelector('.xp__panel');
    const p = await page.evaluate(() => {
      const r = document.querySelector('.xp__panel').getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom), inside: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
    });
    const ok = m.h === 32 && m.headerH === 48 && !m.overlap && !m.scrollX && p.inside;
    if (!ok) bad++;
    console.log(lang, width, ok ? 'ok ' : 'BAD', JSON.stringify(m), JSON.stringify(p));
    if (width === 1280 || width === 390) await page.screenshot({ path: path.join(out, `header-${lang}-${width}.png`), clip: { x: 0, y: 0, width, height: 400 } });
    await page.close();
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
