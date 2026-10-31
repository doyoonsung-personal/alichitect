// The admin page's actions and its JSON API, and the access request from /pending.
//   GET  /admin                          the page (pending, approved, declined and removed lists; recent activity)
//   POST /admin/users/:id/:action        the page's forms; 303 back to /admin with the outcome
//   GET  /admin/api/users                JSON list
//   POST /admin/api/users/:id            JSON { action }; 200 { ok, user } or 4xx { error, message }
//   GET  /admin/api/audit                JSON recent activity
// Every action is one conditional UPDATE in db.ts (the last approved admin can never be demoted or removed).
import type { Env, ExecutionContextLike } from './env.ts';
import { adminEmails, requestMailsPerDay, sessionSecret, turnsPerDay } from './env.ts';
import * as db from './db.ts';
import type { ActionError, AdminAction, UserRow } from './db.ts';
import { ADMIN_ACTIONS, NOTE_MAX } from './db.ts';
import { cookie, json, parseCookies, readBodyLimited, redirect } from './http.ts';
import { signJson, verifyJson } from './crypto.ts';
import { forgetUser } from './session.ts';
import { notifyAccessRequest, notifyApproved } from './mail.ts';
import type { AdminNotice } from './pages/views.ts';
import type { StringKey } from './pages/i18n.ts';

const ERROR_MESSAGE: Record<ActionError, string> = {
  'not-found': 'No such account',
  state: 'The account is not in a state that allows this action',
  self: 'Not on your own account',
  'last-admin': 'This is the last admin',
  forbidden: 'Admins only',
};
const ERROR_STATUS: Record<ActionError, number> = { 'not-found': 404, state: 409, self: 400, 'last-admin': 409, forbidden: 403 };

const isAction = (v: unknown): v is AdminAction => typeof v === 'string' && (ADMIN_ACTIONS as readonly string[]).includes(v);

const publicUser = (u: UserRow & Partial<db.AdminUserView>): Record<string, unknown> => ({
  id: u.id,
  email: u.email,
  name: u.name,
  picture: u.picture,
  status: u.status,
  role: u.role,
  note: u.note,
  createdAt: u.created_at,
  requestedAt: u.requested_at,
  decidedAt: u.decided_at,
  decidedBy: u.decided_by,
  lastSeenAt: u.last_seen_at,
  ...(u.turns_today !== undefined ? { turnsToday: u.turns_today, costTodayUsd: u.cost_today, turnsTotal: u.turns_total } : {}),
});

async function act(env: Env, ctx: ExecutionContextLike, me: UserRow, targetId: string, action: AdminAction, now: number): Promise<{ ok: true; user: UserRow } | { ok: false; error: ActionError; email: string | null }> {
  const r = await db.applyAdminAction(env.DB, me, targetId, action, now);
  if (!r.ok) {
    const target = await db.userById(env.DB, targetId);
    return { ok: false, error: r.error, email: target?.email ?? null };
  }
  forgetUser(r.user.id);
  console.log(JSON.stringify({ evt: 'admin-action', actor: me.id, action, target: r.user.id }));
  if (action === 'approve' && env.NOTIFY_ON_APPROVAL !== '0') ctx.waitUntil(notifyApproved(env, r.user).catch(() => undefined));
  return r;
}

/**
 * The outcome of a form action is shown once on the next /admin page, from this signed, short-lived cookie that only
 * the action sets. It is not read from the URL, so a crafted /admin?done=... link can never show a result that did
 * not happen.
 */
export const FLASH_COOKIE = '__Host-ab_flash';
const FLASH_PURPOSE = 'admin-flash-v1';
const FLASH_TTL_MS = 60_000;

interface Flash {
  k: 'ok' | 'err';
  a: string; // the action, or the error
  u: string; // the account acted on
  t: number;
}

/** POST /admin/users/:id/:action (the page's forms). */
export async function adminFormAction(env: Env, ctx: ExecutionContextLike, me: UserRow, targetId: string, action: string, now = Date.now()): Promise<Response> {
  if (!isAction(action)) return redirect('/admin', 303);
  const r = await act(env, ctx, me, targetId, action, now);
  const flash: Flash = r.ok ? { k: 'ok', a: action, u: r.user.id, t: now } : { k: 'err', a: r.error, u: targetId, t: now };
  const secret = sessionSecret(env);
  const headers: Array<[string, string]> = secret ? [['Set-Cookie', cookie(FLASH_COOKIE, await signJson(secret, FLASH_PURPOSE, flash), { maxAge: FLASH_TTL_MS / 1000 })]] : [];
  return redirect(`/admin${r.ok && action !== 'approve' && action !== 'deny' ? '#approved' : ''}`, 303, headers);
}

/** The notice left by the last form action (the email is looked up, never taken from the request). */
export async function adminNotice(env: Env, request: Request, now = Date.now()): Promise<{ notice: AdminNotice | null; present: boolean }> {
  const raw = parseCookies(request.headers.get('Cookie')).get(FLASH_COOKIE);
  if (!raw) return { notice: null, present: false };
  const secret = sessionSecret(env);
  const f = secret ? await verifyJson<Flash>(secret, FLASH_PURPOSE, raw) : null;
  if (!f || (f.k !== 'ok' && f.k !== 'err') || typeof f.a !== 'string' || typeof f.u !== 'string' || typeof f.t !== 'number' || now - f.t > FLASH_TTL_MS || f.t > now + 5_000) return { notice: null, present: true };
  const DONE: Record<AdminAction, StringKey> = { approve: 'admin.doneApprove', deny: 'admin.doneDeny', revoke: 'admin.doneRevoke', promote: 'admin.donePromote', demote: 'admin.doneDemote' };
  const ERR: Record<ActionError, StringKey> = { 'not-found': 'admin.errorNotFound', state: 'admin.errorState', self: 'admin.errorSelf', 'last-admin': 'admin.errorLastAdmin', forbidden: 'admin.errorState' };
  const u = await db.userById(env.DB, f.u);
  const email = u?.email ?? '';
  if (f.k === 'ok' && isAction(f.a) && u) return { notice: { kind: 'ok', key: DONE[f.a], email }, present: true };
  if (f.k === 'err' && Object.hasOwn(ERR, f.a)) return { notice: { kind: 'error', key: ERR[f.a as ActionError], email }, present: true };
  return { notice: null, present: true };
}

/** /admin/api/* */
export async function adminApi(request: Request, env: Env, ctx: ExecutionContextLike, me: UserRow, path: string, now = Date.now()): Promise<Response> {
  const parts = path.slice('/admin/api/'.length).split('/').filter(Boolean);
  if (parts[0] === 'users' && parts.length === 1) {
    if (request.method !== 'GET') return json(405, { error: 'method-not-allowed', message: 'use GET' }, { Allow: 'GET' });
    const users = await db.listUsers(env.DB, now);
    return json(200, { me: { id: me.id, email: me.email }, turnsPerDay: turnsPerDay(env), users: users.map(publicUser) });
  }
  if (parts[0] === 'users' && parts.length === 2) {
    if (request.method !== 'POST') return json(405, { error: 'method-not-allowed', message: 'use POST' }, { Allow: 'POST' });
    if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return json(415, { error: 'unsupported-media-type', message: 'Content-Type must be application/json' });
    const raw = await readBodyLimited(request, 4096);
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(new TextDecoder().decode(raw)) : null;
    } catch {
      body = null;
    }
    const action = body && typeof body === 'object' ? (body as { action?: unknown }).action : undefined;
    if (!isAction(action)) return json(400, { error: 'bad-action', message: `action must be one of ${ADMIN_ACTIONS.join(', ')}` });
    const r = await act(env, ctx, me, parts[1], action, now);
    if (!r.ok) return json(ERROR_STATUS[r.error], { error: r.error, message: ERROR_MESSAGE[r.error] });
    return json(200, { ok: true, user: publicUser(r.user) });
  }
  if (parts[0] === 'audit' && parts.length === 1 && request.method === 'GET') {
    return json(200, { audit: await db.recentAudit(env.DB, 100) });
  }
  return json(404, { error: 'not-found', message: 'no such admin route' });
}

/** Trims a note: at most NOTE_MAX characters, no control characters except line breaks. */
export function cleanNote(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = [...v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')].slice(0, NOTE_MAX).join('').trim();
  return s ? s : null;
}

/** POST /pending: the access request (or a note update). The admins are emailed on the first request only. */
export async function submitAccessRequest(request: Request, env: Env, ctx: ExecutionContextLike, me: UserRow, now = Date.now()): Promise<Response> {
  const raw = await readBodyLimited(request, 16 * 1024);
  if (!raw) return json(413, { error: 'body-too-large', message: 'The request is too large' });
  const form = new URLSearchParams(new TextDecoder().decode(raw));
  const note = cleanNote(form.get('note'));
  const r = await db.requestAccess(env.DB, me.id, note, now);
  if (r === 'requested') {
    await db.audit(env.DB, me.email, 'request', me.email, null, now);
    console.log(JSON.stringify({ evt: 'access-request', user: me.id, note: !!note }));
    // sign-up is open to any Google account, so the mails are capped per rolling day; the request itself is always kept
    const sent = await db.requestsSince(env.DB, now - 86_400_000).catch(() => 0);
    if (sent > requestMailsPerDay(env)) {
      console.warn(JSON.stringify({ evt: 'notify-throttled', user: me.id, requestsToday: sent }));
      return redirect('/pending?n=sent', 303);
    }
    ctx.waitUntil(
      (async () => {
        const fromDb = await db.adminRecipients(env.DB);
        const seen = new Set(fromDb.map((a) => a.email));
        const recipients = [...fromDb, ...adminEmails(env).filter((e) => !seen.has(e)).map((email) => ({ email, lang: null }))];
        await notifyAccessRequest(env, { email: me.email, name: me.name, note, lang: me.lang }, recipients);
      })().catch((e) => console.error(JSON.stringify({ evt: 'notify-failed', error: (e as Error)?.name ?? 'error' }))),
    );
  }
  return redirect(r === 'requested' ? '/pending?n=sent' : r === 'updated' ? '/pending?n=updated' : '/pending', 303);
}
