// Offline panel regression and screenshots: node scripts/e2e-workflow-panel.mjs [output-directory]
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ?? path.join(os.tmpdir(), 'workflow-panel-shots');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function free(port) {
  return new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1');
  });
}
async function startServer() {
  for (let port = 5190; port <= 5199; port++) {
    if (!(await free(port))) continue;
    const child = spawn(process.execPath, ['--input-type=module', '-e',
      "import {createServer} from 'vite'; const s=await createServer({configLoader:'native',cacheDir:" +
      JSON.stringify(path.join(OUT, 'vite-cache')) + ",server:{port:" + port +
      ",strictPort:true,host:'127.0.0.1'}}); await s.listen();"], { cwd: WEB, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', () => {}); child.stderr.on('data', (s) => process.stderr.write(s));
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 80 && child.exitCode === null; i++) {
      try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return { url, stop: () => child.kill() }; } catch {}
      await sleep(250);
    }
    child.kill();
  }
  throw new Error('No local Vite port available');
}
const chrome = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => p && existsSync(p));
const fixture = JSON.parse(readFileSync(path.join(WEB, '../../packages/core/test/fixtures/workflows/support-email-triage.json'), 'utf8'));
const server = await startServer();
let browser;
const shots = [], results = [], errors = [];
try {
  browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  for (const width of [1150, 920, 800]) for (const lang of ['en', 'ko']) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage(), name = `${width}-${lang}-${theme}`;
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewport({ width, height: 900 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluateOnNewDocument((lang) => localStorage.setItem('ab.lang', lang), lang);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.url().startsWith(server.url + '/api/')) return req.respond({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, keyConfigured: true, model: 'test', endpoint: 'test',
          catalog: { version: 'test', entries: 1 }, limits: { askChars: 20000 }, inFlight: 0, maxInFlight: 4 }) });
      if (!req.url().startsWith(server.url) && !req.url().startsWith('data:')) return req.abort();
      return req.continue();
    });
    await page.goto(server.url);
    await page.waitForFunction(() => !!window.__ab);
    await page.evaluate((ops) => {
      const { store } = window.__ab;
      store.dispatch({ type: 'session/mode', mode: 'workflow' });
      store.dispatch({ type: 'turn/start', mode: 'workflow', ask: 'Support email', now: 1 });
      for (const op of ops) {
        store.dispatch({ type: 'turn/event', event: { type: 'op', phase: 'main', op }, now: 2 });
        store.dispatch({ type: 'turn/flush', now: 3 });
      }
      const s = store.getState();
      store.dispatch({ type: 'turn/event', event: { type: 'commit',
        memory: { ...s.session.memory, workflow: s.work.rawWorkflow }, changes: '', warnings: [] }, now: 4 });
    }, fixture.ops);
    await page.waitForSelector('[data-wf-card]');
    await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
    assert.equal(await page.$eval('#products-body', (e) => e.inert), true);
    await page.click('#products .pp__handle');
    await page.waitForSelector('#products[data-open]');
    await sleep(350);
    await page.evaluate(() => document.fonts.ready);
    const check = await page.evaluate(() => {
      const body = document.querySelector('#products-body'), rows = [...document.querySelectorAll('.wf-panel__step')];
      return { stage: document.querySelector('.wf-stage').clientWidth, panel: body.clientWidth, scroll: body.scrollWidth,
        ids: rows.map((r) => r.dataset.step), named: rows.every((r) => document.getElementById(r.getAttribute('aria-labelledby'))?.textContent),
        glyphs: rows.every((r) => r.querySelector('svg')), inert: body.inert,
        noise: [...document.querySelectorAll('.wf-panel__steps p')].some((p) => p.textContent.includes('Not specified')),
        handle: document.querySelector('.pp__handle').getAttribute('aria-label') };
    });
    assert.ok(check.scroll <= check.panel + 1, name + ' horizontal overflow');
    assert.ok(check.named && check.glyphs && !check.inert && !check.noise, name);
    assert.equal(check.ids[0], 'in');
    assert.ok(!/products/i.test(check.handle));
    for (const section of ['steps', 'mapping', 'cost']) {
      await page.evaluate((section) => {
        const body = document.querySelector('#products-body');
        const target = document.querySelector(section === 'steps' ? '.wf-panel__steps'
          : section === 'mapping' ? '.wf-panel__section' : '.wf-cost');
        body.scrollTop += target.getBoundingClientRect().top - body.getBoundingClientRect().top;
      }, section);
      const file = `${name}-${section}.png`;
      await page.screenshot({ path: path.join(OUT, file) }); shots.push({ name, section, file });
    }
    await page.focus('.pp__handle'); await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#products-body', (e) => e.inert), true);
    assert.equal(await page.$eval('.pp__handle', (e) => e === document.activeElement), true);
    await page.keyboard.press('Enter');
    await page.focus('.wf-panel__step[data-step="draft"] .pp-show');
    await page.keyboard.press('Enter');
    await sleep(150);
    assert.equal(await page.$eval('#products-body', (e) => e.inert), true);
    const action = await page.evaluate(() => {
      const s = window.__ab.store.getState();
      return { highlight: s.ui.highlight, panTo: s.ui.panTo, focused: document.activeElement?.className };
    });
    assert.ok(action.highlight?.cards.includes('draft'), JSON.stringify(action));
    assert.ok(action.panTo?.ids.includes('draft'), JSON.stringify(action));
    assert.equal(await page.$eval('[data-wf-card="draft"]', (e) => e.dataset.lit), 'true');
    assert.ok(action.focused.includes('pp__handle'));
    // Stress wrapping without modifying the canonical fixture or application state.
    await page.click('.pp__handle');
    await page.evaluate(() => {
      document.querySelector('.wf-panel__step h3').textContent = 'VeryLongUnbrokenStepLabel'.repeat(12);
      document.querySelector('.pp-table tbody td:last-child').textContent = 'VeryLongUnbrokenServiceName'.repeat(12);
      document.querySelector('#products-body').scrollTop = 0;
    });
    assert.ok(await page.$eval('#products-body', (e) => e.scrollWidth <= e.clientWidth + 1), name + ' stress overflow');
    await page.screenshot({ path: path.join(OUT, `${name}-wrap.png`) });
    results.push({ name, ...check }); console.log('PASS', name, JSON.stringify(check));
    await page.close();
  }
  assert.deepEqual(errors, []);
  // Overview sheets let reviewers inspect every requested combination in a few images.
  const review = await browser.newPage();
  for (const section of ['steps', 'mapping', 'cost']) for (const theme of ['light', 'dark']) {
    const selected = shots.filter((s) => s.section === section && s.name.endsWith(theme));
    await review.setViewport({ width: 1500, height: 1850, deviceScaleFactor: 1 });
    await review.setContent('<style>body{margin:0;display:grid;grid-template-columns:repeat(3,500px)}figure{margin:0}img{width:500px}</style>' +
      selected.map((s) => `<figure><figcaption>${s.name} ${section}</figcaption><img src="data:image/png;base64,${
        readFileSync(path.join(OUT, s.file)).toString('base64')}"></figure>`).join(''));
    await review.screenshot({ path: path.join(OUT, `review-${section}-${theme}.png`), fullPage: true });
  }
  writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log('Panel browser cases:', results.length, 'Screenshots:', OUT);
} finally { await browser?.close(); server.stop(); }
