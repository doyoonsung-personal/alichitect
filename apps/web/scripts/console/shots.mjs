// Screenshots of the console track's states (landing handoff, waiting, mid-stream, done, repair, solution map, errors,
// summary, replay, ko and zh). Output: apps/web/screenshots/console/. Own Vite on a free port in 5185-5199, stopped at the end.
//   node scripts/console/shots.mjs [--only name,name] [--out dir]
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { startVite, startFakeServer, launch, sleep, WEB } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const only = (arg('--only', '') || '').split(',').filter(Boolean);
const outDir = path.resolve(WEB, arg('--out', 'screenshots/console'));
mkdirSync(outDir, { recursive: true });

const logs = [];
const vite = await startVite();
const browser = await launch();

async function page(w, h, lang = 'en', base = vite.url) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument((l) => {
    try {
      // a fresh profile on the first document only, so a reload keeps the saved sessions
      if (!sessionStorage.getItem('__fresh')) {
        localStorage.clear();
        sessionStorage.setItem('__fresh', '1');
      }
      localStorage.setItem('ab.lang', l);
    } catch {}
  }, lang);
  p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  p.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !/502|Bad Gateway|ECONNREFUSED|Failed to load resource/.test(t)) logs.push(`console: ${t}`);
  });
  p.__base = base;
  return p;
}

async function shot(p, name, { consoleOnly = true } = {}) {
  await p.screenshot({ path: path.join(outDir, `${name}.png`) });
  if (consoleOnly) {
    const box = await p.$eval('.work__console', (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    await p.screenshot({ path: path.join(outDir, `${name}-console.png`), clip: box });
  }
  process.stdout.write(`  ${name}\n`);
}

const replayUrl = (p, id, speed) => `${p.__base}/?replay=${id}&speed=${speed}`;
/** Waits until `ms` after t0. */
const until = (t0, ms) => sleep(Math.max(0, ms - (Date.now() - t0)));

const scenarios = {
  // a one-turn session at 1x: the Cursor at the end of the note, planned and added lines, the draw counter, then done
  async ha() {
    for (const [w, h] of [[1440, 900], [1280, 720]]) {
      const p = await page(w, h);
      const t0 = Date.now();
      await p.goto(replayUrl(p, 'ha', '1x'), { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('.rev', { timeout: 15000 });
      await until(t0, 6500);
      await shot(p, `ha-mid-${w}x${h}`);
      await until(t0, 21500);
      await shot(p, `ha-done-${w}x${h}`);
      await p.close();
    }
  },
  // Korean: three revisions at 4x
  async korean() {
    for (const [w, h] of [[1440, 900], [1280, 720]]) {
      const p = await page(w, h, 'ko');
      const t0 = Date.now();
      await p.goto(replayUrl(p, 'korean', '4x'), { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('.rev', { timeout: 15000 });
      await until(t0, 4200);
      await shot(p, `ko-mid-${w}x${h}`);
      await until(t0, 17000);
      await shot(p, `ko-done-${w}x${h}`);
      await p.close();
    }
  },
  // Chinese with a repair turn: Checking, then "Fixing the diagram...", then the fixed block
  async zhfix() {
    const p = await page(1440, 900, 'zh');
    const t0 = Date.now();
    await p.goto(replayUrl(p, 'chinese-fix', '1x'), { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.rev', { timeout: 15000 });
    await until(t0, 16000);
    await shot(p, 'zh-mid-1440x900');
    await until(t0, 20200);
    await shot(p, 'zh-fixing-1440x900');
    await until(t0, 27500);
    await shot(p, 'zh-fixed-1440x900');
    await p.close();
  },
  // four revisions with a pinned requirement; hover a change line, open an old revision
  async residency() {
    for (const [w, h] of [[1440, 900], [1280, 720]]) {
      const p = await page(w, h);
      await p.goto(replayUrl(p, 'residency', 'instant'), { waitUntil: 'networkidle0' });
      await sleep(900);
      await shot(p, `residency-done-${w}x${h}`);
      if (w === 1440) {
        await p.hover('.rev .chg');
        await sleep(300);
        await shot(p, 'residency-line-hover-1440x900');
        await p.mouse.move(900, 400);
        await p.click('.revs > li:nth-child(2) .row');
        await sleep(400);
        await shot(p, 'residency-row-open-1440x900');
      }
      await p.close();
    }
  },
  async solution() {
    const p = await page(1440, 900);
    await p.goto(replayUrl(p, 'ai-agent', 'instant'), { waitUntil: 'networkidle0' });
    await sleep(700);
    await shot(p, 'solution-map-1440x900');
    await p.close();
  },
  async errors() {
    for (const [id, name, wait] of [['stub-fatal', 'fatal', 9800], ['stub-filtered', 'filtered', 2200], ['stub-network', 'network', 9000], ['stub-fallback', 'fallback-done', 22500]]) {
      const p = await page(1440, 900);
      const t0 = Date.now();
      await p.goto(replayUrl(p, id, '1x'), { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('.rev', { timeout: 15000 });
      if (id === 'stub-fallback') {
        await until(t0, 2600);
        await shot(p, 'fallback-mid-1440x900');
      }
      await until(t0, wait);
      await shot(p, `${name}-1440x900`);
      await p.close();
    }
  },
  async summary() {
    const p = await page(1440, 900);
    const t0 = Date.now();
    await p.goto(replayUrl(p, 'stub-summary', '1x'), { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.rev', { timeout: 15000 });
    await until(t0, 19400);
    await shot(p, 'summary-writing-1440x900');
    await until(t0, 23500);
    await shot(p, 'summary-done-1440x900');
    await p.close();
  },
  // a pinned requirement, the toast after Unpin, the tag pointing at its cards, a long ask, a failed live turn
  async extras() {
    const used = new Set();
    const fake = await startFakeServer('residency', { speed: 8 });
    used.add(fake.port);
    const fatal = await startFakeServer('stub-fatal', { speed: 4, skip: new Set(used) });
    used.add(fatal.port);
    const v1 = await startVite(fake.url, new Set(used));
    used.add(v1.port);
    const v2 = await startVite(fatal.url, new Set(used));
    const long =
      "We're a Singapore fintech and customer data must stay in Singapore. Design a web app with a database for our customer portal. Customers log in with SSO, upload KYC documents, and see their balances. We expect 20,000 daily users, with a peak around month end. Auditors need immutable logs for seven years, and the security team wants a WAF, DDoS protection and encryption keys we control. We also want a staging environment that mirrors production.";
    try {
      {
        const p = await page(1440, 900, 'en', v1.url);
        await p.goto(v1.url, { waitUntil: 'networkidle0' });
        await sleep(500);
        await p.type('.brief__input', long);
        await p.keyboard.press('Enter');
        await p.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done', { timeout: 40000 });
        await sleep(700);
        await shot(p, 'extras-long-ask-1440x900');
        await p.hover('.rev .tag');
        await sleep(300);
        await shot(p, 'extras-tag-hover-1440x900');
        await p.mouse.move(900, 500);
        await p.click('.req__row .req__unpin');
        await sleep(400);
        await shot(p, 'extras-toast-1440x900');
        await p.close();
      }
      {
        const p = await page(1440, 900, 'en', v2.url);
        await p.goto(v2.url, { waitUntil: 'networkidle0' });
        await sleep(500);
        await p.type('.brief__input', 'We run an online store in Southeast Asia with about 30,000 daily users and big sales peaks. Design a highly available web architecture.');
        await p.keyboard.press('Enter');
        await p.waitForSelector('.err', { timeout: 20000 });
        await sleep(400);
        await shot(p, 'extras-fatal-live-1440x900');
        await p.close();
      }
    } finally {
      v1.stop();
      v2.stop();
      fake.stop();
      fatal.stop();
    }
  },
  // reflow at 200% browser zoom on a 1280 screen (640 CSS px): console above, stage below
  async narrow() {
    const p = await page(640, 900);
    await p.goto(replayUrl(p, 'residency', 'instant'), { waitUntil: 'networkidle0' });
    await sleep(800);
    await shot(p, 'narrow-640x900', { consoleOnly: false });
    await p.close();
  },
  // lifecycle notes, the offline notice in the working view, and a restored session
  async states2() {
    const used = new Set();
    const life = await startFakeServer('lifecycle', { speed: 2, file: path.join(WEB, '.qwen/console/lifecycle.json') });
    used.add(life.port);
    const ha = await startFakeServer('ha', { speed: 8, skip: new Set(used) });
    used.add(ha.port);
    const v1 = await startVite(life.url, new Set(used));
    used.add(v1.port);
    const v2 = await startVite(ha.url, new Set(used));
    try {
      {
        const p = await page(1440, 900, 'en', v1.url);
        await p.goto(v1.url, { waitUntil: 'networkidle0' });
        await sleep(500);
        await p.type('.brief__input', 'I need an AI agent my team of 15 software developers can use for coding. We used Tongyi Lingma before.');
        await p.keyboard.press('Enter');
        await p.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done', { timeout: 30000 });
        await sleep(600);
        await shot(p, 'lifecycle-1440x900');
        await p.close();
      }
      {
        const p = await page(1440, 900, 'en', v2.url);
        await p.goto(v2.url, { waitUntil: 'networkidle0' });
        await sleep(500);
        await p.type('.brief__input', 'We run an online store in Southeast Asia with about 30,000 daily users and big sales peaks. Design a highly available web architecture.');
        await p.keyboard.press('Enter');
        await p.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done', { timeout: 30000 });
        await sleep(800);
        // reload: the saved session is on the landing's Sessions menu; open it
        await p.reload({ waitUntil: 'networkidle0' });
        await sleep(600);
        await p.click('.menu--sessions button');
        await sleep(300);
        await shot(p, 'sessions-menu-landing-1440x900', { consoleOnly: false });
        await p.click('.menu__item');
        await p.waitForSelector('.rev', { timeout: 8000 });
        await sleep(700);
        await shot(p, 'restored-1440x900');
        // the service goes away: a follow-up fails and the record offers a way forward
        ha.stop();
        await p.type('.cmp__field', 'Also add a WAF in front of the load balancer');
        await p.keyboard.press('Enter');
        await p.waitForSelector('.err', { timeout: 15000 });
        await p.evaluate(() => window.__ab.controller.checkHealth());
        await sleep(1500);
        await shot(p, 'offline-working-1440x900');
        await p.close();
      }
    } finally {
      v1.stop();
      v2.stop();
      life.stop();
      ha.stop();
    }
  },
  // live mode against a fake drawing service: landing, the handoff, waiting, streaming, a follow-up, composer states
  async live() {
    const fake = await startFakeServer('ha', { speed: 1 });
    const hold = await startFakeServer('ha', { hold: true, skip: new Set([fake.port]) });
    const v1 = await startVite(fake.url, new Set([fake.port, hold.port]));
    const v2 = await startVite(hold.url, new Set([fake.port, hold.port, v1.port]));
    const brief = 'We run an online store in Southeast Asia with about 30,000 daily users and big sales peaks. Design a highly available web architecture.';
    try {
      {
        const p = await page(1440, 900, 'en', v1.url);
        await p.goto(v1.url, { waitUntil: 'networkidle0' });
        await sleep(600);
        await p.type('.brief__input', brief);
        // slow the handoff to a tenth of its speed so a screenshot can catch it in flight
        const cdp = await p.createCDPSession();
        await cdp.send('Animation.enable');
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });
        await p.keyboard.press('Enter');
        await sleep(450);
        await shot(p, 'handoff-a-1440x900', { consoleOnly: false });
        await sleep(1400);
        await shot(p, 'handoff-b-1440x900', { consoleOnly: false });
        await sleep(1800);
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
        await sleep(900);
        await shot(p, 'live-first-1440x900');
        await sleep(5500);
        await shot(p, 'live-mid-1440x900');
        await sleep(14000);
        await shot(p, 'live-done-1440x900');
        await p.click('.cmp__field');
        await p.type('.cmp__field', 'oh i also want waf');
        await p.keyboard.down('Shift');
        await p.keyboard.press('Enter');
        await p.keyboard.up('Shift');
        await p.type('.cmp__field', 'and keep it in Singapore');
        await sleep(200);
        await shot(p, 'composer-typing-1440x900');
        await p.close();
      }
      {
        const p = await page(1440, 900, 'en', v2.url);
        await p.goto(v2.url, { waitUntil: 'networkidle0' });
        await sleep(500);
        await p.type('.brief__input', brief);
        await p.keyboard.press('Enter');
        await sleep(1500);
        await p.type('.cmp__field', 'Also add a WAF in front of the load balancer');
        await sleep(200);
        await shot(p, 'waiting-1440x900');
        await sleep(9000);
        await shot(p, 'waiting-9s-1440x900');
        await p.close();
      }
    } finally {
      v1.stop();
      v2.stop();
      fake.stop();
      hold.stop();
    }
  },
};

for (const [name, fn] of Object.entries(scenarios)) {
  if (only.length && !only.includes(name)) continue;
  process.stdout.write(`${name}\n`);
  try {
    await fn();
  } catch (e) {
    logs.push(`scenario ${name}: ${e.stack ?? e}`);
  }
}
await browser.close();
vite.stop();
if (logs.length) process.stdout.write(`\nmessages:\n${[...new Set(logs)].join('\n')}\n`);
