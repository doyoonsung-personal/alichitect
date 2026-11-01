// Screenshots of the server-rendered pages (sign-in, account, admin) in both themes, and the checks that go with them:
// System follows a dark device with script off (the media query alone), and the account page's Light / Dark / System
// control switches the page and stores the choice under the key the app reads. The pages come from the Worker's own
// fetch handler over the test harness's in-memory D1 (test/helpers.ts: test accounts, no mail, nothing deployed), behind
// a local HTTP server on a free port in 8801-8810 that also serves the logo files. Writes screenshots/theme/.
//   node scripts/pages-shots.ts
import http from 'node:http';
import net from 'node:net';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import type { Page } from 'puppeteer-core';
import worker from '../src/index.ts';
import { ADMIN, makeCtx, makeEnv, signIn } from '../test/helpers.ts';

const OUT = fileURLToPath(new URL('../screenshots/theme/', import.meta.url));
const BRAND = fileURLToPath(new URL('../../web/public/brand/', import.meta.url));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, '/usr/bin/google-chrome'].find((p) => existsSync(p));
const SIZES: Record<string, [number, number]> = { '1440x900': [1440, 900], '1280x720': [1280, 720] };
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const free = (port: number): Promise<boolean> =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
  });

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  let port = 0;
  for (let p = 8801; p <= 8810 && !port; p++) if (await free(p)) port = p;
  if (!port) throw new Error('no free port in 8801-8810');
  const origin = `http://127.0.0.1:${port}`;
  const env = makeEnv({ ALLOWED_ORIGIN: origin });

  // the people the pages show: the admin (whose pages these are), a request waiting, two approved members
  const admin = await signIn(env, ADMIN, { name: 'Dae-yong Sung' });
  await signIn(env, 'mina.park@example.com', { name: 'Mina Park', requested: true });
  await env.DB.prepare('UPDATE users SET note = ?, requested_at = ? WHERE email = ?').bind('Pre-sales, Seoul team. Customer workshops next week.', Date.now() - 3600_000, 'mina.park@example.com').run();
  await signIn(env, 'li.wei@example.com', { name: 'Li Wei', status: 'approved' });
  await signIn(env, 'sam.ortiz@example.com', { name: 'Sam Ortiz', status: 'approved' });
  let cookie = '';

  const server = http.createServer(async (rq, rs) => {
    const url = new URL(rq.url ?? '/', origin);
    if (url.pathname.startsWith('/brand/') && /^[\w.-]+\.svg$/.test(url.pathname.slice(7))) {
      rs.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      rs.end(readFileSync(BRAND + url.pathname.slice(7)));
      return;
    }
    try {
      // only what the Worker reads: the session, the language, the client address
      const headers = new Headers({ 'CF-Connecting-IP': '198.51.100.7', Accept: rq.headers.accept ?? '*/*' });
      // the browser's own cookies (the language choice) plus the session of the person whose page this is
      const jar = [rq.headers.cookie, cookie].filter(Boolean).join('; ');
      if (jar) headers.set('Cookie', jar);
      if (rq.headers['accept-language']) headers.set('Accept-Language', rq.headers['accept-language']);
      const ctx = makeCtx();
      const res = await worker.fetch(new Request(url, { method: rq.method, headers, redirect: 'manual' }), env, ctx);
      await ctx.flush();
      const out: Record<string, string> = {};
      res.headers.forEach((v, k) => (out[k] = v));
      rs.writeHead(res.status, out);
      rs.end(Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      console.error(`  ${url.pathname}: ${(e as Error).message}`);
      rs.writeHead(500);
      rs.end();
    }
  });
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const problems: string[] = [];
  async function open(path: string, o: { theme?: 'light' | 'dark' | 'system'; device?: 'light' | 'dark'; size?: string; js?: boolean; as?: string } = {}): Promise<Page> {
    const [w, h] = SIZES[o.size ?? '1440x900'];
    const p = await browser.newPage();
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: o.device ?? 'light' }]);
    await p.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    if (o.js === false) await p.setJavaScriptEnabled(false);
    await p.evaluateOnNewDocument((t: string) => {
      try {
        localStorage.clear();
        localStorage.setItem('ab.lang', 'en');
        if (t === 'light' || t === 'dark') localStorage.setItem('ab.theme', t);
      } catch {
        /* storage blocked */
      }
    }, o.theme ?? 'system');
    p.on('console', (m) => {
      if (m.type() === 'error') problems.push(`${path}: ${m.text()}`);
    });
    p.on('pageerror', (e) => problems.push(`${path}: ${(e as Error).message}`));
    if (process.env.DEBUG) {
      p.on('request', (r) => console.log(`    -> ${r.url()}`));
      p.on('requestfinished', (r) => console.log(`    <- ${r.response()?.status()} ${r.url()}`));
      p.on('requestfailed', (r) => console.log(`    xx ${r.failure()?.errorText} ${r.url()}`));
    }
    cookie = o.as ?? '';
    await p.goto(origin + path, { waitUntil: 'load' });
    return p;
  }
  const shot = async (p: Page, name: string): Promise<void> => {
    await p.screenshot({ path: `${OUT}${name}.png` });
    console.log(`  ${name}`);
  };

  for (const theme of ['light', 'dark'] as const) {
    for (const size of Object.keys(SIZES)) {
      for (const [name, path, as] of [
        ['login', '/login', ''],
        ['account', '/account', admin.cookie],
        ['admin', '/admin', admin.cookie],
      ] as const) {
        const p = await open(path, { theme, size, as });
        await sleep(150);
        await shot(p, `worker-${theme}-${name}-${size}`);
        await p.close();
      }
    }
  }

  // no script, a dark device: the sign-in page is dark through the media query alone
  {
    const p = await open('/login', { device: 'dark', js: false });
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log(`  no script, dark device: /login body ${bg}`);
    await shot(p, 'worker-nojs-system-dark-login-1440x900');
    await p.close();
  }
  // the account page control: from System on a light device, choose Dark, then System again
  {
    const p = await open('/account', { device: 'light', as: admin.cookie });
    const state = (): Promise<unknown> =>
      p.evaluate(() => ({
        attr: document.documentElement.getAttribute('data-theme'),
        stored: localStorage.getItem('ab.theme'),
        pressed: [...document.querySelectorAll('button[data-theme-choice]')].map((b) => `${(b as HTMLElement).dataset.themeChoice}:${b.getAttribute('aria-pressed')}`).join(' '),
        visible: !(document.querySelector('[data-theme-control]') as HTMLElement).hidden,
        bg: getComputedStyle(document.body).backgroundColor,
      }));
    console.log('  account, before:', JSON.stringify(await state()));
    await p.click('button[data-theme-choice="dark"]');
    await sleep(500);
    console.log('  account, chose Dark:', JSON.stringify(await state()));
    await shot(p, 'worker-account-chose-dark-1440x900');
    // keyboard: Tab to System and press Space
    await p.focus('button[data-theme-choice="system"]');
    await p.keyboard.press('Space');
    await sleep(500);
    console.log('  account, chose System by keyboard:', JSON.stringify(await state()));
    await p.close();
  }
  await browser.close();
  server.close();
  if (problems.length) console.log(`\nbrowser messages:\n${[...new Set(problems)].join('\n')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
