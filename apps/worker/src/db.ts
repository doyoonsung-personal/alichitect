// Every D1 query the Worker runs. Status and role changes are single conditional statements, so two admins acting
// at once cannot break the rules (for example, the last admin can never be demoted or removed).
import type { D1Database, D1PreparedStatement } from './env.ts';
import { randomHex } from './crypto.ts';

export type Status = 'pending' | 'approved' | 'denied' | 'revoked';
export type Role = 'user' | 'admin';

export interface UserRow {
  id: string;
  email: string;
  google_sub: string | null;
  name: string;
  picture: string | null;
  status: Status;
  role: Role;
  note: string | null;
  lang: string | null;
  created_at: number;
  requested_at: number | null;
  decided_at: number | null;
  decided_by: string | null;
  last_seen_at: number | null;
}

export const NOTE_MAX = 500;

/** The UTC day (YYYY-MM-DD) of a time in ms. */
export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export async function userByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
}

export async function userById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
}

/** The user behind a live session (not expired, not revoked), read fresh: status and role are always current. */
export async function userBySession(db: D1Database, idHash: string, now: number): Promise<UserRow | null> {
  return db
    .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ? AND s.expires_at > ? AND s.revoked_at IS NULL')
    .bind(idHash, now)
    .first<UserRow>();
}

export async function audit(db: D1Database, who: string, what: string, target: string | null, detail: Record<string, unknown> | null, now: number): Promise<void> {
  await db
    .prepare('INSERT INTO audit (at, who, what, target, detail) VALUES (?, ?, ?, ?, ?)')
    .bind(now, who, what, target, detail ? JSON.stringify(detail).slice(0, 1000) : null)
    .run();
}

export class AccountMismatch extends Error {}

export interface SignInResult {
  user: UserRow;
  created: boolean;
  /** Approved as an admin from ADMIN_EMAILS during this sign-in. */
  seeded: boolean;
}

/**
 * Creates or refreshes the user for a verified Google identity. An address in ADMIN_EMAILS is approved as an admin
 * when the account is created, or while it is still pending (never over an admin's deny or revoke). A known email
 * arriving with another Google subject is refused.
 */
export async function upsertOnSignIn(
  db: D1Database,
  id: { sub: string; email: string; name: string; picture: string | null },
  o: { seedAdmin: boolean; lang: string | null; now: number },
): Promise<SignInResult> {
  const { now } = o;
  let u = await userByEmail(db, id.email);
  if (!u) {
    const uid = `u_${randomHex(8)}`;
    const status: Status = o.seedAdmin ? 'approved' : 'pending';
    const role: Role = o.seedAdmin ? 'admin' : 'user';
    const r = await db
      .prepare(
        `INSERT INTO users (id, email, google_sub, name, picture, status, role, lang, created_at, decided_at, decided_by, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING`,
      )
      .bind(uid, id.email, id.sub, id.name, id.picture, status, role, o.lang, now, o.seedAdmin ? now : null, o.seedAdmin ? 'ADMIN_EMAILS' : null, now)
      .run();
    u = await userByEmail(db, id.email);
    if (!u) throw new Error('user insert failed');
    if ((r.meta.changes ?? 0) === 1) {
      await audit(db, 'system', o.seedAdmin ? 'seed-admin' : 'sign-up', id.email, null, now);
      return { user: u, created: true, seeded: o.seedAdmin };
    }
  }
  if (u.google_sub && u.google_sub !== id.sub) {
    await audit(db, 'system', 'account-mismatch', id.email, null, now);
    throw new AccountMismatch();
  }
  let seeded = false;
  if (o.seedAdmin && u.status === 'pending') {
    const r = await db
      .prepare(`UPDATE users SET status = 'approved', role = 'admin', decided_at = ?, decided_by = 'ADMIN_EMAILS' WHERE id = ? AND status = 'pending'`)
      .bind(now, u.id)
      .run();
    if ((r.meta.changes ?? 0) === 1) {
      seeded = true;
      await audit(db, 'system', 'seed-admin', u.email, null, now);
    }
  }
  await db
    .prepare('UPDATE users SET google_sub = COALESCE(google_sub, ?), name = ?, picture = ?, lang = COALESCE(?, lang), last_seen_at = ? WHERE id = ?')
    .bind(id.sub, id.name, id.picture, o.lang, now, u.id)
    .run();
  return { user: (await userById(db, u.id))!, created: false, seeded };
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

/**
 * Records the access request (first time: returns 'requested', and the admins are told) or updates the note of a
 * request already made ('updated'). Only a pending user can request.
 */
export async function requestAccess(db: D1Database, userId: string, note: string | null, now: number): Promise<'requested' | 'updated' | 'not-pending'> {
  const first = await db.prepare(`UPDATE users SET note = ?, requested_at = ? WHERE id = ? AND status = 'pending' AND requested_at IS NULL`).bind(note, now, userId).run();
  if ((first.meta.changes ?? 0) === 1) return 'requested';
  const upd = await db.prepare(`UPDATE users SET note = ? WHERE id = ? AND status = 'pending'`).bind(note, userId).run();
  return (upd.meta.changes ?? 0) === 1 ? 'updated' : 'not-pending';
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

export interface AdminUserView extends UserRow {
  turns_today: number;
  cost_today: number;
  turns_total: number;
}

export async function listUsers(db: D1Database, now: number): Promise<AdminUserView[]> {
  const r = await db
    .prepare(
      `SELECT u.*,
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

export async function recordUsage(db: D1Database, userId: string, day: string, costUsd: number): Promise<void> {
  const cost = Number.isFinite(costUsd) && costUsd > 0 ? costUsd : 0;
  await db
    .prepare('INSERT INTO usage (user_id, day, turns, est_cost_usd) VALUES (?, ?, 1, ?) ON CONFLICT (user_id, day) DO UPDATE SET turns = turns + 1, est_cost_usd = est_cost_usd + excluded.est_cost_usd')
    .bind(userId, day, cost)
    .run();
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
