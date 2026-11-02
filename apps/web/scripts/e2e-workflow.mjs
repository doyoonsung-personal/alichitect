// Headless interaction checks for the canvas track, against a running dev server (default http://127.0.0.1:5196) or its own
// on a free port in 5185-5199. Prints PASS/FAIL per check and exits 1 when one fails.
//   node scripts/e2e-canvas.mjs [--url http://127.0.0.1:5196]
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const free = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
  });
async function startServer() {
  for (let port = 5190; port <= 5192; port++) {
    if (!(await free(port))) continue;
    const child = spawn(process.execPath, ['--input-type=module', '-e',
      "import {createServer} from 'vite'; const s=await createServer({configLoader:'native',cacheDir:'.workflow-cache',server:{port:" +
      port + ",strictPort:true,host:'127.0.0.1'}}); await s.listen();"], { cwd: WEB, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', () => {});
    child.stderr.on('data', (s) => process.stderr.write(s));
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 80; i++) {
      try {
        if (child.exitCode !== null) throw new Error('Vite exited');
        if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return { url, stop: () => child.kill() };
      } catch {}
      await sleep(250);
    }
    child.kill();
  }
  throw new Error('no free port');
}
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => p && existsSync(p));


console.log('Starting local workflow harness');
const server = await startServer();
console.log('Server ready', server.url);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
console.log('Browser ready');
let cases = 0;
const errors = [];
try {
  for (const width of [800, 920, 1150]) for (const count of (args.includes('--smoke') ? [10] : [10, 15, 25]))
    for (const focus of (args.includes('--smoke') ? [false] : [false, true, 'stage'])) {
    const page = await browser.newPage();
    await page.setViewport({ width: focus === 'stage' ? width + 360 : width, height: 700 });
    const lang = args.includes('--smoke') ? (width === 800 ? 'en' : width === 920 ? 'ko' : 'zh')
      : count === 10 ? 'en' : count === 15 ? 'ko' : 'zh';
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: count === 25 ? 'reduce' : 'no-preference' }]);
    await page.evaluateOnNewDocument((lang) => { localStorage.setItem('ab.lang', lang); }, lang);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().includes('/api/')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true, keyConfigured: true, model: 'test', endpoint: 'test', catalog: { version: 'test', entries: 1 },
        limits: { askChars: 20000 }, inFlight: 0, maxInFlight: 4,
      }) });
      if (!req.url().startsWith(server.url) && !req.url().startsWith('data:')) return req.abort();
      return req.continue();
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(server.url);
    await page.waitForFunction(() => !!window.__ab);
    await page.click('input[name="focus"][value="workflow"]');
    if (!await page.evaluate(() => window.__ab.store.getState().session.mode === 'workflow'
      && document.querySelector('.examples').hidden)) throw new Error('Landing focus did not switch');
    await page.click('input[name="focus"][value="cloud"]');
    await page.evaluate(({ count, focus }) => {
      const { store, controller } = window.__ab;
      const s = store.getState(), nodes = {}, edges = {};
      for (let i = 0; i < count; i++) {
        nodes['n' + i] = { id: 'n' + i, kind: i === 0 ? 'trigger' : i === count - 1 ? 'end' : i === 3 ? 'human' : 'agent',
          label: 'Step ' + i, ...(i > 0 && i < count - 1 && i !== 3 ? { ai: 'qwen-plus', turns: 5 } : {}) };
        if (i) edges['e' + i] = { id: 'e' + i, from: 'n' + (i - 1), to: 'n' + i };
      }
      edges.loop = { id: 'loop', from: 'n4', to: 'n2', kind: 'loop', max: 2 };
      edges.branch = { id: 'branch', from: 'n2', to: 'n4', kind: 'branch', label: 'Ready', outcome: 'approve' };
      for (let i = 0; i < 4; i++) nodes['a' + i] = { id: 'a' + i, kind: 'tool', label: 'Attachment ' + i, on: 'n1' };
      store.dispatch({ type: 'session/open', record: { ...s.session, mode: 'workflow',
        memory: { ...s.session.memory, workflow: { nodes, edges, groups: {} } } }, now: 1 });
      controller.setFocusDiagram(focus === true);
    }, { count, focus });
    await page.waitForSelector('[data-wf-card]');
    if (width === 800 && count === 10 && !focus) await page.screenshot({ path: path.join(WEB, '.workflow-preview.png') });
    await sleep(500);
    await page.evaluate((dark) => document.documentElement.dataset.theme = dark ? 'dark' : 'light', count === 15);
    if (width === 800 && focus === false) await page.screenshot({ path: path.join(WEB, '.workflow-' + lang + '.png') });
    const check = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-wf-card]')];
      const zoom = Number(/scale\(([^)]+)\)/.exec(document.querySelector('.react-flow__viewport').style.transform)?.[1]);
      return { cards: cards.length, stops: cards.filter((c) => c.tabIndex === 0).length,
        ids: ['diagram', 'products', 'workflow-keys'].every((id) => document.querySelectorAll('#' + id).length === 1),
        floor: cards.every((c) => parseFloat(getComputedStyle(c.querySelector('strong')).fontSize) * zoom >= 10.99) };
    });
    if (check.cards !== count + 3 || check.stops !== 1 || !check.ids || !check.floor) {
      throw new Error(JSON.stringify({ width, count, focus, check }));
    }
    if (width === 800 && count === 10 && focus === false) {
      await page.mouse.move(750, 400); await page.mouse.wheel({ deltaY: 40 }); await sleep(100);
      const before = await page.$eval('.react-flow__viewport', (e) => e.style.transform);
      await page.evaluate(() => {
        const { store } = window.__ab, memory = store.getState().session.memory;
        store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Revise', now: 2 });
        store.dispatch({ type: 'turn/event', event: { type: 'commit', memory, changes: '', warnings: [] }, now: 3 });
      });
      await sleep(100);
      const after = await page.$eval('.react-flow__viewport', (e) => e.style.transform);
      if (before !== after) throw new Error('Commit moved a paused camera');
    }
    await page.focus('[data-wf-card][tabindex="0"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#cv-pop');
    await page.keyboard.press('Escape');
    await page.click('#products .pp__handle');
    await page.waitForSelector('#products[data-open]');
    await page.keyboard.press('Escape');
    cases++;
    console.log('PASS', width, count, focus === 'stage' ? 'canvas width' : focus ? 'focus' : 'console');
    await page.close();
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Workflow browser cases:', cases);
} finally { await browser.close(); server.stop(); }
