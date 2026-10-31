// One-time email codes and the flow cookie that carries a code flow from page to page.
//
// Codes: 6 random digits, valid 15 minutes, 5 tries each (the WonderClip platform's choices). D1 keeps only an HMAC
// of purpose, address and code under SESSION_SECRET, so a copy of the database cannot be used to read or brute-force
// live codes offline. There is one row per (address, purpose, browser flow), and up to LIVE_CODES live rows per address
// and purpose: another browser asking for a code for the same address adds one, it never replaces (or spends the tries
// of) the owner's. A browser asking again replaces only its own.
//
// Flow cookie (__Host-ab_flow, signed, 30 minutes): which flow this browser is in (verify or reset), for which
// address, and a random nonce. Each code row stores the nonce's SHA-256, and a code is accepted only together with
// the cookie of the browser that asked for it. The address therefore never travels in a URL, and a sign-up made for
// someone else's address from another browser cannot borrow the code mailed to them.
import type { D1Database } from './env.ts';
import { hmacSign, randomBytes, randomToken, sha256Hex, signJson, timingSafeEqual, verifyJson } from './crypto.ts';
import { cookie, parseCookies } from './http.ts';

export type CodePurpose = 'verify' | 'reset';
export const CODE_DIGITS = 6;
export const CODE_TTL_MS = 15 * 60_000;
export const CODE_TRIES = 5;
/** Live codes kept per address and purpose (the newest; an older one is dropped when a sixth is issued). */
export const LIVE_CODES = 5;

export const FLOW_COOKIE = '__Host-ab_flow';
const FLOW_PURPOSE = 'flow-v1';
export const FLOW_TTL_MS = 30 * 60_000;

export interface Flow {
  p: CodePurpose;
  e: string; // the address
  n: string; // nonce
  t: number; // issued at (ms)
}

/** A uniformly random 6-digit code (rejection sampling: no modulo bias). */
export function newCode(): string {
  const LIMIT = 4_294_000_000; // the largest multiple of 10^6 below 2^32
  for (;;) {
    const b = randomBytes(4);
    const v = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    if (v < LIMIT) return String(v % 1_000_000).padStart(CODE_DIGITS, '0');
  }
}

/** Only digits; spaces and dashes people paste are dropped. Anything else is not a code. */
export function cleanCode(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(s) ? s : null;
}

const codeHash = (secret: string, purpose: CodePurpose, email: string, code: string): Promise<string> => hmacSign(secret, 'code-v1', `${purpose}\n${email}\n${code}`);
export const flowHash = (nonce: string): Promise<string> => sha256Hex(`flow\n${nonce}`);

/* ---------- the flow cookie ---------- */

export async function readFlow(request: Request, secret: string, purpose: CodePurpose, now: number): Promise<Flow | null> {
  const f = await verifyJson<Flow>(secret, FLOW_PURPOSE, parseCookies(request.headers.get('Cookie')).get(FLOW_COOKIE));
  if (!f || f.p !== purpose || typeof f.e !== 'string' || typeof f.n !== 'string' || f.n.length < 32 || typeof f.t !== 'number') return null;
  if (now - f.t > FLOW_TTL_MS || f.t > now + 60_000) return null;
  return f;
}

/**
 * The flow for this address: the browser's current one when it is for the same purpose and address (so asking twice
 * keeps the code it already has working), else a new nonce.
 */
export async function flowFor(request: Request, secret: string, purpose: CodePurpose, email: string, now: number): Promise<Flow> {
  const cur = await readFlow(request, secret, purpose, now);
  return { p: purpose, e: email, n: cur && cur.e === email ? cur.n : randomToken(32), t: now };
}

export async function flowCookie(secret: string, f: Flow): Promise<string> {
  return cookie(FLOW_COOKIE, await signJson(secret, FLOW_PURPOSE, f), { maxAge: FLOW_TTL_MS / 1000 });
}
export const clearFlowCookie = (): string => cookie(FLOW_COOKIE, '', { maxAge: 0 });

/* ---------- codes ---------- */

export interface CodeRow {
  email: string;
  purpose: CodePurpose;
  flow_hash: string;
  code_hash: string;
  expires_at: number;
  tries: number;
  sent_at: number;
}

/** The code row of one browser flow for this address. */
export async function codeRow(db: D1Database, email: string, purpose: CodePurpose, flowHashValue: string): Promise<CodeRow | null> {
  return db.prepare('SELECT * FROM codes WHERE email = ? AND purpose = ? AND flow_hash = ?').bind(email, purpose, flowHashValue).first<CodeRow>();
}

/**
 * The statements that store a new code for this address and this browser's flow (replacing only that flow's earlier
 * one), drop expired codes and keep the newest LIVE_CODES, and the code itself. Run them in one batch.
 */
export async function issueCode(db: D1Database, secret: string, email: string, purpose: CodePurpose, flowNonce: string, now: number) {
  const code = newCode();
  const fh = await flowHash(flowNonce);
  const stmts = [
    db
      .prepare(
        `INSERT INTO codes (email, purpose, flow_hash, code_hash, expires_at, tries, sent_at) VALUES (?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT (email, purpose, flow_hash) DO UPDATE SET code_hash = excluded.code_hash,
           expires_at = excluded.expires_at, tries = 0, sent_at = excluded.sent_at`,
      )
      .bind(email, purpose, fh, await codeHash(secret, purpose, email, code), now + CODE_TTL_MS, now),
    db
      .prepare(
        `DELETE FROM codes WHERE email = ? AND purpose = ? AND (expires_at <= ? OR flow_hash NOT IN
           (SELECT flow_hash FROM codes WHERE email = ? AND purpose = ? ORDER BY sent_at DESC, rowid DESC LIMIT ${LIVE_CODES}))`,
      )
      .bind(email, purpose, now, email, purpose),
  ];
  return { code, stmts };
}

export type CodeCheck = 'ok' | 'wrong' | 'expired' | 'used-up' | 'none';

/**
 * Checks an entered code against this browser's own row, in constant time. Only a row issued to this flow can match, so
 * a guess made in anyone else's flow never touches (or uses up the tries of) another browser's code. A wrong guess uses
 * one of the row's tries. 'ok' consumes the row (single use, safe against two tabs entering it at once).
 */
export async function useCode(db: D1Database, secret: string, flow: Flow, entered: string | null, now: number): Promise<CodeCheck> {
  const fh = await flowHash(flow.n);
  const row = await codeRow(db, flow.e, flow.p, fh);
  const want = await codeHash(secret, flow.p, flow.e, entered ?? 'not-a-code');
  if (!row) return 'none';
  if (row.expires_at <= now) return 'expired';
  if (row.tries >= CODE_TRIES) return 'used-up';
  const match = timingSafeEqual(row.code_hash, want) && entered !== null;
  if (!match) {
    await db.prepare('UPDATE codes SET tries = tries + 1 WHERE email = ? AND purpose = ? AND flow_hash = ?').bind(flow.e, flow.p, fh).run();
    return row.tries + 1 >= CODE_TRIES ? 'used-up' : 'wrong';
  }
  const del = await db
    .prepare('DELETE FROM codes WHERE email = ? AND purpose = ? AND flow_hash = ? AND code_hash = ? AND tries < ? AND expires_at > ?')
    .bind(flow.e, flow.p, fh, row.code_hash, CODE_TRIES, now)
    .run();
  return (del.meta.changes ?? 0) === 1 ? 'ok' : 'none';
}
