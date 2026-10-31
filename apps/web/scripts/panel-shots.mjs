// Products panel screenshots (panel builder track): closed, open, mid-stream and done, over replay fixtures. Starts its own Vite server on a free port
// in 5185-5199 (never 5173, the user's Phase 0 preview), and stops it when done.
//   node scripts/shots.mjs                       all states
//   node scripts/shots.mjs --only landing,hover  some of them
//   node scripts/shots.mjs --url http://127.0.0.1:5174   use a running server
//   node scripts/shots.mjs --out screenshots --size 1440x900
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const only = arg('--only', '')?.split(',').filter(Boolean);
const outDir = path.resolve(WEB, arg('--out', 'screenshots'));
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const free = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
  });

async function startServer() {
  for (let port = 5185; port <= 5199; port++) {
    if (!(await free(port))) continue;
    const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: WEB, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', () => {});
    child.stderr.on('data', () => {});
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(url)).ok) return { url, stop: () => child.kill() };
      } catch {
        /* not up yet */
      }
      await sleep(250);
    }
    child.kill();
  }
  throw new Error('no free port in 5185-5199');
}

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && existsSync(p));

const sizes = { '1440x900': [1440, 900], '1280x720': [1280, 720], '1920x1080': [1920, 1080] };

async function main() {
  const given = arg('--url', '');
  const server = given ? { url: given, stop() {} } : await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const log = [];
  async function page(w, h, lang = 'en') {
    const p = await browser.newPage();
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await p.evaluateOnNewDocument((l) => {
      try {
        localStorage.clear();
        localStorage.setItem('ab.lang', l);
      } catch {}
    }, lang);
    p.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));
    p.on('console', (m) => {
      if (m.type() === 'error') log.push(`console: ${m.text()}`);
    });
    return p;
  }
  const shot = async (p, name) => {
    await p.screenshot({ path: path.join(outDir, `${name}.png`) });
    process.stdout.write(`  ${name}\n`);
  };
  const sizesP = [[1440, 900], [1280, 720]];
  const openPanel = async (p) => { await p.click('#products .pp__handle'); await sleep(700); };
  const states = {
    async done() {
      for (const [id, lang, tag] of [['residency', 'en', 'residency'], ['korean', 'ko', 'korean'], ['chinese', 'zh', 'chinese'], ['ai-agent', 'en', 'solution']]) {
        for (const [w, h] of sizesP) {
          const p = await page(w, h, lang);
          await p.goto(`${server.url}/?replay=${id}&speed=instant&lang=${lang}`, { waitUntil: 'networkidle0' });
          await sleep(700);
          if (tag === 'residency') await shot(p, `panel-closed-${tag}-${w}x${h}`);
          await openPanel(p);
          await shot(p, `panel-open-${tag}-${w}x${h}`);
          await p.close();
        }
      }
    },
    async mid() {
      for (const [w, h] of sizesP) {
        const p = await page(w, h);
        await p.goto(`${server.url}/?replay=ecommerce&speed=1x`, { waitUntil: 'domcontentloaded' });
        await sleep(9000);
        await shot(p, `panel-stream-closed-${w}x${h}`);
        await openPanel(p);
        await shot(p, `panel-stream-open-${w}x${h}`);
        await p.close();
      }
      const p = await page(1280, 720, 'ko');
      await p.goto(`${server.url}/?replay=korean&speed=1x&lang=ko`, { waitUntil: 'domcontentloaded' });
      await sleep(10000);
      await openPanel(p);
      await shot(p, 'panel-stream-open-ko-1280x720');
      await p.close();
    },
    async interact() {
      const p = await page(1440, 900);
      await p.goto(`${server.url}/?replay=residency&speed=instant`, { waitUntil: 'networkidle0' });
      await sleep(600);
      const probe = () => p.evaluate(() => ({ cls: document.activeElement?.className ?? '', label: document.activeElement?.getAttribute('aria-label') ?? '' }));
      // closed: the rows are inert, so one Tab from the handle never lands in the table
      await p.focus('.pp__handle');
      await p.keyboard.press('Tab');
      process.stdout.write(`  closed, Tab from handle: ${JSON.stringify(await probe())}
`);
      await p.focus('.pp__handle');
      await p.keyboard.press('Enter');
      await sleep(600);
      process.stdout.write(`  Enter on handle: expanded=${await p.$eval('.pp__handle', (e) => e.getAttribute('aria-expanded'))}, focus ${JSON.stringify(await probe())}
`);
      await p.keyboard.press('Tab');
      await p.keyboard.press('Tab');
      process.stdout.write(`  open, 2 x Tab: ${JSON.stringify(await probe())}
`);
      await sleep(250);
      await shot(p, 'panel-keyboard-focus-1440x900');
      await p.hover('.pp-row:nth-child(3)');
      await sleep(300);
      await shot(p, 'panel-row-hover-1440x900');
      await p.keyboard.press('Escape');
      await sleep(500);
      process.stdout.write(`  Escape: expanded=${await p.$eval('.pp__handle', (e) => e.getAttribute('aria-expanded'))}, focus ${JSON.stringify(await probe())}
`);
      // Show on diagram closes the panel and focus returns to the handle
      await p.click('.pp__handle');
      await sleep(500);
      await p.click('.pp-row[data-row-id] .pp-show');
      await sleep(500);
      process.stdout.write(`  Show on diagram: expanded=${await p.$eval('.pp__handle', (e) => e.getAttribute('aria-expanded'))}, focus ${JSON.stringify(await probe())}
`);
      await p.close();
      // reduced motion: no transform transition
      const rm = await page(1440, 900);
      await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await rm.goto(`${server.url}/?replay=residency&speed=instant`, { waitUntil: 'networkidle0' });
      await sleep(400);
      process.stdout.write(`  reduced motion transition: ${await rm.$eval('.pp', (e) => getComputedStyle(e).transitionDuration)}
`);
      await rm.close();
    },
  };
  for (const [name, fn] of Object.entries(states)) {
    if (only.length && !only.includes(name)) continue;
    await fn();
  }
  await browser.close();
  server.stop();
  if (log.length) process.stdout.write(`\nbrowser messages:\n${[...new Set(log)].join('\n')}\n`);
}

main().catch((e) => {
  process.stderr.write(String(e.stack ?? e) + '\n');
  process.exit(1);
});
