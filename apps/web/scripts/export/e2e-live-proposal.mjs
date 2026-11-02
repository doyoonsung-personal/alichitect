// The proposal flow against the real servers (headless Chrome, real Qwen): a real ask draws the diagram, Export proposal
// then Download writes the narrative live (overlay shots mid-draft) and downloads a PDF that leads with the drafted
// sections; a second Download is stopped mid-draft (the overlay closes, nothing downloads), and a new turn starts right
// after it (the slot is free). Starts nothing: run the turn server (node apps/server/src/main.ts, 8787) and Vite
// (npm --prefix apps/web run dev, 5174) first.
//   node --import ./scripts/alias.mjs scripts/export/e2e-live-proposal.mjs [http://localhost:5174]
// Output: screenshots/export/live/*.png and downloads/. Prints one JSON line per step. Exit code 1 when a check fails.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { inspectPdf } from './inspect.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] ?? 'http://localhost:5174';
const out = path.resolve(here, '../../screenshots/export/live');
const dl = path.join(out, 'downloads');
rmSync(out, { recursive: true, force: true });
mkdirSync(dl, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const ev = (name, extra = {}) => console.log(JSON.stringify({ t: Date.now() - T0, name, ...extra }));
const problems = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) problems.push(what);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// what the browser receives from /api/proposal: kept to prove the draft in the PDF is this run's
await page.evaluateOnNewDocument(() => {
  if (!sessionStorage.getItem('qa-init')) {
    localStorage.clear();
    localStorage.setItem('ab.lang', 'en');
    sessionStorage.setItem('qa-init', '1');
  }
  const real = window.fetch.bind(window);
  window.__proposal = { calls: 0, lines: [] };
  window.fetch = async (input, init) => {
    const res = await real(input, init);
    const url = typeof input === 'string' ? input : input.url;
    if (!url.endsWith('/api/proposal') || !res.body) return res;
    window.__proposal.calls++;
    const [a, b] = res.body.tee();
    (async () => {
      const r = b.getReader();
      const dec = new TextDecoder();
      let buf = '';
      try {
        for (;;) {
          const { value, done } = await r.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            window.__proposal.lines.push(buf.slice(0, i));
            buf = buf.slice(i + 1);
          }
        }
      } catch {}
    })();
    return new Response(a, { status: res.status, statusText: res.statusText, headers: res.headers });
  };
});

const state = () =>
  page.evaluate(() => {
    const s = window.__ab.store.getState();
    const r = s.session.revisions.at(-1);
    return { revs: s.session.revisions.length, status: r?.status ?? null, error: r?.error ?? null, cards: s.display.layout ? Object.keys(s.display.layout.cards).length : 0, turn: s.turn.phase };
  });

async function ask(text, max = 180000) {
  const before = await state();
  // the first ask goes in the landing brief, later ones in the console
  const input = (await page.$('.brief__input')) ? '.brief__input' : '.console textarea';
  await page.focus(input);
  await page.type(input, text, { delay: 2 });
  await page.keyboard.press('Enter');
  const t0 = Date.now();
  for (;;) {
    await sleep(250);
    const s = await state();
    if (s.revs > before.revs && (s.status === 'done' || s.status === 'failed' || s.error)) return { ...s, ms: Date.now() - t0 };
    if (Date.now() - t0 > max) return { ...s, ms: Date.now() - t0, timeout: true };
  }
}

const pdfs = () => readdirSync(dl).filter((n) => n.endsWith('.pdf'));

async function openExport(title, customer) {
  await (await page.waitForSelector('.xp > button:not([disabled])')).click();
  await page.waitForSelector('.xp__panel');
  const inputs = await page.$$('.xp__input');
  const fill = async (el, text) => {
    await el.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await el.type(text);
  };
  await fill(inputs[0], title);
  await fill(inputs[1], customer);
  await page.click('.xp__actions .btn--primary');
  await page.waitForSelector('.dov__panel');
}

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('.brief__input, .console textarea', { timeout: 90000 });

// ---------- 1: a real turn ----------
const t1 = await ask('We run an online grocery in Jakarta. Our checkout crashes during weekend promos and customers abandon carts. Design it on Alibaba Cloud.');
ev('turn-1', t1);
check(t1.status === 'done' && t1.cards > 3, `the first turn draws a diagram (${t1.cards} cards, ${t1.ms} ms)`);
await sleep(800);
await page.screenshot({ path: path.join(out, '01-diagram.png') });

// ---------- 2: Download writes the narrative live, then downloads ----------
let before = pdfs().length;
const d0 = Date.now();
await openExport('Promo-proof checkout in Jakarta', 'Segar Grocer');
const shots = [[3000, '02-overlay-3s'], [9000, '03-overlay-9s'], [16000, '04-overlay-16s']];
let file = null;
let si = 0;
while (!file && Date.now() - d0 < 240000) {
  await sleep(200);
  const el = Date.now() - d0;
  if (si < shots.length && el >= shots[si][0]) {
    if (await page.$('.dov__panel')) await page.screenshot({ path: path.join(out, `${shots[si][1]}.png`) });
    si++;
  }
  const names = pdfs();
  if (names.length > before) file = names.find((n) => !n.endsWith('.crdownload')) ?? null;
}
const drafted = await page.evaluate(() => window.__proposal.lines.map((l) => JSON.parse(l)));
const last = drafted.at(-1);
ev('draft-1', { ms: Date.now() - d0, lines: drafted.length, sections: drafted.filter((e) => e.type === 'section').length, statuses: drafted.filter((e) => e.type === 'status').map((e) => e.code), last: last?.type, complete: last?.draft?.complete });
check(last?.type === 'done', `the stream ends with done (${last?.type})`);
check(!!file, `a PDF downloads after the draft (${file})`);
if (file) {
  await sleep(300);
  const info = await inspectPdf(new Uint8Array(readFileSync(path.join(dl, file))));
  const execFirst = (last?.draft?.exec ?? '').split('\n')[0].slice(0, 50);
  const squash = (s) => s.replace(/\s+/g, '');
  check(info.text.includes('Executive summary') && info.text.includes('What you told us') && info.text.includes('Design record'), 'the PDF leads with the drafted sections');
  check(!!execFirst && squash(info.text).includes(squash(execFirst)), `the PDF holds this run's executive summary ("${execFirst}")`);
  const wire = JSON.stringify(drafted);
  check(!/claude|anthropic|qwen|opus|sonnet|haiku|provider|servedBy/i.test(wire), 'nothing on the wire names a provider or model');
  check(!/claude|anthropic/i.test(info.text.replace(/Claude Code/g, '')), 'the PDF names no backend vendor');
}
await sleep(1500);
const note1 = await page.evaluate(() => ({ gone: !document.querySelector('.dov'), note: document.querySelector('.xp__note')?.textContent ?? '' }));
check(note1.gone && note1.note.startsWith('Downloaded'), `the overlay closes and the dialog notes the file (${note1.note})`);
await page.screenshot({ path: path.join(out, '05-downloaded.png') });
await page.keyboard.press('Escape');
await sleep(400);

// ---------- 3: Stop mid-draft ----------
before = pdfs().length;
const callsBefore = await page.evaluate(() => window.__proposal.calls);
await openExport('Promo-proof checkout in Jakarta (stopped)', '');
await page.waitForFunction(() => window.__proposal.lines.some((l, i) => i > 0 && l.includes('"section"')), { timeout: 60000 }).catch(() => undefined);
await sleep(5000);
await page.screenshot({ path: path.join(out, '06-before-stop.png') });
const stopAt = Date.now();
await page.click('.dov__actions .btn--secondary');
await sleep(600);
const stopped = await page.evaluate(() => ({ gone: !document.querySelector('.dov'), note: document.querySelector('.xp__note')?.textContent ?? '', inert: document.getElementById('root').hasAttribute('inert'), calls: window.__proposal.calls }));
ev('stop', { afterMs: stopAt, ...stopped });
check(stopped.calls === callsBefore + 1, 'the second Download sent one request');
check(stopped.gone && !stopped.inert, 'Stop closes the overlay and the workspace is usable');
check(/Stopped/.test(stopped.note) && /Nothing was downloaded/.test(stopped.note), `the dialog says it stopped (${stopped.note})`);
await page.screenshot({ path: path.join(out, '07-stopped.png') });
await sleep(3000);
check(pdfs().length === before, 'nothing downloads after Stop');
await page.keyboard.press('Escape');
await sleep(300);

// ---------- 4: a new turn right after (the slot is free) ----------
const t2 = await ask('Also add a web application firewall in front of the storefront.');
ev('turn-2', t2);
check(t2.status === 'done' && !t2.error, `a new turn starts and commits right after Stop (${t2.status}, ${t2.ms} ms${t2.error ? ', ' + JSON.stringify(t2.error) : ''})`);
await page.screenshot({ path: path.join(out, '08-turn-after-stop.png') });

if (errors.length) check(false, `page errors: ${errors.join('; ')}`);
await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall checks pass');
console.log('output:', out);
process.exit(problems.length ? 1 : 0);
