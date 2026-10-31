// Rate limits and progressive lockouts in D1 (CF-Connecting-IP; an IPv6 address counts by its /64, which one person
// usually holds whole). Keys hold an HMAC of the email, address or nonce under SESSION_SECRET, never the value itself.
//
// - Rate rules count every attempt in a fixed window (one atomic UPSERT ... RETURNING per rule). They are checked
//   before anything looks up an account, and they count unknown addresses exactly like known ones, so a refusal says
//   nothing about whether an account exists.
// - Lock rules count failures. After `free` failures the key is locked for baseMs, doubling with each further
//   failure up to maxMs. A success clears the key; failures older than decayMs are forgotten.
//
// Who may be refused (the availability rule): an address is public (ADMIN_EMAILS is in the repo), so no stranger may be
// able to make its owner's correct password or correct code fail. Hard locks are therefore keyed on something the
// stranger cannot share with the owner: the (address, IP) pair, the browser's own code flow, or a known device. The only
// address-wide counter that can refuse anyone is `signinSoft` (failed guesses from unknown devices, from everywhere):
// it stops new browsers from guessing on, never a browser that signed in before, and a password reset by email clears it.
import type { D1Database, D1PreparedStatement } from './env.ts';
import { hmacSign } from './crypto.ts';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export interface RateRule {
  limit: number;
  windowMs: number;
}
export interface LockRule {
  free: number;
  baseMs: number;
  maxMs: number;
  decayMs: number;
}

export const RATE = {
  signinIp: { limit: 30, windowMs: 15 * MIN }, // attempts from one IP (browsers with no device cookie)
  signinDevice: { limit: 15, windowMs: 15 * MIN }, // attempts from one known device (a browser that signed in before)
  // failed guesses at one address from unknown devices, from everywhere: past this, new browsers wait (see above)
  signinSoft: { limit: 30, windowMs: 15 * MIN },
  signupIp: { limit: 10, windowMs: HOUR },
  signupIpDay: { limit: 30, windowMs: DAY },
  codeIp: { limit: 30, windowMs: 15 * MIN }, // code entries (verify and reset) from one IP
  codeFlow: { limit: 15, windowMs: 15 * MIN }, // code entries in one browser flow
  forgotIp: { limit: 10, windowMs: HOUR },
  resendIp: { limit: 20, windowMs: HOUR },
  passwordUser: { limit: 10, windowMs: 15 * MIN }, // change password while signed in
  // Mails to one address. Each layer is checked only after the one before it let the request through, so a request one
  // IP is refused for never uses up the address-wide budget the owner needs.
  mailGap: { limit: 1, windowMs: MIN }, // per purpose (sign-up, reset), address and IP
  mailPairHour: { limit: 3, windowMs: HOUR }, // per address and IP, any purpose
  mailPairDay: { limit: 6, windowMs: DAY },
  mailHour: { limit: 8, windowMs: HOUR }, // per address, any IP (ADMIN_EMAILS addresses: ADMIN_MAIL_FACTOR times these)
  mailDay: { limit: 20, windowMs: DAY },
} as const satisfies Record<string, RateRule>;

/** ADMIN_EMAILS addresses are public, so strangers aim at them; their per-address mail budget is this many times larger. */
export const ADMIN_MAIL_FACTOR = 3;

export const LOCK = {
  // (address, IP): the person at that IP is slowed, nobody else is. A known device is not held by it.
  signinPair: { free: 5, baseMs: MIN, maxMs: 15 * MIN, decayMs: DAY },
  signinIp: { free: 20, baseMs: 5 * MIN, maxMs: HOUR, decayMs: DAY },
  signinDevice: { free: 10, baseMs: MIN, maxMs: 15 * MIN, decayMs: DAY }, // a stolen device cookie still cannot walk passwords
  // keyed on the browser's own code flow, so guesses in an attacker's flow can lock only that flow
  codeFlow: { free: 10, baseMs: 15 * MIN, maxMs: DAY, decayMs: DAY }, // across resends: 6-digit codes cannot be walked
  codeIp: { free: 30, baseMs: 15 * MIN, maxMs: DAY, decayMs: DAY },
  passwordUser: { free: 5, baseMs: MIN, maxMs: 15 * MIN, decayMs: DAY },
} as const satisfies Record<string, LockRule>;

/** The all-addresses daily mail pools: sign-up codes, reset codes, and a reserve for the ADMIN_EMAILS addresses. */
export type MailPool = 'mailPoolVerify' | 'mailPoolReset' | 'mailPoolAdmin';

export type RateName = keyof typeof RATE | MailPool;
export type LockName = keyof typeof LOCK;

/**
 * The address a mail budget is counted on: a plus-tag is dropped, and for Gmail the dots too, so variants of one inbox
 * share one budget. (Accounts and codes use the address as typed; only the mail counters use this.)
 */
export function budgetAddress(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 0) return email;
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    domain = 'gmail.com';
    local = local.replace(/\./g, '');
  }
  return `${local}@${domain}`;
}

/** The client address for rate limits: IPv4 as is, IPv6 as its /64 prefix, 'unknown' without the header. */
export function ipBucket(raw: string | null): string {
  const ip = (raw ?? '').trim().toLowerCase();
  if (!ip || ip.length > 64 || !/^[0-9a-f:.]+$/.test(ip)) return 'unknown';
  if (!ip.includes(':')) return ip;
  const [head, tail] = ip.split('::', 2) as [string, string | undefined];
  const h = head ? head.split(':') : [];
  const t = tail === undefined ? [] : tail ? tail.split(':') : [];
  const groups = tail === undefined ? h : [...h, ...Array<string>(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ''))
    .join(':')}::/64`;
}

export const ipOf = (request: Request): string => ipBucket(request.headers.get('CF-Connecting-IP'));

/** The stored key for a rule and a value (an HMAC: the table never holds an address or an IP). */
export async function throttleKey(secret: string, rule: string, value: string): Promise<string> {
  return `${rule}:${(await hmacSign(secret, 'throttle-v1', `${rule}\n${value}`)).slice(0, 32)}`;
}

export interface RateCheck {
  name: RateName;
  key: string;
  rule: RateRule;
}

export interface RateOutcome {
  ok: boolean;
  /** The rule that refused, and when its window ends. */
  refused?: RateName;
  retryAfterMs: number;
}

function hitStatement(db: D1Database, c: RateCheck, now: number): D1PreparedStatement {
  const expired = now - c.rule.windowMs;
  return db
    .prepare(
      `INSERT INTO rate (k, window_start, n) VALUES (?, ?, 1)
       ON CONFLICT (k) DO UPDATE SET
         n = CASE WHEN rate.window_start <= ? THEN 1 ELSE rate.n + 1 END,
         window_start = CASE WHEN rate.window_start <= ? THEN excluded.window_start ELSE rate.window_start END
       RETURNING n, window_start`,
    )
    .bind(c.key, now, expired, expired);
}

/** Counts one attempt against each rule (in one batch) and says whether every rule still allows it. */
export async function hit(db: D1Database, checks: RateCheck[], now: number): Promise<RateOutcome> {
  if (!checks.length) return { ok: true, retryAfterMs: 0 };
  const results = await db.batch(checks.map((c) => hitStatement(db, c, now)));
  let worst: RateOutcome = { ok: true, retryAfterMs: 0 };
  results.forEach((r, i) => {
    const row = r.results[0] as { n: number; window_start: number } | undefined;
    const c = checks[i];
    if (row && row.n > c.rule.limit) {
      const wait = Math.max(1000, row.window_start + c.rule.windowMs - now);
      if (worst.ok || wait > worst.retryAfterMs) worst = { ok: false, refused: c.name, retryAfterMs: wait };
    }
  });
  return worst;
}

/** Attempts counted so far in the key's current window, and when that window ends (n 0: none). Counts nothing. */
export async function peek(db: D1Database, key: string, rule: RateRule, now: number): Promise<{ n: number; retryAfterMs: number }> {
  const r = await db.prepare('SELECT n, window_start FROM rate WHERE k = ?').bind(key).first<{ n: number; window_start: number }>();
  if (!r || r.window_start <= now - rule.windowMs) return { n: 0, retryAfterMs: 0 };
  return { n: r.n, retryAfterMs: Math.max(1000, r.window_start + rule.windowMs - now) };
}

/** Forgets the attempt counters of these keys. */
export async function clearRate(db: D1Database, keys: string[]): Promise<void> {
  if (!keys.length) return;
  await db
    .prepare(`DELETE FROM rate WHERE k IN (${keys.map(() => '?').join(', ')})`)
    .bind(...keys)
    .run();
}

/** The longest lock still running on any of the keys (0: none). */
export async function lockedFor(db: D1Database, keys: string[], now: number): Promise<number> {
  if (!keys.length) return 0;
  const r = await db
    .prepare(`SELECT MAX(locked_until) AS until FROM lockouts WHERE k IN (${keys.map(() => '?').join(', ')})`)
    .bind(...keys)
    .first<{ until: number | null }>();
  const until = r?.until ?? 0;
  return until > now ? until - now : 0;
}

/** The lock that follows `fails` failures under a rule (0: none yet). */
export function lockDuration(rule: LockRule, fails: number): number {
  if (fails <= rule.free) return 0;
  return Math.min(rule.maxMs, rule.baseMs * 2 ** Math.min(30, fails - rule.free - 1));
}

/** Records one failure for each key; returns the longest lock now in force (0: none). */
export async function fail(db: D1Database, entries: Array<{ key: string; rule: LockRule }>, now: number): Promise<number> {
  if (!entries.length) return 0;
  const results = await db.batch(
    entries.map((e) =>
      db
        .prepare(
          `INSERT INTO lockouts (k, fails, last_fail_at, locked_until) VALUES (?, 1, ?, 0)
           ON CONFLICT (k) DO UPDATE SET
             fails = CASE WHEN lockouts.last_fail_at < ? THEN 1 ELSE lockouts.fails + 1 END,
             last_fail_at = excluded.last_fail_at
           RETURNING fails`,
        )
        .bind(e.key, now, now - e.rule.decayMs),
    ),
  );
  const updates: D1PreparedStatement[] = [];
  let longest = 0;
  results.forEach((r, i) => {
    const fails = (r.results[0] as { fails: number } | undefined)?.fails ?? 0;
    const ms = lockDuration(entries[i].rule, fails);
    if (ms > 0) {
      updates.push(db.prepare('UPDATE lockouts SET locked_until = MAX(locked_until, ?) WHERE k = ?').bind(now + ms, entries[i].key));
      longest = Math.max(longest, ms);
    }
  });
  if (updates.length) await db.batch(updates);
  return longest;
}

/** Forgets the failures of these keys (after a success). */
export async function clear(db: D1Database, keys: string[]): Promise<void> {
  if (!keys.length) return;
  await db
    .prepare(`DELETE FROM lockouts WHERE k IN (${keys.map(() => '?').join(', ')})`)
    .bind(...keys)
    .run();
}

/** Drops counters, locks, codes and sign-ups that can no longer matter (run now and then, never on the hot path). */
export async function sweep(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM rate WHERE window_start < ?').bind(now - 2 * DAY),
    db.prepare('DELETE FROM lockouts WHERE last_fail_at < ? AND locked_until < ?').bind(now - 2 * DAY, now),
    db.prepare('DELETE FROM codes WHERE expires_at < ?').bind(now - DAY),
    db.prepare('DELETE FROM signups WHERE created_at < ?').bind(now - 2 * DAY),
  ]);
}
