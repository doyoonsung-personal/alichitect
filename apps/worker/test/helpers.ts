// Test harness: a D1 stand-in over node:sqlite running the real migration, fake ASSETS and EMAIL bindings, an
// ExecutionContext that collects waitUntil work, a cookie-keeping Browser that drives the Worker's fetch handler, and
// helpers that create accounts directly or through the real sign-up flow.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { D1Database, D1PreparedStatement, D1Result, Env, ExecutionContextLike } from '../src/env.ts';
import * as db from '../src/db.ts';
import { issueSession } from '../src/session.ts';
import { hashPassword } from '../src/password.ts';
import type { StoredPassword } from '../src/password.ts';
import { AUTH_TIMING } from '../src/auth.ts';
import { randomHex } from '../src/crypto.ts';
import worker from '../src/index.ts';

export const ORIGIN = 'https://architect.alikorea-demo.com';
export const ADMIN = 'dysung.alicloud@gmail.com';
export const SECRET = 'test-session-secret-0123456789abcdefghijklmnopqrstuvwxyz';
export const API_KEY = 'sk-test-SECRET-0123456789abcdef';
export const PASSWORD = 'correct horse battery';

// the response floor that hides account existence is tested on its own; everything else runs without it
AUTH_TIMING.padMs = 0;
AUTH_TIMING.jitterMs = 0;

// every migration, in order, as `wrangler d1 migrations apply` runs them
const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
const MIGRATION_NAMES = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const MIGRATIONS = MIGRATION_NAMES.map((f) => readFileSync(MIGRATIONS_DIR + f, 'utf8'));

type Row = Record<string, unknown>;

class Stmt implements D1PreparedStatement {
  sqlite: DatabaseSync;
  sql: string;
  params: unknown[];
  constructor(sqlite: DatabaseSync, sql: string, params: unknown[] = []) {
    this.sqlite = sqlite;
    this.sql = sql;
    this.params = params;
  }
  bind(...values: unknown[]): D1PreparedStatement {
    return new Stmt(this.sqlite, this.sql, values);
  }
  private args(): Array<string | number | null> {
    return this.params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : (v as string | number | null)));
  }
  async first<T = Row>(): Promise<T | null> {
    const r = this.sqlite.prepare(this.sql).get(...this.args());
    return r ? ({ ...r } as T) : null;
  }
  async all<T = Row>(): Promise<D1Result<T>> {
    const rows = this.sqlite.prepare(this.sql).all(...this.args());
    return { results: rows.map((r) => ({ ...r }) as T), success: true, meta: {} };
  }
  async run(): Promise<D1Result> {
    return this.runSync();
  }
  /** As D1 does: rows for a statement that returns them (SELECT, RETURNING), and the change count. */
  runSync(): D1Result {
    const st = this.sqlite.prepare(this.sql);
    if (/\bRETURNING\b|^\s*SELECT\b/i.test(this.sql)) {
      const before = Number((this.sqlite.prepare('SELECT total_changes() AS n').get() as { n: number }).n);
      const rows = st.all(...this.args()).map((r) => ({ ...r }));
      const after = Number((this.sqlite.prepare('SELECT total_changes() AS n').get() as { n: number }).n);
      return { results: rows, success: true, meta: { changes: after - before } };
    }
    const r = st.run(...this.args());
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export type TestDB = D1Database & { sqlite: DatabaseSync };

/** Wraps an in-memory SQLite database in the D1 stand-in (foreign keys on, as in D1). */
function d1Over(sqlite: DatabaseSync): TestDB {
  return {
    sqlite,
    prepare: (sql: string) => new Stmt(sqlite, sql),
    async batch(statements: D1PreparedStatement[]) {
      sqlite.exec('BEGIN');
      try {
        const out = statements.map((s) => (s as Stmt).runSync());
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

/** D1 over an in-memory SQLite database with the migration applied (foreign keys on, as in D1). */
export function makeD1(): TestDB {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  for (const m of MIGRATIONS) sqlite.exec(m);
  return d1Over(sqlite);
}

/** D1 as an OLD deployment sees it: every migration except the ones whose filename starts
 * with one of the given prefixes. Used to prove a feature's missing tables fail only that
 * feature's routes, never /api/me, application boot or the existing flows. */
export function makeD1Without(...migrationPrefixes: string[]): TestDB {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  for (const name of MIGRATION_NAMES) {
    if (migrationPrefixes.some((p) => name.startsWith(p))) continue;
    sqlite.exec(readFileSync(MIGRATIONS_DIR + name, 'utf8'));
  }
  return d1Over(sqlite);
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const INDEX_HTML = readFileSync(new URL('../../web/index.html', import.meta.url), 'utf8');

export type TestEnv = Env & { DB: TestDB; mails: Mail[] };

export function makeEnv(over: Partial<Env> = {}): TestEnv {
  const mails: Mail[] = [];
  const assets = {
    async fetch(req: Request): Promise<Response> {
      const p = new URL(req.url).pathname;
      if (p === '/' || p === '/index.html') return new Response(INDEX_HTML, { headers: { 'Content-Type': 'text/html' } });
      if (p === '/assets/app.js') return new Response('console.log(1)', { headers: { 'Content-Type': 'text/javascript' } });
      if (p.startsWith('/brand/')) return new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } });
      return new Response(null, { status: 404 });
    },
  };
  return {
    ASSETS: assets,
    DB: makeD1(),
    EMAIL: {
      async send(m) {
        mails.push({ to: m.to, subject: m.subject, text: m.text, html: m.html });
        return { messageId: `m${mails.length}` };
      },
    },
    ADMIN_EMAILS: ADMIN,
    TURNS_PER_DAY: '3',
    ALLOWED_ORIGIN: ORIGIN,
    SESSION_SECRET: SECRET,
    DASHSCOPE_API_KEY: API_KEY,
    MAIL_FROM: 'no-reply@alikorea-demo.com',
    SITE_NAME: 'Alibaba Cloud Architecture Builder',
    NOTIFY_ON_APPROVAL: '1',
    mails,
    ...over,
  } as TestEnv;
}

export function makeCtx(): ExecutionContextLike & { flush(): Promise<void> } {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil(p) {
      pending.push(p);
    },
    async flush() {
      while (pending.length) await Promise.allSettled(pending.splice(0));
    },
  };
}

let testHash: Promise<StoredPassword> | null = null;
/** PASSWORD's hash, computed once (PBKDF2 at full strength takes a while). */
const passwordHash = (): Promise<StoredPassword> => (testHash ??= hashPassword(PASSWORD));

/**
 * Creates an account directly in D1 (as a confirmed sign-up would leave it): ADMIN is an approved admin, anyone else
 * pending, unless status or role say otherwise. The password is PASSWORD unless given.
 */
export async function makeUser(env: Env, email: string, o: { status?: db.Status; role?: db.Role; name?: string; note?: string | null; password?: string; lang?: string | null } = {}): Promise<db.UserRow> {
  const now = Date.now();
  const seeded = email === ADMIN;
  const p = o.password ? await hashPassword(o.password) : await passwordHash();
  const id = `u_${randomHex(8)}`;
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, pw_hash, pw_salt, pw_version, pw_changed_at, status, role, note, lang, created_at, requested_at, decided_at, decided_by, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, email, o.name ?? email.split('@')[0], p.pw_hash, p.pw_salt, p.pw_version, now, o.status ?? (seeded ? 'approved' : 'pending'), o.role ?? (seeded ? 'admin' : 'user'), o.note ?? null, o.lang ?? null, now, seeded ? null : now, seeded ? now : null, seeded ? 'ADMIN_EMAILS' : null, now)
    .run();
  return (await db.userById(env.DB, id))!;
}

/** An account (made with makeUser when the address has none) with a fresh session; returns the Cookie header value. */
export async function signIn(env: Env, email: string, o: { status?: db.Status; role?: db.Role; name?: string; requested?: boolean } = {}): Promise<{ cookie: string; user: db.UserRow }> {
  let user = await db.userByEmail(env.DB, email);
  if (!user) user = await makeUser(env, email, { status: o.status, role: o.role, name: o.name });
  else if (o.status || o.role) {
    await env.DB.prepare('UPDATE users SET status = COALESCE(?, status), role = COALESCE(?, role) WHERE id = ?').bind(o.status ?? null, o.role ?? null, user.id).run();
    user = (await db.userById(env.DB, user.id))!;
  }
  const set = await issueSession(env, user.id, Date.now());
  return { cookie: set.split(';')[0], user };
}

/** A request to the Worker from the app's own origin. */
export function req(path: string, o: { method?: string; cookie?: string; body?: string; type?: string; origin?: string | null; headers?: Record<string, string>; ip?: string } = {}): Request {
  const h = new Headers(o.headers ?? {});
  if (o.cookie) h.set('Cookie', o.cookie);
  if (o.type) h.set('Content-Type', o.type);
  h.set('CF-Connecting-IP', o.ip ?? '198.51.100.1');
  const method = o.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD' && o.origin !== null) h.set('Origin', o.origin ?? ORIGIN);
  return new Request(`${ORIGIN}${path}`, { method, headers: h, body: o.body, redirect: 'manual' });
}

/** Runs one request through the Worker and waits for its background work (mails, session cleanup). */
export async function call(env: Env, r: Request): Promise<Response> {
  const ctx = makeCtx();
  const res = await worker.fetch(r, env, ctx);
  await ctx.flush();
  return res;
}

export const where = (res: Response): string => `${res.status}${res.headers.get('Location') ? ` ${res.headers.get('Location')}` : ''}`;

/** A browser: keeps cookies across requests (dropping the ones a response deletes) and posts forms from this origin. */
export class Browser {
  env: TestEnv;
  ip: string;
  jar = new Map<string, string>();
  constructor(env: TestEnv, ip = '198.51.100.1') {
    this.env = env;
    this.ip = ip;
  }
  get cookie(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async fetch(path: string, o: { method?: string; form?: Record<string, string>; headers?: Record<string, string> } = {}): Promise<Response> {
    const method = o.method ?? (o.form ? 'POST' : 'GET');
    const res = await call(
      this.env,
      req(path, { method, cookie: this.jar.size ? this.cookie : undefined, ip: this.ip, headers: o.headers, type: o.form ? 'application/x-www-form-urlencoded' : undefined, body: o.form ? new URLSearchParams(o.form).toString() : undefined }),
    );
    for (const c of res.headers.getSetCookie()) {
      const pair = c.split(';')[0];
      const i = pair.indexOf('=');
      const [name, value] = [pair.slice(0, i), pair.slice(i + 1)];
      if (/Max-Age=0\b/i.test(c)) this.jar.delete(name);
      else this.jar.set(name, value);
    }
    return res;
  }
  post(path: string, form: Record<string, string> = {}): Promise<Response> {
    return this.fetch(path, { form });
  }
  async text(path: string): Promise<string> {
    return (await this.fetch(path)).text();
  }
}

/** The mails sent to an address, oldest first. */
export const mailsTo = (env: TestEnv, to: string): Mail[] => env.mails.filter((m) => m.to === to);

/** The 6-digit code in the latest mail to an address (it is in the subject, as on WonderClip). */
export function lastCode(env: TestEnv, to: string): string {
  const m = mailsTo(env, to).at(-1);
  const code = /\b(\d{6})\b/.exec(m?.subject ?? '')?.[1];
  if (!code) throw new Error(`no code mailed to ${to}`);
  return code;
}

/** Signs up through the real pages and enters the mailed code. */
export async function signUp(env: TestEnv, email: string, o: { name?: string; password?: string; note?: string; browser?: Browser } = {}): Promise<{ browser: Browser; res: Response }> {
  const b = o.browser ?? new Browser(env);
  const r1 = await b.post('/signup', { name: o.name ?? 'Mina Park', email, password: o.password ?? PASSWORD, note: o.note ?? '' });
  if (r1.status !== 303) throw new Error(`sign-up answered ${r1.status}`);
  const res = await b.post('/verify', { code: lastCode(env, email) });
  return { browser: b, res };
}

/**
 * Moves every stored time back by `ms`, as if that much time had passed: rate windows, lockouts, codes and the
 * sign-ups waiting for them.
 */
export async function age(env: TestEnv, ms: number): Promise<void> {
  env.DB.sqlite.exec(`
    UPDATE rate SET window_start = window_start - ${ms};
    UPDATE lockouts SET last_fail_at = last_fail_at - ${ms}, locked_until = CASE WHEN locked_until > 0 THEN locked_until - ${ms} ELSE 0 END;
    UPDATE codes SET expires_at = expires_at - ${ms}, sent_at = sent_at - ${ms};
    UPDATE signups SET created_at = created_at - ${ms};
  `);
}

/** Reads a whole NDJSON response into parsed lines. */
export async function ndjson(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text();
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}
