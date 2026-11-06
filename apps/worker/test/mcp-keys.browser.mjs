// Local-only browser regression using the existing D1/Worker test harness.
// Build apps/web first; run: node test/mcp-keys.browser.mjs [--before]
// Test users/keys live only in memory. Screenshots never contain a secret.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { makeEnv, makeUser, makeCtx, PASSWORD } from './helpers.ts';
import worker from '../src/index.ts';

const before = process.argv.includes('--before');
const base = 'http://localhost:8806';
const out = new URL('../../../tmp/mcp-keys/', import.meta.url);
await mkdir(out, { recursive: true });
const dist = new URL('../../web/dist/', import.meta.url);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const env = makeEnv({ ALLOWED_ORIGIN: base, ADMIN_EMAILS: 'admin@example.test', DASHSCOPE_API_KEY: 'local-dummy', ASSETS: {
  async fetch(req) {
    const path = new URL(req.url).pathname;
    try {
      const file = new URL(path === '/' ? 'index.html' : path.slice(1), dist);
      if (!file.href.startsWith(dist.href)) return new Response(null, { status: 404 });
      return new Response(await readFile(file), { headers: { 'Content-Type': types[path === '/' ? '.html' : path.slice(path.lastIndexOf('.'))] ?? 'application/octet-stream' } });
    } catch { return new Response(null, { status: 404 }); }
  },
} });
const owner = await makeUser(env, 'keys@example.test', { status: 'approved', name: 'Local keys test' });
// Do not show the unrelated first-login release walkthrough.
const { claimReleaseNotice } = await import('../src/release-notice.ts');
await claimReleaseNotice(new Request(base + '/api/release-notice', { method: 'POST' }), env, owner, 'en');
const networkFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  assert.equal(url.origin, base, 'Only the local test origin is allowed');
  return networkFetch(input, init);
};
const server = createServer(async (incoming, outgoing) => {
  try {
    const body = [];
    for await (const chunk of incoming) body.push(chunk);
    const headers = new Headers();
    for (let i = 0; i < incoming.rawHeaders.length; i += 2) headers.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1]);
    const req = new Request(base + incoming.url, { method: incoming.method, headers, ...(body.length ? { body: Buffer.concat(body) } : {}) });
    const ctx = makeCtx();
    const res = await worker.fetch(req, env, ctx);
    outgoing.statusCode = res.status;
    for (const [key, value] of res.headers) if (key !== 'set-cookie') outgoing.setHeader(key, value);
    outgoing.setHeader('set-cookie', res.headers.getSetCookie());
    outgoing.end(Buffer.from(await res.arrayBuffer()));
    await ctx.flush();
  } catch { outgoing.writeHead(500); outgoing.end('Local test harness failed'); }
});
await new Promise(resolve => server.listen(8806, '127.0.0.1', resolve));
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(p => p && existsSync(p));
assert.ok(chrome, 'Chrome must be installed');
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--no-first-run'] });
const summary = { mode: before ? 'before' : 'after', screenshots: [], renders: [], pageErrors: [] };
try {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });
  await page.setRequestInterception(true);
  page.on('request', req => new URL(req.url()).origin === base ? req.continue() : req.abort());
  page.on('pageerror', err => summary.pageErrors.push(err.message));
  await page.setViewport({ width: 1150, height: 900, deviceScaleFactor: 1 });
  await page.goto(base + '/login?next=%2Faccount%2Fkeys', { waitUntil: 'networkidle0' });
  await page.type('#email', owner.email);
  await page.type('#password', PASSWORD);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('form[action="/login"] button[type="submit"]')]);
  assert.equal(new URL(page.url()).pathname, '/account/keys');
  async function issue(name, scope = 'write') {
    await page.type('input[name="name"]', name);
    await page.select('select[name="scope"]', scope);
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('form[action="/account/keys"] button[type="submit"]')]);
    assert.ok(await page.$('#mcp-secret'), 'issue shows the secret once');
    const result = await page.evaluate(() => ({ listOnIssue: !!document.querySelector('form[action="/account/keys/revoke"]'), countOnIssue: document.querySelector('#mcp-active-count')?.textContent }));
    assert.ok(result.listOnIssue);
    await page.goto(base + '/account/keys', { waitUntil: 'networkidle0' });
    assert.equal(await page.$('#mcp-secret'), null);
    return result;
  }
  if (!before) {
    // Produce real revoked records through the browser before filling all three slots.
    for (let i = 1; i <= 2; i++) {
      await issue(`Retired example ${i}`);
      page.once('dialog', d => d.accept());
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('form[action="/account/keys/revoke"] button')]);
    }
  }
  for (let i = 1; i <= 3; i++) summary.lastIssue = await issue(`Example ${i} · ${i === 2 ? 'Read only' : 'Design client'}`, i === 2 ? 'read' : 'write');
  if (!before) {
    assert.equal(summary.lastIssue.countOnIssue, '3 of 3 active keys');
    assert.equal(await page.$eval('form[action="/account/keys"] button[type="submit"]', b => b.disabled), true);
    const fourth = await page.evaluate(async () => {
      const form = document.querySelector('form[action="/account/keys"]');
      const values = new URLSearchParams(new FormData(form));
      values.set('name', 'Blocked fourth');
      const response = await fetch('/account/keys', { method: 'POST', body: values });
      const html = await response.text();
      return { status: response.status, clearMessage: html.includes('Revoke a key before creating another.') };
    });
    assert.deepEqual(fourth, { status: 400, clearMessage: true });
    summary.fourth = fourth;
  }
  for (const lang of ['en', 'ko']) {
    for (const width of [1150, 390]) {
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      await page.goto(base + '/account/keys?lang=' + lang, { waitUntil: 'networkidle0' });
      const measurements = await page.evaluate(() => ({
        firstRevokeY: Math.round(document.querySelector('form[action="/account/keys/revoke"]').getBoundingClientRect().top + window.scrollY),
        documentWidth: document.documentElement.scrollWidth,
        count: document.querySelector('#mcp-active-count')?.textContent,
        historyOpen: document.querySelector('#mcp-history')?.open,
      }));
      summary.renders.push({ lang, width, ...measurements });
      assert.equal(measurements.documentWidth, width, 'no horizontal overflow');
      if (!before) {
        assert.ok(measurements.firstRevokeY < 900, 'management is visible on the first screen');
        assert.equal(measurements.historyOpen, false);
        assert.equal(await page.$$eval('#mcp-active article', els => els.length), 3);
        assert.equal(await page.$$eval('#mcp-history article', els => els.length), 2);
      }
      const name = `${before ? 'before' : 'after'}-${lang}-${width}.png`;
      await page.screenshot({ path: fileURLToPath(new URL(name, out)), fullPage: true });
      summary.screenshots.push(name);
      if (!before) {
        await page.screenshot({ path: fileURLToPath(new URL(`after-${lang}-${width}-top.png`, out)) });
        await page.click('#mcp-history summary');
        assert.equal(await page.$eval('#mcp-history', el => el.open), true);
        assert.equal(await page.$$eval('#mcp-history article', els => els.filter(el => el.getBoundingClientRect().height > 0).length), 2);
        await page.click('#mcp-history summary');
      }
    }
  }
  // Cancel then confirm the existing revoke flow; state must change only on confirmation.
  let confirmations = 0;
  page.once('dialog', async d => { confirmations++; await d.dismiss(); });
  await page.click('form[action="/account/keys/revoke"] button');
  assert.equal(confirmations, 1);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM mcp_keys WHERE revoked_at IS NULL').get().n, 3);
  page.once('dialog', async d => { confirmations++; await d.accept(); });
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('form[action="/account/keys/revoke"] button')]);
  assert.equal(confirmations, 2);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM mcp_keys WHERE revoked_at IS NULL').get().n, 2);
  summary.revoke = 'cancel preserved 3; confirm left 2 active';
  // Verify the actual built SPA account menu leads back to this page.
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.menu--account button');
  await page.click('.menu--account button');
  assert.equal(await page.$eval('.menu--account a[href="/account/keys"]', el => el.textContent), 'MCP API 키');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('.menu--account a[href="/account/keys"]')]);
  assert.equal(new URL(page.url()).pathname, '/account/keys');
  summary.menu = 'built SPA account menu opens /account/keys';
  assert.deepEqual(summary.pageErrors, []);
  await writeFile(new URL(`${before ? 'before' : 'after'}.json`, out), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  env.DB.sqlite.close();
  globalThis.fetch = networkFetch;
}
