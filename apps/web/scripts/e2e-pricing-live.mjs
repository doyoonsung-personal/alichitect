// From apps/web with DASHSCOPE_API_KEY set: npm run build, then node scripts/e2e-pricing-live.mjs.
// Exercises the public UI against the real local server. The PDF is written to a fresh temporary directory.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { configFromEnv, hostsFor } from '../../server/src/config.ts';
import { createTurnServer } from '../../server/src/server.ts';
import { loadCatalog } from '../../../packages/core/src/catalog-node.ts';
import { inspectPdf } from './export/inspect.ts';

assert.ok(process.env.DASHSCOPE_API_KEY, 'Set DASHSCOPE_API_KEY for this live check.');
const directory = mkdtempSync(join(tmpdir(), 'alichitect-pricing-'));
const config = configFromEnv({ ...process.env, TURN_LOG: '0' });
const api = createTurnServer({ config, catalog: loadCatalog(), apiKey: process.env.DASHSCOPE_API_KEY });
let web, browser;
try {
  const apiPort = await api.listen(0);
  config.allowedHosts = hostsFor(apiPort);
  web = await preview({ configLoader: 'native', preview: {
    host: '127.0.0.1', port: 0, proxy: { '/api': { target: 'http://127.0.0.1:' + apiPort, changeOrigin: true } },
  } });
  const url = web.resolvedUrls.local[0];
  config.allowedOrigins = [new URL(url).origin];
  const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    .find(p => p && existsSync(p));
  browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 480000, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('Browser error:', e.message));
  page.setDefaultTimeout(480000);
  await page.setViewport({ width: 1440, height: 900 });
  await (await page.createCDPSession()).send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: directory });
  await page.goto(url + '?lang=en', { waitUntil: 'networkidle2' });
  await page.type('.brief__input', 'Draw only the compute tier for our customer portal migration to Singapore. Two Linux web servers move to Alibaba Cloud ECS; our PostgreSQL database stays with its current provider and is explicitly out of scope. We need private connectivity to it.');
  await page.locator('.brief button[type=submit]').click();
  await page.waitForSelector('.rev[data-status="done"],.rev[data-status="failed"]');
  assert.equal(await page.$eval('.rev', n => n.dataset.status), 'done', await page.$eval('.rev', n => n.textContent));
  console.log('Cloud design committed.');
  const waitPricing = () => page.waitForResponse(r => new URL(r.url()).pathname === '/api/pricing' && r.request().method() === 'POST');
  let pricingCalls = 0;
  page.on('request', r => { if (new URL(r.url()).pathname === '/api/pricing') pricingCalls++; });
  const openAt = Date.now();
  await page.locator('.pricing-toggle').click();
  await page.waitForSelector('#pricing-reply');
  assert.equal(pricingCalls, 0);
  console.log('Local pricing opening in ms:', Date.now() - openAt);
  const second = waitPricing();
  const details = 'Both servers will use Singapore ecs.g7.large pay-as-you-go for 300 hours each per month. Migrate 400 GB once. Our current provider quotes USD 0.05 per GB outbound. Show compute and source egress only; keep disks, connectivity, tax and labor as unpriced. PostgreSQL stays with the current provider. Give this rough estimate now.';
  await page.type('#pricing-reply', details);
  await page.locator('.pricing-compose button[type=submit]').click();
  const answered = await second;
  const result = await answered.json();
  assert.equal(answered.status(), 200, JSON.stringify(result));
  const estimate = result.pricing.estimate;
  console.log('Estimate:', JSON.stringify(estimate));
  assert.equal(estimate.monthlyUsd, 64.8);
  assert.equal(estimate.oneTimeUsd, 20);
  await page.waitForFunction(() => !document.querySelector('#pricing-reply')?.readOnly);
  const correction = waitPricing();
  await page.type('#pricing-reply', 'Correction: only the second server changes to 100 hours per month. All other inputs stay the same.');
  await page.locator('.pricing-compose button[type=submit]').click();
  const corrected = (await (await correction).json()).pricing.estimate;
  assert.equal(corrected.monthlyUsd, 43.2);
  assert.deepEqual(corrected.items.filter(r => r.period === 'one-time'), estimate.items.filter(r => r.period === 'one-time'));
  const reviewing = waitPricing();
  await page.locator('.pricing-review button').click();
  const reviewed = (await (await reviewing).json()).pricing;
  assert.ok(reviewed.review.text);
  await page.waitForSelector('.pricing-review p');
  await page.reload();
  await page.waitForSelector('#estimate');
  assert.match(await page.$eval('#estimate', n => n.textContent), /43\.20/);
  assert.equal(await page.$eval('.pricing-review p', n => n.textContent), reviewed.review.text);
  assert.equal(pricingCalls, 3);
  // A long streamed response can age out of Chrome's DevTools network buffer. Observe the page's
  // fetch stream instead, keeping the app's own branch untouched while it renders the report.
  await page.evaluate(() => {
    const fetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await fetch(...args);
      if (new URL(response.url).pathname === '/api/proposal') {
        window.pricingTestDraft = response.clone().text().then(text => JSON.parse(text.trim().split('\n').at(-1)));
      }
      return response;
    };
  });
  await page.locator('.xp > button').click();
  await page.locator('.xp__panel button[type=submit]').click();
  await page.waitForFunction(() => !!window.pricingTestDraft);
  const last = await page.evaluate(() => window.pricingTestDraft);
  assert.equal(last.type, 'done', JSON.stringify(last));
  assert.ok(last.draft.exec && last.draft.cost, 'Expected an authored recommendation and pricing interpretation');
  let filename;
  for (let i = 0; i < 120 && !filename; i++) {
    filename = readdirSync(directory).find(f => f.endsWith('.pdf'));
    if (!filename) await wait(250);
  }
  assert.ok(filename, 'Expected a PDF download');
  const file = join(directory, filename);
  const pdf = await inspectPdf(new Uint8Array(readFileSync(file)));
  assert.match(pdf.text, /43\.20/);
  assert.match(pdf.text, /USD 20\b/);
  assert.ok(pdf.text.includes(last.draft.cost.slice(0, 22)), 'The PDF contains the model-authored interpretation');
  console.log(JSON.stringify({ file, pages: pdf.pages.length, complete: last.draft.complete, recommendation: last.draft.exec, interpretation: last.draft.cost }));
} finally {
  await browser?.close();
  await web?.close();
  await api.close();
}
