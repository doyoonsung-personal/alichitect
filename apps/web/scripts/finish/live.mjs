// Finish QA, part 1: the real flow against a live turn server with real Qwen turns.
//   node scripts/finish/live.mjs <web url> [--out screenshots/finish/live]
// Starts nothing: run the server (PORT=8790 ALLOWED_ORIGINS=<web origin> node apps/server/src/main.ts) and
// Vite (API_TARGET=http://127.0.0.1:8790 vite --port 5190) first. Prints the transcript (events and timings only) as JSON.
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '../..');
const url = process.argv[2] ?? 'http://localhost:5190';
const oi = process.argv.indexOf('--out');
const OUT = path.resolve(WEB, oi > 0 ? process.argv[oi + 1] : 'screenshots/finish/live');
const DL = path.join(OUT, 'pdf');
mkdirSync(DL, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });
const errors = [];
const consoleErrors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
const log = [];
const T0 = Date.now();
const ev = (name, extra = {}) => { const e = { t: Date.now() - T0, name, ...extra }; log.push(e); console.log(JSON.stringify(e)); };
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); ev('shot', { name }); };

const state = () => page.evaluate(() => {
  const s = window.__ab.store.getState();
  const rs = s.session.revisions;
  const r = rs.at(-1);
  return {
    view: s.view, mode: s.conn.mode, turn: s.turn.phase, lang: s.lang, title: s.session.title,
    revs: rs.length,
    rev: r ? { n: r.n, status: r.status, note: r.note.slice(0, 160), lines: r.changes.map((c) => `${c.kind}:${c.name}${c.fromName ? '<-' + c.fromName : ''}`).slice(0, 12), nChanges: r.changes.length, error: r.error ?? null, ms: r.durationMs ?? null } : null,
    cards: s.display.layout ? Object.keys(s.display.layout.cards).length : 0,
    reqs: rs.flatMap((x) => x.reqs).slice(0, 8),
    assumptions: (s.session.memory.assumptions ?? []).length,
    questions: (s.session.memory.questions ?? []).length,
  };
});

async function runTurn(label, input, text, { shots = [], max = 150000 } = {}) {
  await page.focus(input);
  await page.type(input, text, { delay: 4 });
  const before = await state();
  const t0 = Date.now();
  ev('submit', { label, text });
  await page.keyboard.press('Enter');
  let first = null, done = null, shotIdx = 0;
  const wanted = [...shots].sort((a, b) => a[0] - b[0]);
  while (Date.now() - t0 < max) {
    await sleep(120);
    const el = Date.now() - t0;
    while (shotIdx < wanted.length && el >= wanted[shotIdx][0]) { await shot(wanted[shotIdx][1]); shotIdx++; }
    const s = await state();
    if (first === null && s.cards > (before.cards ?? 0) && s.rev && s.rev.status !== 'done') { first = el; ev('first-card', { label, ms: el, cards: s.cards }); }
    if (s.rev && s.rev.n > before.revs && (s.rev.status === 'done' || s.rev.status === 'failed')) { done = el; break; }
    if (s.rev && s.rev.n > before.revs && s.rev.error) { done = el; break; }
  }
  await sleep(1200);
  const s = await state();
  ev('turn-done', { label, ms: done, firstCardMs: first, cards: s.cards, rev: s.rev, reqs: s.reqs, assumptions: s.assumptions, questions: s.questions });
  return s;
}

async function clickByText(re, scope = 'button') {
  return page.evaluate((src, sc) => {
    const rx = new RegExp(src, 'i');
    const b = [...document.querySelectorAll(sc)].find((x) => rx.test((x.textContent || '').trim()) && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  }, re.source, scope);
}

async function exportPdf(label) {
  const before = new Set(readdirSync(DL));
  ev('export-open', { label });
  if (!(await clickByText(/export|제안서/))) { ev('export-missing', { label }); return null; }
  await sleep(600);
  await shot(`export-dialog-${label}`);
  const t0 = Date.now();
  const ok = await page.evaluate(() => { const f = document.querySelector('.xp form'); const b = f && [...f.querySelectorAll('button')].find((x) => x.type === 'submit'); if (b) { b.click(); return true; } return false; });
  if (!ok) { ev('export-submit-missing', { label }); return null; }
  let file = null;
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    const now = readdirSync(DL).filter((f) => !before.has(f) && !f.endsWith('.crdownload'));
    if (now.length) { file = now[0]; break; }
  }
  ev('export-saved', { label, file, ms: Date.now() - t0 });
  await sleep(500);
  await shot(`export-done-${label}`);
  await page.keyboard.press('Escape');
  return file;
}

try {
  await page.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('qa-init')) { localStorage.clear(); localStorage.setItem('ab.lang', 'en'); sessionStorage.setItem('qa-init', '1'); } });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await sleep(1000);
  ev('boot', await state());
  await shot('01-landing');

  // 1. e-commerce
  const ask1 = 'Cross-border e-commerce for Southeast Asia with flash sales and an AI shopping assistant';
  await page.focus('.brief__input');
  await page.type('.brief__input', ask1, { delay: 3 });
  await shot('02-landing-typed');
  const t0 = Date.now();
  ev('submit', { label: 'ecommerce', text: ask1 });
  await page.keyboard.press('Enter');
  await sleep(140); await shot('03-handoff-mid');
  let first = null, done = null; const marks = [[2500, '04-stream-2s'], [6000, '05-stream-6s'], [11000, '06-stream-11s']]; let mi = 0;
  while (Date.now() - t0 < 150000) {
    await sleep(120);
    const el = Date.now() - t0;
    while (mi < marks.length && el >= marks[mi][0]) { await shot(marks[mi][1]); mi++; }
    const s = await state();
    if (first === null && s.cards > 0) { first = el; ev('first-card', { ms: el }); }
    if (s.rev && (s.rev.status === 'done' || s.rev.status === 'failed' || s.rev.error)) { done = el; break; }
  }
  await sleep(1500);
  const s1 = await state();
  ev('turn-done', { label: 'ecommerce', ms: done, firstCardMs: first, cards: s1.cards, rev: s1.rev, reqs: s1.reqs, assumptions: s1.assumptions, questions: s1.questions });
  await shot('07-ecommerce-done');

  // open products panel + popover
  await page.evaluate(() => { const h = document.querySelector('.pp__handle'); if (h) h.click(); });
  await sleep(700); await shot('08-panel-open');
  await page.evaluate(() => { const h = document.querySelector('.pp__handle'); if (h) h.click(); });
  await sleep(500);
  // hover a card
  const box = await page.evaluate(() => { const c = document.querySelector('.cv-card'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (box) { await page.mouse.move(box.x, box.y); await sleep(700); await shot('09-card-hover'); await page.mouse.move(700, 880); }

  // 2. follow-up
  await runTurn('waf', '.console textarea', 'oh i also want waf', { shots: [[2500, '10-waf-stream-2s'], [6000, '11-waf-stream-6s']] });
  await sleep(500); await shot('12-waf-done');

  // export (live e-commerce session)
  const pdf1 = await exportPdf('ecommerce');

  // 3. AI agent (new session)
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /new session|새 세션/i.test(x.textContent || '') && !x.disabled); b?.click(); });
  await sleep(900); await shot('13-newsession-landing');
  await runTurn('agent', '.brief__input', 'i need some AI agent that i can use with my team', { shots: [[3000, '14-agent-stream-3s'], [9000, '15-agent-stream-9s']] });
  await sleep(500); await shot('16-agent-done');
  const pdf2 = await exportPdf('agent');

  // 4. Korean
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /new session|새 세션/i.test(x.textContent || '') && !x.disabled); b?.click(); });
  await sleep(900);
  await page.evaluate(() => localStorage.setItem('ab.lang', 'ko'));
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1200);
  await shot('16b-ko-landing');
  const sk = await runTurn('korean', '.brief__input', '싱가포르에서 고객 데이터가 외부로 나가면 안 되는 핀테크 웹앱', { shots: [[3000, '17-ko-stream-3s'], [9000, '18-ko-stream-9s']] });
  await sleep(500); await shot('19-ko-done');

  // 5. refresh
  const beforeReload = await state();
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1800);
  const afterReload = await state();
  ev('refresh', { before: { view: beforeReload.view, title: beforeReload.title, revs: beforeReload.revs, cards: beforeReload.cards }, after: { view: afterReload.view, title: afterReload.title, revs: afterReload.revs, cards: afterReload.cards, reqs: afterReload.reqs } });
  await shot('20-after-refresh');
  const pdf3 = await exportPdf('korean-after-refresh');

  // sessions menu lists all three
  await clickByText(/sessions|세션 목록/);
  await sleep(500); await shot('21-sessions-menu');
  const sessionsSaved = await page.evaluate(() => JSON.parse(localStorage.getItem('ab.sessions.v1') ?? '{}').sessions?.length ?? 0);
  ev('summary', { pdfs: [pdf1, pdf2, pdf3], sessionsSaved, pageErrors: errors, consoleErrors });
} catch (e) {
  ev('FAILED', { message: String(e && e.stack || e).slice(0, 600) });
  try { await shot('zz-failure'); } catch { /* ignore */ }
} finally {
  await browser.close();
}
