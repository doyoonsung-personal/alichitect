// Every D1 query the Worker runs. Status and role changes are single conditional statements, so two admins acting
// at once cannot break the rules (for example, the last admin can never be demoted or removed).
import type { D1Database, D1PreparedStatement } from './env.ts';
import { randomHex } from './crypto.ts';
import type { StoredPassword } from './password.ts';

export type Status = 'pending' | 'approved' | 'denied' | 'revoked';
export type Role = 'user' | 'admin';

/** An account as the rest of the Worker sees it. The password columns are never read into it (see credentialsByEmail). */
export interface UserRow {
  id: string;
  email: string;
  name: string;
  status: Status;
  role: Role;
  note: string | null;
  lang: string | null;
  created_at: number;
  requested_at: number | null;
  decided_at: number | null;
  decided_by: string | null;
  last_login_at: number | null;
  last_seen_at: number | null;
}

/** The columns of UserRow, for SELECTs (never u.*, which would carry the password hash along). */
const USER_COLS = 'id, email, name, status, role, note, lang, created_at, requested_at, decided_at, decided_by, last_login_at, last_seen_at';
const U_COLS = USER_COLS.split(', ')
  .map((c) => `u.${c}`)
  .join(', ');

export const NOTE_MAX = 500;
export const NAME_MAX = 80;

/** The UTC day (YYYY-MM-DD) of a time in ms. */
export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export async function userByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db.prepare(`SELECT ${USER_COLS} FROM users WHERE email = ?`).bind(email).first<UserRow>();
}

export async function userById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).bind(id).first<UserRow>();
}

export interface Credentials extends StoredPassword {
  id: string;
  email: string;
}

/** The password hash of an account, for sign-in and password changes only. */
export async function credentialsByEmail(db: D1Database, email: string): Promise<Credentials | null> {
  return db.prepare('SELECT id, email, pw_hash, pw_salt, pw_version FROM users WHERE email = ?').bind(email).first<Credentials>();
}

export async function credentialsById(db: D1Database, id: string): Promise<Credentials | null> {
  return db.prepare('SELECT id, email, pw_hash, pw_salt, pw_version FROM users WHERE id = ?').bind(id).first<Credentials>();
}

/** The user behind a live session (not expired, not revoked), read fresh: status and role are always current. */
export async function userBySession(db: D1Database, idHash: string, now: number): Promise<UserRow | null> {
  return db
    .prepare(`SELECT ${U_COLS} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ? AND s.expires_at > ? AND s.revoked_at IS NULL`)
    .bind(idHash, now)
    .first<UserRow>();
}

export async function audit(db: D1Database, who: string, what: string, target: string | null, detail: Record<string, unknown> | null, now: number): Promise<void> {
  await db
    .prepare('INSERT INTO audit (at, who, what, target, detail) VALUES (?, ?, ?, ?, ?)')
    .bind(now, who, what, target, detail ? JSON.stringify(detail).slice(0, 1000) : null)
    .run();
}

/* ---------- sign-ups ---------- */

export interface SignupInput {
  email: string;
  name: string;
  note: string | null;
  password: StoredPassword;
  lang: string | null;
  flowHash: string;
}

/** Sign-ups kept per address while they wait for their code (the newest; see codes.ts LIVE_CODES). */
const LIVE_SIGNUPS = 5;

/**
 * The statements that store (or replace, for the same browser flow) a sign-up waiting for its code, and drop the
 * address's expired or surplus ones. Another browser's sign-up for the same address is a row of its own: it can neither
 * replace the owner's nor attach a password to the owner's code.
 */
export function putSignup(db: D1Database, s: SignupInput, now: number): D1PreparedStatement[] {
  return [
    db
      .prepare(
        `INSERT INTO signups (email, flow_hash, name, note, pw_hash, pw_salt, pw_version, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (email, flow_hash) DO UPDATE SET name = excluded.name, note = excluded.note, pw_hash = excluded.pw_hash, pw_salt = excluded.pw_salt,
           pw_version = excluded.pw_version, lang = excluded.lang, created_at = excluded.created_at`,
      )
      .bind(s.email, s.flowHash, s.name, s.note, s.password.pw_hash, s.password.pw_salt, s.password.pw_version, s.lang, now),
    db
      .prepare(
        `DELETE FROM signups WHERE email = ? AND (created_at < ? OR flow_hash NOT IN
           (SELECT flow_hash FROM signups WHERE email = ? ORDER BY created_at DESC, rowid DESC LIMIT ${LIVE_SIGNUPS}))`,
      )
      .bind(s.email, now - 2 * 86_400_000, s.email),
  ];
}

/** Updates the details of a sign-up, only when it belongs to the same browser flow (the person corrected the form). */
export async function updateSignupInFlow(db: D1Database, s: SignupInput, now: number): Promise<boolean> {
  const r = await db
    .prepare('UPDATE signups SET name = ?, note = ?, pw_hash = ?, pw_salt = ?, pw_version = ?, lang = ?, created_at = ? WHERE email = ? AND flow_hash = ?')
    .bind(s.name, s.note, s.password.pw_hash, s.password.pw_salt, s.password.pw_version, s.lang, now, s.email, s.flowHash)
    .run();
  return (r.meta.changes ?? 0) === 1;
}

/** Whether this browser flow has a sign-up waiting for this address. */
export async function signupInFlow(db: D1Database, email: string, flowHash: string): Promise<boolean> {
  return (await db.prepare('SELECT 1 AS x FROM signups WHERE email = ? AND flow_hash = ?').bind(email, flowHash).first()) !== null;
}

/**
 * Scratch writes with the shape of a sign-up or code write (an upsert per statement, in one batch). The paths for an
 * address that has an account run this where a new address stores a sign-up or a code, so both cost the same database
 * work and a timing difference cannot tell them apart. The rows are never read.
 */
export async function decoyWrite(db: D1Database, statements: number, now: number): Promise<void> {
  const stmts: D1PreparedStatement[] = [];
  for (let i = 0; i < statements; i++) {
    stmts.push(db.prepare('INSERT INTO decoy (k, at) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET at = excluded.at').bind(`d${i}`, now));
  }
  await db.batch(stmts);
}

export interface CreatedAccount {
  user: UserRow;
  /** Approved as an admin from ADMIN_EMAILS. */
  seeded: boolean;
}

/**
 * Turns the confirmed sign-up of this browser flow into an account: pending, or an approved admin for an address in
 * ADMIN_EMAILS. The address's other waiting sign-ups and codes (other browsers') are dropped. Returns null when there
 * is no such sign-up or the address already has an account.
 */
export async function createAccountFromSignup(db: D1Database, email: string, flowHash: string, seedAdmin: boolean, now: number): Promise<CreatedAccount | null> {
  const id = `u_${randomHex(8)}`;
  const status: Status = seedAdmin ? 'approved' : 'pending';
  const role: Role = seedAdmin ? 'admin' : 'user';
  const [ins] = await db.batch([
    db
      .prepare(
        `INSERT INTO users (id, email, name, pw_hash, pw_salt, pw_version, pw_changed_at, status, role, note, lang, created_at, requested_at, decided_at, decided_by, last_login_at, last_seen_at)
         SELECT ?, email, name, pw_hash, pw_salt, pw_version, ?, ?, ?, note, lang, ?, ?, ?, ?, ?, ? FROM signups WHERE email = ? AND flow_hash = ?
         ON CONFLICT (email) DO NOTHING`,
      )
      .bind(id, now, status, role, now, seedAdmin ? null : now, seedAdmin ? now : null, seedAdmin ? 'ADMIN_EMAILS' : null, now, now, email, flowHash),
    db.prepare('DELETE FROM signups WHERE email = ?').bind(email),
    db.prepare(`DELETE FROM codes WHERE email = ? AND purpose = 'verify'`).bind(email),
  ]);
  if ((ins.meta.changes ?? 0) !== 1) return null;
  await audit(db, 'system', seedAdmin ? 'seed-admin' : 'sign-up', email, null, now);
  return { user: (await userById(db, id))!, seeded: seedAdmin };
}

/**
 * At sign-in: an address in ADMIN_EMAILS whose account is still pending becomes an approved admin. Never over an
 * admin's decline or removal.
 */
export async function seedAdminIfPending(db: D1Database, user: UserRow, now: number): Promise<boolean> {
  if (user.status !== 'pending') return false;
  const r = await db
    .prepare(`UPDATE users SET status = 'approved', role = 'admin', decided_at = ?, decided_by = 'ADMIN_EMAILS' WHERE id = ? AND status = 'pending'`)
    .bind(now, user.id)
    .run();
  if ((r.meta.changes ?? 0) !== 1) return false;
  await audit(db, 'system', 'seed-admin', user.email, null, now);
  return true;
}

export async function recordSignIn(db: D1Database, userId: string, lang: string | null, now: number): Promise<void> {
  await db.prepare('UPDATE users SET last_login_at = ?, last_seen_at = ?, lang = COALESCE(?, lang) WHERE id = ?').bind(now, now, lang, userId).run();
}

/** Stores a new password hash. */
export function setPasswordStatement(db: D1Database, userId: string, p: StoredPassword, now: number): D1PreparedStatement {
  return db.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_version = ?, pw_changed_at = ? WHERE id = ?').bind(p.pw_hash, p.pw_salt, p.pw_version, now, userId);
}

/** Replaces the password and revokes every session of the user except `keepSession` (a hash, or null for all). */
export async function changePassword(db: D1Database, userId: string, p: StoredPassword, keepSession: string | null, now: number): Promise<void> {
  await db.batch([
    setPasswordStatement(db, userId, p, now),
    keepSession
      ? db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND id_hash != ?').bind(now, userId, keepSession)
      : db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').bind(now, userId),
  ]);
}

export async function insertSession(db: D1Database, idHash: string, userId: string, now: number, expiresAt: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now - 86_400_000),
    db.prepare('INSERT INTO sessions (id_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(idHash, userId, now, expiresAt),
  ]);
}

export async function revokeSession(db: D1Database, idHash: string, now: number): Promise<void> {
  await db.prepare('UPDATE sessions SET revoked_at = ? WHERE id_hash = ? AND revoked_at IS NULL').bind(now, idHash).run();
}

export async function revokeUserSessions(db: D1Database, userId: string, now: number): Promise<void> {
  await db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').bind(now, userId).run();
}

export async function touchLastSeen(db: D1Database, userId: string, now: number): Promise<void> {
  await db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').bind(now, userId).run();
}

/** Updates the note of a pending user's request. */
export async function updateNote(db: D1Database, userId: string, note: string | null): Promise<boolean> {
  const r = await db.prepare(`UPDATE users SET note = ? WHERE id = ? AND status = 'pending'`).bind(note, userId).run();
  return (r.meta.changes ?? 0) === 1;
}

/** How many access requests were made since `since` (ms): the throttle for the admin notification mails. */
export async function requestsSince(db: D1Database, since: number): Promise<number> {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM users WHERE requested_at >= ?').bind(since).first<{ n: number }>();
  return r?.n ?? 0;
}

/** Approved admins' addresses and languages (for notifications). */
export async function adminRecipients(db: D1Database): Promise<Array<{ email: string; lang: string | null }>> {
  const r = await db.prepare(`SELECT email, lang FROM users WHERE role = 'admin' AND status = 'approved' ORDER BY created_at LIMIT 10`).all<{ email: string; lang: string | null }>();
  return r.results;
}

export type AdminAction = 'approve' | 'deny' | 'revoke' | 'promote' | 'demote';
export const ADMIN_ACTIONS: readonly AdminAction[] = ['approve', 'deny', 'revoke', 'promote', 'demote'];

export type ActionError = 'not-found' | 'state' | 'self' | 'last-admin' | 'forbidden';

/**
 * Applies an admin action. Each is one conditional UPDATE:
 * - approve: pending, denied or revoked -> approved
 * - deny: pending -> denied
 * - revoke: approved -> revoked (and the role drops to user); every session of the user is revoked
 * - promote: approved user -> admin
 * - demote: admin -> user
 * Revoke and demote never leave zero approved admins, and an admin cannot revoke or deny themselves.
 * The acting admin is checked inside the UPDATE too (actorIsAdmin), not only on the row the request read earlier: an
 * admin who was demoted or removed a moment ago cannot complete one more action.
 */
export async function applyAdminAction(db: D1Database, actor: UserRow, targetId: string, action: AdminAction, now: number): Promise<{ ok: true; user: UserRow } | { ok: false; error: ActionError }> {
  const target = await userById(db, targetId);
  if (!target) return { ok: false, error: 'not-found' };
  if (target.id === actor.id && (action === 'revoke' || action === 'deny')) return { ok: false, error: 'self' };
  const otherAdmins = `(SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'approved' AND id != ?) >= 1`;
  const actorIsAdmin = `EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'admin' AND status = 'approved')`;
  let stmt: D1PreparedStatement;
  switch (action) {
    case 'approve':
      stmt = db.prepare(`UPDATE users SET status = 'approved', decided_at = ?, decided_by = ? WHERE id = ? AND status IN ('pending', 'denied', 'revoked') AND ${actorIsAdmin}`).bind(now, actor.email, target.id, actor.id);
      break;
    case 'deny':
      stmt = db.prepare(`UPDATE users SET status = 'denied', decided_at = ?, decided_by = ? WHERE id = ? AND status = 'pending' AND ${actorIsAdmin}`).bind(now, actor.email, target.id, actor.id);
      break;
    case 'revoke':
      stmt = db
        .prepare(`UPDATE users SET status = 'revoked', role = 'user', decided_at = ?, decided_by = ? WHERE id = ? AND status = 'approved' AND (role != 'admin' OR ${otherAdmins}) AND ${actorIsAdmin}`)
        .bind(now, actor.email, target.id, target.id, actor.id);
      break;
    case 'promote':
      stmt = db.prepare(`UPDATE users SET role = 'admin' WHERE id = ? AND status = 'approved' AND role = 'user' AND ${actorIsAdmin}`).bind(target.id, actor.id);
      break;
    case 'demote':
      stmt = db.prepare(`UPDATE users SET role = 'user' WHERE id = ? AND role = 'admin' AND ${otherAdmins} AND ${actorIsAdmin}`).bind(target.id, target.id, actor.id);
      break;
  }
  const r = await stmt.run();
  if ((r.meta.changes ?? 0) !== 1) {
    const currentActor = await userById(db, actor.id);
    if (!currentActor || currentActor.role !== 'admin' || currentActor.status !== 'approved') return { ok: false, error: 'forbidden' };
    const isLastAdmin = target.role === 'admin' && target.status === 'approved' && (action === 'demote' || action === 'revoke');
    if (isLastAdmin) {
      const others = await db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'approved' AND id != ?`).bind(target.id).first<{ n: number }>();
      if ((others?.n ?? 0) === 0) return { ok: false, error: 'last-admin' };
    }
    return { ok: false, error: 'state' };
  }
  if (action === 'revoke') await revokeUserSessions(db, target.id, now);
  await audit(db, actor.email, action, target.email, { from: target.status, role: target.role }, now);
  return { ok: true, user: (await userById(db, target.id))! };
}

/** Requests that have waited longer than this are "old" for the bulk decline on /admin. */
export const STALE_REQUEST_MS = 7 * 86_400_000;

/**
 * Declines every pending request older than STALE_REQUEST_MS in one conditional UPDATE (open sign-up lets anyone with
 * a mailbox leave junk in the queue). Only an approved admin's call changes anything; ADMIN_EMAILS-seeded and admin
 * rows are never touched (role must be 'user'). Returns how many were declined.
 */
export async function denyStalePending(db: D1Database, actor: UserRow, now: number): Promise<number> {
  const r = await db
    .prepare(
      `UPDATE users SET status = 'denied', decided_at = ?, decided_by = ?
       WHERE status = 'pending' AND role = 'user' AND COALESCE(requested_at, created_at) < ?
         AND EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'admin' AND status = 'approved')`,
    )
    .bind(now, actor.email, now - STALE_REQUEST_MS, actor.id)
    .run();
  const count = r.meta.changes ?? 0;
  if (count > 0) await audit(db, actor.email, 'bulk-deny', null, { count, olderThanDays: STALE_REQUEST_MS / 86_400_000 }, now);
  return count;
}

export interface AdminUserView extends UserRow {
  turns_today: number;
  cost_today: number;
  turns_total: number;
}

export async function listUsers(db: D1Database, now: number): Promise<AdminUserView[]> {
  const r = await db
    .prepare(
      `SELECT ${U_COLS},
         COALESCE((SELECT turns FROM usage WHERE user_id = u.id AND day = ?), 0) AS turns_today,
         COALESCE((SELECT est_cost_usd FROM usage WHERE user_id = u.id AND day = ?), 0) AS cost_today,
         COALESCE((SELECT SUM(turns) FROM usage WHERE user_id = u.id), 0) AS turns_total
       FROM users u
       ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, (u.requested_at IS NULL), COALESCE(u.requested_at, u.created_at) DESC
       LIMIT 1000`,
    )
    .bind(utcDay(now), utcDay(now))
    .all<AdminUserView>();
  return r.results;
}

export interface AuditRow {
  id: number;
  at: number;
  who: string;
  what: string;
  target: string | null;
}

export async function recentAudit(db: D1Database, limit = 30): Promise<AuditRow[]> {
  const r = await db.prepare('SELECT id, at, who, what, target FROM audit ORDER BY id DESC LIMIT ?').bind(limit).all<AuditRow>();
  return r.results;
}

/* ---------- usage and the one-turn-in-flight lock ---------- */

export async function turnsToday(db: D1Database, userId: string, now: number): Promise<number> {
  const r = await db.prepare('SELECT turns FROM usage WHERE user_id = ? AND day = ?').bind(userId, utcDay(now)).first<{ turns: number }>();
  return r?.turns ?? 0;
}

/**
 * Books one finished turn: `turns` toward the daily quota (2 for a turn the Claude backup finished, otherwise 1) and the
 * turn's estimated cost, Claude's share included. Rescue counts and Claude's own cost are booked as they happen
 * (bookRescue), not here.
 */
export async function recordUsage(db: D1Database, userId: string, day: string, costUsd: number, turns = 1): Promise<void> {
  const cost = Number.isFinite(costUsd) && costUsd > 0 ? costUsd : 0;
  await db
    .prepare('INSERT INTO usage (user_id, day, turns, est_cost_usd) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, day) DO UPDATE SET turns = turns + excluded.turns, est_cost_usd = est_cost_usd + excluded.est_cost_usd')
    .bind(userId, day, turns, cost)
    .run();
}

/** The row of `usage` that totals every user (rescues and claude_cost_usd only). Not a users.id: those start with 'u_'. */
export const GLOBAL_USAGE = '*';

export interface RescueUsage {
  /** Rescues this user has had today. */
  userRescues: number;
  /** Claude's cost today, all users together. */
  globalCostUsd: number;
}

/** What the Claude backup has been used for today: the user's rescues and everybody's Claude cost. */
export async function rescueUsage(db: D1Database, userId: string, day: string): Promise<RescueUsage> {
  const r = await db
    .prepare('SELECT user_id, rescues, claude_cost_usd FROM usage WHERE day = ? AND user_id IN (?, ?)')
    .bind(day, userId, GLOBAL_USAGE)
    .all<{ user_id: string; rescues: number; claude_cost_usd: number }>();
  let userRescues = 0;
  let globalCostUsd = 0;
  for (const row of r.results) {
    if (row.user_id === GLOBAL_USAGE) globalCostUsd = Number(row.claude_cost_usd) || 0;
    else userRescues = Number(row.rescues) || 0;
  }
  return { userRescues, globalCostUsd };
}

/**
 * Books one backup call on the user's row and on the global row, in one batch: its cost, and the rescue itself when it is
 * the first call of the turn (`newRescue`). Called after each backup call, so a turn that dies later is still counted.
 */
export async function bookRescue(db: D1Database, userId: string, day: string, costUsd: number, newRescue: boolean): Promise<void> {
  const cost = Number.isFinite(costUsd) && costUsd > 0 ? costUsd : 0;
  const sql =
    'INSERT INTO usage (user_id, day, turns, est_cost_usd, rescues, claude_cost_usd) VALUES (?, ?, 0, 0, ?, ?) ON CONFLICT (user_id, day) DO UPDATE SET rescues = rescues + excluded.rescues, claude_cost_usd = claude_cost_usd + excluded.claude_cost_usd';
  const n = newRescue ? 1 : 0;
  await db.batch([db.prepare(sql).bind(userId, day, n, cost), db.prepare(sql).bind(GLOBAL_USAGE, day, n, cost)]);
}

/** Takes the user's in-flight slot. A slot older than staleMs belongs to a turn that died and is taken over. */
export async function acquireTurnSlot(db: D1Database, userId: string, requestId: string, now: number, staleMs: number): Promise<boolean> {
  const r = await db
    .prepare(
      `INSERT INTO inflight (user_id, request_id, started_at) VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET request_id = excluded.request_id, started_at = excluded.started_at WHERE inflight.started_at < ?`,
    )
    .bind(userId, requestId, now, now - staleMs)
    .run();
  return (r.meta.changes ?? 0) === 1;
}

export async function releaseTurnSlot(db: D1Database, userId: string, requestId: string): Promise<void> {
  await db.prepare('DELETE FROM inflight WHERE user_id = ? AND request_id = ?').bind(userId, requestId).run();
}
