// Drives the real app in headless Chrome: opens a recorded conversation (replay, no server and no Qwen), clicks
// "Export proposal", edits the dialog, downloads, and checks what came out. A replay has no server to write the
// proposal's narrative, so the overlay offers the basic version, which this downloads (scripts/export/e2e-overlay.mjs
// covers the written proposal with a stubbed server). Run against your own Vite on 5185-5199:
//   API_TARGET=http://127.0.0.1:8790 npx vite --port 5185 --strictPort     (in apps/web)
//   node --import ./scripts/alias.mjs scripts/export/e2e-browser.mjs [url] [fixture] [lang]
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { inspectPdf, renderPdf } from './inspect.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] ?? 'http://localhost:5185';
const fixture = process.argv[3] ?? 'residency';
const lang = process.argv[4] ?? 'en';
const outDir = path.resolve(here, '../../screenshots/export/browser');
const dl = path.join(outDir, 'downloads');
rmSync(dl, { recursive: true, force: true });
mkdirSync(dl, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
await page.evaluateOnNewDocument(() => {
  localStorage.clear();
  window.__prints = 0;
  window.print = () => void window.__prints++;
});
await page.goto(`${base}/?replay=${fixture}&speed=instant&lang=${lang}`, { waitUntil: 'networkidle0' });
await page.waitForSelector('.cv-card', { timeout: 20000 });
await sleep(800);

const trigger = await page.waitForSelector('.xp > button');
console.log('button disabled before open:', await trigger.evaluate((b) => b.disabled), '| label:', await trigger.evaluate((b) => b.textContent));
await page.screenshot({ path: path.join(outDir, `${fixture}-1-header.png`), clip: { x: 0, y: 0, width: 1440, height: 120 } });

await trigger.click();
await page.waitForSelector('.xp__panel');
await sleep(150);
const defaults = await page.evaluate(() => ({ title: document.querySelector('.xp__input')?.value, active: document.activeElement?.className }));
console.log('dialog defaults:', JSON.stringify(defaults));
await page.screenshot({ path: path.join(outDir, `${fixture}-2-dialog.png`), clip: { x: 640, y: 0, width: 800, height: 440 } });

// edit the title and add a customer
await page.click('.xp__input');
await page.keyboard.down('Control');
await page.keyboard.press('a');
await page.keyboard.up('Control');
await page.keyboard.type(lang === 'ko' ? '배달 앱 제안서' : lang === 'zh' ? '外卖应用方案' : 'Singapore customer portal');
const customerInput = (await page.$$('.xp__input'))[1];
await customerInput.type(lang === 'ko' ? '한빛푸드' : lang === 'zh' ? '星河餐饮' : 'Acme Pay Pte Ltd');
await page.click('.xp__actions .btn--primary');
await page.waitForSelector('.dov__panel');
await sleep(300);
console.log('overlay:', await page.$eval('.dov__title', (n) => n.textContent));
await page.screenshot({ path: path.join(outDir, `${fixture}-3-overlay.png`) });
const t0 = Date.now();
await page.click('.dov__actions .btn--primary');
let file = null;
for (let i = 0; i < 200; i++) {
  await sleep(100);
  const names = readdirSync(dl).filter((n) => n.endsWith('.pdf'));
  if (names.length) {
    file = names[0];
    break;
  }
}
const ms = Date.now() - t0;
await sleep(300);
console.log('download:', file, 'in', ms, 'ms; note:', await page.$eval('.xp__note', (n) => n.textContent));
await sleep(1200);
await page.screenshot({ path: path.join(outDir, `${fixture}-4-done.png`), clip: { x: 640, y: 0, width: 800, height: 440 } });
console.log('window.print calls:', await page.evaluate(() => window.__prints));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
if (!file) process.exit(1);

const bytes = new Uint8Array(readFileSync(path.join(dl, file)));
const info = await inspectPdf(bytes);
console.log('pdf:', bytes.length, 'bytes,', info.pages.length, 'pages; links', info.links.length, '; title', info.title);
console.log('cover text:', info.pages[0].text.replace(/\s+/g, ' ').slice(0, 160));
const pngs = await renderPdf(bytes, new URL(`file:///${outDir.replace(/\\/g, '/')}/`), `${fixture}-${lang}`, 1.2);
console.log(pngs.length, 'pages rendered');
