// Finish QA, part 2: what flow.mjs does not cover, at every viewport: assume and ask chips (en and ko), the question-first
// revision, the export dialog (open, working, saved, failed), error states, the popover, the header at its tightest.
//   node scripts/finish/extra.mjs <web url> [--out screenshots/finish/extra] [--sizes 1280x720,...]
// Replay mode (?replay=<id>&speed=instant) needs no drawing service. Writes report.json with measured problems.
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from '../console/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '../..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const base = args[0]?.startsWith('http') ? args[0] : 'http://localhost:5190';
const OUT = path.resolve(WEB, arg('--out', 'screenshots/finish/extra'));
const SIZES = arg('--sizes', '1280x720,1366x768,1440x900,1536x864,1920x1080,390x844').split(',');
const report = { sizes: {}, problems: [] };
const browser = await launch();
const log = (m) => process.stdout.write(`${m}\n`);

async function open(w, h, pth, { lang = 'en', reduced = false, blockFonts = false } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument((l) => { try { localStorage.clear(); localStorage.setItem('ab.lang', l); } catch {} }, lang);
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/502|Bad Gateway|Failed to load resource|Export proposal failed/.test(m.text())) p.errs.push(`console: ${m.text().slice(0, 160)}`); });
  if (blockFonts) { await p.setRequestInterception(true); p.on('request', (r) => (/\.woff2?(\?|$)/.test(r.url()) ? r.abort() : r.continue())); }
  await p.goto(base + pth, { waitUntil: 'networkidle0' });
  await sleep(500);
  return p;
}

/** Things a reviewer would flag, measured on the page. */
async function measure(p) {
  return p.evaluate(() => {
    const o = { hscroll: document.documentElement.scrollWidth > innerWidth + 1, header: [], clipped: [] };
    const hd = document.querySelector('.header');
    if (hd) {
      const kids = [...hd.querySelectorAll('.header__title, .header__right > *, .brand, [class*="brand"]')].filter((e) => e.getBoundingClientRect().width > 0);
      const rects = kids.map((e) => ({ n: (e.className || e.tagName).toString().split(' ')[0], r: e.getBoundingClientRect() }));
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r, b = rects[j].r;
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1 && !rects[i].n.includes('brand') && !rects[j].n.includes('brand') && rects[i].n !== rects[j].n) o.header.push(`${rects[i].n} x ${rects[j].n}`);
      }
      if (hd.scrollWidth > hd.clientWidth + 1) o.header.push(`header scrolls ${hd.scrollWidth}>${hd.clientWidth}`);
    }
    for (const el of document.querySelectorAll('.console *, .header *, .pp *')) {
      if (el.children.length === 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'visible') o.clipped.push((el.className || el.tagName).toString().slice(0, 40));
    }
    o.clipped = [...new Set(o.clipped)].slice(0, 6);
    let min = Infinity;
    for (const el of document.querySelectorAll('.cv-card__title')) {
      const cs = parseFloat(getComputedStyle(el).fontSize), r = el.getBoundingClientRect();
      const sc = el.offsetHeight ? r.height / el.offsetHeight : 1;
      if (r.width > 0) min = Math.min(min, cs * sc);
    }
    o.minTitlePx = Number.isFinite(min) ? Math.round(min * 10) / 10 : null;
    o.cards = document.querySelectorAll('.cv-card:not(.cv-card--ghost)').length;
    const dlg = document.querySelector('.xp__panel');
    if (dlg) { const r = dlg.getBoundingClientRect(); o.dialog = { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), inside: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; }
    return o;
  });
}

async function played(p, n = 1, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const ok = await p.evaluate((k) => { const s = window.__ab.store.getState(); return s.session.revisions.length >= k && s.turn.phase === 'idle'; }, n);
    if (ok) return true;
    await sleep(100);
  }
  return false;
}

for (const sz of SIZES) {
  const [w, h] = sz.split('x').map(Number);
  const dir = path.join(OUT, sz);
  mkdirSync(dir, { recursive: true });
  const R = (report.sizes[sz] = {});
  const shot = async (p, name) => { await p.screenshot({ path: path.join(dir, `${name}.png`) }); log(`  ${sz}/${name}`); };
  const step = async (name, pth, opts, fn) => {
    let p;
    try {
      p = await open(w, h, pth, opts);
      await fn(p);
      R[name] = await measure(p);
      if (p.errs.length) { R[name].errs = p.errs; report.problems.push(`${sz} ${name}: ${p.errs.join(' | ')}`); }
      const m = R[name];
      if (m.hscroll && w >= 1280) report.problems.push(`${sz} ${name}: horizontal scroll`);
      if (m.header.length) report.problems.push(`${sz} ${name}: header ${m.header.join('; ')}`);
      if (m.dialog && !m.dialog.inside) report.problems.push(`${sz} ${name}: dialog outside the window`);
    } catch (e) {
      report.problems.push(`${sz} ${name}: FAILED ${String(e.message).slice(0, 200)}`);
      log(`  FAILED ${name}: ${e.message}`);
    } finally { await p?.close(); }
  };
  log(sz);

  // assume chips and questions (assume, ask), English and Korean
  await step('asks-shop-en', '/?replay=asks-shop&speed=instant', {}, async (p) => { await played(p, 1); await sleep(1000); await shot(p, 'asks-shop-en'); });
  await step('asks-shop-ko', '/?replay=asks-shop-ko&speed=instant&lang=ko', { lang: 'ko' }, async (p) => { await played(p, 1); await sleep(1000); await shot(p, 'asks-shop-ko'); });
  await step('asks-vague', '/?replay=asks-vague&speed=instant', {}, async (p) => { await played(p, 1); await sleep(1000); await shot(p, 'asks-vague-question-first'); });
  // the full asks-shop conversation, last revision with the chip gone and the requirement pinned
  await step('asks-shop-done', '/?replay=asks-shop&speed=instant', {}, async (p) => { await played(p, 3); await sleep(1200); await shot(p, 'asks-shop-3-revisions'); });

  // the product-need solution map with the panel open, and the popover on a card
  await step('popover', '/?replay=ecommerce&speed=instant', {}, async (p) => {
    await played(p, 2); await sleep(900);
    const c = await p.$('.cv-card[data-nav-id="alb"]') ?? await p.$('.cv-card:not(.cv-card--ghost)');
    if (c) { await c.hover(); await sleep(1000); await shot(p, 'popover'); }
  });

  // the export dialog: open, filled, working/saved (a replay session has revisions), then failed with the fonts blocked
  await step('export', '/?replay=residency&speed=instant', {}, async (p) => {
    await played(p, 4); await sleep(900);
    await p.evaluate(() => [...document.querySelectorAll('.xp > button')][0]?.click());
    await sleep(500);
    await shot(p, 'export-dialog');
    await p.type('.xp__input:nth-of-type(1)', ' ').catch(() => {});
    await p.evaluate(() => document.querySelector('.xp form button[type=submit]')?.click());
    await sleep(120); await shot(p, 'export-working');
    await sleep(2200); await shot(p, 'export-saved');
  });
  if (sz === '1440x900' || sz === '390x844') {
    await step('export-failed', '/?replay=residency&speed=instant', { blockFonts: true }, async (p) => {
      await played(p, 4); await sleep(900);
      await p.evaluate(() => [...document.querySelectorAll('.xp > button')][0]?.click());
      await sleep(400);
      await p.evaluate(() => document.querySelector('.xp form button[type=submit]')?.click());
      await sleep(3000); await shot(p, 'export-failed');
    });
  }

  // error states in replay (read-only buttons)
  for (const id of ['stub-fatal', 'stub-filtered', 'stub-network', 'stub-fallback']) {
    await step(id, `/?replay=${id}&speed=instant`, {}, async (p) => { await sleep(1200); await shot(p, id); });
  }
  // Korean and Chinese header at this width
  await step('header-ko', '/?replay=korean&speed=instant&lang=ko', { lang: 'ko' }, async (p) => { await played(p, 3); await sleep(900); await shot(p, 'korean-3-revisions'); });
}

writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
await browser.close();
log(JSON.stringify(report.problems, null, 1));
log('done');
