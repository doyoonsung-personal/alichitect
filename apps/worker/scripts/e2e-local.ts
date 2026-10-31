// End-to-end check against a running `npm run dev` (wrangler dev --env dev on http://localhost:8800, local D1, mails
// logged instead of sent). Headless Chrome walks the whole account flow and saves 1440x900 screenshots to
// apps/worker/screenshots/. The codes are read from the mail log: the wrangler dev output, which MAIL_LOG fills with
// one {"evt":"mail-logged","to":...,"subject":...} line per mail (the subject carries the code).
//   1. the admin address (ADMIN_EMAILS) signs up, enters its code -> an approved admin, in the builder
//   2. a new person signs up with a note, enters the code -> /pending; the admin is mailed about the request
//   3. the admin approves on /admin; the person gets the approval mail
//   4. the person signs in with the password -> the SPA; a turn streams through POST /api/turn (real Qwen when the dev
//      server has a key)
//   5. the person resets the password by email code -> every older session is dead at once; the new password works
//   6. the admin removes the person's access -> their next API call is 401 at once
//   7. a stranger's wrong guesses at the admin address lock that address-and-IP pair, never the admin's own browser (device
//      cookie); a weak password is refused on the sign-up page
// Prints a JSON summary (statuses, landings, mail subjects with the codes masked, event counts, timings, CSP
// violations). Never prints a password or a key.
//   node scripts/e2e-local.ts --mail-log <wrangler dev output file> [--base http://localhost:8800] [--no-turn]
import puppeteer from 'puppeteer-core';
import type { Browser, BrowserContext, Page } from 'puppeteer-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const BASE = arg('--base') ?? 'http://localhost:8800';
const MAIL_LOG = arg('--mail-log');
const RUN_TURN = !process.argv.includes('--no-turn');
const ADMIN = 'dysung.alicloud@gmail.com';
const PERSON = `mina.park+${Date.now().toString(36)}@example.com`;
// test passwords made here, used here, never printed
const pw = (): string => `e2e-${randomBytes(12).toString('base64url')}`;
const ADMIN_PW = pw();
const PERSON_PW = pw();
const PERSON_PW2 = pw();
const SHOTS = fileURLToPath(new URL('../screenshots/', import.meta.url));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, '/usr/bin/google-chrome'].find((p) => existsSync(p));

const summary: Record<string, unknown> = {};
const cspViolations: string[] = [];
const pageErrors: string[] = [];

/* ---------- the mail log ---------- */

interface LoggedMail {
  to: string;
  subject: string;
}

function mails(): LoggedMail[] {
  if (!MAIL_LOG) throw new Error('--mail-log <file> is required (the wrangler dev output)');
  const out: LoggedMail[] = [];
  for (const line of readFileSync(MAIL_LOG, 'utf8').split(/\r?\n/)) {
    const at = line.indexOf('{"evt":"mail-logged"');
    if (at < 0) continue;
    try {
      const m = JSON.parse(line.slice(at)) as LoggedMail;
      out.push({ to: m.to, subject: m.subject });
    } catch {
      /* a partial line */
    }
  }
  return out;
}

/** Waits for the n-th mail (counting from `after`) to an address whose subject matches. */
async function waitForMail(to: string, re: RegExp, after: number): Promise<LoggedMail> {
  for (let i = 0; i < 100; i++) {
    const found = mails().filter((m, idx) => idx >= after && m.to === to && re.test(m.subject));
    if (found.length) return found.at(-1)!;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no mail to ${to} matching ${re}`);
}

const codeOf = (m: LoggedMail): string => /\b(\d{6})\b/.exec(m.subject)![1];
const masked = (m: LoggedMail): string => `${m.to}: ${m.subject.replace(/\b\d{6}\b/, '######')}`;

/* ---------- the browser ---------- */

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

async function fill(page: Page, sel: string, value: string): Promise<void> {
  await page.$eval(sel, (el) => ((el as HTMLInputElement).value = ''));
  await page.type(sel, value);
}

async function submit(page: Page, formSel: string): Promise<void> {
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click(`${formSel} button[type=submit]`)]);
}

const path = (page: Page): string => {
  const u = new URL(page.url());
  return u.pathname + u.search;
};

async function apiStatus(page: Page, p: string): Promise<number> {
  return page.evaluate(async (x) => (await fetch(x)).status, p);
}

async function signUpAndVerify(page: Page, o: { name: string; email: string; password: string; note?: string; shots?: boolean }): Promise<string> {
  const before = mails().length;
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  if (o.shots) await shot(page, 'login');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('a[href="/signup"]')]);
  await fill(page, 'input#name', o.name);
  await fill(page, 'input#email', o.email);
  await fill(page, 'input#password', o.password);
  if (o.note) await page.type('textarea#note', o.note);
  if (o.shots) await shot(page, 'signup');
  await submit(page, 'form[action="/signup"]');
  const onVerify = path(page);
  const mail = await waitForMail(o.email, /Verification code \d{6}/, before);
  if (o.shots) await shot(page, 'verify');
  await fill(page, 'input#code', codeOf(mail));
  await submit(page, 'form[action="/verify"]');
  return `${onVerify} -> ${path(page)} (${masked(mail)})`;
}

async function signIn(page: Page, email: string, password: string): Promise<string> {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await fill(page, 'input#email', email);
  await fill(page, 'input#password', password);
  await submit(page, 'form[action="/login"]');
  return path(page);
}

async function main(): Promise<void> {
  if (!CHROME) throw new Error('Chrome not found');
  if (!MAIL_LOG || !existsSync(MAIL_LOG)) throw new Error('--mail-log <file>: the wrangler dev output file');
  mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--font-render-hinting=none', '--lang=en-GB'] });
  try {
    // 1. the admin address signs up and confirms
    const a = await fresh(browser, 'admin');
    const r0 = await a.page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    summary.anonymousRootLandsOn = `${r0?.status()} ${path(a.page)}`;
    summary.adminSignUp = await signUpAndVerify(a.page, { name: 'Doyoon Sung', email: ADMIN, password: ADMIN_PW, shots: true });
    summary.adminMe = await a.page.evaluate(async () => {
      const m = (await (await fetch('/api/me')).json()) as Record<string, unknown>;
      return { status: m.status, role: m.role, links: m.links };
    });

    // 2. a new person signs up with a note and confirms -> pending; the admin is mailed
    const p = await fresh(browser, 'person');
    const beforeRequest = mails().length;
    summary.personSignUp = await signUpAndVerify(p.page, { name: 'Mina Park', email: PERSON, password: PERSON_PW, note: 'Solutions architect, Jakarta. Retail customer demos for next week.' });
    await shot(p.page, 'pending');
    summary.adminRequestMail = masked(await waitForMail(ADMIN, /New access request/, beforeRequest));
    summary.pendingApiMe = await apiStatus(p.page, '/api/me');
    summary.pendingTurn = await p.page.evaluate(async () => {
      const r = await fetch('/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      return `${r.status} ${((await r.json()) as { code: string }).code}`;
    });

    // 3. the admin approves
    await a.page.goto(`${BASE}/admin`, { waitUntil: 'networkidle0' });
    await shot(a.page, 'admin');
    const approveSel = await a.page.evaluate((email) => {
      const row = [...document.querySelectorAll('#requests tr')].find((tr) => tr.textContent?.includes(email));
      const f = row?.querySelector('form[action$="/approve"]');
      return f ? `form[action="${f.getAttribute('action')}"] button` : null;
    }, PERSON);
    if (!approveSel) throw new Error('request not listed on /admin');
    const beforeApproval = mails().length;
    await Promise.all([a.page.waitForNavigation({ waitUntil: 'networkidle0' }), a.page.click(approveSel)]);
    summary.afterApprove = (await a.page.$eval('.notice', (el) => el.textContent?.trim())) ?? null;
    await shot(a.page, 'admin-after-approve');
    summary.approvalMail = masked(await waitForMail(PERSON, /You have access/, beforeApproval));

    // 4. the person signs in with the password (a second browser) and runs a turn
    const p2 = await fresh(browser, 'person-2');
    summary.personSignInLandsOn = await signIn(p2.page, PERSON, PERSON_PW);
    await p2.page.waitForSelector('#root *', { timeout: 15_000 });
    summary.spaRendered = await p2.page.evaluate(() => (document.querySelector('#root')?.children.length ?? 0) > 0);
    await shot(p2.page, 'spa');
    await p.page.goto(`${BASE}/pending`, { waitUntil: 'networkidle0' });
    summary.firstSessionLetIn = path(p.page); // the session from step 2 is let in at once after the approval
    if (RUN_TURN) {
      summary.turn = await p2.page.evaluate(async () => {
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
    await p2.page.goto(`${BASE}/account`, { waitUntil: 'networkidle0' });
    await shot(p2.page, 'account');

    // 5. password reset by email code: every older session ends at once
    summary.sessionsBeforeReset = { first: await apiStatus(p.page, '/api/me'), second: await apiStatus(p2.page, '/api/me') };
    const r = await fresh(browser, 'reset');
    await r.page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
    await Promise.all([r.page.waitForNavigation({ waitUntil: 'networkidle0' }), r.page.click('a[href="/forgot"]')]);
    await fill(r.page, 'input#email', PERSON);
    await shot(r.page, 'forgot');
    const beforeReset = mails().length;
    await submit(r.page, 'form[action="/forgot"]');
    const resetMail = await waitForMail(PERSON, /Password reset code \d{6}/, beforeReset);
    summary.resetMail = masked(resetMail);
    await shot(r.page, 'reset');
    await fill(r.page, 'input#code', codeOf(resetMail));
    await fill(r.page, 'input#password', PERSON_PW2);
    await submit(r.page, 'form[action="/reset"]');
    summary.afterResetLandsOn = path(r.page);
    summary.passwordChangedMail = masked(await waitForMail(PERSON, /password was changed/, beforeReset));
    summary.sessionsAfterReset = { first: await apiStatus(p.page, '/api/me'), second: await apiStatus(p2.page, '/api/me') };
    const old = await fresh(browser, 'old-password');
    await signIn(old.page, PERSON, PERSON_PW);
    summary.oldPasswordRefused = (await old.page.$eval('.notice', (el) => el.textContent?.trim()).catch(() => null)) ?? null;
    summary.newPasswordLandsOn = await signIn(r.page, PERSON, PERSON_PW2);

    // 6. removing access takes effect at once
    await a.page.goto(`${BASE}/admin`, { waitUntil: 'networkidle0' });
    const revokeSel = await a.page.evaluate((email) => {
      const row = [...document.querySelectorAll('#approved tr')].find((tr) => tr.textContent?.includes(email));
      const f = row?.querySelector('form[action$="/revoke"]');
      return f ? `form[action="${f.getAttribute('action')}"] button` : null;
    }, PERSON);
    if (!revokeSel) throw new Error('approved person not listed');
    await Promise.all([a.page.waitForNavigation({ waitUntil: 'networkidle0' }), a.page.click(revokeSel)]);
    summary.revokedApiMe = await apiStatus(r.page, '/api/me');
    summary.revokedSignInLandsOn = await signIn((await fresh(browser, 'revoked')).page, PERSON, PERSON_PW2);

    // 7. a stranger who only knows the admin address cannot lock the admin out. (Every browser here shares one IP, so the
    // stranger does lock that address-and-IP pair; what matters is that the admin's browser, which signed in before and
    // carries the device cookie, still gets in, while a browser with no device cookie is held.)
    const device = await a.page.createCDPSession();
    const deviceCookie = ((await device.send('Network.getAllCookies')) as { cookies: Array<{ name: string; httpOnly: boolean; secure: boolean; sameSite?: string }> }).cookies.find((c) => c.name === '__Host-ab_device');
    summary.deviceCookie = deviceCookie ? { httpOnly: deviceCookie.httpOnly, secure: deviceCookie.secure, sameSite: deviceCookie.sameSite } : null;
    const stranger = await fresh(browser, 'stranger');
    const wrongLanding: string[] = [];
    for (let i = 0; i < 7; i++) wrongLanding.push(await signIn(stranger.page, ADMIN, `guess-${i}-${randomBytes(6).toString('hex')}`));
    summary.strangerGuessesEndWith = (await stranger.page.$eval('.notice', (el) => el.textContent?.trim()).catch(() => null)) ?? null;
    const noDevice = await fresh(browser, 'no-device');
    summary.adminPasswordFromABrowserWithNoDeviceCookie = `${await signIn(noDevice.page, ADMIN, ADMIN_PW)} ${(await noDevice.page.$eval('.notice', (el) => el.textContent?.trim()).catch(() => null)) ?? ''}`.trim();
    await a.page.evaluate(() => fetch('/auth/logout', { method: 'POST' }));
    summary.adminKnownBrowserSignsInDespiteTheLock = await signIn(a.page, ADMIN, ADMIN_PW);

    // a weak password is refused on the sign-up page, with a message that says why
    const w = await fresh(browser, 'weak');
    await w.page.goto(`${BASE}/signup`, { waitUntil: 'networkidle0' });
    await fill(w.page, 'input#name', 'Weak Tester');
    await fill(w.page, 'input#email', `weak.${Date.now().toString(36)}@example.com`);
    await fill(w.page, 'input#password', 'Password123');
    await submit(w.page, 'form[action="/signup"]');
    summary.weakPasswordRefused = (await w.page.$eval('.field__error', (el) => el.textContent?.trim()).catch(() => null)) ?? null;
    await shot(w.page, 'signup-weak');

    // the Korean and Chinese sign-in pages
    const k = await fresh(browser, 'ko');
    await k.page.goto(`${BASE}/login?lang=ko`, { waitUntil: 'networkidle0' });
    await shot(k.page, 'login-ko');
    await k.page.goto(`${BASE}/signup?lang=zh`, { waitUntil: 'networkidle0' });
    await shot(k.page, 'signup-zh');
    summary.headers = await k.page.evaluate(async () => {
      const res = await fetch('/login');
      return { csp: res.headers.get('content-security-policy'), nosniff: res.headers.get('x-content-type-options'), frame: res.headers.get('x-frame-options') };
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
