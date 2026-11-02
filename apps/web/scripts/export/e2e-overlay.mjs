// The proposal overlay in the real app (headless Chrome): screenshots of the in-progress and failure states in light and
// dark, at 1440x900 and 1040x800, in English and Korean, plus the behaviour around them: the dialog is modal and the
// workspace inert, Escape does not stop the writing, Stop aborts and downloads nothing, a finished draft downloads a PDF
// with the business sections (twice in a row, long after the click), and a replay offers the basic version.
// No server is needed: /api/health and /api/proposal are stubbed in the page (fetch is replaced before the app loads),
// and the drafted sections come from scripts/export/drafts/. Run against your own Vite dev server on 5185-5199:
//   npx vite --port 5186 --strictPort     (in apps/web)
//   node --import ./scripts/alias.mjs scripts/export/e2e-overlay.mjs [http://localhost:5186]
// Output: screenshots/export/overlay/*.png. Exit code 1 when a behaviour check fails.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { inspectPdf } from './inspect.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] ?? 'http://localhost:5186';
const out = path.resolve(here, '../../screenshots/export/overlay');
const dl = path.join(out, 'downloads');
rmSync(out, { recursive: true, force: true });
mkdirSync(dl, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const draftOf = (id) => JSON.parse(readFileSync(path.join(here, 'drafts', `${id}.json`), 'utf8'));
const LANGS = {
  en: { fixture: 'residency', draft: draftOf('residency-en'), title: 'Customer portal', customer: 'Acme Pay Pte Ltd', quota: "You have used today's 30 turns, and writing a proposal counts as one. The limit resets at 00:00 UTC. You can still download the basic version." },
  ko: { fixture: 'korean', draft: draftOf('korean-ko'), title: '배달 앱 제안서', customer: '한빛푸드', quota: '오늘의 요청 30회를 모두 사용했습니다(제안서 작성도 1회로 계산됩니다). 제한은 00:00 UTC에 초기화됩니다. 기본 버전은 계속 다운로드할 수 있습니다.' },
};

/** The sections a draft streams, in the writer's order. */
function sectionsOf(d) {
  return [
    { k: 'exec', text: d.exec },
    ...d.needs.map((n) => ({ k: 'need', ...n })),
    ...d.outcomes.map((o) => ({ k: 'outcome', ...o })),
    ...Object.entries(d.why).map(([product, text]) => ({ k: 'why', product, text })),
    ...d.tradeoffs.map((t) => ({ k: 'tradeoff', ...t })),
    ...d.next.map((text) => ({ k: 'next', text })),
  ].map((section) => ({ type: 'section', section }));
}

/**
 * Scenarios for the stubbed POST /api/proposal, as [delay ms, event] lists. 'hang' keeps the stream open after the
 * last event (the in-progress shots); a status event shows the quiet "taking longer" note.
 */
function scenario(kind, l) {
  const secs = sectionsOf(l.draft);
  if (kind === 'progress') return { events: secs.slice(0, 1 + l.draft.needs.length + l.draft.outcomes.length + 5).map((e) => [180, e]), hang: true };
  if (kind === 'slow') return { events: [...secs.slice(0, 3).map((e) => [150, e]), [100, { type: 'status', code: 'retry', text: '' }]], hang: true };
  // cut off before 'done': retryable, so all three ways forward show
  if (kind === 'failed') return { events: secs.slice(0, 4).map((e) => [150, e]), hang: false };
  // refused before writing (today's turns are used up): the Worker's proposal copy (fatal.proposal-quota-exceeded),
  // not retryable as apps/worker/src/proposal.ts sends it, so the server's own words and no Try again
  if (kind === 'quota') return { events: [[150, { type: 'fatal', code: 'quota-exceeded', message: l.quota, retryable: false }]], hang: false };
  if (kind === 'done') return { events: [...secs.map((e) => [40, e]), [6000, { type: 'done', draft: l.draft }]], hang: false };
  return { events: [], hang: true };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const problems = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) problems.push(what);
};

async function openApp({ lang, theme, width, height, kind, replay = false }) {
  const l = LANGS[lang];
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await page.evaluateOnNewDocument(
    (theme, sc) => {
      localStorage.clear();
      localStorage.setItem('ab.theme', theme);
      const real = window.fetch.bind(window);
      const enc = new TextEncoder();
      window.__proposalCalls = 0;
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.endsWith('/api/health')) return new Response(JSON.stringify({ ok: true, catalog: { version: '2026-10-31' }, limits: { askChars: 4000 }, keyConfigured: true }), { headers: { 'Content-Type': 'application/json' } });
        if (!url.endsWith('/api/proposal')) return real(input, init);
        window.__proposalCalls++;
        const signal = init?.signal;
        const body = new ReadableStream({
          async start(ctl) {
            let dead = false;
            signal?.addEventListener('abort', () => {
              dead = true;
              try {
                ctl.error(new DOMException('The operation was aborted.', 'AbortError'));
              } catch {}
            });
            for (const [ms, ev] of sc.events) {
              await new Promise((r) => setTimeout(r, ms));
              if (dead) return;
              ctl.enqueue(enc.encode(JSON.stringify(ev) + '\n'));
            }
            if (!sc.hang && !dead) ctl.close();
          },
        });
        return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } });
      };
    },
    theme,
    scenario(kind, l),
  );
  await page.goto(`${base}/?replay=${l.fixture}&speed=instant&lang=${lang}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.cv-card', { timeout: 20000 });
  await sleep(600);
  // keep the drawn session but leave replay mode, so the export talks to the (stubbed) server
  if (!replay) await page.evaluate(() => window.__ab.store.dispatch({ type: 'replay/set', replay: null }));
  await sleep(200);
  return { page, errors, l };
}

let exports = 0;
/** Opens the dialog and downloads, with a title of its own, so no download can overwrite (and hide) another. */
async function startExport(page, l, open = true) {
  if (open) {
    await (await page.waitForSelector('.xp > button:not([disabled])')).click();
    await page.waitForSelector('.xp__panel');
  }
  const inputs = await page.$$('.xp__input');
  await inputs[0].click();
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.type(`${l.title} ${++exports}`);
  if (open) await inputs[1].type(l.customer);
  await page.click('.xp__actions .btn--primary');
  await page.waitForSelector('.dov__panel');
}

const pdfs = () => readdirSync(dl).filter((n) => n.endsWith('.pdf'));

// ---------- screenshots: in progress and failed, light and dark, two sizes, en and ko ----------
for (const lang of ['en', 'ko']) {
  for (const theme of ['light', 'dark']) {
    for (const [width, height] of [[1440, 900], [1040, 800]]) {
      for (const kind of ['progress', 'failed']) {
        const { page, errors, l } = await openApp({ lang, theme, width, height, kind });
        await startExport(page, l);
        await sleep(kind === 'progress' ? 3600 : 1400);
        const name = `overlay-${kind}-${lang}-${theme}-${width}x${height}.png`;
        await page.screenshot({ path: path.join(out, name) });
        if (errors.length) check(false, `${name}: page errors ${errors.join('; ')}`);
        await page.close();
      }
    }
  }
}

// ---------- behaviour ----------
{
  // modal: role, focus inside, the workspace inert; Escape does nothing while writing; Stop aborts and downloads nothing
  const { page, l } = await openApp({ lang: 'en', theme: 'light', width: 1440, height: 900, kind: 'progress' });
  await startExport(page, l);
  await sleep(1500);
  const m = await page.evaluate(() => {
    const d = document.querySelector('.dov__panel');
    return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), focusInside: d.contains(document.activeElement), inert: document.getElementById('root').hasAttribute('inert'), steps: [...document.querySelectorAll('.dov__step')].map((s) => s.dataset.status[0]).join('') };
  });
  check(m.role === 'dialog' && m.modal === 'true', 'the overlay is a modal dialog');
  check(m.focusInside, 'focus moves into the overlay');
  check(m.inert, 'the workspace behind is inert');
  check(/^d+a/.test(m.steps), `steps advance with the sections (${m.steps})`);
  await page.keyboard.press('Escape');
  await sleep(300);
  check(!!(await page.$('.dov__panel')), 'Escape does not stop the writing');
  // Tab stays inside: the only control while writing is Stop
  await page.keyboard.press('Tab');
  check(await page.evaluate(() => document.activeElement?.closest('.dov__panel') !== null), 'Tab stays in the overlay');
  await page.screenshot({ path: path.join(out, 'behaviour-progress-en.png') });
  const before = pdfs().length;
  await page.click('.dov__actions .btn--secondary');
  await sleep(500);
  const after = await page.evaluate(() => ({ gone: !document.querySelector('.dov'), note: document.querySelector('.xp__note')?.textContent ?? '', inert: document.getElementById('root').hasAttribute('inert'), focus: document.activeElement?.closest('.xp__actions') !== null }));
  check(after.gone && !after.inert, 'Stop closes the overlay and the workspace is usable again');
  check(after.note.includes('Stopped') && after.note.includes('Nothing was downloaded'), `the dialog says it stopped (${after.note})`);
  check(after.focus, 'focus returns to the Download button');
  await sleep(1500);
  check(pdfs().length === before, 'nothing downloads after Stop');
  await page.screenshot({ path: path.join(out, 'behaviour-stopped-en.png'), clip: { x: 640, y: 0, width: 800, height: 440 } });
  await page.close();
}
for (const lang of ['en', 'ko']) {
  // a quota refusal shows the server's message and offers no Try again
  const { page, l } = await openApp({ lang, theme: 'light', width: 1440, height: 900, kind: 'quota' });
  await startExport(page, l);
  await sleep(900);
  const q = await page.evaluate(() => ({ text: document.querySelector('.dov__hint')?.textContent ?? '', buttons: document.querySelectorAll('.dov__actions button').length }));
  check(q.text === l.quota && q.buttons === 2, `${lang}: quota shows the server message, with Download basic version and Close only`);
  await page.screenshot({ path: path.join(out, `overlay-quota-${lang}-light-1440x900.png`) });
  await page.close();
}
{
  // a slow draft shows only the quiet note
  const { page, l } = await openApp({ lang: 'en', theme: 'light', width: 1440, height: 900, kind: 'slow' });
  await startExport(page, l);
  await sleep(1500);
  const slow = await page.$eval('.dov__panel', (d) => d.textContent);
  check(slow.includes('Taking a little longer'), 'a status event shows "Taking a little longer"');
  await page.screenshot({ path: path.join(out, 'overlay-slow-en-light-1440x900.png') });
  await page.close();
}
{
  // a finished draft downloads a PDF with the business sections, about 6 s after the last section; then a second one
  const { page, l } = await openApp({ lang: 'en', theme: 'light', width: 1440, height: 900, kind: 'done' });
  for (const round of [1, 2]) {
    const before = pdfs().length;
    await startExport(page, l, round === 1);
    let file = null;
    for (let i = 0; i < 300 && !file; i++) {
      await sleep(100);
      if (round === 1 && i === 45) await page.screenshot({ path: path.join(out, 'behaviour-layout-en.png') });
      const names = pdfs();
      if (names.length > before) file = names.find((n) => !n.endsWith('.crdownload')) ?? null;
    }
    check(!!file, `round ${round}: the PDF downloads after the draft is written (well after the click)`);
    if (round === 1) {
      await sleep(200);
      await page.screenshot({ path: path.join(out, 'behaviour-ready-en.png') });
    }
    await sleep(1500);
    const s = await page.evaluate(() => ({ gone: !document.querySelector('.dov'), note: document.querySelector('.xp__note')?.textContent ?? '' }));
    check(s.gone && s.note.startsWith('Downloaded'), `round ${round}: the overlay closes and the dialog notes the download (${s.note})`);
    if (file && round === 1) {
      const info = await inspectPdf(new Uint8Array(readFileSync(path.join(dl, file))));
      check(info.text.includes('Executive summary') && info.text.includes('What you told us') && info.text.includes('Design record'), 'the downloaded PDF leads with the drafted sections');
    }
  }
  await page.close();
}
{
  // a replay has no server to write with: it says so and offers the basic version, which downloads
  for (const theme of ['light', 'dark']) {
    const { page, l } = await openApp({ lang: 'en', theme, width: 1440, height: 900, kind: 'none', replay: true });
    await startExport(page, l);
    await sleep(500);
    const u = await page.evaluate(() => ({ title: document.querySelector('.dov__title')?.textContent, calls: window.__proposalCalls, focus: document.activeElement?.textContent }));
    check(u.calls === 0 && /not available/.test(u.title ?? ''), `replay: no request, "${u.title}"`);
    check((u.focus ?? '').includes('Download basic version'), 'replay: focus lands on Download basic version');
    await page.screenshot({ path: path.join(out, `overlay-unavailable-en-${theme}-1440x900.png`) });
    if (theme === 'light') {
      const before = pdfs().length;
      await page.click('.dov__actions .btn--primary');
      let ok = false;
      for (let i = 0; i < 100 && !ok; i++) {
        await sleep(100);
        ok = pdfs().length > before;
      }
      check(ok, 'replay: the basic version downloads');
      await sleep(1500);
      const note = await page.$eval('.xp__note', (n) => n.textContent);
      check(note.includes('basic version'), `replay: the dialog says it was the basic version (${note})`);
    }
    await page.close();
  }
}

await browser.close();
console.log(problems.length ? `${problems.length} problem(s)` : 'all checks passed', '\noutput:', out);
process.exit(problems.length ? 1 : 0);
