// Contrast audit of the Worker's server-rendered pages (sign-in, sign-up, forgot, pending, account, admin) in both themes,
// with the same measuring code as the app's (apps/web/scripts/theme-audit.mjs): every text colour against its real ground,
// the focus ring of every Tab stop read from the pixels, control borders, icons. The pages come from the Worker's own fetch
// handler over the test harness's in-memory D1, behind a local server on a free port in 8801-8810. Nothing is deployed.
//   node scripts/pages-audit.mjs [--themes light,dark]
import http from 'node:http';
import net from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import worker from '../src/index.ts';
import { ADMIN, makeCtx, makeEnv, signIn } from '../test/helpers.ts';
import { measure, report, results } from '../../web/scripts/theme-audit.mjs';

const args = process.argv.slice(2);
const themes = (args.includes('--themes') ? args[args.indexOf('--themes') + 1] : 'light,dark').split(',');
const BRAND = fileURLToPath(new URL('../../web/public/brand/', import.meta.url));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find((p) => existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const free = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
  });

let port = 0;
for (let p = 8801; p <= 8810 && !port; p++) if (await free(p)) port = p;
if (!port) throw new Error('no free port in 8801-8810');
const origin = `http://127.0.0.1:${port}`;
const env = makeEnv({ ALLOWED_ORIGIN: origin });
const admin = await signIn(env, ADMIN, { name: 'Dae-yong Sung' });
await signIn(env, 'mina.park@example.com', { name: 'Mina Park', requested: true });
await env.DB.prepare('UPDATE users SET note = ?, requested_at = ? WHERE email = ?').bind('Pre-sales, Seoul team. Customer workshops next week.', Date.now() - 3600_000, 'mina.park@example.com').run();
await signIn(env, 'li.wei@example.com', { name: 'Li Wei', status: 'approved' });
const waiting = await signIn(env, 'new.person@example.com', { name: 'New Person', status: 'pending' });
let cookie = '';

const server = http.createServer(async (rq, rs) => {
  const url = new URL(rq.url ?? '/', origin);
  if (url.pathname.startsWith('/brand/') && /^[\w.-]+\.svg$/.test(url.pathname.slice(7))) {
    rs.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    rs.end(readFileSync(BRAND + url.pathname.slice(7)));
    return;
  }
  try {
    const headers = new Headers({ 'CF-Connecting-IP': '198.51.100.7', Accept: rq.headers.accept ?? '*/*' });
    const jar = [rq.headers.cookie, cookie].filter(Boolean).join('; ');
    if (jar) headers.set('Cookie', jar);
    if (rq.headers['accept-language']) headers.set('Accept-Language', rq.headers['accept-language']);
    const ctx = makeCtx();
    const res = await worker.fetch(new Request(url, { method: rq.method, headers, redirect: 'manual' }), env, ctx);
    await ctx.flush();
    const out = {};
    res.headers.forEach((v, k) => (out[k] = v));
    rs.writeHead(res.status, out);
    rs.end(Buffer.from(await res.arrayBuffer()));
  } catch (e) {
    rs.writeHead(500);
    rs.end();
    console.error(url.pathname, e.message);
  }
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
const log = [];
const PAGES = [
  ['login', '/login', ''],
  ['signup', '/signup', ''],
  ['forgot', '/forgot', ''],
  ['pending', '/pending', waiting.cookie],
  ['account', '/account', admin.cookie],
  ['admin', '/admin', admin.cookie],
];
for (const theme of themes) {
  for (const [name, path, as] of PAGES) {
    const p = await browser.newPage();
    await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await p.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await p.evaluateOnNewDocument((t) => {
      try {
        localStorage.clear();
        localStorage.setItem('ab.lang', 'en');
        if (t === 'light' || t === 'dark') localStorage.setItem('ab.theme', t);
      } catch {}
    }, theme);
    p.on('pageerror', (e) => log.push(`${path}: ${e.message}`));
    cookie = as;
    process.stdout.write(`${name} ${theme}\n`);
    await p.goto(origin + path, { waitUntil: 'load' });
    await sleep(250);
    await measure(p, theme, `worker-${name}`, { focus: 24 });
    await p.close();
  }
}
await browser.close();
server.close();
report(results, log, themes);
