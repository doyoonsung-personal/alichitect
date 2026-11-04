// GET /api/me: who is signed in and how much of today's quota is used. Only the hosted Worker (apps/worker) has this
// route; the local turn server (apps/server) does not, so every failure here resolves to null and the header shows no
// account control at all.

/** The shape of GET /api/me (apps/worker/src/index.ts). */
export interface Account {
  email: string;
  name: string;
  role: 'admin' | 'verified' | 'member';
  /** UTC-day turn count so far. */
  turnsToday: number;
  /** The daily limit, or null for admins and verified users. */
  turnsPerDay: number | null;
  links: { account: string; admin: string | null; signOut: string };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Same-origin paths only: a link in this response never leaves the site. */
const isPath = (v: unknown): v is string => typeof v === 'string' && /^\/(?![/\\])[\w\-./?=&%]*$/.test(v);

/** Validates a /api/me body. Anything else (a 404 page, another server's JSON) is null. */
export function parseAccount(v: unknown): Account | null {
  if (!isObj(v) || typeof v.email !== 'string' || !v.email || typeof v.turnsToday !== 'number' || !Number.isFinite(v.turnsToday)) return null;
  const l = v.links;
  if (!isObj(l) || !isPath(l.account) || !isPath(l.signOut) || !(l.admin === null || isPath(l.admin))) return null;
  const limit = v.turnsPerDay;
  if (!(limit === null || (typeof limit === 'number' && Number.isFinite(limit) && limit >= 0))) return null;
  return {
    email: v.email,
    name: typeof v.name === 'string' ? v.name.trim() : '',
    role: v.role === 'admin' || v.role === 'verified' ? v.role : 'member',
    turnsToday: Math.max(0, Math.floor(v.turnsToday)),
    turnsPerDay: limit,
    links: { account: l.account, admin: l.admin, signOut: l.signOut },
  };
}

export async function fetchAccount(o: { url?: string; fetchImpl?: typeof fetch; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<Account | null> {
  const f = o.fetchImpl ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), o.timeoutMs ?? 4000);
  const onAbort = (): void => ac.abort();
  o.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const res = await f(o.url ?? '/api/me', { signal: ac.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok || !/json/i.test(res.headers.get('content-type') ?? '')) return null;
    return parseAccount(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    o.signal?.removeEventListener('abort', onAbort);
  }
}

/** What the account menu says about the quota. */
export type Quota = { kind: 'unlimited'; used: number } | { kind: 'limited'; used: number; limit: number; left: number };

export function quotaOf(a: Pick<Account, 'turnsToday' | 'turnsPerDay'>): Quota {
  if (a.turnsPerDay === null) return { kind: 'unlimited', used: a.turnsToday };
  return { kind: 'limited', used: a.turnsToday, limit: a.turnsPerDay, left: Math.max(0, a.turnsPerDay - a.turnsToday) };
}

/** The next UTC midnight, when the daily count starts again (the Worker counts UTC days). */
export function nextResetMs(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

/** The name the header shows: the person's name, else the part of the address before the @. */
export function shortName(a: Pick<Account, 'name' | 'email'>): string {
  return a.name || a.email.split('@')[0] || a.email;
}

/** Where the SPA sends a person whose session ended: sign in, and come back to this page. */
export function loginUrl(path: string): string {
  const next = /^\/(?![/\\])/.test(path) ? path : '/';
  return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}

/** Fatal codes from the Worker that mean the person must sign in again, or is not approved. */
export function authHandoff(code: string): 'login' | 'pending' | null {
  if (code === 'signed-out' || code === 'http-401') return 'login';
  if (code === 'not-approved') return 'pending';
  return null;
}
