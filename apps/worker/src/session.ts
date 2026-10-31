// Sessions: an HMAC-SHA256-signed cookie (__Host-ab_session, HttpOnly, Secure, SameSite=Lax, 7 days) carrying a random
// session id whose SHA-256 is stored in D1. Every check reads the session and the user's status and role from D1, so a
// revoked session or a revoked user stops working at once. Static asset requests may use a 15 s per-isolate cache
// (pages, the API and the admin page never do), and an admin action clears the cache of the isolate it runs in.
import type { Env } from './env.ts';
import { sessionSecret } from './env.ts';
import { randomToken, sha256Hex, signJson, verifyJson } from './crypto.ts';
import { cookie, parseCookies } from './http.ts';
import * as db from './db.ts';
import type { UserRow } from './db.ts';

export const SESSION_COOKIE = '__Host-ab_session';
export const SESSION_TTL_MS = 7 * 86_400_000;
const PURPOSE = 'session-v1';
const CACHE_MS = 15_000;
const CACHE_MAX = 500;

interface SessionPayload {
  sid: string;
  exp: number;
}

export interface Signed {
  user: UserRow;
  sessionHash: string;
}

const cache = new Map<string, { user: UserRow; at: number }>();

/** Starts a session for a user and returns its Set-Cookie value. */
export async function issueSession(env: Env, userId: string, now: number): Promise<string> {
  const secret = sessionSecret(env);
  if (!secret) throw new Error('SESSION_SECRET missing');
  const sid = randomToken(32);
  const exp = now + SESSION_TTL_MS;
  await db.insertSession(env.DB, await sha256Hex(sid), userId, now, exp);
  return cookie(SESSION_COOKIE, await signJson(secret, PURPOSE, { sid, exp } satisfies SessionPayload), { maxAge: SESSION_TTL_MS / 1000 });
}

export const clearSessionCookie = (): string => cookie(SESSION_COOKIE, '', { maxAge: 0 });

/** The session id hash from a valid, unexpired cookie, or null. Does not touch D1. */
export async function sessionHashOf(request: Request, env: Env, now: number): Promise<string | null> {
  const secret = sessionSecret(env);
  if (!secret) return null;
  const raw = parseCookies(request.headers.get('Cookie')).get(SESSION_COOKIE);
  const p = await verifyJson<SessionPayload>(secret, PURPOSE, raw);
  if (!p || typeof p.sid !== 'string' || p.sid.length < 32 || typeof p.exp !== 'number' || p.exp <= now) return null;
  return sha256Hex(p.sid);
}

/**
 * The signed-in user, or null. fresh=false (static assets only) may answer from a 15 s per-isolate cache; everything
 * else reads D1.
 */
export async function currentUser(request: Request, env: Env, o: { fresh: boolean; now?: number }): Promise<Signed | null> {
  const now = o.now ?? Date.now();
  const hash = await sessionHashOf(request, env, now);
  if (!hash) return null;
  if (!o.fresh) {
    const c = cache.get(hash);
    if (c && now - c.at < CACHE_MS) return { user: c.user, sessionHash: hash };
  }
  const user = await db.userBySession(env.DB, hash, now);
  if (!user) {
    cache.delete(hash);
    return null;
  }
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(hash, { user, at: now });
  return { user, sessionHash: hash };
}

/** Forgets cached sessions of a user in this isolate (after an admin action on them). */
export function forgetUser(userId: string): void {
  for (const [k, v] of cache) if (v.user.id === userId) cache.delete(k);
}

/** Revokes the request's session (if any) and returns the clearing Set-Cookie value. */
export async function endSession(request: Request, env: Env, now: number): Promise<string> {
  const hash = await sessionHashOf(request, env, now);
  if (hash) {
    cache.delete(hash);
    await db.revokeSession(env.DB, hash, now);
  }
  return clearSessionCookie();
}

/** Test hook: empties the per-isolate cache. */
export function _resetSessionCache(): void {
  cache.clear();
}
