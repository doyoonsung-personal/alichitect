// Real SPA rendering/persistence; account, architecture and business-case APIs are deterministic mocks.
// Run: node scripts/e2e-business-case.mjs http://127.0.0.1:5179 [--pdf]
// --pdf additionally writes a Korean worksheet PDF; use the PDF skill before generating that artifact.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { pricingDesignKey } from '../../../packages/core/src/solution-pricing.ts';
import { calculateBusinessCase, validateDocument } from '../../../packages/business-case/src/engine.ts';
import { csp } from '../../worker/src/http.ts';

const url = process.argv[2] ?? 'http://127.0.0.1:5179';
const makePdf = process.argv.includes('--pdf');
const output = fileURLToPath(new URL('../../../tmp/business-case/', import.meta.url));
mkdirSync(output, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', process.env.CHROME_PATH].find(path => path && existsSync(path));
assert.ok(chrome, 'Chrome executable required');
const fixture = JSON.parse(readFileSync(new URL('../src/replay/fixtures/ha.json', import.meta.url), 'utf8'));
const title = '매장 재고 운영 개선 검토';
const events = fixture.turns[0].ev.map(([, event]) => event.type === 'commit' ? { ...event, title } : event);
const health = { ok: true, model: 'qwen3.8-max', endpoint: 'mock.local', catalog: { version: 'mock', entries: 223 },
  keyConfigured: true, inFlight: 0, maxInFlight: 1,
  limits: { askChars: 6000, turns: 200, nodes: 150, requirements: 40, bodyBytes: 524288 }, uptimeS: 1 };
const discussion = { summary: 'Validate the operational assumptions with the customer before making an investment decision.',
  questions: ['Which existing costs would actually disappear?'], validationSteps: ['Measure manual task time before and during the pilot.'] };
const prefix = '/api/features/business-case';
let enabled = false, nextRecord = 0;
const records = [];
const apiRequests = [];
const pageErrors = [];
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
let page;
try {
  page = await browser.newPage();
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const parsed = new URL(request.url()), path = parsed.pathname;
    const json = (body, status = 200) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/health') return json(health);
    if (path === '/api/me') return json({ email: 'business-case-test@example.org', name: 'Worksheet test', role: 'verified',
      turnsToday: 0, turnsPerDay: null, links: { account: '/account', admin: null, signOut: '/auth/logout' }, features: { businessCase: enabled } });
    if (path === '/api/turn') return request.respond({ status: 200, contentType: 'application/x-ndjson', body: events.map(event => JSON.stringify(event)).join('\n') + '\n' });
    if (path === '/api/session-title') return json({ title, titleVersion: 1 });
    if (path === prefix || path.startsWith(prefix + '/')) {
      const body = request.postData() ? JSON.parse(request.postData()) : undefined;
      apiRequests.push({ method: request.method(), path, body });
      if (!enabled) return json({ error: 'not-found' }, 404);
      if (path === prefix + '/versions' && request.method() === 'GET') return json({ versions: records.map(record => ({ id: record.id,
        sessionId: record.document.source.sessionId, title: record.document.source.title, createdAt: record.createdAt })) });
      if (path === prefix && request.method() === 'GET') return json({ records: records.filter(record => record.document.source.sessionId === parsed.searchParams.get('sessionId')) });
      if (path === prefix && request.method() === 'POST') {
        const checked = validateDocument(body.document);
        if (!checked.ok) return json({ error: 'invalid-document' }, 400);
        const record = { id: `bc_${(++nextRecord).toString(16).padStart(32, '0')}`, createdAt: Date.now(), document: checked.value };
        records.unshift(structuredClone(record));
        return json({ record }, 201);
      }
      if (path === prefix + '/explain') return json({ explanation: discussion });
      if (request.method() === 'DELETE') {
        const index = records.findIndex(record => record.id === path.slice(prefix.length + 1));
        if (index < 0) return json({ error: 'not-found' }, 404);
        records.splice(index, 1);
        return request.respond({ status: 204 });
      }
      return json({ error: 'not-found' }, 404);
    }
    if (path.startsWith('/api/')) return json({}, 404);
    return request.continue();
  });

  const clickText = async (selector, text) => {
    const handle = await page.evaluateHandle((selector, text) => [...document.querySelectorAll(selector)].find(element => element.textContent.trim() === text), selector, text);
    const element = handle.asElement(); assert.ok(element, `Missing ${selector}: ${text}`);
    await element.click(); await handle.dispose();
  };
  const field = async (name, value) => {
    const selector = `[data-field="${name}"]`;
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type(selector, String(value));
  };
  const open = async () => {
    await page.click('.business-case-entry');
    await page.waitForSelector('.bc-dialog[open] [data-field="baselineMonthlyCostUsd"]');
    await page.waitForFunction(() => !document.querySelector('.bc-inputs')?.disabled);
  };
  const close = async () => {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.bc-dialog')?.open);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('business-case-entry')), true, 'Escape restores focus to the entry button');
  };
  const sourceMonthly = () => page.$eval('.bc-source-totals dd', element => element.textContent);
  const stableHost = () => page.evaluate(() => ({ storage: localStorage.getItem('ab.sessions.v1'), memory: window.__ab.store.getState().session.memory,
    pricing: window.__ab.store.getState().session.pricing }));
  const seedPricing = async monthly => {
    const memory = await page.evaluate(() => window.__ab.store.getState().session.memory);
    const key = pricingDesignKey(memory);
    await page.evaluate(({ monthly, key }) => {
      const session = structuredClone(window.__ab.store.getState().session);
      session.pricing = { messages: [{ role: 'assistant', text: 'Mock current estimate for browser verification.' }], designKey: key,
        estimate: { currency: 'USD', monthlyUsd: monthly, oneTimeUsd: 1000, assumptions: ['Illustrative test fixture; not a customer quote.'], unknowns: [], items: [
          { label: 'Recurring solution cost', period: 'monthly', quantity: 1, unit: 'month', unitUsd: monthly, amountUsd: monthly, basis: 'user', source: 'Browser regression fixture' },
          { label: 'Setup', period: 'one-time', quantity: 1, unit: 'setup', unitUsd: 1000, amountUsd: 1000, basis: 'user', source: 'Browser regression fixture' },
        ] } };
      // session/open reads an existing saved record; fixture setup must seed both
      // the browser history and the live store, as the actual pricing controller does.
      const saved = JSON.parse(localStorage.getItem('ab.sessions.v1'));
      saved.sessions = saved.sessions.map(record => record.id === session.id ? session : record);
      localStorage.setItem('ab.sessions.v1', JSON.stringify(saved));
      window.__ab.store.dispatch({ type: 'session/open', record: session, now: Date.now() });
    }, { monthly, key });
    await page.waitForFunction(monthly => JSON.parse(localStorage.getItem('ab.sessions.v1')).sessions.some(session => session.pricing?.estimate.monthlyUsd === monthly), {}, monthly);
  };

  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !!window.__ab);
  await page.evaluate(() => window.__ab.controller.submit('여러 매장의 재고를 검토하고 담당자 승인 후 재배치를 제안하는 운영 개선안을 설계해 주세요.'));
  await page.waitForFunction(() => window.__ab.store.getState().session.revisions[0]?.status === 'done');
  await seedPricing(300);
  assert.equal(await page.$('.business-case-entry'), null, 'feature disabled hides the entry');
  assert.equal(apiRequests.length, 0, 'feature disabled performs no business-case requests');
  enabled = true;
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.business-case-entry');
  await open();
  await page.select('.bc-topbar select', 'en');
  assert.match(await sourceMonthly(), /300/);
  const before = await stableHost();
  for (const [name, value] of Object.entries({ baselineMonthlyCostUsd: 500, retiredMonthlyCostUsd: 100,
    manualHoursMonthly: 100, loadedHourlyCostUsd: 30, additionalRecurringMonthlyUsd: 0,
    additionalImplementationUsd: 2000, 'expected.cashRealizationPct': 50 })) await field(name, value);
  await field('evidence', 'Example only: customer-observed manual workload. Validate avoidable overtime and the measurement baseline during a pilot.');
  await page.waitForFunction(() => [...document.querySelectorAll('.bc-table tbody tr')].find(row => row.querySelector('th').textContent === 'Net cash benefit / month')?.querySelectorAll('td')[1]?.textContent.includes('175'));
  const displayed = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.bc-table tbody tr')].map(row => [row.querySelector('th').textContent, row.querySelectorAll('td')[1].textContent])));
  assert.match(displayed['Net cash benefit / month'], /175/);
  assert.match(displayed['Net cash over evaluation period'], /-\$900/);
  assert.deepEqual(await stableHost(), before, 'worksheet edits must not write host sessions or memory');
  await clickText('.bc-footer button', 'Save a version');
  await page.waitForFunction(() => document.querySelector('.bc-footer>span').textContent === 'Saved worksheet');
  assert.equal(records.length, 1);
  const expected = calculateBusinessCase(records[0].document).scenarios.find(scenario => scenario.id === 'expected');
  assert.equal(expected.netMonthlyCashUsd, 175);
  assert.equal(expected.horizonNetCashUsd, -900);
  assert.deepEqual(await stableHost(), before, 'server save must not rewrite host session');

  // A saved worksheet can outlive a local browser conversation. Explicit account
  // metadata makes that orphan removable without importing its customer inputs.
  const orphan = structuredClone(records[0]);
  orphan.id = 'bc_ffffffffffffffffffffffffffffffff'; orphan.document.source.sessionId = 'orphan_session';
  orphan.document.source.title = 'Orphaned test worksheet';
  records.push(orphan);
  await page.click('.bc-all-versions summary');
  await clickText('.bc-all-versions button', 'Load all saved versions');
  await page.waitForFunction(() => document.querySelectorAll('.bc-all-versions li').length === 2);
  const orphanRow = await page.evaluateHandle(() => [...document.querySelectorAll('.bc-all-versions li')].find(element => element.textContent.includes('Orphaned test worksheet')));
  const orphanDelete = await orphanRow.asElement().$('button'); await orphanDelete.click();
  await clickText('.bc-all-versions .bc-delete-confirm button', 'Delete version');
  await page.waitForFunction(() => document.querySelectorAll('.bc-all-versions li').length === 1);
  assert.equal(records.length, 1);
  assert.equal(records[0].document.source.sessionId, (await page.evaluate(() => window.__ab.store.getState().session.id)));
  assert.equal(await page.$eval('[data-field="manualHoursMonthly"]', element => element.value), '100');
  assert.deepEqual(await stableHost(), before, 'orphan cleanup must not change the active conversation');
  await orphanRow.dispose();

  await page.reload({ waitUntil: 'networkidle0' });
  await open(); await page.select('.bc-topbar select', 'en');
  assert.equal(await page.$eval('[data-field="manualHoursMonthly"]', element => element.value), '100');
  assert.equal(await page.$$eval('.bc-history li', elements => elements.length), 1);
  await clickText('.bc-panel button', 'Prepare discussion questions');
  await page.waitForSelector('.bc-explanation');
  assert.match(await page.$eval('.bc-explanation', element => element.textContent), /Which existing costs/);
  await field('evidence', records[0].document.inputs.evidence + ' Ask the operations lead to confirm.');
  assert.equal(await page.$('.bc-explanation'), null, 'editing inputs invalidates old AI guidance');

  await close(); await seedPricing(600); await open();
  await page.waitForSelector('.bc-source .bc-message--warn');
  assert.match(await sourceMonthly(), /300/, 'source values remain frozen until explicit refresh');
  await clickText('.bc-source button', 'Refresh from current session');
  await page.waitForFunction(() => !document.querySelector('.bc-source .bc-message--warn'));
  assert.match(await sourceMonthly(), /600/);
  assert.equal(await page.$eval('[data-field="manualHoursMonthly"]', element => element.value), '100');
  assert.equal(await page.$eval('[data-field="expected.cashRealizationPct"]', element => element.value), '50');
  await clickText('.bc-history button', 'Open version');
  await page.waitForSelector('.bc-source .bc-message--warn');
  assert.match(await sourceMonthly(), /300/, 'loading history restores its old source and warns');

  const screenshots = [];
  for (const lang of ['en', 'ko', 'zh']) {
    await page.select('.bc-topbar select', lang);
    await page.$eval('.bc-scroll', element => { element.scrollTop = 0; });
    await page.screenshot({ path: output + `/worksheet-${lang}-1440.png` });
    screenshots.push(`worksheet-${lang}-1440.png`);
    if (lang === 'ko') {
      await page.$eval('.bc-results', element => element.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: output + '/worksheet-ko-results-1440.png' });
      screenshots.push('worksheet-ko-results-1440.png');
    }
  }
  await page.setViewport({ width: 390, height: 844 });
  await page.select('.bc-topbar select', 'ko');
  await page.$eval('.bc-scroll', element => { element.scrollTop = 0; });
  const mobile = await page.evaluate(() => {
    const dialog = document.querySelector('.bc-dialog'), scroll = document.querySelector('.bc-scroll'), rect = dialog.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: innerWidth, dialogWidth: dialog.clientWidth,
      dialogScrollWidth: dialog.scrollWidth, contentWidth: scroll.clientWidth, contentScrollWidth: scroll.scrollWidth };
  });
  assert.ok(mobile.left >= 0 && mobile.right <= mobile.viewport, JSON.stringify(mobile));
  assert.ok(mobile.dialogScrollWidth <= mobile.dialogWidth + 1, JSON.stringify(mobile));
  assert.ok(mobile.contentScrollWidth <= mobile.contentWidth + 1, JSON.stringify(mobile));
  await page.screenshot({ path: output + '/worksheet-ko-390.png' });
  screenshots.push('worksheet-ko-390.png');
  await close(); await open();

  // Apply hosted restrictions after Vite finishes injecting its own development styles.
  // The module print action itself must add no iframe, script or inline CSS.
  await page.setViewport({ width: 1440, height: 1000 });
  await page.select('.bc-topbar select', 'ko');
  await page.evaluate(policy => {
    window.__bcViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.__bcViolations.push({ directive: event.violatedDirective, blockedURI: event.blockedURI,
      sourceFile: event.sourceFile, lineNumber: event.lineNumber }));
    const meta = document.createElement('meta'); meta.httpEquiv = 'Content-Security-Policy'; meta.content = policy;
    document.head.append(meta);
    window.__bcPrintCalls = 0; window.print = () => { window.__bcPrintCalls++; };
  }, csp(false));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.deepEqual(await page.evaluate(() => window.__bcViolations), [], 'applying policy alone does not produce violations');
  await page.click('.bc-footer button:first-of-type');
  await page.waitForFunction(() => window.__bcPrintCalls === 1);
  assert.equal(await page.$$('.bc-print-document').then(elements => elements.length), 1);
  assert.equal(await page.$$('.bc-print-document script,.bc-print-document iframe,.bc-print-document style,.bc-print-document [style]').then(elements => elements.length), 0);
  await page.emulateMediaType('print');
  const printState = await page.evaluate(() => ({ surface: getComputedStyle(document.querySelector('.bc-print-document')).display,
    host: [...document.body.children].filter(element => !element.classList.contains('bc-print-document')).map(element => getComputedStyle(element).display),
    violations: window.__bcViolations }));
  assert.equal(printState.surface, 'block');
  assert.ok(printState.host.every(display => display === 'none'), JSON.stringify(printState));
  assert.deepEqual(printState.violations, []);
  await page.screenshot({ path: output + '/worksheet-ko-print.png', fullPage: true });
  if (makePdf) await page.pdf({ path: output + '/business-case-ko.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.$('.bc-print-document'), null);
  assert.equal(await page.evaluate(() => document.body.classList.contains('bc-printing')), false);
  assert.deepEqual(pageErrors, []);
  const result = { mocks: 'Account, architecture and business-case responses are deterministic browser test fixtures.',
    expected, mobile, printState, screenshots, pdf: makePdf ? 'business-case-ko.pdf' : null,
    requestCounts: apiRequests.reduce((counts, request) => { const key = `${request.method} ${request.path}`; counts[key] = (counts[key] ?? 0) + 1; return counts; }, {}),
    checks: ['default-off', 'calculate', 'save/reload', 'orphan-version cleanup', 'explain/edit invalidation', 'host data unchanged', 'explicit source refresh', 'history source warning', 'EN/KO/ZH', 'mobile overflow', 'Escape/focus', 'hosted CSP print', 'print cleanup'] };
  writeFileSync(output + '/browser-results.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (page) {
    await page.screenshot({ path: output + '/failure.png' }).catch(() => {});
    console.error(await page.evaluate(() => ({ body: document.body.innerText.slice(-4000), violations: window.__bcViolations })).catch(() => ({})));
  }
  throw error;
} finally { await browser.close(); }
