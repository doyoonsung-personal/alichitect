// Run with node scripts/e2e-guided-discovery.mjs from apps/web. Chrome uses an isolated tab,
// Vite gets an ephemeral local port, and the drawing endpoint serves recorded turns.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const openDiscovery = 'Help me find a use case';
const byName = (page, name, role) => page.locator(`::-p-aria(${name}[role="${role}"])`);
const clickButton = (page, name) => byName(page, name, 'button').click();
const health = { ok: true, model: 'fixture', endpoint: 'example.test', keyConfigured: true,
  inFlight: 0, maxInFlight: 1, uptimeS: 10, catalog: { version: 'fixture', entries: 1 },
  limits: { askChars: 600, turns: 40, nodes: 80, requirements: 12, bodyBytes: 200000 } };

async function recordedTurn(fixture) {
  const data = JSON.parse(await readFile(join(root, 'src/replay/fixtures', `${fixture}.json`), 'utf8'));
  return data.turns[0].ev.map(([, event]) => JSON.stringify(event)).join('\n') + '\n';
}

test('prospect onboarding in the browser', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'guided-discovery-'));
  let server;
  let browser;
  t.after(async () => {
    await browser?.close();
    await server?.close();
    await rm(cacheDir, { recursive: true, force: true });
  });
  server = await createServer({ root, cacheDir, configLoader: 'native', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((path) => path && existsSync(path));
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const streams = { cloud: await recordedTurn('ha'), workflow: await recordedTurn('stub-workflow') };

  async function open(t, { online = true, width = 1100 } = {}) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    t.after(async () => {
      await page.close();
      assert.deepEqual(errors, [], 'browser runtime errors');
    });
    const api = { online, turns: [] };
    await page.setViewport({ width, height: 850 });
    await page.setRequestInterception(true);
    page.on('request', async (req) => {
      const { pathname } = new URL(req.url());
      if (pathname === '/api/health') return req.respond({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ...health, keyConfigured: api.online }) });
      if (pathname === '/api/turn' && req.method() === 'POST') {
        const body = JSON.parse(await req.fetchPostData());
        api.turns.push(body);
        return req.respond({ status: 200, contentType: 'application/x-ndjson', body: streams[body.mode ?? 'cloud'] });
      }
      if (pathname.startsWith('/api/')) return req.respond({ status: 404 });
      if (req.url().startsWith(url) || req.url().startsWith('data:')) return req.continue();
      return req.abort();
    });
    await page.goto(`${url}?lang=en`);
    await page.waitForFunction((mode) => window.__ab?.store.getState().conn.mode === mode, {}, online ? 'live' : 'offline');
    return { page, api };
  }

  await t.test('exiting the guide restores the original draft and its cloud submission', async (t) => {
    const { page, api } = await open(t);
    const original = 'Our shop needs a more resilient checkout.';
    await page.locator('.brief__input').fill(original);
    await clickButton(page, openDiscovery);
    assert.equal(await byName(page, 'Your answer', 'textbox').map((box) => box.value).wait(), original);
    await clickButton(page, 'Exit discovery');
    assert.equal(await page.$eval('.brief__input', (box) => box.value), original);
    assert.equal(await page.$eval('input[name="focus"]:checked', (radio) => radio.value), 'cloud');
    assert.deepEqual(api.turns, []);
    await clickButton(page, 'Draw architecture');
    await page.waitForSelector('.app--working[data-view="cloud"]');
    await page.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done');
    assert.deepEqual(api.turns.map(({ ask, mode }) => ({ ask, mode })), [{ ask: original, mode: 'cloud' }]);
  });

  await t.test('a mobile prospect reviews and edits a proposal offline, then sends one workflow turn', async (t) => {
    const { page, api } = await open(t, { online: false, width: 375 });
    await clickButton(page, openDiscovery);
    await byName(page, 'Customer emails and requests', 'radio').click();
    await clickButton(page, 'Continue');
    await byName(page, 'Finding the right policy or answer', 'radio').click();
    await clickButton(page, 'Review my brief');
    const brief = byName(page, 'Starting brief', 'textbox');
    const suggested = await brief.map((box) => box.value).wait();
    assert.match(suggested, /polic/i);
    await clickButton(page, 'Back');
    assert.equal(await byName(page, 'Finding the right policy or answer', 'radio').map((radio) => radio.checked).wait(), true);
    await clickButton(page, 'Review my brief');
    const edited = 'Find the policy for each customer email and let our specialist check the source.';
    await brief.fill(edited);
    assert.deepEqual(api.turns, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
    await clickButton(page, 'Start with this');
    await page.waitForSelector('.notice--landing');
    assert.equal(await brief.map((box) => box.value).wait(), edited);
    assert.deepEqual(api.turns, []);
    api.online = true;
    await clickButton(page, 'Try again');
    await page.waitForSelector('.notice--landing', { hidden: true });
    await clickButton(page, 'Start with this');
    await page.waitForSelector('.app--working[data-view="workflow"]');
    await page.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done');
    assert.deepEqual(api.turns.map(({ ask, mode }) => ({ ask, mode })), [{ ask: edited, mode: 'workflow' }]);
  });

  await t.test('language changes translate the guide but keep a prospect’s own words', async (t) => {
    const { page, api } = await open(t);
    await clickButton(page, '한국어');
    await clickButton(page, 'AI 활용 사례 찾기');
    await byName(page, '직접 입력', 'radio').click();
    const context = '우리 팀은 행사 요청을 정리해요.';
    await byName(page, '내 답변', 'textbox').fill(context);
    await clickButton(page, '다음');
    await clickButton(page, '中文');
    await byName(page, '自己填写', 'radio').click();
    const focus = '找出两次预订的会议室。';
    await byName(page, '您的回答', 'textbox').fill(focus);
    await clickButton(page, '查看需求草稿');
    const proposed = await byName(page, '需求草稿', 'textbox').map((box) => box.value).wait();
    assert.ok(proposed.includes(context) && proposed.includes(focus));
    assert.deepEqual(api.turns, []);
  });
});
