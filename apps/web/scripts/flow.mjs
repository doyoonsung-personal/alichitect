// The whole flow in one batched screenshot round, per viewport: landing, typing, IME, submit and handoff, first narration,
// mid-stream, done, panel closed and open, popover, panel-row highlight, a follow-up, the solution map, a fatal error,
// a content-filtered message, and a long session. Runs against a fake drawing service that streams recorded fixtures with
// their timings (no key, no Qwen) and against replay mode. Starts its own Vite and fake servers on free ports in 5185-5199
// (never 5173) and stops them.
//   node scripts/flow.mjs                              all five sizes and 390x844
//   node scripts/flow.mjs --sizes 1440x900,1280x720    some sizes
//   node scripts/flow.mjs --out screenshots/flow --live    also one live turn through the proxy, if the server answers
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const await_fs = () => ({ readFileSync });
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { startFakeServer, launch, sleep, WEB, freePort } from './console/lib.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const SIZES = (arg('--sizes', '1280x720,1366x768,1440x900,1536x864,1920x1080') || '').split(',').filter((v) => /^\d+x\d+$/.test(v));
const OUT = path.resolve(WEB, arg('--out', 'screenshots/flow'));
const ONLY_EXTRA = args.includes('--no-390');

// The app is built once and served by `vite preview`, so a Phase 1a edit in packages/core cannot hot-reload a page mid-run.
const DIST = path.resolve(arg('--dist', path.join(process.env.TEMP ?? WEB, 'ab-flow-dist')));
if (!args.includes('--no-build')) {
  const b = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'review', '--outDir', DIST, '--emptyOutDir'], { cwd: WEB, encoding: 'utf8' });
  if (b.status !== 0) { process.stdout.write(b.stdout + b.stderr); process.exit(1); }
}
async function startVite(apiTarget, skip = new Set()) {
  const port = await freePort(5185, 5199, skip);
  const env = { ...process.env, ...(apiTarget ? { API_TARGET: apiTarget } : {}) };
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', DIST, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: WEB, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(url)).ok) return { url, port, stop: () => child.kill() }; } catch {}
    await sleep(250);
  }
  child.kill();
  throw new Error('preview did not start');
}

const browser = await launch();
const report = { sizes: {}, issues: [] };
const log = (m) => process.stdout.write(`${m}\n`);

async function open(vite, w, h, { lang = 'en', path: pth = '/', reduced = false } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.evaluateOnNewDocument((l) => {
    try {
      localStorage.clear();
      localStorage.setItem('ab.lang', l);
    } catch {}
  }, lang);
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(`pageerror: ${e.message}`));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/502|Bad Gateway|Failed to load resource/.test(m.text())) p.errs.push(`console: ${m.text()}`);
  });
  await p.goto(vite.url + pth, { waitUntil: 'networkidle0' });
  await sleep(500);
  return p;
}

const until = async (p, fn, ms = 40000, arg2) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.evaluate(fn, arg2)) return true;
    await sleep(80);
  }
  return false;
};
const st = (p) => p.evaluate(() => { const s = window.__ab.store.getState(); return { view: s.view, phase: s.turn.phase, revs: s.session.revisions.length, last: s.session.revisions.at(-1)?.status }; });
const idle = (p, nrevs) => until(p, (n) => { const s = window.__ab.store.getState(); return s.view === 'working' && s.turn.phase === 'idle' && s.session.revisions.length >= n && s.session.revisions.at(-1)?.status !== 'streaming'; }, 60000, nrevs);
const cards = (p) => p.evaluate(() => document.querySelectorAll('.cv-card:not(.cv-card--ghost)').length);
const untilCards = (p, n, ms = 40000) => until(p, (k) => document.querySelectorAll('.cv-card:not(.cv-card--ghost)').length >= k, ms, n);

/** Sanity numbers read from the page at the moment of a shot. */
async function metrics(p, tag) {
  const m = await p.evaluate(() => {
    const out = { hscroll: document.documentElement.scrollWidth > innerWidth + 1, vscroll: document.documentElement.scrollHeight > innerHeight + 1 };
    const cv = document.querySelector('.cv');
    out.zoom = cv ? Number(cv.getAttribute('data-zoom')) : null;
    let min = Infinity;
    for (const el of document.querySelectorAll('.cv-card__title')) {
      const cs = parseFloat(getComputedStyle(el).fontSize);
      const r = el.getBoundingClientRect();
      const scale = el.offsetHeight ? r.height / el.offsetHeight : 1;
      if (r.width > 0) min = Math.min(min, cs * scale);
    }
    out.minTitlePx = Number.isFinite(min) ? Math.round(min * 10) / 10 : null;
    out.cards = document.querySelectorAll('.cv-card:not(.cv-card--ghost)').length;
    // console column: any text clipped horizontally?
    const clipped = [];
    for (const el of document.querySelectorAll('.console *')) {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible' && el.children.length === 0 && el.clientWidth > 0) clipped.push((el.className || el.tagName).toString().slice(0, 40));
    }
    out.overflowing = clipped.slice(0, 5);
    if (out.hscroll) {
      const wide = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('.cv, .react-flow')) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > innerWidth + 1 || r.left < -1)) wide.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
      }
      out.wide = wide.slice(0, 8);
    }
    return out;
  });
  report.sizes[tag] = m;
  return m;
}

async function runSize(sz) {
  const [w, h] = sz.split('x').map(Number);
  const dir = path.join(OUT, sz);
  mkdirSync(dir, { recursive: true });
  const shot = async (p, name) => {
    await p.screenshot({ path: path.join(dir, `${name}.png`) });
    log(`  ${sz}/${name}`);
  };
  const R = (report.sizes[sz] = {});

  // ---------------- the live-like flow: the residency conversation through a fake drawing service ----------------
  const fx = JSON.parse((await import('node:fs')).readFileSync(path.join(WEB, 'src/replay/fixtures/residency.json'), 'utf8'));
  const asks = fx.turns.map((t) => t.ask);
  const fake = await startFakeServer('residency', { speed: 2 });
  const vite = await startVite(fake.url, new Set([fake.port]));
  try {
    const p = await open(vite, w, h);
    await shot(p, '01-landing');
    R.landing = await metrics(p, `${sz}:landing`);
    await p.type('.brief__input', asks[0].slice(0, 70));
    await sleep(120);
    await shot(p, '02-typing');
    // IME: composition open, Enter must not submit
    const ime = await p.evaluate(() => {
      const el = document.querySelector('.brief__input');
      el.focus();
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
      const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      return { prevented: ev.defaultPrevented, view: window.__ab.store.getState().view, hint: document.querySelector('.brief__hint, .brief__foot')?.textContent ?? '' };
    });
    await sleep(100);
    await shot(p, '03-ime-composing');
    await p.evaluate(() => document.querySelector('.brief__input').dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' })));
    R.ime = { ...ime, stayedOnLanding: ime.view === 'landing' };
    if (!R.ime.stayedOnLanding) report.issues.push(`${sz}: Enter during composition submitted`);
    // type the full ask, then Enter
    await p.evaluate(() => { const el = document.querySelector('.brief__input'); el.select(); });
    await p.keyboard.press('Backspace');
    await p.evaluate((a) => {
      const el = document.querySelector('.brief__input');
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      set.call(el, a);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, asks[0]);
    await sleep(150);
    await p.keyboard.press('Enter');
    await sleep(210);
    await shot(p, '04-handoff-mid');
    await untilCards(p, 1);
    await sleep(160);
    await shot(p, '05-first-card');
    await untilCards(p, 8);
    await sleep(250);
    await shot(p, '06-mid-stream');
    R.mid = await metrics(p, `${sz}:mid`);
    await idle(p, 1);
    await sleep(900);
    await shot(p, '07-done-rev1');
    R.done1 = await metrics(p, `${sz}:done1`);

    // panel closed -> open
    await p.click('.pp__handle');
    await sleep(750);
    await shot(p, '08-panel-open');
    // hover on a panel row: highlight on the canvas
    const row = await p.$('.pp-row:nth-child(3)');
    if (row) { await row.hover(); await sleep(450); await shot(p, '09-panel-row-hover'); }
    await p.keyboard.press('Escape');
    await sleep(600);
    // hover a card: popover
    const card = await p.$('.cv-card[data-nav-id="alb"]') ?? (await p.$('.cv-card:not(.cv-card--ghost)'));
    if (card) { await card.hover(); await sleep(900); await shot(p, '10-card-popover'); }
    await p.mouse.move(2, 2);
    await sleep(200);

    // follow-ups
    for (let i = 1; i < 4; i++) {
      await p.click('.console [data-flip="composer"] textarea');
      await p.type('.console [data-flip="composer"] textarea', asks[i]);
      await sleep(i === 1 ? 150 : 50);
      if (i === 1) await shot(p, '11-followup-typed');
      await p.keyboard.press('Enter');
      if (i === 1) { await sleep(2400); await shot(p, '12-followup-mid'); }
      await idle(p, i + 1);
      await sleep(900);
      if (i === 1) await shot(p, '13-followup-done');
      if (i === 1) {
        // hover a change line: highlight on the canvas
        const line = await p.$('.rec--latest .chg__list li button, .chgs__list li button');
        if (line) { await line.hover(); await sleep(450); await shot(p, '14-line-hover'); await p.mouse.move(2, 2); }
      }
    }
    await shot(p, '15-four-revisions');
    R.done4 = await metrics(p, `${sz}:done4`);
    // long session: five more
    for (let i = 4; i < 9; i++) {
      await p.click('.console [data-flip="composer"] textarea');
      await p.type('.console [data-flip="composer"] textarea', asks[1 + (i % 3)]);
      await p.keyboard.press('Enter');
      await idle(p, i + 1);
    }
    await sleep(900);
    await shot(p, '16-long-session');
    R.long = await metrics(p, `${sz}:long`);
    R.errors = p.errs;
    await p.close();
  } finally {
    fake.stop();
    vite.stop();
  }

  // ---------------- a fatal error and a content-filtered message on a drawn diagram, through the fake service ----------------
  // (replay buttons are read-only, so the live-like path is the one that shows Try again and Edit and resend)
  {
    const rd = (f) => JSON.parse((await_fs()).readFileSync(path.join(WEB, 'src/replay/fixtures', f + '.json'), 'utf8'));
    const combo = { ...rd('residency'), turns: [rd('residency').turns[0], rd('stub-fatal').turns[0], rd('stub-filtered').turns[0]] };
    const tmp = path.join(process.env.TEMP ?? WEB, 'ab-flow-errors.json');
    writeFileSync(tmp, JSON.stringify(combo));
    const fk = await startFakeServer('residency', { speed: 4, file: tmp });
    const vv = await startVite(fk.url, new Set([fk.port]));
    try {
      const p = await open(vv, w, h);
      await p.evaluate((a) => {
        const el = document.querySelector('.brief__input');
        const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        set.call(el, a);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, asks[0]);
      await p.keyboard.press('Enter');
      await idle(p, 1);
      await sleep(700);
      await p.click('.console [data-flip="composer"] textarea');
      await p.type('.console [data-flip="composer"] textarea', 'Move the database to a second zone.');
      await p.keyboard.press('Enter');
      await until(p, () => !!document.querySelector('.err'), 30000);
      await sleep(900);
      await shot(p, '21-fatal-live');
      R['21-fatal-live'] = await metrics(p, `${sz}:fatal-live`);
      await p.click('.err__actions .btn:last-child');
      await sleep(300);
      await p.keyboard.press('Enter');
      await until(p, () => document.querySelectorAll('.err').length > 0 && /content filter/i.test(document.querySelector('.err')?.textContent ?? ''), 30000);
      await sleep(900);
      await shot(p, '22-filtered-live');
      R.errors = [...(R.errors ?? []), ...p.errs];
      await p.close();
    } finally {
      fk.stop();
      vv.stop();
    }
  }

  // ---------------- replay mode scenarios ----------------
  const rv = await startVite(null, new Set());
  try {
    for (const [name, id, extra] of [
      ['17-solution-map', 'ai-agent', async (p) => { await p.click('.pp__handle'); await sleep(750); await shot(p, '17b-solution-map-panel'); await p.keyboard.press('Escape'); await sleep(500); }],
      ['18-fatal', 'stub-fatal'],
      ['19-filtered', 'stub-filtered'],
    ]) {
      const p = await open(rv, w, h, { path: `/?replay=${id}&speed=instant` });
      await sleep(900);
      await shot(p, name);
      if (extra) await extra(p);
      R[name] = await metrics(p, `${sz}:${name}`);
      (R.errors ??= []).push(...p.errs);
      await p.close();
    }
    // a Korean and a Chinese working view
    for (const [lang, id] of [['ko', 'korean'], ['zh', 'chinese']]) {
      const p = await open(rv, w, h, { lang, path: `/?replay=${id}&speed=instant&lang=${lang}` });
      await sleep(900);
      await shot(p, `20-${lang}`);
      R[`20-${lang}`] = await metrics(p, `${sz}:${lang}`);
      await p.close();
    }
  } finally {
    rv.stop();
  }
}

for (const sz of SIZES) {
  log(sz);
  try {
    await runSize(sz);
  } catch (e) {
    report.issues.push(`${sz}: ${e.stack ?? e}`);
    log(`  FAILED ${e.message}`);
  }
}

if (!ONLY_EXTRA) {
  // 390x844: nothing may break (no horizontal scroll, the page is usable)
  const dir = path.join(OUT, '390x844');
  mkdirSync(dir, { recursive: true });
  const rv = await startVite(null, new Set());
  try {
    const p = await open(rv, 390, 844);
    await p.screenshot({ path: path.join(dir, '01-landing.png') });
    report.sizes['390x844:landing'] = await metrics(p, '390x844:landing');
    await p.close();
    const q = await open(rv, 390, 844, { path: '/?replay=residency&speed=instant' });
    await sleep(900);
    await q.screenshot({ path: path.join(dir, '02-working.png') });
    report.sizes['390x844:working'] = await metrics(q, '390x844:working');
    (report.errors390 ??= []).push(...q.errs);
    await q.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(300);
    await q.screenshot({ path: path.join(dir, '03-working-scrolled.png') });
    await q.close();
  } finally {
    rv.stop();
  }
}

writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
await browser.close();
log('done');
