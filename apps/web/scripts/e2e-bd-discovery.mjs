// Real SPA + BD route handler + SQLite/D1 adapter. Account/health and model output
// are synthetic; this verifies local behavior, not production or model quality.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { makeEnv, makeUser, makeCtx, req } from '../../worker/test/helpers.ts';
import { handleBdBrief } from '../../worker/src/features/bd-brief/routes.ts';
import { makeEmptyContent } from '../../../packages/bd-brief/src/types.ts';
import { snapshotFingerprint } from '../../../packages/bd-brief/src/evidence.ts';
import { bt } from '../src/features/bd-brief/strings.ts';

const url = process.argv[2] ?? 'http://127.0.0.1:5183';
const output = fileURLToPath(new URL('../../../tmp/bd-discovery/', import.meta.url));mkdirSync(output, { recursive: true });
const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ADMIN_ONLY: '1', BD_BRIEF_ALLOWLIST: 'discovery@example.org' });
const user = await makeUser(env, 'discovery@example.org', { status: 'approved', role: 'admin' });
let role = 'user';const requests = [], generations = [], errors = [];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();await page.setViewport({ width: 1440, height: 1000 });page.on('pageerror', e => errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const u = new URL(request.url()), path = u.pathname;
    const json = body => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/health') return json({ ok: true, model: 'synthetic', endpoint: 'mock.local', catalog: { version: 'mock', entries: 223 }, keyConfigured: true, inFlight: 0, maxInFlight: 1, limits: { askChars: 12000, requirements: 60, turns: 40 } });
    if (path === '/api/me') return json({ email: user.email, name: 'Discovery test', role, turnsToday: 0, turnsPerDay: 60, links: { account: '/account', admin: role === 'admin' ? '/admin' : null, signOut: '/auth/logout' }, features: role === 'admin' ? { bdBrief: true } : {} });
    if (path.startsWith('/api/features/bd-brief')) {
      const body = request.postData();requests.push({ path, method: request.method(), query: u.search });
      const r = req(path + u.search, { method: request.method(), ...(body ? { body, type: 'application/json' } : {}) });
      const ctx = makeCtx();
      const result = await handleBdBrief(r, env, ctx, { ...user, role }, new URL(r.url), { engine: async input => {
        generations.push(input);const content = makeEmptyContent();
        content.opportunity = { ...content.opportunity, text: '고객의 문제와 사업 영향은 아직 확인되지 않았습니다.', origin: 'model' };
        content.questions = ['현재 업무는 어떤 순서로 진행되나요?', '가장 많은 시간이나 수작업이 필요한 일은 무엇인가요?', '이번 미팅에서 어떤 결과를 얻고 싶으신가요?'].map((text,i) => ({ id: 'q'+i, text, priority: true, context: null, answer: null, sourceIds: [], review: 'unreviewed', origin: 'model' }));
        return { ok: true, result: { candidate: { kind: 'content', baseVersion: input.base?.version ?? 0, snapshotFingerprint: snapshotFingerprint(input.snapshot), content, changes: null }, usage: null, repairs: 0 } };
      } });await ctx.flush();
      return request.respond({ status: result.status, contentType: result.headers.get('content-type') ?? 'application/json', body: await result.text() });
    }
    if (path.startsWith('/api/')) { requests.push({ path, method: request.method() });return request.respond({ status: 404, contentType: 'application/json', body: '{}' }); }
    return request.continue();
  });
  const host = () => page.evaluate(() => ({ memory: window.__ab.store.getState().session.memory, revisions: window.__ab.store.getState().session.revisions, pricing: window.__ab.store.getState().session.pricing, storage: localStorage.getItem('ab.sessions.v1'), view: window.__ab.store.getState().view }));
  const settle = () => page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
  const waitLibrary = async () => { await page.waitForSelector('.bdb-discovery__columns');await page.waitForFunction(() => !document.querySelector('.bdb__working'));await settle(); };
  const clickText = async (selector, text) => {
    const h = await page.evaluateHandle((s,t) => [...document.querySelectorAll(s)].find(e => e.textContent.trim() === t), selector,text);assert.ok(h.asElement(), text);await h.asElement().click();await h.dispose();
  };
  await page.goto(url, { waitUntil: 'networkidle0' });await page.waitForFunction(() => !!window.__ab);
  assert.equal(await page.$('.bd-discovery-entry'), null);
  role = 'verified';await page.reload({ waitUntil: 'networkidle0' });assert.equal(await page.$('.bd-discovery-entry'), null);assert.equal(requests.filter(r=>r.path.startsWith('/api/features/bd-brief')).length, 0);
  role = 'admin';await page.reload({ waitUntil: 'networkidle0' });await page.waitForSelector('.bd-discovery-entry');
  await page.evaluate(() => window.__ab.controller.setLanguage('ko'));
  const initialHost = await host();assert.equal(initialHost.view, 'landing');
  await page.screenshot({ path: output+'landing-ko.png' });
  await page.click('.bd-discovery-entry');await waitLibrary();assert.equal(generations.length, 0);
  await page.screenshot({ path: output+'library-ko.png' });
  await page.click('.bdb-discovery__columns button[type=submit]');await page.waitForSelector('.bdb__prep textarea');await page.waitForFunction(() => !document.querySelector('.bdb__working'));
  assert.equal(generations.length, 0, 'creating a container does not spend a model call');
  assert.equal(await page.$eval('#root', e => e.inert), true);
  await page.click('.bdb__prep button[type=submit]');await page.waitForSelector('.bdb__brief');
  assert.equal(generations.length, 1);assert.deepEqual(generations[0].snapshot.statements, []);assert.equal(generations[0].snapshot.design, null);assert.equal(generations[0].snapshot.sourceKind, 'discovery');
  await page.click('.bdb__foot .btn--primary');await page.waitForFunction(label => document.querySelector('.bdb__foot .btn--primary')?.textContent.trim() === label, {}, bt('ko','bdb.brief.saved'));
  assert.deepEqual(await host(), initialHost);await page.$eval('.bdb__panel',e=>e.scrollTop=0);await settle();await page.screenshot({ path: output+'brief-ko.png' });
  await page.keyboard.press('Escape');await waitLibrary();
  assert.equal(await page.$eval('#root', e => e.inert), true, 'library retains modal isolation after child closes');
  assert.ok(await page.evaluate(() => !!document.activeElement?.closest('.bdb__panel')));
  await page.keyboard.press('Escape');await page.waitForSelector('.bdb__panel', { hidden: true });assert.equal(await page.$eval('#root',e=>e.inert),false);
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('bd-discovery-entry')),true);
  await page.reload({ waitUntil: 'networkidle0' });await page.click('.bd-discovery-entry');await waitLibrary();
  assert.equal(await page.$$eval('.bdb-discovery__list li', es=>es.length),1);
  await page.click('.bdb-discovery__list button');await page.waitForSelector('.bdb__brief');assert.equal(generations.length,1,'reopening does not regenerate');
  await page.keyboard.press('Escape');await waitLibrary();
  // A meeting that has never generated a brief can still be deleted.
  await page.type('.bdb-discovery__columns input','Unprepared meeting');await page.click('.bdb-discovery__columns button[type=submit]');await page.waitForSelector('.bdb__delete');
  await page.click('.bdb__delete');await clickText('.bdb__delete-confirm button',bt('ko','bdb.brief.deleteYes'));await waitLibrary();
  assert.equal(await page.$$eval('.bdb-discovery__list li',es=>es.length),1);
  await page.keyboard.press('Escape');await page.waitForSelector('.bdb__panel',{hidden:true});
  for (const lang of ['en','ko','zh']) {
    await page.evaluate(l=>window.__ab.controller.setLanguage(l),lang);await page.click('.bd-discovery-entry');await waitLibrary();
    const size=await page.$eval('.bdb__panel',e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(size.scroll<=size.width+1);
    await page.screenshot({path:output+`library-${lang}.png`});await page.keyboard.press('Escape');await page.waitForSelector('.bdb__panel',{hidden:true});
  }
  assert.ok(!requests.some(r=>r.path==='/api/turn'||r.path==='/api/session-title'));
  assert.deepEqual(errors,[]);const report={checks:['main-page capability gate','empty create without model call','real BD routes and SQLite persistence','generate and explicit save','host session unchanged','focus and modal isolation','reload and reopen without regeneration','delete ungenerated container','EN/KO/ZH desktop layout'],requests:requests.length,modelCalls:generations.length,errors};writeFileSync(output+'browser-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally { await browser.close();env.DB.sqlite.close(); }
