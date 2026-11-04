// Accounts, as on the WonderClip platform: sign up (email, password, name, optional note) -> a 6-digit code by email
// -> the account exists, pending -> an administrator approves -> sign in with email and password. Forgotten passwords
// are reset with an emailed code; a signed-in user can change theirs on /account.
//
//   GET/POST /login             sign in                      GET/POST /signup    sign up
//   GET/POST /verify            the sign-up code             POST /verify/resend a new sign-up code
//   GET/POST /forgot            ask for a reset code         GET/POST /reset     the reset code and a new password
//   POST /reset/resend          a new reset code             POST /account/password (signed in) change password
//   POST /auth/logout           sign out
//
// What these flows promise:
// - Nobody learns from them whether an address has an account. Sign-up, the code pages, "forgot password" and the
//   resend buttons answer the same way and in about the same time for every address: mails go out in the background,
//   an address with an account does the same database writes (decoy rows) where a new one stores a sign-up or a code,
//   and the response waits out a common floor with a little random jitter (AUTH_TIMING). Sign-up with a registered
//   address mails its owner a "you already have an account" note instead of a code. Sign-in failures are one generic
//   message, and an unknown address costs the same PBKDF2 work as a known one. Every rate limit and lockout is keyed
//   on what was typed, so it behaves identically for addresses with and without accounts.
// - Nobody who only knows an address can lock its owner out (src/throttle.ts says how): hard locks are keyed on the
//   (address, IP) pair, on a browser's own code flow or on a known device, never on the address alone; an owner's code
//   is not replaced by, or spent on, anyone else's requests; the mail budget has layers an IP cannot run through; and
//   the all-addresses mail cap is split into pools (sign-up, reset, ADMIN_EMAILS) and says so when it is spent.
// - Passwords: PBKDF2-SHA256, 100,000 iterations, per-password salt, versioned (src/password.ts); compared in constant
//   time; common and guessable ones refused. Codes: HMAC-stored, single use, 15 minutes, 5 tries, bound to the browser
//   that asked (src/codes.ts).
// - A password reset revokes every session of the account; a change revokes every other session.
// - ADMIN_EMAILS addresses become approved admins once they confirm their address (only that inbox can).
import type { Env, ExecutionContextLike } from './env.ts';
import { adminCodeMailsPerDay, adminEmails, codeMailsPerDay, isSharedAccount, resetMailsPerDay, sessionSecret } from './env.ts';
import * as db from './db.ts';
import type { UserRow } from './db.ts';
import { NAME_MAX } from './db.ts';
import { hashPassword, passwordProblem, verifyPassword } from './password.ts';
import type { PasswordProblem } from './password.ts';
import { clearFlowCookie, cleanCode, flowCookie, flowFor, flowHash, issueCode, readFlow, useCode } from './codes.ts';
import type { CodePurpose, Flow } from './codes.ts';
import { ADMIN_MAIL_FACTOR, LOCK, RATE, budgetAddress, clear, clearRate, fail, hit, ipOf, lockedFor, peek, sweep, throttleKey } from './throttle.ts';
import type { MailPool, RateCheck, RateName, RateOutcome } from './throttle.ts';
import { deviceCookie, readDevice } from './device.ts';
import { html, readForm, redirect, safeNext } from './http.ts';
import { clearSessionCookie, endSession, forgetUser, issueSession, sessionHashOf } from './session.ts';
import { asLang, mailAlreadyRegistered, mailPasswordChanged, mailResetCode, mailVerifyCode } from './mail.ts';
import { cleanNote, notifyNewRequest } from './admin.ts';
import type { PageCtx } from './pages/layout.ts';
import type { StringKey } from './pages/i18n.ts';
import { accountPage, forgotPage, loginPage, resetPage, signupPage, verifyPage } from './pages/views.ts';
import type { Note, SignupErrors } from './pages/views.ts';

/**
 * The floor every enumeration-sensitive answer waits out (ms), plus up to jitterMs more at random, so that the time of
 * an answer does not say how much work was behind it. Tests set both to 0.
 */
export const AUTH_TIMING = { padMs: 600, jitterMs: 150 };

export interface AuthCtx {
  request: Request;
  env: Env;
  ctx: ExecutionContextLike;
  page: PageCtx;
  secret: string;
  now: number;
}

// An allow-list for the local part (letters, digits, . _ + ' -): no % or ! (relay "hacks"), no quotes, no brackets. The
// domain is dot-separated labels and a letters-only (or punycode) top-level label. Lower-case input.
const EMAIL_RE = /^(?!\.)(?!.*\.\.)[\p{L}\p{N}._+'-]{1,64}(?<!\.)@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+(?:xn--[a-z0-9-]{1,59}|\p{L}{2,63})$/u;

/** A lowercase address, or null when it is not one. */
export function normEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return s.length <= 254 && EMAIL_RE.test(s) ? s : null;
}

/** A display name: no control characters, at most NAME_MAX characters. */
export function cleanName(v: unknown): string {
  if (typeof v !== 'string') return '';
  return [...v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, NAME_MAX).join('');
}

const minutes = (ms: number): number => Math.max(1, Math.ceil(ms / 60_000));
const retryAfter = (ms: number): Array<[string, string]> => [['Retry-After', String(Math.max(1, Math.ceil(ms / 1000)))]];
const limitNote = (ms: number): Note => ({ kind: 'error', key: 'limit.wait', vars: { n: minutes(ms) } });
const lockNote = (ms: number): Note => ({ kind: 'error', key: 'limit.locked', vars: { n: minutes(ms) } });
const BUSY_NOTE: Note = { kind: 'error', key: 'limit.busy' };
const BUSY_RETRY_MS = 15 * 60_000;
const PW_KEY: Record<PasswordProblem, StringKey> = { short: 'password.error.short', long: 'password.error.long', email: 'password.error.email', weak: 'password.error.weak' };

async function padSince(t0: number): Promise<void> {
  const jitter = AUTH_TIMING.jitterMs > 0 ? crypto.getRandomValues(new Uint32Array(1))[0] % (AUTH_TIMING.jitterMs + 1) : 0;
  const left = AUTH_TIMING.padMs + jitter - (Date.now() - t0);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}

const key = (a: AuthCtx, rule: string, value: string): Promise<string> => throttleKey(a.secret, rule, value);

type RateEntry = [name: keyof typeof RATE, value: string, factor?: number];

async function rate(a: AuthCtx, rules: RateEntry[]): Promise<RateOutcome> {
  const checks: RateCheck[] = await Promise.all(
    rules.map(async ([name, value, factor]) => ({ name, key: await key(a, name, value), rule: factor && factor !== 1 ? { ...RATE[name], limit: RATE[name].limit * factor } : RATE[name] })),
  );
  const r = await hit(a.env.DB, checks, a.now);
  if (!r.ok) console.warn(JSON.stringify({ evt: 'throttled', rule: r.refused }));
  return r;
}

/** What the mail budget decided: whether to send, when it would be allowed again if not, or "busy" (a daily pool is spent). */
interface Budget extends RateOutcome {
  send: boolean;
  busy: boolean;
}

/**
 * The mail budget of one address, in layers; a layer is counted only when the ones before it let the request through,
 * so what one IP is refused for never uses up what the owner needs:
 *   1. one mail a minute per purpose, address and IP;
 *   2. 3 an hour and 6 a day per address and IP (any purpose);
 *   3. 8 an hour and 20 a day per address (any IP; 3 times that for ADMIN_EMAILS addresses). Plus-tags and Gmail dots
 *      count as one address (budgetAddress);
 *   4. the all-addresses daily pool: sign-up codes, reset codes, and a reserve for ADMIN_EMAILS addresses. A spent pool
 *      is reported as "busy", which the page says out loud and which says nothing about any address.
 * Counted the same whether or not the address has an account.
 */
async function mailBudget(a: AuthCtx, email: string, purpose: CodePurpose): Promise<Budget> {
  const addr = budgetAddress(email);
  const ip = ipOf(a.request);
  const admin = adminEmails(a.env).includes(email);
  const refused = (r: RateOutcome): Budget => ({ ...r, send: false, busy: false });
  const gap = await rate(a, [['mailGap', `${purpose}\n${addr}\n${ip}`]]);
  if (!gap.ok) return refused(gap);
  const pair = await rate(a, [
    ['mailPairHour', `${addr}\n${ip}`],
    ['mailPairDay', `${addr}\n${ip}`],
  ]);
  if (!pair.ok) return refused(pair);
  const f = admin ? ADMIN_MAIL_FACTOR : 1;
  // the day is counted only for what the hour let through, so a flood refused by the hourly cap cannot eat the day's
  const hour = await rate(a, [['mailHour', addr, f]]);
  if (!hour.ok) return refused(hour);
  const day = await rate(a, [['mailDay', addr, f]]);
  if (!day.ok) return refused(day);
  const pool: MailPool = admin ? 'mailPoolAdmin' : purpose === 'verify' ? 'mailPoolVerify' : 'mailPoolReset';
  const limit = admin ? adminCodeMailsPerDay(a.env) : purpose === 'verify' ? codeMailsPerDay(a.env) : resetMailsPerDay(a.env);
  const name: RateName = pool;
  const g = await hit(a.env.DB, [{ name, key: await key(a, pool, '*'), rule: { limit, windowMs: 86_400_000 } }], a.now);
  if (!g.ok) console.warn(JSON.stringify({ evt: 'mail-cap-reached', pool }));
  return { ok: true, retryAfterMs: 0, send: g.ok, busy: !g.ok };
}

const background = (a: AuthCtx, p: Promise<unknown>): void => a.ctx.waitUntil(p.catch((e) => console.error(JSON.stringify({ evt: 'background-failed', error: (e as Error)?.name ?? 'error' }))));

function maybeSweep(a: AuthCtx): void {
  if (Math.random() < 0.02) background(a, sweep(a.env.DB, a.now));
}

/* ---------- sign-in ---------- */

/** The Set-Cookie header that marks this browser as known for the account (keeps its device id when it has one). */
async function deviceHeader(a: AuthCtx, email: string, existingId: string | null): Promise<[string, string]> {
  return ['Set-Cookie', await deviceCookie(a.secret, await key(a, 'device', email), existingId, a.now)];
}

/**
 * Sign-in. Who is held back, and by what (see src/throttle.ts for why):
 * - every browser: the IP's attempts (30 in 15 minutes) and lock (20 failures), and a lock on this (address, IP) pair
 *   (5 failures, then 1 minute doubling to 15). Only real attempts count against the pair: a blank password or a
 *   malformed address cannot be the owner's, so it counts against the IP alone.
 * - a browser that signed in to this account before (device cookie): none of the above. It has its own, looser
 *   counters, so other people's failures cannot reject its correct password.
 * - the address-wide soft gate: after 30 failed guesses from unknown devices in 15 minutes, from anywhere, new browsers
 *   are told to reset the password by email (which ends the gate); known devices are not held.
 */
export async function postLogin(a: AuthCtx): Promise<Response> {
  const t0 = Date.now();
  const form = (await readForm(a.request)) ?? new URLSearchParams();
  const typed = (form.get('email') ?? '').trim().slice(0, 254);
  const valid = normEmail(typed);
  const email = valid ?? typed.toLowerCase();
  const password = form.get('password') ?? '';
  const next = safeNext(form.get('next'));
  const page = (status: number, note: Note, extra: Array<[string, string]> = []): Response => html(status, loginPage(a.page, { next, email: typed, note }), extra);

  const attempt = valid !== null && password !== '';
  const ip = ipOf(a.request);
  const device = attempt ? await readDevice(a.request, a.secret, await key(a, 'device', valid), a.now) : null;
  const gate: RateEntry = device ? ['signinDevice', device] : ['signinIp', ip];
  const r = await rate(a, [gate]);
  if (!r.ok) return page(429, limitNote(r.retryAfterMs), retryAfter(r.retryAfterMs));
  const k = {
    pair: await key(a, 'signinPair', `${email}\n${ip}`),
    ip: await key(a, 'signinIp', ip),
    soft: await key(a, 'signinSoft', email),
    device: device ? await key(a, 'signinDevice', device) : '',
  };
  const locked = await lockedFor(a.env.DB, device ? [k.device] : attempt ? [k.pair, k.ip] : [k.ip], a.now);
  if (locked) return page(429, lockNote(locked), retryAfter(locked));
  if (attempt && !device) {
    const soft = await peek(a.env.DB, k.soft, RATE.signinSoft, a.now);
    if (soft.n >= RATE.signinSoft.limit) {
      console.warn(JSON.stringify({ evt: 'signin-soft-gate' }));
      return page(429, { kind: 'error', key: 'login.hot', vars: { n: minutes(soft.retryAfterMs) } }, retryAfter(soft.retryAfterMs));
    }
  }

  const cred = attempt ? await db.credentialsByEmail(a.env.DB, valid) : null;
  const v = await verifyPassword(password, cred); // the same PBKDF2 work for an unknown address
  if (!v.ok || !cred) {
    const entries = device ? [{ key: k.device, rule: LOCK.signinDevice }] : [{ key: k.ip, rule: LOCK.signinIp }, ...(attempt ? [{ key: k.pair, rule: LOCK.signinPair }] : [])];
    const lock = await fail(a.env.DB, entries, a.now);
    if (attempt && !device) await hit(a.env.DB, [{ name: 'signinSoft', key: k.soft, rule: RATE.signinSoft }], a.now);
    if (lock) console.warn(JSON.stringify({ evt: 'lockout', rule: 'signin' }));
    await padSince(t0);
    return lock ? page(429, lockNote(lock), retryAfter(lock)) : page(401, { kind: 'error', key: 'login.error.credentials' });
  }

  await clear(a.env.DB, [k.pair, k.device].filter(Boolean));
  if (v.needsRehash) await db.setPasswordStatement(a.env.DB, cred.id, await hashPassword(password), a.now).run();
  let user = (await db.userById(a.env.DB, cred.id))!;
  if (adminEmails(a.env).includes(user.email) && (await db.seedAdminIfPending(a.env.DB, user, a.now))) user = (await db.userById(a.env.DB, user.id))!;
  await db.recordSignIn(a.env.DB, user.id, a.page.chosen ? a.page.lang : null, a.now);
  return startSession(a, user, user.status === 'approved' ? next : '/pending', 'sign-in', [await deviceHeader(a, user.email, device)]);
}

/** Ends the browser's earlier session (if any), starts one for the user and goes on. */
async function startSession(a: AuthCtx, user: UserRow, to: string, evt: string, extra: Array<[string, string]> = []): Promise<Response> {
  if (await sessionHashOf(a.request, a.env, a.now)) background(a, endSession(a.request, a.env, a.now));
  const set = await issueSession(a.env, user.id, a.now);
  console.log(JSON.stringify({ evt, user: user.id, status: user.status, role: user.role }));
  return redirect(to, 303, [...extra, ['Set-Cookie', set]]);
}

export async function signOut(request: Request, env: Env, now = Date.now()): Promise<Response> {
  const clearCookie = await endSession(request, env, now);
  return redirect('/login?signed_out=1', 303, [['Set-Cookie', clearCookie]]);
}

/* ---------- sign-up and its code ---------- */

export async function postSignup(a: AuthCtx): Promise<Response> {
  const t0 = Date.now();
  const form = await readForm(a.request);
  if (!form) return html(413, signupPage(a.page, { note: { kind: 'error', key: 'form.tooLarge' } }));
  const name = cleanName(form.get('name'));
  const typed = (form.get('email') ?? '').trim().slice(0, 254);
  const email = normEmail(typed);
  const password = form.get('password') ?? '';
  const note = cleanNote(form.get('note'));
  const values = { name, email: typed, note: note ?? '' };

  const errors: SignupErrors = {};
  if (!name) errors.name = 'signup.error.name';
  if (!email) errors.email = 'signup.error.email';
  const pp = passwordProblem(password, email ?? '', name);
  if (pp) errors.password = PW_KEY[pp];
  if (!email || Object.keys(errors).length) return html(400, signupPage(a.page, { values, errors }));

  // per IP only: a limit on the address would let anyone use up its owner's sign-ups (the mail budget limits the mails)
  const r = await rate(a, [
    ['signupIp', ipOf(a.request)],
    ['signupIpDay', ipOf(a.request)],
  ]);
  if (!r.ok) return html(429, signupPage(a.page, { values, note: limitNote(r.retryAfterMs) }), retryAfter(r.retryAfterMs));

  const pw = await hashPassword(password); // done for every address, registered or not
  const flow = await flowFor(a.request, a.secret, 'verify', email, a.now);
  const fh = await flowHash(flow.n);
  const existing = await db.userByEmail(a.env.DB, email);
  const budget = await mailBudget(a, email, 'verify');
  if (budget.busy) {
    await padSince(t0);
    return html(503, signupPage(a.page, { values, note: BUSY_NOTE }), retryAfter(BUSY_RETRY_MS));
  }
  if (existing) {
    // the owner learns about the attempt; the visitor sees exactly what a new address would show, after the same
    // database work (a sign-up and a code are four writes)
    await db.decoyWrite(a.env.DB, budget.send ? 4 : 1, a.now);
    if (budget.send) background(a, mailAlreadyRegistered(a.env, email, asLang(existing.lang ?? a.page.lang)));
  } else {
    const input: db.SignupInput = { email, name, note, password: pw, lang: a.page.lang, flowHash: fh };
    if (budget.send) {
      const { code, stmts } = await issueCode(a.env.DB, a.secret, email, 'verify', flow.n, a.now);
      await a.env.DB.batch([...db.putSignup(a.env.DB, input, a.now), ...stmts]);
      background(a, mailVerifyCode(a.env, email, code, a.page.lang));
    } else {
      // within the mail gap: the same browser may correct its details and keep the code it already has; another
      // browser changes nothing (it can never attach its password to the code mailed for this sign-up)
      await db.updateSignupInFlow(a.env.DB, input, a.now);
    }
  }
  maybeSweep(a);
  await padSince(t0);
  return redirect(afterSend('/verify', budget, null), 303, [['Set-Cookie', await flowCookie(a.secret, flow)]]);
}

/** Where a code page goes after a send: a plain notice, or "wait m minutes" when the address's mail budget is spent. */
const afterSend = (page: string, budget: RateOutcome, sent: 'resent' | null): string =>
  budget.ok ? (sent ? `${page}?n=${sent}` : page) : `${page}?n=wait&m=${minutes(budget.retryAfterMs)}`;

/** The notice a code page shows from its ?n= (fixed texts; only a whole number of minutes is taken from the URL). */
function codePageNote(url: URL): Note | null {
  const n = url.searchParams.get('n');
  if (n === 'resent') return { kind: 'ok', key: 'verify.resent' };
  if (n === 'wait') {
    const m = Number(url.searchParams.get('m'));
    return { kind: 'info', key: 'verify.wait', vars: { n: Number.isInteger(m) && m >= 1 && m <= 1440 ? m : 1 } };
  }
  return null;
}

export async function getVerify(a: AuthCtx, url: URL): Promise<Response> {
  const flow = await readFlow(a.request, a.secret, 'verify', a.now);
  if (!flow) return redirect('/signup?n=again');
  return html(200, verifyPage(a.page, { email: flow.e, note: codePageNote(url) }));
}

/**
 * Checks a code under the code rate limits and lockouts, which are keyed on this browser's own flow and on its IP, never
 * on the address: guesses in an attacker's flow can lock that flow only, and they cannot touch the owner's code (the
 * check is against this flow's own code row).
 */
async function checkCode(a: AuthCtx, flow: Flow, entered: string | null): Promise<{ ok: true } | { ok: false; status: number; note: Note | null; headers: Array<[string, string]> }> {
  const ip = ipOf(a.request);
  const fh = await flowHash(flow.n);
  const r = await rate(a, [
    ['codeIp', ip],
    ['codeFlow', fh],
  ]);
  if (!r.ok) return { ok: false, status: 429, note: limitNote(r.retryAfterMs), headers: retryAfter(r.retryAfterMs) };
  const keys = { flow: await key(a, 'codeFlow', fh), ip: await key(a, 'codeIp', ip) };
  const locked = await lockedFor(a.env.DB, [keys.flow, keys.ip], a.now);
  if (locked) return { ok: false, status: 429, note: lockNote(locked), headers: retryAfter(locked) };
  const result = await useCode(a.env.DB, a.secret, flow, entered, a.now);
  if (result === 'ok') {
    await clear(a.env.DB, [keys.flow]);
    return { ok: true };
  }
  // wrong, expired, used up, or no code at all: one answer for all, so it says nothing about the address
  const lock = await fail(
    a.env.DB,
    [
      { key: keys.flow, rule: LOCK.codeFlow },
      { key: keys.ip, rule: LOCK.codeIp },
    ],
    a.now,
  );
  if (lock) console.warn(JSON.stringify({ evt: 'lockout', rule: 'code' }));
  return lock ? { ok: false, status: 429, note: lockNote(lock), headers: retryAfter(lock) } : { ok: false, status: 400, note: null, headers: [] };
}

export async function postVerify(a: AuthCtx): Promise<Response> {
  const t0 = Date.now();
  const flow = await readFlow(a.request, a.secret, 'verify', a.now);
  if (!flow) return redirect('/signup?n=again', 303);
  const form = (await readForm(a.request)) ?? new URLSearchParams();
  const c = await checkCode(a, flow, cleanCode(form.get('code')));
  if (!c.ok) {
    await padSince(t0);
    return html(c.status, verifyPage(a.page, { email: flow.e, note: c.note, codeError: !c.note }), c.headers);
  }
  const seed = adminEmails(a.env).includes(flow.e);
  const created = await db.createAccountFromSignup(a.env.DB, flow.e, await flowHash(flow.n), seed, a.now);
  if (!created) return redirect('/signup?n=again', 303, [['Set-Cookie', clearFlowCookie()]]);
  if (!created.seeded) notifyNewRequest(a.env, a.ctx, created.user, a.now);
  return startSession(a, created.user, created.seeded ? '/' : '/pending?n=verified', 'sign-up', [['Set-Cookie', clearFlowCookie()], await deviceHeader(a, flow.e, null)]);
}

/** Answers "the mail budget is spent for the day" on a code page. */
function busyCodePage(a: AuthCtx, purpose: CodePurpose, flow: Flow): Response {
  const body = purpose === 'verify' ? verifyPage(a.page, { email: flow.e, note: BUSY_NOTE }) : resetPage(a.page, { email: flow.e, note: BUSY_NOTE });
  return html(503, body, retryAfter(BUSY_RETRY_MS));
}

/** A new code for the flow this browser is in (verify or reset), within the address's mail budget. */
async function resend(a: AuthCtx, purpose: CodePurpose): Promise<Response> {
  const t0 = Date.now();
  const flow = await readFlow(a.request, a.secret, purpose, a.now);
  const page = purpose === 'verify' ? '/verify' : '/reset';
  if (!flow) return redirect(purpose === 'verify' ? '/signup?n=again' : '/forgot?n=again', 303);
  const r = await rate(a, [['resendIp', ipOf(a.request)]]);
  if (!r.ok) {
    const note = limitNote(r.retryAfterMs);
    const body = purpose === 'verify' ? verifyPage(a.page, { email: flow.e, note }) : resetPage(a.page, { email: flow.e, note });
    return html(429, body, retryAfter(r.retryAfterMs));
  }
  const budget = await mailBudget(a, flow.e, purpose);
  if (budget.busy) {
    await padSince(t0);
    return busyCodePage(a, purpose, flow);
  }
  if (budget.send) {
    if (purpose === 'verify') {
      // only the browser whose sign-up is waiting gets a new code for it (never another browser's password)
      const fh = await flowHash(flow.n);
      if (await db.signupInFlow(a.env.DB, flow.e, fh)) {
        const { code, stmts } = await issueCode(a.env.DB, a.secret, flow.e, 'verify', flow.n, a.now);
        await a.env.DB.batch(stmts);
        background(a, mailVerifyCode(a.env, flow.e, code, a.page.lang));
      } else {
        await db.decoyWrite(a.env.DB, 2, a.now);
      }
    } else {
      await sendResetCode(a, flow);
    }
  }
  await padSince(t0);
  return redirect(afterSend(page, budget, 'resent'), 303, [['Set-Cookie', await flowCookie(a.secret, { ...flow, t: a.now })]]);
}

export const postVerifyResend = (a: AuthCtx): Promise<Response> => resend(a, 'verify');
export const postResetResend = (a: AuthCtx): Promise<Response> => resend(a, 'reset');

/* ---------- forgotten password ---------- */

/** Mails a reset code when the address has an account; an unknown address does the same database write on a scratch row. */
async function sendResetCode(a: AuthCtx, flow: Flow): Promise<void> {
  const user = await db.userByEmail(a.env.DB, flow.e);
  if (!user) {
    await db.decoyWrite(a.env.DB, 2, a.now);
    return;
  }
  const { code, stmts } = await issueCode(a.env.DB, a.secret, flow.e, 'reset', flow.n, a.now);
  await a.env.DB.batch(stmts);
  background(a, mailResetCode(a.env, flow.e, code, a.page.lang));
}

export async function postForgot(a: AuthCtx): Promise<Response> {
  const t0 = Date.now();
  const form = (await readForm(a.request)) ?? new URLSearchParams();
  const typed = (form.get('email') ?? '').trim().slice(0, 254);
  const email = normEmail(typed);
  if (!email) return html(400, forgotPage(a.page, { email: typed, emailError: true }));
  const r = await rate(a, [['forgotIp', ipOf(a.request)]]);
  if (!r.ok) return html(429, forgotPage(a.page, { email: typed, note: limitNote(r.retryAfterMs) }), retryAfter(r.retryAfterMs));
  const flow = await flowFor(a.request, a.secret, 'reset', email, a.now);
  const budget = await mailBudget(a, email, 'reset');
  if (budget.busy) {
    await padSince(t0);
    return html(503, forgotPage(a.page, { email: typed, note: BUSY_NOTE }), retryAfter(BUSY_RETRY_MS));
  }
  if (budget.send) await sendResetCode(a, flow); // nothing at all for an unknown address, and the same answer
  maybeSweep(a);
  await padSince(t0);
  return redirect(afterSend('/reset', budget, null), 303, [['Set-Cookie', await flowCookie(a.secret, flow)]]);
}

export async function getReset(a: AuthCtx, url: URL): Promise<Response> {
  const flow = await readFlow(a.request, a.secret, 'reset', a.now);
  if (!flow) return redirect('/forgot?n=again');
  return html(200, resetPage(a.page, { email: flow.e, note: codePageNote(url) }));
}

export async function postReset(a: AuthCtx): Promise<Response> {
  const t0 = Date.now();
  const flow = await readFlow(a.request, a.secret, 'reset', a.now);
  if (!flow) return redirect('/forgot?n=again', 303);
  const form = (await readForm(a.request)) ?? new URLSearchParams();
  const password = form.get('password') ?? '';
  const pp = passwordProblem(password, flow.e);
  if (pp) return html(400, resetPage(a.page, { email: flow.e, passwordError: PW_KEY[pp] })); // no code try is spent
  const c = await checkCode(a, flow, cleanCode(form.get('code')));
  if (!c.ok) {
    await padSince(t0);
    return html(c.status, resetPage(a.page, { email: flow.e, note: c.note, codeError: !c.note }), c.headers);
  }
  const cred = await db.credentialsByEmail(a.env.DB, flow.e);
  if (!cred) return redirect('/forgot?n=again', 303, [['Set-Cookie', clearFlowCookie()]]);
  await db.changePassword(a.env.DB, cred.id, await hashPassword(password), null, a.now); // every session ends
  forgetUser(cred.id);
  // whatever strangers did to the sign-in counters ends with a reset by the inbox's owner
  await clear(a.env.DB, [await key(a, 'signinPair', `${flow.e}\n${ipOf(a.request)}`)]);
  await clearRate(a.env.DB, [await key(a, 'signinSoft', flow.e)]);
  await db.audit(a.env.DB, flow.e, 'password-reset', flow.e, null, a.now);
  const user = await db.userById(a.env.DB, cred.id);
  background(a, mailPasswordChanged(a.env, flow.e, asLang(user?.lang ?? a.page.lang)));
  console.log(JSON.stringify({ evt: 'password-reset', user: cred.id }));
  // the code proved the inbox, so this browser is a known device for the account from now on
  return redirect('/login?n=reset', 303, [['Set-Cookie', clearFlowCookie()], ['Set-Cookie', clearSessionCookie()], await deviceHeader(a, flow.e, await readDevice(a.request, a.secret, await key(a, 'device', flow.e), a.now))]);
}

/* ---------- change password (signed in) ---------- */

export async function postChangePassword(a: AuthCtx, me: UserRow, sessionHash: string): Promise<Response> {
  // Everyone using a shared demo account would be locked out (and signed out) if one of them changed its password.
  if (isSharedAccount(a.env, me.email)) return html(403, accountPage(a.page, { me, shared: true }));
  const form = (await readForm(a.request)) ?? new URLSearchParams();
  const current = form.get('current') ?? '';
  const next = form.get('password') ?? '';
  const pp = passwordProblem(next, me.email, me.name);
  if (pp) return html(400, accountPage(a.page, { me, passwordError: PW_KEY[pp] }));
  const r = await rate(a, [['passwordUser', me.id]]);
  if (!r.ok) return html(429, accountPage(a.page, { me, note: limitNote(r.retryAfterMs) }), retryAfter(r.retryAfterMs));
  const lockKey = await key(a, 'passwordUser', me.id);
  const locked = await lockedFor(a.env.DB, [lockKey], a.now);
  if (locked) return html(429, accountPage(a.page, { me, note: lockNote(locked) }), retryAfter(locked));
  const cred = await db.credentialsById(a.env.DB, me.id);
  const v = await verifyPassword(current, cred);
  if (!v.ok || !cred) {
    const lock = await fail(a.env.DB, [{ key: lockKey, rule: LOCK.passwordUser }], a.now);
    return lock ? html(429, accountPage(a.page, { me, note: lockNote(lock) }), retryAfter(lock)) : html(400, accountPage(a.page, { me, currentError: true }));
  }
  // Compared only after the current password is proven: typing the new password into both boxes (or a browser
  // autofilling both) must report a wrong current password, not "choose a different password".
  if (next === current) return html(400, accountPage(a.page, { me, passwordError: 'password.error.same' }));
  await db.changePassword(a.env.DB, me.id, await hashPassword(next), sessionHash, a.now); // other sessions end
  forgetUser(me.id);
  await clear(a.env.DB, [lockKey]);
  await db.audit(a.env.DB, me.email, 'password-change', me.email, null, a.now);
  background(a, mailPasswordChanged(a.env, me.email, asLang(me.lang ?? a.page.lang)));
  console.log(JSON.stringify({ evt: 'password-change', user: me.id }));
  return redirect('/account?n=changed', 303);
}

/* ---------- the GET pages ---------- */

export function loginNote(url: URL, configured: boolean): Note | null {
  if (!configured) return { kind: 'error', key: 'login.error.config' };
  if (url.searchParams.get('n') === 'reset') return { kind: 'ok', key: 'login.reset' };
  if (url.searchParams.get('signed_out')) return { kind: 'info', key: 'login.signedOut' };
  return null;
}

export function getSignup(a: AuthCtx, url: URL): Response {
  const note: Note | null = url.searchParams.get('n') === 'again' ? { kind: 'info', key: 'signup.again' } : null;
  return html(200, signupPage(a.page, { note }));
}

export function getForgot(a: AuthCtx, url: URL): Response {
  const note: Note | null = url.searchParams.get('n') === 'again' ? { kind: 'info', key: 'forgot.again' } : null;
  return html(200, forgotPage(a.page, { note }));
}

/** The context for a public auth route, or null when SESSION_SECRET is missing (every auth path then fails closed). */
export function authCtx(request: Request, env: Env, ctx: ExecutionContextLike, page: PageCtx): AuthCtx | null {
  const secret = sessionSecret(env);
  return secret ? { request, env, ctx, page, secret, now: Date.now() } : null;
}
