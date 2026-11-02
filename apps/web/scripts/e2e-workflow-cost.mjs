// Offline cost regressions: node apps/web/scripts/e2e-workflow-cost.mjs [cache-directory]
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ?? path.join(os.tmpdir(), 'workflow-cost-checks');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function free(port) {
  return new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false)); s.once('listening', () => s.close(() => res(true))); s.listen(port, '127.0.0.1');
  });
}
async function startServer() {
  for (let port = 5210; port <= 5219; port++) {
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
const results = [], errors = [];

async function open(lang = 'en') {
  const width = 1150, theme = 'light';
  const page = await browser.newPage();
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

  await page.click('.wf-cost summary');
  return page;
}
async function run(name, fn) {
  const page = await open();
  try { await fn(page); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (e) { results.push({ name, ok: false }); console.error('FAIL', name, e.message); }
  finally { await page.close(); }
}
const runs = 'input[aria-label="Runs per month"]';
async function type(page, value) {
  await page.focus(runs);
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type(value);
}
async function stored(page) {
  return page.evaluate(() => window.__ab.store.getState().session.memory.estimate?.runsPerMonth);
}
async function reset(page) {
  await page.click('.wf-driver:has(' + runs + ') button:last-of-type');
}
try {
  browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  await run('C18: Escape restores 5000 after typing 7000', async page => {
    await type(page, '5000'); await page.keyboard.press('Enter');
    await type(page, '7000'); await page.keyboard.press('Escape');
    assert.equal(await stored(page), 5000);
    assert.equal(await page.$eval(runs, e => e.value), '5000');
    assert.ok(await page.$('#products[data-open]'));
    await page.keyboard.press('Tab'); assert.equal(await stored(page), 5000);
  });
  await run('C43: Escape cancels a new 5000 override', async page => {
    await type(page, '5000'); await page.keyboard.press('Escape');
    assert.equal(await stored(page), undefined);
    assert.ok(await page.$('#products[data-open]'));
    await page.keyboard.press('Escape'); assert.equal(await page.$('#products[data-open]'), null);
  });
  for (const bad of ['1e', '--5']) for (const action of ['Tab', 'Enter', 'Apply']) {
    await run('C21: invalid ' + bad + ' via ' + action, async page => {
      await type(page, '5000'); await page.keyboard.press('Enter'); await type(page, bad);
      assert.equal(await page.$eval(runs, e => e.validity.badInput), true);
      if (action === 'Apply') await page.click('.wf-driver:has(' + runs + ') button:first-of-type');
      else await page.keyboard.press(action);
      assert.equal(await stored(page), 5000);
      assert.equal(await page.$eval(runs, e => e.getAttribute('aria-invalid')), 'true');
      await reset(page);
      assert.equal(await page.$eval(runs, e => e.validity.badInput), false);
      assert.equal(await page.$eval(runs, e => e.value), '');
    });
  }
  for (const value of ['-5', '100']) await run(value === '-5' ? 'C29: reset rejected draft' : 'Codex #2: reset unsaved draft', async page => {
    await type(page, value);
    if (value === '-5') await page.keyboard.press('Enter');
    await reset(page);
    assert.equal(await page.$eval(runs, e => e.value), '');
    assert.equal(await page.$eval(runs, e => e.getAttribute('aria-invalid')), 'false');
    await page.keyboard.press('Tab'); assert.equal(await stored(page), undefined);
  });
  await run('C19 C20 C26 C32 C47: estimator choices and readable driver names', async page => {
    const names = await page.$$eval('.wf-driver legend', es => es.map(e => e.textContent));
    assert.ok(names.some(n => n.includes('Budget spent') && n.includes('Share of runs')));
    assert.ok(names.some(n => n.includes('Approve exact email') && n.includes('Extra loop passes')));
    assert.ok(names.some(n => n.includes('Revise') && n.includes('Extra loop passes')));
    assert.ok(!names.some(n => /^l\d+\s/.test(n)));
  });
  await run('C27: input bounds and visible range errors', async page => {
    assert.equal(await page.$eval(runs, e => e.max), '1000000000');
    assert.equal(await page.$eval(runs, e => e.min), '0');
    await type(page, '2000000000'); await page.keyboard.press('Enter');
    assert.equal(await stored(page), undefined);
    assert.equal(await page.$eval(runs, e => e.getAttribute('aria-invalid')), 'true');
    assert.ok(await page.$('.wf-driver [role="alert"]'));
  });
  for (const lang of ['en', 'ko', 'zh']) {
    const page = await open(lang);
    for (const [name, fn] of [
      ['C23 C34 Codex #7 localized units', async () => {
        const units = await page.$$eval('.wf-cost table:nth-of-type(2) td:first-of-type', es => es.map(e => e.textContent));
        assert.ok(!units.includes('mtok'));
        if (lang !== 'en') assert.ok(!units.includes('event') && !units.includes('detection call'));
        assert.ok(!(await page.$eval('.wf-cost', e => e.textContent)).includes('reviewer hour'));
      }],
      ['C23 C35 internal sources hidden', async () => {
        assert.doesNotMatch(await page.$eval('.wf-cost', e => e.textContent), /NOTES|research\/|Adjudicate/);
      }],
      ['C36 global scope note once', async () => {
        await page.evaluate(() => window.__ab.store.dispatch({ type: 'workflow/estimate', next: { scope: 'global' }, now: 5 }));
        const strings = JSON.parse(readFileSync(path.join(WEB, 'src/i18n/strings.json'), 'utf8'));
        const note = strings[lang]['workflow.cost.globalNote'];
        await page.waitForFunction(note => document.querySelector('.wf-cost').textContent.includes(note), {}, note);
        const texts = await page.$$eval('.wf-cost li, .wf-cost > p', es => es.map(e => e.textContent));
        assert.equal(texts.filter(t => t === note).length, 1);
      }],
      ['C41 localized runs punctuation', async () => {
        if (lang === 'zh') assert.match(await page.$eval('.wf-cost', e => e.textContent), /：10,000/);
      }],
    ]) {
      try { await fn(); results.push({ name: name + ' ' + lang, ok: true }); console.log('PASS', name, lang); }
      catch (e) { results.push({ name: name + ' ' + lang, ok: false }); console.error('FAIL', name, lang, e.message); }
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('Cost browser cases:', results.length, 'Passed:', results.filter(r => r.ok).length);
  assert.ok(results.every(r => r.ok));
} finally { await browser?.close(); server.stop(); }
