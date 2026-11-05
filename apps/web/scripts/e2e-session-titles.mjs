// Run against the Vite development server. The architecture response is mocked; layout and persistence use the real SPA.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://127.0.0.1:5174';
const output = fileURLToPath(new URL('../../../tmp/pdfs/workflow-tiles/', import.meta.url));
mkdirSync(output, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', process.env.CHROME_PATH].find(p => p && existsSync(p));
const fixture = JSON.parse(readFileSync(new URL('../src/replay/fixtures/ha.json', import.meta.url), 'utf8'));
const title = '다매장 재고 자동 분석 및 이동 제안';
const events = fixture.turns[0].ev.map(([, event]) => event.type === 'commit' ? { ...event, title } : event);
const health = { ok: true, model: 'qwen3.8-max', endpoint: 'test.local', catalog: { version: 'test', entries: 223 },
  keyConfigured: true, inFlight: 0, maxInFlight: 1,
  limits: { askChars: 6000, turns: 200, nodes: 150, requirements: 40, bodyBytes: 524288 }, uptimeS: 1 };
const requests = [];
const titleRequests = [];
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path === '/api/health') return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(health) });
    if (path === '/api/turn') {
      requests.push(JSON.parse(request.postData()));
      return request.respond({ status: 200, contentType: 'application/x-ndjson', body: events.map(event => JSON.stringify(event)).join('\n') + '\n' });
    }
    if (path === '/api/session-title') {
      titleRequests.push(JSON.parse(request.postData()));
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ title, titleVersion: 1 }) });
    }
    if (path.startsWith('/api/')) return request.respond({ status: 404, contentType: 'application/json', body: '{}' });
    return request.continue();
  });
  await page.goto(url, { waitUntil: 'networkidle0' });
  const ask = '여러 지역의 매장에서 판매와 재고를 분석해 재배치 및 발주를 제안하고 담당자 승인 후 실행하고 싶습니다.';
  await page.evaluate(text => window.__ab.controller.submit(text), ask);
  await page.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done');
  const saved = await page.evaluate(() => ({ title: window.__ab.store.getState().session.title,
    ask: window.__ab.store.getState().session.revisions[0].ask,
    stored: JSON.parse(localStorage.getItem('ab.sessions.v1')).sessions[0].title }));
  assert.equal(saved.title, title);
  assert.equal(saved.ask, ask);
  assert.equal(saved.stored, title);
  assert.equal(requests[0].generateTitle, true);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.evaluate(() => window.__ab.store.getState().session.title), title);
  await page.screenshot({ path: output + '/session-title-generated.png' });

  // A legacy record is renamed on main-page boot, without changing its history or activity timestamp.
  const beforeMigration = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('ab.sessions.v1'));
    const record = saved.sessions[0];
    record.title = record.revisions[0].ask;
    delete record.titleVersion;
    saved.sessions.push({ ...record, id: 'custom-name-kept', title: 'Approved inventory proposal' });
    localStorage.setItem('ab.sessions.v1', JSON.stringify(saved));
    return { updatedAt: record.updatedAt, memory: record.memory, revisions: record.revisions };
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem('ab.sessions.v1')).sessions.some(s => s.title === expected && s.titleVersion === 1), {}, title);
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('ab.sessions.v1')).sessions);
  const renamed = migrated.find(s => s.title === title);
  assert.deepEqual({ updatedAt: renamed.updatedAt, memory: renamed.memory, revisions: renamed.revisions }, beforeMigration);
  assert.equal(migrated.find(s => s.id === 'custom-name-kept').title, 'Approved inventory proposal');
  assert.deepEqual(titleRequests, [{ ask }]);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(titleRequests.length, 1, 'a second visit never regenerates a migrated title');

  // Distinct custom names are retained. Long custom names still need a usable menu and header.
  await page.evaluate(() => {
    const session = structuredClone(window.__ab.store.getState().session);
    session.title = '기존의아주긴세션이름'.repeat(250);
    window.__ab.store.dispatch({ type: 'session/open', record: session, now: Date.now() });
    window.__ab.store.dispatch({ type: 'sessions/list', sessions: [{ id: session.id, title: session.title,
      updatedAt: session.updatedAt, revisions: session.revisions.length }] });
  });
  const results = [];
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewport({ width, height: 900 });
    const trigger = await page.$('.header .menu--sessions > button');
    if (await trigger.evaluate(el => el.getAttribute('aria-expanded') !== 'true')) await trigger.click();
    await page.waitForFunction(() => {
      const bounds = document.querySelector('.header .menu--sessions .menu__list').getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth + 1;
    });
    const dimensions = await page.evaluate(() => {
      const menu = document.querySelector('.header .menu--sessions .menu__list');
      const text = menu.querySelector('.menu__title');
      const rect = menu.getBoundingClientRect(), titleRect = text.getBoundingClientRect();
      return { viewport: innerWidth, left: rect.left, right: rect.right, width: rect.width,
        textWidth: titleRect.width, textScroll: text.scrollWidth, bodyWidth: document.body.scrollWidth,
        titleOverflow: getComputedStyle(text).textOverflow };
    });
    results.push(dimensions);
    assert.ok(dimensions.width <= Math.min(360, width - 32) + 1, JSON.stringify(dimensions));
    assert.ok(dimensions.textScroll > dimensions.textWidth);
    assert.equal(dimensions.titleOverflow, 'ellipsis');
    assert.ok(dimensions.bodyWidth <= width, JSON.stringify(dimensions));
    await page.screenshot({ path: output + `/session-title-legacy-${width}.png` });
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.$('.header .menu--sessions .menu__list'), null);
  writeFileSync(output + '/session-title-browser.json', JSON.stringify({ saved, results }, null, 2));
  console.log(JSON.stringify({ saved, results }, null, 2));
} finally {
  await browser.close();
}
