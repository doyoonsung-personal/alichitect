// The Worker's bindings, vars and secrets, and the small binding interfaces it uses. The interfaces are written here
// (not taken from @cloudflare/workers-types) so the same source type-checks and runs under node:test with fakes.

import type { Role } from './db.ts';

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

  /** Comma-separated addresses that become approved admins when they confirm their email (or sign in while pending). */
  ADMIN_EMAILS?: string;
  /** Turns per UTC day for a standard user (default 60). */
  TURNS_PER_DAY?: string;
  /** The one origin the app is served from, e.g. https://architect.alikorea-demo.com. */
  ALLOWED_ORIGIN: string;
  MAIL_FROM?: string;
  SITE_NAME?: string;
  /** New access requests that email the admins per rolling day (default 30); the rest are recorded without a mail. */
  REQUEST_MAILS_PER_DAY?: string;
  /** "1": email the user when an admin approves them (default on). */
  NOTIFY_ON_APPROVAL?: string;
  /** The sign-up pool: sign-up codes and "you already have an account" notes per rolling day, all addresses together
   * (default 100). Past it the sign-up page says it is temporarily unavailable; resets and the ADMIN_EMAILS addresses
   * have pools of their own. */
  CODE_MAILS_PER_DAY?: string;
  /** The reset pool: password-reset codes per rolling day, all addresses together (default 50). */
  RESET_MAILS_PER_DAY?: string;
  /** The reserve for ADMIN_EMAILS addresses (their sign-up and reset codes): per rolling day, never shared with the
   * pools above, so a flood of sign-ups cannot keep an operator from getting a code (default 40). */
  ADMIN_CODE_MAILS_PER_DAY?: string;
  /** "1" (local only): log mails (recipient and subject, which carries any code) instead of sending. Ignored unless
   * ALLOWED_ORIGIN is a plain-http loopback address, so it can never leak codes into production logs. */
  MAIL_LOG?: string;
  QWEN_MODEL?: string;
  /** 'none' disables failover. */
  QWEN_FALLBACK_MODEL?: string;
  QWEN_BASE_URL?: string;
  TURN_DEADLINE_MS?: string;
  /** Hard stop for one high-effort proposal draft, 30000-840000 ms (default 840000). */
  PROPOSAL_DEADLINE_MS?: string;
  /** The Claude backup's model (default claude-opus-5-5); used only when ANTHROPIC_API_KEY is set. Any other value, and any model not in the PRICES table, falls back to the default. */
  CLAUDE_BACKUP_MODEL?: string;
  /** Claude rescues per UTC day for a non-admin user (default 10). 0 turns the backup off for them. */
  CLAUDE_RESCUES_PER_USER_DAY?: string;
  /** Claude rescues per UTC day for an admin (default 30). */
  CLAUDE_RESCUES_PER_ADMIN_DAY?: string;
  /** The most Claude may cost per UTC day, all users together, in USD (default 5). Past it no rescue starts. */
  CLAUDE_BUDGET_USD_PER_DAY?: string;

  // secrets
  DASHSCOPE_API_KEY?: string;
  /** Optional: the Claude backup that finishes turns Model Studio's content filter stops. Unset: no backup. */
  ANTHROPIC_API_KEY?: string;
  /** Signs the session, flow and notice cookies, and keys the email-code and throttle HMACs. 32+ characters. */
  SESSION_SECRET?: string;
  /** Comma-separated shared demo accounts (created by the owner, no email confirmation). Their password cannot be
   * changed or reset from the app, and no mail is ever sent to them (the addresses need not be real inboxes). */
  SHARED_ACCOUNTS?: string;
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

/** Lowercased addresses from SHARED_ACCOUNTS. */
export function sharedAccounts(env: Env): string[] {
  return (env.SHARED_ACCOUNTS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.includes('@'));
}

export function isSharedAccount(env: Env, email: string): boolean {
  return sharedAccounts(env).includes(email.trim().toLowerCase());
}

/** The default deadline of one proposal draft (POST /api/proposal). */
export const DEFAULT_PROPOSAL_DEADLINE_MS = 840_000;

/** Up to 14 min: leave a minute for job persistence within the scheduled Worker's 15-minute wall-clock limit. */
export function proposalDeadlineMs(env: Env): number {
  const d = Number(env.PROPOSAL_DEADLINE_MS);
  return Number.isInteger(d) && d >= 30_000 && d <= 840_000 ? d : DEFAULT_PROPOSAL_DEADLINE_MS;
}

export function turnsPerDay(env: Env): number {
  const n = Number(env.TURNS_PER_DAY ?? '60');
  return Number.isInteger(n) && n >= 0 && n <= 100_000 ? n : 60;
}

/** Turn quota only. Permissions and backup allowances still distinguish admins from everyone else. */
export function dailyTurnLimit(env: Env, role: Role): number | null {
  return role === 'admin' || role === 'verified' ? null : turnsPerDay(env);
}

const intVar = (v: string | undefined, dflt: number, max = 100_000): number => {
  const n = Number(v ?? String(dflt));
  return Number.isInteger(n) && n >= 0 && n <= max ? n : dflt;
};

/** Claude rescues per day for one user (admins have their own, higher cap). */
export function rescuesPerDay(env: Env, admin: boolean): number {
  const raw = (admin ? env.CLAUDE_RESCUES_PER_ADMIN_DAY : env.CLAUDE_RESCUES_PER_USER_DAY)?.trim();
  const dflt = admin ? 30 : 10;
  // A whole number of digits only: an empty or garbled var must not read as 0 (which would switch the backup off) or as a huge cap.
  return raw !== undefined && /^\d{1,6}$/.test(raw) ? Number(raw) : dflt;
}

/** The day's Claude budget in USD, all users together. */
export function claudeBudgetUsdPerDay(env: Env): number {
  const raw = env.CLAUDE_BUDGET_USD_PER_DAY?.trim();
  if (raw === undefined || raw === '') return 5;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 10_000 ? n : 5;
}

export const codeMailsPerDay = (env: Env): number => intVar(env.CODE_MAILS_PER_DAY, 100);
export const resetMailsPerDay = (env: Env): number => intVar(env.RESET_MAILS_PER_DAY, 50);
export const adminCodeMailsPerDay = (env: Env): number => intVar(env.ADMIN_CODE_MAILS_PER_DAY, 40);

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

/** MAIL_LOG is honoured only for local development: plain http on a loopback ALLOWED_ORIGIN. */
export function mailLogAllowed(env: Env): boolean {
  if (env.MAIL_LOG !== '1') return false;
  try {
    const u = new URL(env.ALLOWED_ORIGIN);
    return u.protocol === 'http:' && isLoopbackHost(u.hostname);
  } catch {
    return false;
  }
}
