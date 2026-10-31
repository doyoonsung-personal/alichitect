// Draw first, then ask: screenshots and behaviour checks for the assumption chips and the follow-up questions, driven
// through the real UI against a fake drawing service that streams the synthetic fixtures asks-shop and asks-vague.
// Output: apps/web/screenshots/console/asks/. Own Vite and fake service on free ports in 5185-5199; both stopped at the end.
//   node scripts/console/asks.mjs [--only shop|vague] [--lang en|ko] [--size 1280x720] [--no-shots]
import path from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import { startVite, startFakeServer, launch, sleep, WEB } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const only = arg('--only', '');
const langs = arg('--lang', 'en,ko').split(',');
const sizes = arg('--size', '1280x720,1440x900').split(',').map((s) => s.split('x').map(Number));
const shots = !args.includes('--no-shots');
const outDir = path.resolve(WEB, 'screenshots/console/asks');
mkdirSync(outDir, { recursive: true });

const fixture = (id) => JSON.parse(readFileSync(path.join(WEB, 'src/replay/fixtures', `${id}.json`), 'utf8'));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  process.stdout.write(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}\n`);
};

const browser = await launch();
const servers = [];
const logs = [];

async function session(scenario, lang, [w, h]) {
  const id = lang === 'en' ? scenario : `${scenario}-ko`;
  const fake = await startFakeServer(id, { speed: 10 });
  const vite = await startVite(fake.url, new Set([fake.port]));
  servers.push(fake, vite);
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument((l) => {
    try {
      localStorage.clear();
      localStorage.setItem('ab.lang', l);
    } catch {}
  }, lang);
  p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  p.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/Failed to load resource/.test(t)) logs.push(`console: ${t}`);
  });
  await p.goto(vite.url, { waitUntil: 'networkidle0' });
  await sleep(300);
  return { p, fx: fixture(id), id, stop: () => (fake.stop(), vite.stop()) };
}

const revisionsDone = (p, n) => p.waitForFunction((k) => {
  const r = window.__ab.store.getState().session.revisions;
  return r.length === k && r[k - 1].status === 'done';
}, { timeout: 40000 }, n);

async function shot(p, name) {
  if (!shots) return;
  await p.screenshot({ path: path.join(outDir, `${name}.png`) });
  process.stdout.write(`      shot ${name}\n`);
}

/** Tab from the page start until `selector` is focused; returns the focused element's facts, or null. */
async function tabTo(p, selector, max = 60) {
  await p.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  // restart from the document start so the count is the same on every run
  await p.evaluate(() => { const a = document.createElement('a'); a.id = '__start'; a.tabIndex = -1; document.body.prepend(a); a.focus(); });
  for (let i = 1; i <= max; i++) {
    await p.keyboard.press('Tab');
    const hit = await p.evaluate((sel) => {
      const e = document.activeElement;
      if (!e || !e.matches(sel)) return null;
      const cs = getComputedStyle(e);
      return { text: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' '), outline: `${cs.outlineStyle} ${cs.outlineWidth}`, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
    }, selector);
    if (hit) return { ...hit, presses: i };
  }
  return null;
}

const atBottom = (p) => p.evaluate(() => { const r = document.querySelector('.rec'); return Math.round(r.scrollHeight - r.scrollTop - r.clientHeight); });

const typeAsk = async (p, text) => {
  await p.type('.brief__input', text);
  await p.keyboard.press('Enter');
};

// ---------- the shop: assume, ask, answer with an option, Change ----------

async function shop(lang, size) {
  const [w, h] = size;
  const tag = `${lang}-${w}x${h}`;
  process.stdout.write(`shop ${tag}\n`);
  const { p, fx, stop } = await session('asks-shop', lang, size);
  try {
    await typeAsk(p, fx.turns[0].ask);
    await revisionsDone(p, 1);
    await sleep(900); // the entrances finish
    const chips = await p.$$eval('.asm__chip', (els) => els.map((e) => e.textContent.replace(/\s*·\s*/g, ' · ').replace(/\s+/g, ' ').trim()));
    check(`shop ${tag}: two assumption chips`, chips.length === 2, chips.join(' | '));
    check(`shop ${tag}: chip reads "Assumed: <text> · Change"`, lang === 'en' ? chips[0] === 'Assumed: Public-facing · Change' : chips[0] === '가정: 외부 공개 · 변경', chips[0]);
    const q = await p.$$eval('.ask', (els) => els.map((e) => ({ state: e.dataset.state, opts: e.querySelectorAll('.ask__opt').length })));
    check(`shop ${tag}: two open questions with options`, q.length === 2 && q.every((x) => x.state === 'open' && x.opts === 3), JSON.stringify(q));
    const inside = await p.$eval('.asks', (el) => !!el.closest('.rev'));
    check(`shop ${tag}: the questions sit inside the revision`, inside);
    const live = await p.$eval('[role="status"][aria-live="polite"]', (el) => el.textContent);
    check(`shop ${tag}: the new questions are announced politely`, /2/.test(live) && live.length > 20, live);
    const groupLabel = await p.$eval('.asks', (el) => el.getAttribute('aria-label'));
    check(`shop ${tag}: the question group is labelled`, !!groupLabel, groupLabel);
    const d1 = await atBottom(p);
    check(`shop ${tag}: the record is scrolled to the newest questions`, d1 < 4, `${d1}px from the bottom`);
    await shot(p, `shop-1-drawn-${tag}`);

    // keyboard: Tab reaches Change and the options, with a visible ring
    const change = await tabTo(p, '.asm__change');
    check(`shop ${tag}: Tab reaches Change`, !!change, change && `${change.presses} presses, "${change.text}"`);
    check(`shop ${tag}: Change has a visible focus ring`, !!change && change.ring, change?.outline);
    await shot(p, `shop-focus-change-${tag}`);
    const opt = await tabTo(p, '.ask__opt');
    check(`shop ${tag}: Tab reaches an option`, !!opt, opt && `${opt.presses} presses, "${opt.text}"`);
    check(`shop ${tag}: the option has a visible focus ring`, !!opt && opt.ring, opt?.outline);
    await shot(p, `shop-focus-option-${tag}`);

    // Space on the second option: "About 100,000 shoppers" is sent as the next ask
    await p.focus('.ask:first-child .ask__opts li:nth-child(2) .ask__opt');
    const want = fx.turns[1].ask;
    await p.keyboard.press('Space');
    await revisionsDone(p, 2);
    await sleep(900);
    const sent = await p.evaluate(() => window.__ab.store.getState().session.revisions[1].ask);
    check(`shop ${tag}: Space on an option sends it as the next ask`, sent === want, sent);
    // revision 1 collapsed when revision 2 started; open it to read its questions
    await p.click('[data-rev="1"] .row');
    await sleep(500);
    const states = await p.$$eval('[data-rev="1"] .ask', (els) => els.map((e) => e.dataset.state));
    check(`shop ${tag}: the question is answered and the other closed`, states.join() === 'answered,replied', states.join());
    const answer = await p.$eval('.ask[data-state="answered"] .ask__answer', (e) => e.textContent.trim());
    check(`shop ${tag}: the answer shows inline`, answer.includes(want.replace(/^쇼핑객 /, '')) || answer.includes(want), answer);
    const noOpts = await p.$$eval('.ask:not([data-state="open"]) .ask__opt', (e) => e.length);
    check(`shop ${tag}: an answered question keeps no buttons`, noOpts === 0);
    await shot(p, `shop-2-answered-${tag}`);

    // Enter on Change: "Change: Internal only instead of Public-facing"; the requirement settles it and the chip goes
    await p.focus('.asm__chip:first-child .asm__change');
    await p.keyboard.press('Enter');
    await revisionsDone(p, 3);
    await sleep(1000);
    const sent3 = await p.evaluate(() => window.__ab.store.getState().session.revisions[2].ask);
    check(`shop ${tag}: Enter on Change sends the localized follow-up`, sent3 === fx.turns[2].ask, sent3);
    const chips3 = await p.$$eval('.asm__chip', (els) => els.map((e) => e.textContent.replace(/\s*·\s*/g, ' · ').replace(/\s+/g, ' ').trim()));
    check(`shop ${tag}: the settled chip is gone`, chips3.length === 1 && !/Public|외부 공개/.test(chips3[0]), chips3.join(' | '));
    const reqs = await p.$$eval('.req__text', (els) => els.map((e) => e.textContent.trim()));
    check(`shop ${tag}: the flipped assumption is a pinned requirement`, reqs.some((r) => /Internal only|내부 전용/.test(r)), reqs.join(' | '));
    const d3 = await atBottom(p);
    check(`shop ${tag}: the record still follows to the newest revision after an older one was opened`, d3 < 4, `${d3}px from the bottom`);
    await shot(p, `shop-3-changed-${tag}`);
  } finally {
    await p.close();
    stop();
  }
}

// ---------- a free-typed answer clears the open questions ----------

async function typed(lang) {
  const size = [1440, 900];
  process.stdout.write(`typed ${lang}\n`);
  const { p, fx, stop } = await session('asks-shop', lang, size);
  try {
    await typeAsk(p, fx.turns[0].ask);
    await revisionsDone(p, 1);
    await sleep(600);
    await p.focus('.cmp__field');
    await p.type('.cmp__field', lang === 'en' ? 'Around 5,000 on a good day' : '잘 되는 날 5,000명 정도');
    await p.keyboard.press('Enter');
    await revisionsDone(p, 2);
    await sleep(600);
    await p.click('[data-rev="1"] .row');
    await sleep(500);
    const states = await p.$$eval('[data-rev="1"] .ask', (els) => els.map((e) => e.dataset.state));
    check(`typed ${lang}: a free-typed answer closes both open questions`, states.join() === 'replied,replied', states.join());
    const btns = await p.$$eval('.ask__opt', (e) => e.length);
    check(`typed ${lang}: no option buttons remain`, btns === 0);
  } finally {
    await p.close();
    stop();
  }
}

// ---------- "we need cloud": question first, then an option ----------

async function vague(lang, size) {
  const [w, h] = size;
  const tag = `${lang}-${w}x${h}`;
  process.stdout.write(`vague ${tag}\n`);
  const { p, fx, stop } = await session('asks-vague', lang, size);
  try {
    await typeAsk(p, fx.turns[0].ask);
    await revisionsDone(p, 1);
    await sleep(900);
    const q = await p.$$eval('.ask', (els) => els.map((e) => ({ state: e.dataset.state, opts: e.querySelectorAll('.ask__opt').length })));
    check(`vague ${tag}: two questions, four and two options`, q.length === 2 && q[0].opts === 4 && q[1].opts === 2, JSON.stringify(q));
    const cards = await p.evaluate(() => window.__ab.store.getState().session.revisions[0].added);
    check(`vague ${tag}: nothing was drawn`, cards === 0);
    const chips = await p.$$eval('.asm__chip', (e) => e.length);
    check(`vague ${tag}: no assumption chips before a design`, chips === 0);
    const live = await p.$eval('[role="status"][aria-live="polite"]', (el) => el.textContent);
    check(`vague ${tag}: announced politely`, live.length > 20, live);
    await shot(p, `vague-1-asked-${tag}`);
    await p.focus('.ask:first-child .ask__opts li:first-child .ask__opt');
    await shot(p, `vague-focus-option-${tag}`);
    await p.keyboard.press('Enter');
    await revisionsDone(p, 2);
    await sleep(1000);
    const sent = await p.evaluate(() => window.__ab.store.getState().session.revisions[1].ask);
    check(`vague ${tag}: Enter on an option sends it`, sent === fx.turns[1].ask, sent);
    const chips2 = await p.$$eval('.asm__chip', (e) => e.length);
    check(`vague ${tag}: the drawing arrives with its assumptions`, chips2 === 2, String(chips2));
    await shot(p, `vague-2-drawn-${tag}`);
  } finally {
    await p.close();
    stop();
  }
}

try {
  for (const lang of langs) {
    for (const size of sizes) {
      if (only !== 'vague') await shop(lang, size);
      if (only !== 'shop') await vague(lang, size);
    }
    if (only !== 'vague') await typed(lang);
  }
} finally {
  await browser.close();
  for (const s of servers) s.stop();
}
if (logs.length) process.stdout.write(`\nbrowser errors:\n${[...new Set(logs)].join('\n')}\n`);
const bad = results.filter((r) => !r.ok);
process.stdout.write(`\n${results.length - bad.length}/${results.length} checks passed\n`);
process.exit(bad.length || logs.length ? 1 : 0);
