// Screenshots of the canvas track: mid-stream and done states of replay fixtures at 1280x720 and 1440x900, plus the hover
// popover, the highlight link and the keyboard path. Starts its own Vite server on a free port in 5185-5199 (never
// 5173), and stops it when done.
//   node scripts/shots-canvas.mjs                         the standard set
//   node scripts/shots-canvas.mjs --only residency-done   one shot
//   node scripts/shots-canvas.mjs --url http://127.0.0.1:5195   use a running server
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
const only = (arg('--only', '') || '').split(',').filter(Boolean);
const outDir = path.resolve(WEB, arg('--out', 'screenshots/canvas'));
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

const SIZES = { '1440x900': [1440, 900], '1280x720': [1280, 720] };

async function main() {
  const given = arg('--url', '');
  const server = given ? { url: given, stop() {} } : await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const log = [];
  async function page(sz, lang = 'en') {
    const [w, h] = SIZES[sz];
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
      if (m.type() === 'error' || m.type() === 'warning') log.push(`console ${m.type()}: ${m.text()}`);
    });
    return p;
  }
  const shot = async (p, name) => {
    await p.screenshot({ path: path.join(outDir, `${name}.png`) });
    process.stdout.write(`  ${name}\n`);
  };
  const stats = (p) =>
    p.evaluate(() => {
      const cv = document.querySelector('.cv');
      const cards = [...document.querySelectorAll('.cv-card:not(.cv-card--ghost) .cv-card__title')];
      const zoom = Number(cv?.getAttribute('data-zoom') ?? 1);
      const px = cards.map((el) => parseFloat(getComputedStyle(el).fontSize) * zoom);
      return { router: cv?.getAttribute('data-router'), zoom, cards: cards.length, minTitlePx: px.length ? Math.min(...px).toFixed(2) : null };
    });

  const done = async (sz, fixture, lang, name, extra) => {
    const p = await page(sz, lang);
    await p.goto(`${server.url}/?replay=${fixture}&speed=instant&lang=${lang}`, { waitUntil: 'networkidle0' });
    await sleep(1800);
    if (extra) await extra(p);
    await shot(p, name);
    process.stdout.write(`    ${JSON.stringify(await stats(p))}\n`);
    await p.close();
  };
  const mid = async (sz, fixture, lang, name, ms) => {
    const p = await page(sz, lang);
    await p.goto(`${server.url}/?replay=${fixture}&speed=1x&lang=${lang}`, { waitUntil: 'domcontentloaded' });
    await sleep(ms);
    await shot(p, name);
    process.stdout.write(`    ${JSON.stringify(await stats(p))}\n`);
    await p.close();
  };

  const shots = {
    async 'residency-done'() {
      for (const sz of Object.keys(SIZES)) await done(sz, 'residency', 'en', `residency-done-${sz}`);
    },
    async 'korean-done'() {
      for (const sz of Object.keys(SIZES)) await done(sz, 'korean', 'ko', `korean-done-${sz}`);
    },
    async 'chinese-done'() {
      await done('1440x900', 'chinese', 'zh', 'chinese-done-1440x900');
    },
    async 'ha-done'() {
      for (const sz of Object.keys(SIZES)) await done(sz, 'ha', 'en', `ha-done-${sz}`);
    },
    async 'ecommerce-mid'() {
      await mid('1440x900', 'ecommerce', 'en', 'ecommerce-mid-1440x900', 9000);
      await mid('1280x720', 'ecommerce', 'en', 'ecommerce-mid-1280x720', 9000);
    },
    async 'korean-mid'() {
      await mid('1440x900', 'korean', 'ko', 'korean-mid-1440x900', 8000);
    },
    async 'solution'() {
      await done('1440x900', 'ai-agent', 'en', 'solution-1440x900');
      await done('1280x720', 'ai-agent', 'en', 'solution-1280x720');
    },
    async 'hover'() {
      await done('1440x900', 'residency', 'en', 'hover-1440x900', async (p) => {
        const el = await p.$('.cv-card[data-nav-id="alb"]');
        await el.hover();
        await sleep(700);
      });
    },
    async 'badge-hover'() {
      await done('1440x900', 'residency', 'en', 'badge-hover-1440x900', async (p) => {
        const el = await p.$('.cv-badge[data-nav-id="waf"]');
        await el.hover();
        await sleep(700);
      });
    },
    async 'highlight'() {
      await done('1440x900', 'residency', 'en', 'highlight-1440x900', async (p) => {
        await p.evaluate(() => window.__ab.controller.highlight({ source: 'line', cards: ['alb', 'waf', 'esa'], ghosts: [] }));
        await sleep(400);
      });
    },
    async 'keyboard'() {
      await done('1440x900', 'residency', 'en', 'keyboard-1440x900', async (p) => {
        await p.evaluate(() => document.querySelector('.cv-card[tabindex="0"]')?.focus());
        await p.keyboard.press('ArrowRight');
        await p.keyboard.press('ArrowRight');
        await sleep(500);
      });
    },
  };
  for (const [name, fn] of Object.entries(shots)) {
    if (only.length && !only.includes(name)) continue;
    process.stdout.write(`${name}\n`);
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
