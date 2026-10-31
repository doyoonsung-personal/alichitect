// Headless-Chrome measurement for the canvas spike: screenshots of every scenario's final state (light and dark,
// libavoid; light with the channel router), a mid-stream capture, and 1x replays for fps, stability and timings.
// Drafted by Qwen (qwen3.8-max) from a written spec; reviewed and fixed by Claude (exit-code handling).
// Run from spikes/canvas: node scripts/measure.mjs [--only a,b] [--skip-fps] [--skip-shots] [--no-server]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  if (i !== -1 && i + 1 < args.length) return args[i + 1];
  return undefined;
}

const url = getArg('--url') || 'http://127.0.0.1:5173';
const noServer = args.includes('--no-server');
const onlyArg = getArg('--only');
const skipFps = args.includes('--skip-fps');
const skipShots = args.includes('--skip-shots');
const out = getArg('--out') || 'screenshots';

const ALL_SCENARIOS = ['a', 'b', 'c', 'd', 'e1', 'e2', 'f'];
const SCENARIOS = onlyArg ? onlyArg.split(',').filter(s => ALL_SCENARIOS.includes(s)) : ALL_SCENARIOS;

if (!existsSync(out)) mkdirSync(out, { recursive: true });

let serverProcess = null;
let browser = null;
let result = null;

async function main() {
  // Server
  if (!noServer) {
    serverProcess = spawn(process.execPath, [
      'node_modules/vite/bin/vite.js', '--port', '5173', '--strictPort', '--host', '127.0.0.1'
    ], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });

    serverProcess.stdout.on('data', () => {});
    serverProcess.stderr.on('data', () => {});

    const start = Date.now();
    while (true) {
      try {
        const res = await fetch(url);
        if (res.status === 200) break;
      } catch {}
      if (Date.now() - start > 40000) {
        throw new Error('Vite dev server did not start within 40 seconds');
      }
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // Chrome executable
  const candidates = process.env.CHROME_PATH ? [process.env.CHROME_PATH] : [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  const executablePath = candidates.find(p => p && existsSync(p));
  if (!executablePath) {
    throw new Error('No Chrome or Edge executable found. Set CHROME_PATH environment variable.');
  }

  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--hide-scrollbars', '--force-color-profile=srgb']
  });
  const chromeVersion = await browser.version();

  result = {
    generatedAt: new Date().toISOString(),
    chrome: chromeVersion,
    viewport: { width: 1600, height: 1000 },
    screenshots: [],
    static: {},
    replay: {},
    errors: []
  };

  // Screenshot pass
  if (!skipShots) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`[page] ${msg.text()}`);
    });

    for (const id of SCENARIOS) {
      for (const theme of ['light', 'dark']) {
        for (const router of ['libavoid', 'channel']) {
          try {
            await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
            const t0 = Date.now();
            await page.goto(`${url}/?scenario=${id}&theme=${theme}&speed=instant&router=${router}&capture=1`, { waitUntil: 'networkidle0' });
            await page.waitForFunction(() => window.__replay && (window.__replay.done || window.__replay.error), { timeout: 60000, polling: 100 });

            const err = await page.evaluate(() => window.__replay?.error);
            if (err) {
              result.errors.push({ id, theme, router, message: String(err) });
              continue;
            }

            await new Promise(r => setTimeout(r, 900));

            let fileName = null;
            if (router === 'libavoid') {
              fileName = `${id}-${theme}.png`;
            } else if (router === 'channel' && theme === 'light') {
              fileName = `${id}-light-channel.png`;
            }

            if (fileName) {
              await page.screenshot({ path: join(out, fileName) });
              result.screenshots.push(fileName);
            }

            const metrics = await page.evaluate(() => window.__replay.metrics);
            if (!result.static[id]) result.static[id] = {};
            if (!result.static[id][router]) result.static[id][router] = {};
            result.static[id][router][theme] = metrics;

            const elapsed = Date.now() - t0;
            console.log(`shot ${id} ${theme} ${router} ${elapsed} ms`);
          } catch (e) {
            result.errors.push({ id, theme, router, message: e.message });
          }
        }
      }
    }
    await page.close();
  }

  // FPS pass
  if (!skipFps) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`[page] ${msg.text()}`);
    });

    let streamingScheduled = false;

    for (const id of SCENARIOS) {
      try {
        const navPromise = page.goto(`${url}/?scenario=${id}&theme=light&speed=1x&router=libavoid&capture=0`);

        if (!streamingScheduled && id === 'a') {
          streamingScheduled = true;
          setTimeout(async () => {
            try {
              await page.screenshot({ path: join(out, 'a-light-streaming.png') });
              result.screenshots.push('a-light-streaming.png');
            } catch (e) {
              result.errors.push({ id: 'a', theme: 'light', router: 'libavoid', message: `streaming screenshot: ${e.message}` });
            }
          }, 12000);
        }

        await navPromise;

        await page.waitForFunction(() => window.__replay && (window.__replay.done || window.__replay.error), { timeout: 120000, polling: 100 });

        const err = await page.evaluate(() => window.__replay?.error);
        if (err) {
          result.errors.push({ id, theme: 'light', router: 'libavoid', message: String(err) });
          continue;
        }

        await new Promise(r => setTimeout(r, 600));

        const metrics = await page.evaluate(() => window.__replay.metrics);
        result.replay[id] = metrics;
      } catch (e) {
        result.errors.push({ id, theme: 'light', router: 'libavoid', message: e.message });
      }
    }
    await page.close();
  }

  // Output
  writeFileSync(join(out, 'metrics.json'), JSON.stringify(result, null, 2));

  // Summary table
  console.log('\nScenario | fps.mean | fps.p5 | stability.maxMovedUnrelated | layout.meanMs');
  console.log('-'.repeat(78));
  for (const id of SCENARIOS) {
    const m = result.replay[id];
    const fpsMean = m?.fps?.mean != null ? m.fps.mean : '-';
    const fpsP5 = m?.fps?.p5 != null ? m.fps.p5 : '-';
    const maxMoved = m?.stability?.maxMovedUnrelated != null ? m.stability.maxMovedUnrelated : '-';
    const layoutMean = m?.layout?.meanMs != null ? m.layout.meanMs : '-';
    console.log(`${id.padEnd(8)} | ${String(fpsMean).padStart(8)} | ${String(fpsP5).padStart(6)} | ${String(maxMoved).padStart(29)} | ${String(layoutMean).padStart(11)}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) {
    try { await browser.close(); } catch {}
  }
  if (serverProcess) {
    serverProcess.kill();
  }
  if (result && result.errors.length) {
    console.log(`${result.errors.length} error(s):`, JSON.stringify(result.errors, null, 1));
    process.exitCode = 1;
  }
});

process.on('SIGINT', () => {
  if (browser) browser.close().catch(() => {});
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
