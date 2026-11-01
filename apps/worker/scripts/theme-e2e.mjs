// The theme choice across the app and the Worker's own pages, on one real origin: wrangler dev (http://localhost:8800, the
// built apps/web/dist behind the sign-in gate, the Worker's real Content-Security-Policy). Headless Chrome signs the admin
// address up (the code is read from the mail log, as in e2e-local.ts), then:
//   1  the builder's menu sets Dark; the account page opens dark (the same key), before its first paint
//   2  the account page's own control sets Light; the builder, loaded again, is light
//   3  System (nothing stored) follows an emulated prefers-color-scheme change live on the account page
//   4  the first painted frame of the account page and of the builder is the stored theme, whatever the device says
//   5  no Content-Security-Policy violation, no page error
// Start the Worker on a throw-away local database first (so the admin address is new):
//   npx wrangler d1 migrations apply alichitect --local --env dev --persist-to <dir>
//   npx wrangler dev --env dev --port 8800 --inspector-port 8809 --persist-to <dir> > dev.log 2>&1
//   node scripts/theme-e2e.mjs --mail-log dev.log [--base http://localhost:8800]
// Prints PASS or FAIL per check. Never prints a password or a code.
import puppeteer from 'puppeteer-core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);
const BASE = arg('--base') ?? 'http://localhost:8800';
const MAIL_LOG = arg('--mail-log');
const ADMIN = 'dysung.alicloud@gmail.com';
// the test password is made here; with --state <file> it is kept there (a scratch file) so a second run can sign in again
const STATE = arg('--state');
const KNOWN = STATE && existsSync(STATE) ? readFileSync(STATE, 'utf8').trim() : null;
const PW = KNOWN ?? `e2e-${randomBytes(12).toString('base64url')}`;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};
const csp = [];
const errors = [];

const mails = () => {
  const out = [];
  for (const line of readFileSync(MAIL_LOG, 'utf8').split(/\r?\n/)) {
    const at = line.indexOf('{"evt":"mail-logged"');
    if (at < 0) continue;
    try {
      out.push(JSON.parse(line.slice(at)));
    } catch {}
  }
  return out;
};
async function codeFor(to, after) {
  for (let i = 0; i < 100; i++) {
    const m = mails().filter((x, idx) => idx >= after && x.to === to && /Verification code \d{6}/.test(x.subject)).at(-1);
    if (m) return /\b(\d{6})\b/.exec(m.subject)[1];
    await sleep(200);
  }
  throw new Error('no verification mail');
}

const attr = (p) => p.evaluate(() => document.documentElement.getAttribute('data-theme'));
const bg = (p) => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
const stored = (p) => p.evaluate(() => localStorage.getItem('ab.theme'));
const DARK = 'rgb(24, 25, 28)';
const LIGHT = 'rgb(255, 255, 255)';

async function main() {
  if (!CHROME) throw new Error('Chrome not found');
  if (!MAIL_LOG || !existsSync(MAIL_LOG)) throw new Error('--mail-log <file>: the wrangler dev output file');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none', '--lang=en-GB'] });
  try {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en;q=0.9' });
    page.on('console', (m) => /Content Security Policy|Refused to/i.test(m.text()) && csp.push(m.text().slice(0, 160)));
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
    const submit = (form) => Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(`${form} button[type=submit]`)]);
    const fill = async (sel, v) => {
      await page.$eval(sel, (el) => (el.value = ''));
      await page.type(sel, v);
    };

    if (KNOWN) {
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
      await fill('input#email', ADMIN);
      await fill('input#password', PW);
      await submit('form[action="/login"]');
    } else {
      // sign up the admin and confirm
      const before = mails().length;
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('a[href="/signup"]')]);
      await fill('input#name', 'Doyoon Sung');
      await fill('input#email', ADMIN);
      await fill('input#password', PW);
      await submit('form[action="/signup"]');
      await fill('input#code', await codeFor(ADMIN, before));
      await submit('form[action="/verify"]');
      if (STATE) writeFileSync(STATE, PW);
    }
    check('signed in: the builder is served by the Worker', new URL(page.url()).pathname === '/', page.url().replace(BASE, ''));

    // 1  Dark in the builder, then the account page
    await page.evaluate(() => localStorage.removeItem('ab.theme'));
    await page.reload({ waitUntil: 'networkidle0' });
    check('builder, nothing stored, light device: light, no data-theme', (await attr(page)) === null && (await bg(page)) === LIGHT);
    await page.click('.menu--theme > button');
    await sleep(200);
    await page.click('.menu--theme [role="menuitemradio"]:nth-of-type(2)');
    await sleep(500);
    check('builder: Dark chosen in the menu', (await attr(page)) === 'dark' && (await stored(page)) === 'dark' && (await bg(page)) === DARK);
    await page.goto(`${BASE}/account`, { waitUntil: 'networkidle0' });
    check('account page (same origin) opens dark, with the control showing Dark', (await attr(page)) === 'dark' && (await bg(page)) === DARK && (await page.$eval('button[data-theme-choice="dark"]', (b) => b.getAttribute('aria-pressed'))) === 'true');

    // 2  Light on the account page, back in the builder
    await page.click('button[data-theme-choice="light"]');
    await sleep(500);
    check('account page: Light chosen with the mouse, page and storage change', (await attr(page)) === 'light' && (await stored(page)) === 'light' && (await bg(page)) === LIGHT);
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    check('the builder, opened again, is light', (await attr(page)) === 'light' && (await bg(page)) === LIGHT);
    const trig = await page.$eval('.menu--theme > button', (e) => e.getAttribute('aria-label') ?? e.textContent);
    check('the builder menu trigger names the choice made on the account page', /light/i.test(trig ?? ''), `"${trig}"`);

    // 3  System follows the device live on the account page
    await page.goto(`${BASE}/account`, { waitUntil: 'networkidle0' });
    await page.focus('button[data-theme-choice="system"]');
    await page.keyboard.press('Space');
    await sleep(500);
    check('account page: System chosen by keyboard clears the stored choice', (await stored(page)) === null && (await attr(page)) === null);
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await sleep(300);
    check('System, device turns dark: the account page follows, no reload', (await bg(page)) === DARK);
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await sleep(300);
    check('System, device turns light again: the account page follows', (await bg(page)) === LIGHT);
    // the public pages share the same key: the forgot page, signed in or not, takes the stored choice
    await page.evaluate(() => localStorage.setItem('ab.theme', 'dark'));
    await page.goto(`${BASE}/forgot`, { waitUntil: 'networkidle0' });
    check('forgot-password page opens dark on a light device when Dark is stored', (await attr(page)) === 'dark' && (await bg(page)) === DARK);

    // reduced motion: the account page changes theme at once, with no view transition
    for (const reduced of [true, false]) {
      const rm = await ctx.newPage();
      await rm.setViewport({ width: 1440, height: 900 });
      await rm.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
      await rm.evaluateOnNewDocument(() => {
        window.__vt = 0;
        const orig = document.startViewTransition?.bind(document);
        if (orig) document.startViewTransition = (cb) => { window.__vt++; return orig(cb); };
      });
      await rm.goto(`${BASE}/account`, { waitUntil: 'networkidle0' });
      await rm.evaluate(() => localStorage.removeItem('ab.theme'));
      await rm.reload({ waitUntil: 'networkidle0' });
      await rm.click('button[data-theme-choice="dark"]');
      await sleep(600);
      const info = await rm.evaluate(() => ({ vt: window.__vt, switching: document.documentElement.hasAttribute('data-theme-switching'), attr: document.documentElement.getAttribute('data-theme') }));
      check(reduced ? 'reduced motion, account page: Dark applies with no view transition' : 'motion allowed, account page: one cross-fade view transition', info.attr === 'dark' && !info.switching && info.vt === (reduced ? 0 : 1), JSON.stringify(info));
      await rm.evaluate(() => localStorage.removeItem('ab.theme'));
      await rm.close();
    }

    // 4  first painted frame
    const blank = await ctx.newPage();
    for (const [path, theme, device, want] of [['/account', 'dark', 'light', DARK], ['/account', 'light', 'dark', LIGHT], ['/', 'dark', 'light', DARK], ['/', 'light', 'dark', LIGHT]]) {
      const p = await ctx.newPage();
      await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: device }]);
      await p.setViewport({ width: 1440, height: 900 });
      await p.goto(`${BASE}/forgot`, { waitUntil: 'domcontentloaded' });
      await p.evaluate((t) => localStorage.setItem('ab.theme', t), theme);
      // the page's own record of its first paint: the theme on <html> and the body's colour at that moment
      await p.evaluateOnNewDocument(() => {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (e.name === 'first-paint') window.__fp = { attr: document.documentElement.getAttribute('data-theme'), bg: document.body ? getComputedStyle(document.body).backgroundColor : null };
        }).observe({ type: 'paint', buffered: true });
      });
      await p.tracing.start({ screenshots: true, categories: ['disabled-by-default-devtools.screenshot', 'devtools.timeline', 'loading', 'blink.user_timing'] });
      await p.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await sleep(900);
      const trace = JSON.parse(Buffer.from(await p.tracing.stop()).toString('utf8'));
      const fp = trace.traceEvents.filter((e) => e.name === 'firstPaint' && e.ts).sort((a, b) => a.ts - b.ts).at(-1);
      const snap = trace.traceEvents.filter((e) => e.name === 'Screenshot' && e.args?.snapshot && (!fp || e.ts >= fp.ts)).sort((a, b) => a.ts - b.ts)[0];
      let px = null;
      if (snap) {
        px = await blank.evaluate(async (b64) => {
          const img = new Image();
          img.src = 'data:image/jpeg;base64,' + b64;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const x = c.getContext('2d');
          x.drawImage(img, 0, 0);
          const d = x.getImageData(Math.floor(img.width * 0.04), Math.floor(img.height / 2), 1, 1).data; // the left margin: no text, no control
          return [d[0], d[1], d[2]];
        }, snap.args.snapshot);
      }
      const target = want === DARK ? [24, 25, 28] : [255, 255, 255];
      const fpInfo = await p.evaluate(() => window.__fp ?? null);
      const framed = px && Math.abs(px[0] - target[0]) + Math.abs(px[1] - target[1]) + Math.abs(px[2] - target[2]) < 30;
      const observed = fpInfo && fpInfo.attr === theme && fpInfo.bg === want;
      // a traced frame after First Paint is the picture; with none (a page that paints once), the page's own first-paint record stands
      check(`first painted frame of ${path}: stored ${theme}, device ${device} -> ${want === DARK ? 'dark' : 'light'}`, px ? !!framed && !!observed : !!observed, `${px ? `frame rgb(${px.join(', ')}); ` : 'no traced frame; '}at first paint data-theme=${fpInfo?.attr}, body ${fpInfo?.bg}`);
      await p.close();
    }

    check('no Content-Security-Policy violation, no page error', csp.length === 0 && errors.length === 0, [...csp, ...errors].join(' | '));
  } finally {
    await browser.close();
  }
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks pass`);
  if (results.includes(false)) process.exit(1);
}

main().catch((e) => {
  console.error(String(e.stack ?? e));
  process.exit(1);
});
