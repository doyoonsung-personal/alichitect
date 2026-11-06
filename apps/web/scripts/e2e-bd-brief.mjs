// Real SPA/layout, deterministic account/design/BD APIs. These mocks are not live model or production verification.
// Run: node --import ./scripts/alias.mjs scripts/e2e-bd-brief.mjs http://127.0.0.1:5179
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { snapshotFingerprint } from '../../../packages/bd-brief/src/evidence.ts';
import { makeEmptyContent } from '../../../packages/bd-brief/src/types.ts';
import { bt } from '../src/features/bd-brief/strings.ts';
import { csp } from '../../worker/src/http.ts';

const url = process.argv[2] ?? 'http://127.0.0.1:5179';
const output = fileURLToPath(new URL('../../../tmp/bd-integration/', import.meta.url));
mkdirSync(output, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', process.env.CHROME_PATH].find(path => path && existsSync(path));
assert.ok(chrome);
const fixture = JSON.parse(readFileSync(new URL('../src/replay/fixtures/ha.json', import.meta.url), 'utf8'));
const title = '고객 미팅 준비 테스트';
const events = fixture.turns[0].ev.map(([, event]) => event.type === 'commit' ? { ...event, title } : event);
const health = { ok: true, model: 'qwen3.8-max', endpoint: 'mock.local', catalog: { version: 'mock', entries: 223 }, keyConfigured: true, inFlight: 0, maxInFlight: 1,
  limits: { askChars: 6000, turns: 200, nodes: 150, requirements: 40, bodyBytes: 524288 }, uptimeS: 1 };
const contentText = {
  en: ['Understand the customer’s inventory planning workload.', 'Agree the next workshop', 'Which tasks need the most manual effort?', 'The customer wants to validate the inventory process first.'],
  ko: ['고객의 재고 계획 업무와 수작업 부담을 파악합니다.', '다음 워크숍 합의', '어떤 업무에 수작업이 가장 많이 필요하나요?', '고객은 먼저 재고 관리 프로세스를 검증하고 싶어 합니다.'],
  zh: ['了解客户的库存规划工作和手动处理负担。', '商定下一次研讨会', '哪些任务需要最多的人工处理？', '客户希望先验证库存管理流程。'],
};
const prefix = '/api/features/bd-brief';
let role = 'member', saved = null, notes = [], versions = [], noteCount = 0;
const requests = [], errors = [];
function candidateContent(lang, sourceId) {
  const text = contentText[lang];
  return { ...makeEmptyContent(), opportunity: { id: 'opp', text: text[0], sourceIds: [sourceId], review: 'unreviewed', origin: 'model' },
    valuePoints: [{ id: 'v1', label: text[1], text: text[0], sourceIds: [sourceId], review: 'unreviewed', origin: 'model' }],
    questions: [{ id: 'q1', text: text[2], priority: true, context: null, answer: null, sourceIds: [sourceId], review: 'unreviewed', origin: 'model' }],
  };
}
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
let page;
try {
  page = await browser.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const parsed = new URL(request.url()), path = parsed.pathname;
    const json = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/health') return json(health);
    if (path === '/api/me') return json({ email: 'bd-ui-test@example.org', name: 'BD browser test', role, turnsToday: 0, turnsPerDay: role === 'member' ? 60 : null,
      links: { account: '/account', admin: role === 'admin' ? '/admin' : null, signOut: '/auth/logout' }, features: role === 'admin' ? { businessCase: true, bdBrief: true } : {} });
    if (path === '/api/turn') return request.respond({ status: 200, contentType: 'application/x-ndjson', body: events.map(event => JSON.stringify(event)).join('\n') + '\n' });
    if (path === '/api/session-title') return json({ title, titleVersion: 1 });
    if (path === '/api/features/business-case') return json({ records: [] });
    if (path.startsWith(prefix)) {
      const method = request.method(), body = request.postData() ? JSON.parse(request.postData()) : undefined;
      requests.push({ path, method, body });
      if (role !== 'admin') return json({ error: 'not-available' }, 404);
      if (path === `${prefix}/briefs` && method === 'GET') return json({ brief: saved && saved.sourceKey === parsed.searchParams.get('sourceKey') ? saved : null });
      if (path === `${prefix}/briefs` && method === 'POST') {
        saved = { id: 'bd-browser-test', ownerId: 'mock-owner', sourceKind: 'browser-session', sourceKey: body.sourceKey, schemaVersion: 1, lang: body.lang,
          version: 0, content: makeEmptyContent(), snapshotFingerprint: snapshotFingerprint(body.snapshot), sourceRevision: body.snapshot.sourceRevision, createdAt: Date.now(), updatedAt: Date.now() };
        return json({ brief: saved }, 201);
      }
      if (path === `${prefix}/briefs/${saved?.id}` && method === 'GET') return json({ brief: saved, versions, notes });
      if (path === `${prefix}/briefs/${saved?.id}` && method === 'PATCH') {
        saved = { ...saved, content: body.content, version: saved.version + 1, snapshotFingerprint: body.snapshotFingerprint, sourceRevision: body.sourceRevision, updatedAt: Date.now() };
        versions.push({ version: saved.version, origin: body.origin, snapshotFingerprint: saved.snapshotFingerprint, savedAt: Date.now() });
        return json({ brief: saved });
      }
      if (path.endsWith('/notes') && method === 'POST') {
        const note = { id: `note-${++noteCount}`, briefId: saved.id, requestId: body.requestId, text: body.text, meetingDate: body.meetingDate, source: body.source, savedAt: Date.now() };
        notes.push(note); return json({ note, deduplicated: false }, 201);
      }
      if (path.endsWith('/generate')) {
        const sourceId = body.snapshot?.statements[0]?.id ?? notes[0]?.id ?? 'design';
        const fp = body.snapshot ? snapshotFingerprint(body.snapshot) : saved.snapshotFingerprint;
        const candidate = body.mode === 'initial'
          ? { kind: 'content', baseVersion: body.expectedVersion, snapshotFingerprint: fp, content: candidateContent(body.lang, sourceId), changes: null }
          : { kind: 'changes', baseVersion: body.expectedVersion, snapshotFingerprint: fp, content: null, changes: [{ id: 'change-1', kind: 'update', section: 'opportunity', targetId: 'opp', proposedText: contentText[body.lang][3], sourceIds: [sourceId], conflict: null }] };
        return json({ state: 'completed', candidate, usage: null });
      }
      if (path === `${prefix}/briefs/${saved?.id}` && method === 'DELETE') { saved = null; notes = []; versions = []; return request.respond({ status: 204 }); }
      return json({ error: 'not-found' }, 404);
    }
    if (path.startsWith('/api/')) return json({}, 404);
    return request.continue();
  });
  const clickText = async (selector, text) => {
    const handle = await page.evaluateHandle((selector, text) => [...document.querySelectorAll(selector)].find(element => element.textContent.trim() === text), selector, text);
    assert.ok(handle.asElement(), `Missing ${selector}: ${text}`);
    await handle.asElement().click(); await handle.dispose();
  };
  const host = () => page.evaluate(() => ({ memory: window.__ab.store.getState().session.memory, storage: localStorage.getItem('ab.sessions.v1'), pricing: window.__ab.store.getState().session.pricing }));
  const open = async () => {
    await page.click('.bd-brief-entry'); await page.waitForSelector('.bdb__panel');
    await page.waitForFunction(() => !document.querySelector('.bdb__working'));
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.bdb__panel')).opacity) > 0.99);
  };
  const close = async () => {
    await page.keyboard.press('Escape'); await page.waitForSelector('.bdb__panel', { hidden: true });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('bd-brief-entry')), true);
    assert.equal(await page.$eval('#root', element => element.inert), false);
  };

  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !!window.__ab);
  await page.evaluate(() => { window.__ab.controller.setLanguage('en'); window.__ab.controller.submit('Help our customer plan inventory with a human review before any business action.'); });
  await page.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done');
  assert.equal(await page.$('.bd-brief-entry'), null); assert.equal(await page.$('.business-case-entry'), null);
  role = 'verified'; await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.$('.bd-brief-entry'), null); assert.equal(await page.$('.business-case-entry'), null);
  assert.equal(requests.length, 0, 'disabled roles never call the module');
  role = 'admin'; await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.bd-brief-entry'); await page.waitForSelector('.business-case-entry');
  const initialHost = await host();
  await open();
  await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest('.bdb__panel')), true, 'focus stays inside dialog');
  await page.type('.bdb__prep textarea', 'Agree an in-person discovery workshop.');
  await page.click('.bdb__prep button[type=submit]');
  await page.waitForSelector('.bdb__brief');
  assert.equal(saved.version, 0, 'generation requires explicit acceptance/save');
  await page.click('.bdb__foot .btn--primary');
  await page.waitForFunction(label => document.querySelector('.bdb__foot .btn--primary')?.textContent.trim() === label, {}, bt('en', 'bdb.brief.saved'));
  assert.equal(saved.version, 1);
  assert.deepEqual(await host(), initialHost);

  await page.type('.bdb__notes textarea', 'The customer wants to validate the inventory process first.');
  await page.click('.bdb__notes button[type=submit]');
  await page.waitForSelector('.bdb__changes .bdb__change');
  assert.equal(saved.version, 1, 'notes review does not silently write accepted content');
  assert.equal(notes.length, 1);
  await clickText('.bdb__change-actions button', bt('en', 'bdb.review.accept'));
  await clickText('.bdb__review .bdb__actions button', bt('en', 'bdb.review.commit'));
  await page.waitForFunction(() => !document.querySelector('.bdb__review'));
  assert.equal(saved.version, 2); assert.equal(saved.content.opportunity.text, contentText.en[3]);
  assert.deepEqual(await host(), initialHost);

  // Latest source is observable while open; no automatic generation, patch, or writeback.
  const beforeChange = requests.length;
  await page.evaluate(() => {
    const record = structuredClone(window.__ab.store.getState().session);
    record.memory.requirements.push('Keep customer data in the selected region.');
    window.__ab.store.dispatch({ type: 'session/open', record, now: Date.now() });
  });
  await page.waitForFunction(text => [...document.querySelectorAll('.bdb__banner')].some(element => element.textContent.includes(text)), {}, bt('en', 'bdb.stale.banner'));
  assert.equal(requests.length, beforeChange);
  await close(); await open();
  await clickText('.bdb__banner button', bt('en', 'bdb.stale.refresh'));
  await page.waitForSelector('.bdb__change');
  assert.ok(requests.at(-1).body.snapshot.statements.some(statement => statement.text.includes('selected region')));
  await clickText('.bdb__change-actions button', bt('en', 'bdb.review.accept'));
  await clickText('.bdb__review .bdb__actions button', bt('en', 'bdb.review.commit'));
  await page.waitForFunction(() => !document.querySelector('.bdb__review'));
  assert.equal(saved.version, 3);

  for (const lang of ['en', 'ko', 'zh']) {
    await close(); await page.evaluate(lang => window.__ab.controller.setLanguage(lang), lang); await open();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.screenshot({ path: output + `bd-${lang}-desktop.png` });
    await page.setViewport({ width: 390, height: 844 });
    const dimensions = await page.$eval('.bdb__panel', element => ({ width: element.clientWidth, scroll: element.scrollWidth, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, `${lang} mobile dialog overflow`);
    assert.ok(dimensions.left >= 0 && dimensions.right <= 390, `${lang} dialog must fit the viewport`);
    await page.screenshot({ path: output + `bd-${lang}-mobile.png` });
  }
  await close();
  await page.screenshot({ path: output + 'both-entries-mobile.png' });
  assert.ok(await page.$eval('.bd-brief-entry svg', element => element.getBoundingClientRect().width > 0));
  assert.ok(await page.$eval('.business-case-entry svg', element => element.getBoundingClientRect().width > 0));
  await page.click('.business-case-entry'); await page.waitForSelector('.bc-dialog[open]'); await page.keyboard.press('Escape');
  await page.setViewport({ width: 1440, height: 1000 }); await open();

  // Styles are loaded first (Vite injects them inline); then apply the actual hosted policy to test the print action.
  await page.evaluate(policy => {
    window.__bdCspViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.__bdCspViolations.push({ directive: event.violatedDirective, source: event.sourceFile }));
    const meta = document.createElement('meta'); meta.httpEquiv = 'Content-Security-Policy'; meta.content = policy; document.head.append(meta);
    window.print = () => { window.__bdPrinted = true; };
  }, csp(false));
  await clickText('.bdb__foot button', bt('zh', 'bdb.brief.print'));
  await page.waitForFunction(() => window.__bdPrinted === true);
  await page.emulateMediaType('print');
  assert.equal(await page.$eval('.bdb__print', element => getComputedStyle(element).display), 'block');
  assert.equal(await page.$eval('#root', element => getComputedStyle(element).display), 'none');
  assert.equal(await page.evaluate(() => document.querySelector('.bc-print-document')), null);
  assert.deepEqual(await page.evaluate(() => window.__bdCspViolations), []);
  await page.screenshot({ path: output + 'bd-print-surface.png', fullPage: true });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.$eval('.bdb__print', element => getComputedStyle(element).display), 'none');
  await page.emulateMediaType('screen');

  // Both lazy stylesheets remain loaded. Opening/printing one module must not select the other's page.
  await close();
  await page.click('.business-case-entry');
  await page.waitForSelector('.bc-dialog[open] .bc-footer .btn--secondary:not(:disabled)');
  await page.evaluate(() => { window.__bcPrinted = false; window.print = () => { window.__bcPrinted = true; }; });
  await page.click('.bc-footer .btn--secondary');
  await page.waitForFunction(() => window.__bcPrinted === true);
  await page.emulateMediaType('print');
  assert.equal(await page.$eval('.bc-print-document', element => getComputedStyle(element).display), 'block');
  assert.equal(await page.$eval('.bc-print-document', element => getComputedStyle(element).page), 'bc-business-case');
  assert.equal(await page.$eval('#root', element => getComputedStyle(element).display), 'none');
  assert.equal(await page.$('.bdb__print'), null);
  assert.equal(await page.$eval('body', element => element.classList.contains('bdb-printing')), false);
  assert.deepEqual(await page.evaluate(() => window.__bdCspViolations), []);
  await page.screenshot({ path: output + 'bc-print-after-bd.png', fullPage: true });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.$('.bc-print-document'), null);
  await page.emulateMediaType('screen');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.bc-dialog')?.open);
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('business-case-entry')), true);
  await open();
  await page.evaluate(() => { window.__bdPrinted = false; window.print = () => { window.__bdPrinted = true; }; });
  await clickText('.bdb__foot button', bt('zh', 'bdb.brief.print'));
  await page.waitForFunction(() => window.__bdPrinted === true);
  await page.emulateMediaType('print');
  assert.equal(await page.$eval('.bdb__print', element => getComputedStyle(element).page), 'bd-meeting-brief');
  assert.equal(await page.$eval('.bdb__print', element => getComputedStyle(element).display), 'block');
  assert.equal(await page.$('.bc-print-document'), null);
  assert.equal(await page.$eval('body', element => element.classList.contains('bc-printing')), false);
  assert.deepEqual(await page.evaluate(() => window.__bdCspViolations), []);
  await page.screenshot({ path: output + 'bd-print-after-bc.png', fullPage: true });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMediaType('screen');
  await close();
  assert.deepEqual(errors, []);
  writeFileSync(output + 'result.json', JSON.stringify({ ok: true, api: 'mocked', assertions: ['admin-only entries', 'no hidden-module requests', 'explicit save', 'notes review acceptance', 'live source isolation', 'EN/KO/ZH desktop and390px', 'focus return', 'both entries coexist', 'CSP-safe isolated print', 'BC opens/prints/closes after BD', 'BD opens/prints/closes after BC'], requests: requests.map(({ path, method }) => ({ path, method })) }, null, 2));
  process.stdout.write('PASS: BD integration browser checks (mocked APIs), screenshots in tmp/bd-integration\n');
} catch (error) {
  if (page) await page.screenshot({ path: output + 'failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
