// Offline workflow checks through the real UI, served by Vite on a free loopback port in 5190-5192.
//   node scripts/e2e-workflow.mjs [--smoke]
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
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
  const fixture = JSON.parse(readFileSync(path.join(WEB, '../../packages/core/test/fixtures/workflows/support-email-triage.json'), 'utf8'));
  for (const [width, required] of [[1150, 4], [920, 3], [800, 2]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 800 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument(() => localStorage.setItem('ab.lang', 'en'));
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
    await page.evaluate(() => {
      window.__ab.store.dispatch({ type: 'session/mode', mode: 'workflow' });
      window.__ab.store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Support email', now: 1 });
    });
    for (const op of fixture.ops) {
      await page.evaluate((op) => {
        const { store } = window.__ab;
        store.dispatch({ type: 'turn/event', event: { type: 'op', phase: 'main', op }, now: 2 });
        store.dispatch({ type: 'turn/flush', now: 3 });
      }, op);
      await page.waitForSelector('[data-wf-card]');
      await sleep(60);
    }
    const inspect = () => page.evaluate(() => {
      const stage = document.querySelector('.wf-stage').getBoundingClientRect();
      const zoom = Number(/scale\(([^)]+)\)/.exec(document.querySelector('.react-flow__viewport').style.transform)?.[1]);
      const cards = [...document.querySelectorAll('[data-wf-card]')].map((el) => {
        const r = el.getBoundingClientRect(), title = el.querySelector('strong');
        return { id: el.dataset.wfCard, x: r.x, y: r.y, w: r.width, h: r.height,
          titlePx: parseFloat(getComputedStyle(title).fontSize) * zoom,
          visible: r.left >= stage.left && r.right <= stage.right && r.top >= stage.top + 110 && r.bottom <= stage.bottom - 48,
          clipped: el.scrollHeight > el.clientHeight + 1 || title.scrollWidth > title.clientWidth + 1 };
      });
      const visible = cards.filter((c) => c.visible);
      return { zoom, width: stage.width, following: document.querySelector('.wf-tools [aria-pressed]')?.getAttribute('aria-pressed') === 'true',
        columns: new Set(visible.map((c) => Math.round(c.x))).size,
        readable: cards.every((c) => c.titlePx >= 10.99), clipped: cards.filter((c) => c.clipped),
        newest: cards.filter((c) => c.x === Math.max(...cards.map((c) => c.x))).some((c) => c.visible) };
    });
    await sleep(300);
    const follow = await inspect();
    if (!follow.following || !follow.newest || !follow.readable || follow.zoom > 1) {
      throw new Error('Fixture follow: ' + JSON.stringify({ width, follow }));
    }
    await page.evaluate(() => {
      const { store } = window.__ab, s = store.getState();
      store.dispatch({ type: 'turn/event', event: { type: 'commit',
        memory: { ...s.session.memory, workflow: s.work.rawWorkflow }, changes: '', warnings: [] }, now: 4 });
    });
    await sleep(300);
    const check = await inspect();
    if (check.columns < required || !check.readable || check.zoom > 1 || check.clipped.length) {
      throw new Error('Fixture fit: ' + JSON.stringify({ width, required, check }));
    }
    cases++;
    console.log('PASS support-email fixture', width, JSON.stringify(check));
    if (width === 1150) {
      await page.setViewport({ width: 800, height: 800 });
      await sleep(300);
      const resized = await inspect();
      if (resized.columns < 2 || !resized.readable || resized.zoom > 1) throw new Error('Fixture resize: ' + JSON.stringify(resized));
      await page.click('.wf-tools button');
      await sleep(100);
      const fitted = await inspect();
      if (fitted.columns < 2 || !fitted.readable || fitted.zoom > 1) throw new Error('Fixture fit button: ' + JSON.stringify(fitted));
    }
    await page.close();
  }
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
