// End-to-end check against the real turn server: landing -> submit -> a streamed turn -> commit -> a follow-up.
// Starts nothing itself: run the server (PORT=5199 ALLOWED_ORIGINS=http://127.0.0.1:5198 node apps/server/src/main.ts) and
// Vite (API_TARGET=http://127.0.0.1:5199 vite --port 5198), then: node scripts/e2e-live.mjs http://127.0.0.1:5198
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://127.0.0.1:5174';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../screenshots');
mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.evaluateOnNewDocument(() => localStorage.clear());
await page.goto(url, { waitUntil: 'networkidle0' });
const state = () => page.evaluate(() => {
  const s = window.__ab.store.getState();
  const r = s.session.revisions.at(-1);
  return { view: s.view, mode: s.conn.mode, turn: s.turn.phase, rev: r ? { n: r.n, status: r.status, note: r.note.slice(0, 80), lines: r.changes.length, error: r.error } : null, cards: s.display.layout ? Object.keys(s.display.layout.cards).length : 0, reqs: s.session.memory.requirements.length };
});
await sleep(800);
console.log('boot', JSON.stringify(await state()));

// IME: Enter while composing must not submit
const client = await page.createCDPSession();
await page.focus('.brief__input');
await client.send('Input.imeSetComposition', { text: '데이터', selectionStart: 3, selectionEnd: 3 });
await page.keyboard.press('Enter');
await sleep(300);
console.log('after Enter while composing (ko):', (await state()).view);
await client.send('Input.insertText', { text: '데이터' });
await page.evaluate(() => { const t = document.querySelector('.brief__input'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, ''); t.dispatchEvent(new Event('input', { bubbles: true })); });

const ask = 'We run an online store in Southeast Asia with about 30,000 daily users and big sales peaks. Design a highly available web architecture.';
await page.type('.brief__input', ask);
const t0 = Date.now();
await page.keyboard.press('Enter');
let first = null;
let done = null;
for (let i = 0; i < 400; i++) {
  await sleep(250);
  const s = await state();
  if (first === null && s.cards > 0) first = Date.now() - t0;
  if (i === 16) await page.screenshot({ path: path.join(out, 'live-streaming-1440x900.png') });
  if (s.rev && (s.rev.status === 'done' || s.rev.status === 'failed')) { done = Date.now() - t0; break; }
}
console.log('first card ms', first, 'done ms', done, JSON.stringify(await state()));
await page.screenshot({ path: path.join(out, 'live-done-1440x900.png') });

// follow-up through the composer
await page.type('.console textarea', 'oh i also want waf');
await page.keyboard.press('Enter');
for (let i = 0; i < 200; i++) {
  await sleep(250);
  const s = await state();
  if (s.rev && s.rev.n === 2 && (s.rev.status === 'done' || s.rev.status === 'failed')) break;
}
console.log('follow-up', JSON.stringify(await state()));
await page.screenshot({ path: path.join(out, 'live-followup-1440x900.png') });
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ab.sessions.v1') ?? '{}').sessions?.length ?? 0);
console.log('saved sessions', saved, 'page errors', JSON.stringify(errors));
await browser.close();
