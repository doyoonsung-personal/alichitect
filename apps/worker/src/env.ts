// The Worker's bindings, vars and secrets, and the small binding interfaces it uses. The interfaces are written here
// (not taken from @cloudflare/workers-types) so the same source type-checks and runs under node:test with fakes.

export interface D1Meta {
  changes?: number;
  last_row_id?: number;
  [k: string]: unknown;
}
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

/** The static assets binding (apps/web/dist). */
export interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

/** Cloudflare Email Service (send_email binding), the structured form the WonderClip platform uses. */
export interface EmailBinding {
  send(message: { from: { email: string; name?: string }; to: string; subject: string; html: string; text: string }): Promise<{ messageId?: string } | void>;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface Env {
  ASSETS: AssetsBinding;
  DB: D1Database;
  EMAIL?: EmailBinding;

  /** Comma-separated addresses that become approved admins at their first sign-in. */
  ADMIN_EMAILS?: string;
  /** Turns per UTC day for a non-admin user (default 60). */
  TURNS_PER_DAY?: string;
  /** The one origin the app is served from, e.g. https://architect.alikorea-demo.com. */
  ALLOWED_ORIGIN: string;
  GOOGLE_CLIENT_ID: string;
  MAIL_FROM?: string;
  SITE_NAME?: string;
  /** New access requests that email the admins per rolling day (default 30); the rest are recorded without a mail. */
  REQUEST_MAILS_PER_DAY?: string;
  /** "1": email the user when an admin approves them (default on). */
  NOTIFY_ON_APPROVAL?: string;
  /** "1" (local only): log mail subjects instead of sending. */
  MAIL_LOG?: string;
  /** "1" (local only): the fake Google sign-in for tests. Refused unless both the page and ALLOWED_ORIGIN are loopback. */
  DEV_FAKE_GOOGLE?: string;
  QWEN_MODEL?: string;
  /** 'none' disables failover. */
  QWEN_FALLBACK_MODEL?: string;
  QWEN_BASE_URL?: string;
  TURN_DEADLINE_MS?: string;

  // secrets
  DASHSCOPE_API_KEY?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
}

/** Lowercased, de-duplicated addresses from ADMIN_EMAILS. */
export function adminEmails(env: Env): string[] {
  const out = new Set<string>();
  for (const raw of (env.ADMIN_EMAILS ?? '').split(',')) {
    const s = raw.trim().toLowerCase();
    if (s && s.includes('@')) out.add(s);
  }
  return [...out];
}

export function turnsPerDay(env: Env): number {
  const n = Number(env.TURNS_PER_DAY ?? '60');
  return Number.isInteger(n) && n >= 0 && n <= 100_000 ? n : 60;
}

export function requestMailsPerDay(env: Env): number {
  const n = Number(env.REQUEST_MAILS_PER_DAY ?? '30');
  return Number.isInteger(n) && n >= 0 && n <= 10_000 ? n : 30;
}

/** The canonical origin (scheme://host[:port], lowercase), or null when ALLOWED_ORIGIN is not a bare http(s) origin. */
export function allowedOrigin(env: Env): string | null {
  try {
    const u = new URL(env.ALLOWED_ORIGIN);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.origin.toLowerCase();
  } catch {
    return null;
  }
}

/** The session secret, or null when it is missing or too short to be safe (every auth path then fails closed). */
export function sessionSecret(env: Env): string | null {
  const s = env.SESSION_SECRET ?? '';
  return s.length >= 32 ? s : null;
}

export const isLoopbackHost = (h: string): boolean => h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
