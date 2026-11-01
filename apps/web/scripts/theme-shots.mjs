// Screenshots of the app's main states in both themes, for reviewing light and dark side by side. Starts its own Vite
// server on a free port in 5185-5199, answers every /api call in the browser (so nothing reaches the local turn server's
// port), and writes screenshots/theme/<theme>-<state>-<size>.png. The theme is set the way a reader sets it: the
// 'ab.theme' key before the page loads; the device's own setting is pinned to light so System cannot leak in, and the
// system-* shots check that System follows a dark or light device.
//   node scripts/theme-shots.mjs                      every state, both themes, 1440x900 and 1280x720
//   node scripts/theme-shots.mjs --only landing,popover --themes dark --sizes 1440x900
//   node scripts/theme-shots.mjs --only themeMenu --lang ko --sizes 390x844      (ko or zh; a phone width)
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { WEB, launch, sleep, startVite } from './console/lib.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const only = arg('--only', '').split(',').filter(Boolean);
const themes = arg('--themes', 'light,dark').split(',');
const SIZES = { '1440x900': [1440, 900], '1280x720': [1280, 720], '390x844': [390, 844] };
const sizes = arg('--sizes', '1440x900,1280x720').split(',');
const LANG = arg('--lang', 'en');
const outDir = path.join(WEB, 'screenshots', 'theme');
mkdirSync(outDir, { recursive: true });

const ACCOUNT = { email: 'mina.park@example.com', name: 'Mina Park', role: 'member', turnsToday: 7, turnsPerDay: 20, links: { account: '/account', admin: null, signOut: '/auth/logout' } };

async function main() {
  // the proxy target is a port in the allowed range with nothing on it; the browser answers /api itself anyway
  const server = await startVite('http://127.0.0.1:8805');
  const browser = await launch();
  const log = [];

  async function open(theme, size, url, o = {}) {
    const [w, h] = SIZES[size];
    const p = await browser.newPage();
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await p.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: o.device ?? 'light' },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
    ]);
    await p.evaluateOnNewDocument(
      (t, lang) => {
        try {
          localStorage.clear();
          localStorage.setItem('ab.lang', lang);
          if (t === 'light' || t === 'dark') localStorage.setItem('ab.theme', t);
        } catch {}
      },
      theme,
      o.lang ?? LANG,
    );
    await p.setRequestInterception(true);
    p.on('request', (r) => {
      const u = new URL(r.url());
      if (!u.pathname.startsWith('/api/')) return void r.continue();
      if (u.pathname === '/api/me' && o.account) return void r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(o.account) });
      return void r.respond({ status: 404, contentType: 'application/json', body: '{"error":"not-found"}' });
    });
    p.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));
    p.on('console', (m) => {
      if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) log.push(`console: ${m.text()}`);
    });
    await p.goto(server.url + url, { waitUntil: o.wait ?? 'networkidle0' });
    return p;
  }
  const shot = async (p, name) => {
    const file = LANG === 'en' ? name : `${name}-${LANG}`;
    await p.screenshot({ path: path.join(outDir, `${file}.png`) });
    process.stdout.write(`  ${file}\n`);
  };

  const states = {
    async landing(theme, size) {
      const p = await open(theme, size, '/');
      await sleep(300);
      await shot(p, `${theme}-landing-${size}`);
      await p.close();
    },
    async themeMenu(theme, size) {
      const p = await open(theme, size, '/');
      await sleep(200);
      await p.click('.menu--theme > button');
      await sleep(250);
      await shot(p, `${theme}-theme-menu-landing-${size}`);
      await p.close();
    },
    async stream(theme, size) {
      const p = await open(theme, size, '/?replay=ecommerce&speed=1x', { wait: 'domcontentloaded' });
      await sleep(6800);
      await shot(p, `${theme}-stream-mid-${size}`);
      await p.close();
    },
    // the first moments of a turn (the canvas reads the brief behind the Cursor), and a second pass finishing an answer
    async finishing(theme, size) {
      const w = await open(theme, size, '/?replay=ecommerce&speed=1x', { wait: 'domcontentloaded' });
      await sleep(900);
      await shot(w, `${theme}-stream-waiting-${size}`);
      await w.close();
      const p = await open(theme, size, '/?replay=stub-rescue-whole&speed=4x', { wait: 'domcontentloaded' });
      await p.waitForSelector('.rev__status', { timeout: 15000 });
      await sleep(120);
      await shot(p, `${theme}-finishing-${size}`);
      await p.close();
    },
    async done(theme, size) {
      const p = await open(theme, size, '/?replay=ha&speed=instant');
      await sleep(700);
      await shot(p, `${theme}-working-done-${size}`);
      await p.click('.menu--theme > button');
      await sleep(250);
      await shot(p, `${theme}-theme-menu-working-${size}`);
      await p.close();
    },
    async panel(theme, size) {
      const p = await open(theme, size, '/?replay=ha&speed=instant');
      await sleep(500);
      await p.click('#products button');
      await sleep(600);
      await p.hover('.pp-row:nth-of-type(2)').catch(() => undefined);
      await sleep(300);
      await shot(p, `${theme}-panel-open-${size}`);
      await p.close();
    },
    async popover(theme, size) {
      const p = await open(theme, size, '/?replay=ha&speed=instant');
      await sleep(600);
      const cards = await p.$$('.cv-card');
      await cards[Math.min(3, cards.length - 1)].hover();
      await sleep(700);
      await shot(p, `${theme}-popover-${size}`);
      // a change line pointed at: the cards it changed ring in blue, the rest dim
      const line = await p.$('button.chg');
      if (line) {
        await line.hover();
        await sleep(400);
        await shot(p, `${theme}-highlight-${size}`);
      }
      await p.close();
    },
    async solution(theme, size) {
      const p = await open(theme, size, '/?replay=ai-agent&speed=instant');
      await sleep(700);
      await shot(p, `${theme}-solution-map-${size}`);
      await p.close();
    },
    async account(theme, size) {
      const p = await open(theme, size, '/?replay=ha&speed=instant', { account: ACCOUNT });
      await sleep(600);
      await p.click('.menu--account > button');
      await sleep(250);
      await shot(p, `${theme}-account-menu-${size}`);
      await p.close();
    },
    async error(theme, size) {
      const p = await open(theme, size, '/?replay=stub-fatal&speed=instant');
      await sleep(700);
      await shot(p, `${theme}-error-${size}`);
      await p.close();
    },
    async offline(theme, size) {
      const p = await open(theme, size, '/');
      await sleep(600);
      await p.type('.brief__input', 'We run an online store in Southeast Asia.');
      await p.keyboard.press('Enter');
      await sleep(500);
      await shot(p, `${theme}-landing-offline-${size}`);
      await p.close();
    },
    async exportDialog(theme, size) {
      const p = await open(theme, size, '/?replay=ha&speed=instant');
      await sleep(600);
      const btn = await p.$('.xp > button');
      if (btn) {
        await btn.click();
        await sleep(350);
        await shot(p, `${theme}-export-dialog-${size}`);
      }
      await p.close();
    },
  };

  for (const [name, fn] of Object.entries(states)) {
    if (only.length && !only.includes(name)) continue;
    for (const theme of themes) for (const size of sizes) await fn(theme, size);
  }
  // System follows the device: no stored choice, a dark device, then a light one
  if (!only.length || only.includes('system')) {
    for (const device of ['dark', 'light']) {
      const p = await open('system', '1440x900', '/?replay=ha&speed=instant', { device });
      await sleep(600);
      const attr = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
      const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
      process.stdout.write(`  system on a ${device} device: data-theme=${attr}, body ${bg}\n`);
      await shot(p, `system-${device}-device-1440x900`);
      await p.close();
    }
  }
  await browser.close();
  server.stop();
  if (log.length) process.stdout.write(`\nbrowser messages:\n${[...new Set(log)].join('\n')}\n`);
}

main().catch((e) => {
  process.stderr.write(String(e.stack ?? e) + '\n');
  process.exit(1);
});
