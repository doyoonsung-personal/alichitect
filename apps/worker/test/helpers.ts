// Test harness: a D1 stand-in over node:sqlite running the real migration, fake ASSETS and EMAIL bindings, an
// ExecutionContext that collects waitUntil work, an RSA key pair that signs ID tokens, and a helper that signs a user
// in by the same code the callback uses.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { D1Database, D1PreparedStatement, D1Result, Env, ExecutionContextLike } from '../src/env.ts';
import { b64url, utf8 } from '../src/crypto.ts';
import type { Jwk } from '../src/oidc.ts';
import * as db from '../src/db.ts';
import { issueSession } from '../src/session.ts';

export const ORIGIN = 'https://architect.alikorea-demo.com';
export const ADMIN = 'dysung.alicloud@gmail.com';
export const CLIENT_ID = 'test-client.apps.googleusercontent.com';
export const SECRET = 'test-session-secret-0123456789abcdefghijklmnopqrstuvwxyz';
export const API_KEY = 'sk-test-SECRET-0123456789abcdef';

const MIGRATION = readFileSync(fileURLToPath(new URL('../migrations/0001_init.sql', import.meta.url)), 'utf8');

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
    const r = this.sqlite.prepare(this.sql).run(...this.args());
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  runSync(): D1Result {
    const r = this.sqlite.prepare(this.sql).run(...this.args());
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

/** D1 over an in-memory SQLite database with the migration applied (foreign keys on, as in D1). */
export function makeD1(): D1Database & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec(MIGRATION);
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

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export const INDEX_HTML = '<!doctype html><title>Architecture Builder</title><div id="root"></div>';

export function makeEnv(over: Partial<Env> = {}): Env & { DB: ReturnType<typeof makeD1>; mails: Mail[] } {
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
        mails.push({ to: m.to, subject: m.subject, text: m.text });
        return { messageId: `m${mails.length}` };
      },
    },
    ADMIN_EMAILS: ADMIN,
    TURNS_PER_DAY: '3',
    ALLOWED_ORIGIN: ORIGIN,
    GOOGLE_CLIENT_ID: CLIENT_ID,
    GOOGLE_CLIENT_SECRET: 'test-google-secret',
    SESSION_SECRET: SECRET,
    DASHSCOPE_API_KEY: API_KEY,
    MAIL_FROM: 'no-reply@alikorea-demo.com',
    SITE_NAME: 'Alibaba Cloud Architecture Builder',
    NOTIFY_ON_APPROVAL: '1',
    mails,
    ...over,
  } as Env & { DB: ReturnType<typeof makeD1>; mails: Mail[] };
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

/** Signs a user in as the OIDC callback would (create or refresh, ADMIN_EMAILS seeding) and returns the Cookie header value. */
export async function signIn(env: Env, email: string, o: { status?: db.Status; role?: db.Role; name?: string; requested?: boolean } = {}): Promise<{ cookie: string; user: db.UserRow }> {
  const now = Date.now();
  const r = await db.upsertOnSignIn(env.DB, { sub: `sub-${email}`, email, name: o.name ?? email.split('@')[0], picture: null }, { seedAdmin: email === ADMIN, lang: null, now });
  if (o.status || o.role || o.requested) {
    await env.DB.prepare('UPDATE users SET status = COALESCE(?, status), role = COALESCE(?, role), requested_at = COALESCE(?, requested_at) WHERE id = ?')
      .bind(o.status ?? null, o.role ?? null, o.requested ? now : null, r.user.id)
      .run();
  }
  const set = await issueSession(env, r.user.id, now);
  const user = (await db.userById(env.DB, r.user.id))!;
  return { cookie: set.split(';')[0], user };
}

/** A request to the Worker from the app's own origin. */
export function req(path: string, o: { method?: string; cookie?: string; body?: string; type?: string; origin?: string | null; headers?: Record<string, string> } = {}): Request {
  const h = new Headers(o.headers ?? {});
  if (o.cookie) h.set('Cookie', o.cookie);
  if (o.type) h.set('Content-Type', o.type);
  const method = o.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD' && o.origin !== null) h.set('Origin', o.origin ?? ORIGIN);
  return new Request(`${ORIGIN}${path}`, { method, headers: h, body: o.body, redirect: 'manual' });
}

/* ---------- RS256 keys and ID tokens ---------- */

export interface TestKey {
  kid: string;
  jwk: Jwk;
  privateKey: CryptoKey;
}

export async function makeKey(kid: string): Promise<TestKey> {
  const kp = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const pub = (await crypto.subtle.exportKey('jwk', kp.publicKey)) as JsonWebKey;
  return { kid, jwk: { kty: 'RSA', n: pub.n, e: pub.e, alg: 'RS256', use: 'sig', kid }, privateKey: kp.privateKey };
}

export async function signToken(key: TestKey, claims: Record<string, unknown>, header: Record<string, unknown> = {}): Promise<string> {
  const h = b64url(utf8(JSON.stringify({ alg: 'RS256', kid: key.kid, typ: 'JWT', ...header })));
  const p = b64url(utf8(JSON.stringify(claims)));
  const s = b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, utf8(`${h}.${p}`)));
  return `${h}.${p}.${s}`;
}

export function goodClaims(nonce: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  const iat = Math.floor(Date.now() / 1000);
  return { iss: 'https://accounts.google.com', aud: CLIENT_ID, azp: CLIENT_ID, sub: '1234567890', email: 'Someone@Example.com', email_verified: true, name: 'Some One', picture: 'https://lh3.googleusercontent.com/a/abc=s96-c', nonce, iat, exp: iat + 3600, ...over };
}

/** Reads a whole NDJSON response into parsed lines. */
export async function ndjson(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text();
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}
