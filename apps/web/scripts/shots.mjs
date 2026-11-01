// Headless-Chrome screenshots of the app's states, for looking at the result. Starts its own Vite server on a free port
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
  const states = {
    async landing() {
      for (const [sz, [w, h]] of Object.entries(sizes)) {
        if (sz === '1920x1080' && only.length === 0) continue;
        const p = await page(w, h);
        await p.goto(server.url, { waitUntil: 'networkidle0' });
        await sleep(300);
        await shot(p, `landing-en-${sz}`);
        await p.close();
      }
      for (const lang of ['ko', 'zh']) {
        const p = await page(1440, 900, lang);
        await p.goto(server.url, { waitUntil: 'networkidle0' });
        await sleep(300);
        await shot(p, `landing-${lang}-1440x900`);
        await p.close();
      }
    },
    async typing() {
      const p = await page(1440, 900);
      await p.goto(server.url, { waitUntil: 'networkidle0' });
      await p.type('.brief__input', 'We run an online store in Southeast Asia with big sales peaks.');
      await sleep(200);
      await shot(p, 'landing-typing-1440x900');
      await p.hover('.examples__list li:nth-child(2) button');
      await sleep(250);
      await shot(p, 'landing-example-hover-1440x900');
      await p.close();
    },
    async offline() {
      const p = await page(1440, 900);
      await p.goto(server.url, { waitUntil: 'networkidle0' });
      await sleep(800);
      await p.type('.brief__input', 'We run an online store in Southeast Asia.');
      await p.keyboard.press('Enter');
      await sleep(400);
      await shot(p, 'landing-offline-1440x900');
      await p.close();
    },
    async working() {
      for (const [sz, [w, h]] of Object.entries(sizes)) {
        if (sz === '1920x1080' && only.length === 0) continue;
        const p = await page(w, h);
        await p.goto(`${server.url}/?replay=ha&speed=instant`, { waitUntil: 'networkidle0' });
        await sleep(600);
        await shot(p, `working-ha-${sz}`);
        await p.close();
      }
    },
    async reflow() {
      const p = await page(640, 900);
      await p.goto(`${server.url}/?replay=ha&speed=instant`, { waitUntil: 'networkidle0' });
      await sleep(500);
      await shot(p, 'working-ha-640x900');
      await p.close();
    },
    async stream() {
      const p = await page(1440, 900);
      await p.goto(`${server.url}/?replay=ecommerce&speed=1x`, { waitUntil: 'domcontentloaded' });
      await sleep(900);
      await shot(p, 'stream-waiting-1440x900');
      await sleep(6500);
      await shot(p, 'stream-mid-1440x900');
      await p.close();
    },
    async panel() {
      const p = await page(1440, 900);
      await p.goto(`${server.url}/?replay=ha&speed=instant`, { waitUntil: 'networkidle0' });
      await sleep(500);
      await p.click('#products button');
      await sleep(500);
      await shot(p, 'panel-open-1440x900');
      await p.close();
    },
    // a turn the filter stopped and a second pass finishes: the status line while it works (4x, caught on the status), the
    // closed revision (which looks like any other), the both-failed case, and the existing error when no backup is configured
    async rescue() {
      const live = async (id, name, lang = 'en') => {
        const p = await page(1440, 900, lang);
        await p.goto(`${server.url}/?replay=${id}&speed=4x&lang=${lang}`, { waitUntil: 'domcontentloaded' });
        await p.waitForSelector('.rev__status', { timeout: 15000 });
        await sleep(120);
        await shot(p, name);
        await p.close();
      };
      const done = async (id, name, lang = 'en') => {
        const p = await page(1440, 900, lang);
        await p.goto(`${server.url}/?replay=${id}&speed=instant&lang=${lang}`, { waitUntil: 'networkidle0' });
        await sleep(700);
        await shot(p, name);
        await p.close();
      };
      await live('stub-rescue-continue', 'rescue-status-continue-1440x900');
      await live('stub-rescue-whole', 'rescue-status-whole-1440x900');
      await live('stub-rescue-continue', 'rescue-status-continue-ko-1440x900', 'ko');
      await live('stub-rescue-continue', 'rescue-status-continue-zh-1440x900', 'zh');
      await done('stub-rescue-continue', 'rescue-done-continue-1440x900');
      await done('stub-rescue-whole', 'rescue-done-whole-1440x900');
      await done('stub-rescue-incomplete', 'rescue-incomplete-1440x900');
      await done('stub-rescue-incomplete', 'rescue-incomplete-ko-1440x900', 'ko');
      await done('stub-rescue-continue', 'rescue-done-continue-zh-1440x900', 'zh');
      await done('stub-rescue-failed', 'rescue-failed-1440x900');
      await done('stub-filtered', 'rescue-none-filtered-1440x900');
    },
    async states() {
      for (const [id, name] of [['stub-fatal', 'fatal'], ['stub-fallback', 'fallback'], ['ai-agent', 'solution-map'], ['chinese-fix', 'repair'], ['korean', 'korean'], ['residency', 'residency']]) {
        const p = await page(1440, 900, id === 'korean' ? 'ko' : id === 'chinese-fix' ? 'zh' : 'en');
        await p.goto(`${server.url}/?replay=${id}&speed=instant`, { waitUntil: 'networkidle0' });
        await sleep(600);
        await shot(p, `state-${name}-1440x900`);
        await p.close();
      }
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
