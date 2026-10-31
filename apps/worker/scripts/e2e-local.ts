// End-to-end check against a running `npm run dev` (wrangler dev --env dev on http://localhost:8800, local D1, fake
// Google). Headless Chrome walks the whole flow and saves 1440x900 screenshots to apps/worker/screenshots/:
//   1. a new person opens the app -> /login -> fake Google -> /pending, requests access with a note
//   2. the admin (ADMIN_EMAILS) signs in -> the SPA, then /admin, and approves the request
//   3. the person reloads -> the SPA loads; a turn streams through POST /api/turn (real Qwen when the dev server has a key)
//   4. the admin removes the person's access -> their next API call is 401 at once
// Prints a JSON summary (status codes, event counts, timings, CSP violations). Never prints secrets.
//   node scripts/e2e-local.ts [--base http://localhost:8800] [--no-turn] [--ui-turn]
import puppeteer from 'puppeteer-core';
import type { Browser, BrowserContext, Page } from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const BASE = arg('--base') ?? 'http://localhost:8800';
const RUN_TURN = !process.argv.includes('--no-turn');
const UI_TURN = process.argv.includes('--ui-turn');
const ADMIN = 'dysung.alicloud@gmail.com';
const PERSON = `mina.park+${Date.now().toString(36)}@example.com`;
const SHOTS = fileURLToPath(new URL('../screenshots/', import.meta.url));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, '/usr/bin/google-chrome'].find((p) => existsSync(p));

const summary: Record<string, unknown> = {};
const cspViolations: string[] = [];
const pageErrors: string[] = [];

function watch(page: Page, who: string): void {
  page.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to/i.test(t)) cspViolations.push(`${who}: ${t.slice(0, 200)}`);
  });
  page.on('pageerror', (e) => pageErrors.push(`${who}: ${String((e as Error).message ?? e).slice(0, 200)}`));
  page.on('dialog', (d) => void d.accept());
}

async function fresh(browser: Browser, who: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-GB,en;q=0.9' });
  watch(page, who);
  return { ctx, page };
}

async function shot(page: Page, name: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: false });
}

async function signInWithFakeGoogle(page: Page, email: string, name: string): Promise<void> {
  await page.click('a.btn--google');
  await page.waitForSelector('input#email');
  await page.$eval('input#email', (el, v) => ((el as HTMLInputElement).value = v), email);
  await page.$eval('input#name', (el, v) => ((el as HTMLInputElement).value = v), name);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('button[type=submit]')]);
}

async function main(): Promise<void> {
  if (!CHROME) throw new Error('Chrome not found');
  mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none', '--lang=en-GB'] });
  try {
    // 1. a new person
    const p = await fresh(browser, 'person');
    const r0 = await p.page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    summary.anonymousRootLandsOn = new URL(p.page.url()).pathname;
    summary.loginStatus = r0?.status();
    await shot(p.page, 'login');
    await signInWithFakeGoogle(p.page, PERSON, 'Mina Park');
    summary.newPersonLandsOn = new URL(p.page.url()).pathname;
    await shot(p.page, 'pending-before-request');
    await p.page.type('textarea#note', 'Solutions architect, Jakarta. Retail customer demos for next week.');
    await Promise.all([p.page.waitForNavigation({ waitUntil: 'networkidle0' }), p.page.click('form[action="/pending"] button')]);
    summary.afterRequest = p.page.url().replace(BASE, '');
    await shot(p.page, 'pending');
    summary.pendingApiMe = await p.page.evaluate(async () => (await fetch('/api/me')).status);
    summary.pendingTurn = await p.page.evaluate(async () => {
      const r = await fetch('/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      return `${r.status} ${((await r.json()) as { code: string }).code}`;
    });

    // 2. the admin
    const a = await fresh(browser, 'admin');
    await a.page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
    await signInWithFakeGoogle(a.page, ADMIN, 'Doyoon Sung');
    summary.adminLandsOn = new URL(a.page.url()).pathname;
    await a.page.goto(`${BASE}/admin`, { waitUntil: 'networkidle0' });
    await shot(a.page, 'admin');
    const approveSel = await a.page.evaluate((email) => {
      const row = [...document.querySelectorAll('#requests tr')].find((tr) => tr.textContent?.includes(email));
      const f = row?.querySelector('form[action$="/approve"]');
      return f ? `form[action="${f.getAttribute('action')}"] button` : null;
    }, PERSON);
    if (!approveSel) throw new Error('request not listed on /admin');
    await Promise.all([a.page.waitForNavigation({ waitUntil: 'networkidle0' }), a.page.click(approveSel)]);
    summary.afterApprove = (await a.page.$eval('.notice', (el) => el.textContent?.trim())) ?? null;
    await shot(a.page, 'admin-after-approve');

    // 3. the person is let in
    await p.page.goto(`${BASE}/pending`, { waitUntil: 'networkidle0' });
    summary.approvedPersonLandsOn = new URL(p.page.url()).pathname;
    await p.page.waitForSelector('#root *', { timeout: 15_000 });
    summary.spaRendered = await p.page.evaluate(() => (document.querySelector('#root')?.children.length ?? 0) > 0);
    await shot(p.page, 'spa');
    summary.me = await p.page.evaluate(async () => {
      const m = (await (await fetch('/api/me')).json()) as Record<string, unknown>;
      return { status: m.status, role: m.role, turnsToday: m.turnsToday, turnsPerDay: m.turnsPerDay };
    });
    if (RUN_TURN) {
      summary.turn = await p.page.evaluate(async () => {
        const t0 = performance.now();
        const res = await fetch('/api/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: `e2e_${Date.now()}`, ask: 'A small online shop in Singapore: web servers behind a load balancer, a MySQL database and a CDN.', memory: { turns: [], requirements: [], graph: { groups: {}, nodes: {}, edges: {}, recs: [] }, tombstones: [] } }),
        });
        const out: Record<string, unknown> = { status: res.status, contentType: res.headers.get('content-type') };
        if (!res.body) return out;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let firstLineMs: number | null = null;
        const counts: Record<string, number> = {};
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i);
            buf = buf.slice(i + 1);
            if (!line.trim()) continue;
            firstLineMs ??= Math.round(performance.now() - t0);
            const e = JSON.parse(line) as { type: string; code?: string; memory?: { graph: { nodes: object } } };
            counts[e.type] = (counts[e.type] ?? 0) + 1;
            if (e.type === 'commit') out.committedNodes = Object.keys(e.memory!.graph.nodes).length;
            if (e.type === 'fatal') out.fatal = e.code;
          }
        }
        return { ...out, firstLineMs, totalMs: Math.round(performance.now() - t0), counts };
      });
    }
    if (UI_TURN) {
      await p.page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
      await p.page.type('.brief__input', 'An internal AI assistant for 200 staff in Singapore, with RAG over our documents.');
      await p.page.click('.brief button.btn--primary');
      await p.page.waitForFunction(() => document.querySelectorAll('.react-flow__node').length >= 3, { timeout: 120_000 });
      await new Promise((r) => setTimeout(r, 8000));
      await shot(p.page, 'spa-turn');
      summary.uiTurnCards = await p.page.evaluate(() => document.querySelectorAll('.react-flow__node').length);
    }

    // 4. removing access takes effect at once
    await a.page.goto(`${BASE}/admin`, { waitUntil: 'networkidle0' });
    const revokeSel = await a.page.evaluate((email) => {
      const row = [...document.querySelectorAll('#approved tr')].find((tr) => tr.textContent?.includes(email));
      const f = row?.querySelector('form[action$="/revoke"]');
      return f ? `form[action="${f.getAttribute('action')}"] button` : null;
    }, PERSON);
    if (!revokeSel) throw new Error('approved person not listed');
    await Promise.all([a.page.waitForNavigation({ waitUntil: 'networkidle0' }), a.page.click(revokeSel)]);
    summary.revokedApiMe = await p.page.evaluate(async () => (await fetch('/api/me')).status);
    await p.page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    summary.revokedPersonLandsOn = new URL(p.page.url()).pathname;

    // the Korean and Chinese sign-in pages
    const k = await fresh(browser, 'ko');
    await k.page.goto(`${BASE}/login?lang=ko`, { waitUntil: 'networkidle0' });
    await shot(k.page, 'login-ko');
    await k.page.goto(`${BASE}/login?lang=zh`, { waitUntil: 'networkidle0' });
    await shot(k.page, 'login-zh');
    summary.headers = await k.page.evaluate(async () => {
      const r = await fetch('/login');
      return { csp: !!r.headers.get('content-security-policy'), nosniff: r.headers.get('x-content-type-options'), frame: r.headers.get('x-frame-options') };
    });
  } finally {
    await browser.close();
  }
  summary.cspViolations = cspViolations;
  summary.pageErrors = pageErrors;
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error('e2e failed:', (e as Error).message);
  console.log(JSON.stringify({ ...summary, cspViolations, pageErrors }, null, 2));
  process.exit(1);
});
