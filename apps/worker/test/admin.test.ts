// Admin rules (never demote or remove the last admin, never act on yourself, legal state changes only), the admin
// page's forms and JSON API, revocation taking effect at once, the access request and its notifications, and the
// ADMIN_EMAILS seed.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';
import * as db from '../src/db.ts';
import { ADMIN, makeCtx, makeEnv, req, signIn } from './helpers.ts';
import type { Env } from '../src/env.ts';

async function call(env: Env, r: Request): Promise<Response> {
  const ctx = makeCtx();
  const res = await worker.fetch(r, env, ctx);
  await ctx.flush();
  return res;
}

/** The Cookie pair for the one-shot notice cookie a form action sets. */
const flashOf = (res: Response): string => {
  const set = res.headers.getSetCookie().find((c) => c.startsWith('__Host-ab_flash='));
  assert.ok(set, 'a flash cookie is set');
  return set.split(';')[0];
};

const api = (env: Env, cookie: string, id: string, action: string) =>
  call(env, req(`/admin/api/users/${id}`, { method: 'POST', cookie, type: 'application/json', body: JSON.stringify({ action }) }));

describe('the last-admin rule', () => {
  test('the only admin can neither be demoted nor removed', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const res = await api(env, a.cookie, a.user.id, 'demote');
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { error: string }).error, 'last-admin');
    assert.equal((await db.userById(env.DB, a.user.id))?.role, 'admin');
  });

  test('with two admins one may be demoted, then the other is the last', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const b = await signIn(env, 'second@example.com', { status: 'approved', role: 'admin' });
    assert.equal((await api(env, a.cookie, b.user.id, 'demote')).status, 200);
    const again = await api(env, a.cookie, a.user.id, 'demote');
    assert.equal(((await again.json()) as { error: string }).error, 'last-admin');
  });

  test('an admin may demote themselves when another admin remains', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    await signIn(env, 'second@example.com', { status: 'approved', role: 'admin' });
    assert.equal((await api(env, a.cookie, a.user.id, 'demote')).status, 200);
    assert.equal((await call(env, req('/admin/api/users', { cookie: a.cookie }))).status, 403, 'no longer an admin, at once');
  });

  test('two admins demoting each other: exactly one succeeds, one admin remains', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const b = await signIn(env, 'second@example.com', { status: 'approved', role: 'admin' });
    const [r1, r2] = await Promise.all([db.applyAdminAction(env.DB, a.user, b.user.id, 'demote', Date.now()), db.applyAdminAction(env.DB, b.user, a.user.id, 'demote', Date.now())]);
    assert.equal([r1.ok, r2.ok].filter(Boolean).length, 1);
    const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'approved'`).first<{ n: number }>();
    assert.equal(n?.n, 1);
  });

  test('an admin cannot remove or decline themselves', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    await signIn(env, 'second@example.com', { status: 'approved', role: 'admin' });
    const res = await api(env, a.cookie, a.user.id, 'revoke');
    assert.equal(((await res.json()) as { error: string }).error, 'self');
  });
});

describe('admin actions', () => {
  test('approve a request: approved, audited, the user emailed; their next request is let in', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const u = await signIn(env, 'new@example.com', { requested: true });
    assert.equal((await call(env, req('/', { cookie: u.cookie }))).status, 302);
    const res = await call(env, req(`/admin/users/${u.user.id}/approve`, { method: 'POST', cookie: a.cookie }));
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('Location'), '/admin');
    assert.equal((await db.userById(env.DB, u.user.id))?.status, 'approved');
    assert.equal((await call(env, req('/', { cookie: u.cookie }))).status, 200, 'the same session works now');
    assert.deepEqual(env.mails.map((m) => [m.to, m.subject]), [['new@example.com', 'You can now use Architecture Builder']]);
    const audit = await db.recentAudit(env.DB);
    assert.equal(audit[0].what, 'approve');
    assert.equal(audit[0].who, ADMIN);
    const page = await (await call(env, req('/admin', { cookie: `${a.cookie}; ${flashOf(res)}` }))).text();
    assert.match(page, /Approved new@example\.com\./);
  });

  test('revoke: the user is signed out at once, everywhere', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const u = await signIn(env, 'user@example.com', { status: 'approved' });
    assert.equal((await call(env, req('/api/me', { cookie: u.cookie }))).status, 200);
    assert.equal((await api(env, a.cookie, u.user.id, 'revoke')).status, 200);
    assert.equal((await call(env, req('/api/me', { cookie: u.cookie }))).status, 401);
    assert.equal((await call(env, req('/assets/app.js', { cookie: u.cookie }))).status, 302);
  });

  test('a removed admin loses the role too; approving again brings back a plain user', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const b = await signIn(env, 'second@example.com', { status: 'approved', role: 'admin' });
    assert.equal((await api(env, a.cookie, b.user.id, 'revoke')).status, 200);
    assert.equal((await api(env, a.cookie, b.user.id, 'approve')).status, 200);
    const back = await db.userById(env.DB, b.user.id);
    assert.equal(back?.status, 'approved');
    assert.equal(back?.role, 'user');
  });

  test('only legal transitions happen', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const p = await signIn(env, 'p@example.com', { requested: true });
    assert.equal((await api(env, a.cookie, p.user.id, 'promote')).status, 409, 'a pending user cannot be made admin');
    assert.equal((await api(env, a.cookie, p.user.id, 'revoke')).status, 409, 'nothing to remove yet');
    assert.equal((await api(env, a.cookie, p.user.id, 'deny')).status, 200);
    assert.equal((await api(env, a.cookie, p.user.id, 'deny')).status, 409, 'already declined');
    assert.equal((await api(env, a.cookie, 'u_nobody', 'approve')).status, 404);
    assert.equal((await api(env, a.cookie, p.user.id, 'delete')).status, 400, 'unknown action');
  });

  test('the form route reports errors back on the page', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const res = await call(env, req(`/admin/users/${a.user.id}/demote`, { method: 'POST', cookie: a.cookie }));
    assert.equal(res.headers.get('Location'), '/admin');
    const page = await (await call(env, req('/admin', { cookie: `${a.cookie}; ${flashOf(res)}` }))).text();
    assert.match(page, /is the last admin/);
  });

  test('the JSON list carries status, role and usage, never secrets', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    await signIn(env, 'p@example.com', { requested: true });
    const body = (await (await call(env, req('/admin/api/users', { cookie: a.cookie }))).json()) as { users: Array<Record<string, unknown>> };
    assert.deepEqual(body.users.map((u) => [u.email, u.status, u.role]).sort(), [
      [ADMIN, 'approved', 'admin'],
      ['p@example.com', 'pending', 'user'],
    ]);
    assert.ok(!('google_sub' in body.users[0]));
  });
});

describe('the admin notice cannot be forged from a link', () => {
  test('a crafted ?done= link shows no banner; only the cookie set by a real action does, once', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const u = await signIn(env, 'user@example.com', { status: 'approved' });
    const crafted = await (await call(env, req(`/admin?done=revoke&u=${u.user.id}`, { cookie: a.cookie }))).text();
    assert.doesNotMatch(crafted, /Removed access for/);
    const craftedErr = await (await call(env, req(`/admin?err=last-admin&u=${u.user.id}`, { cookie: a.cookie }))).text();
    assert.doesNotMatch(craftedErr, /is the last admin/);
    // a real action: the banner shows once, then the cookie is cleared
    const done = await call(env, req(`/admin/users/${u.user.id}/revoke`, { method: 'POST', cookie: a.cookie }));
    const flash = flashOf(done);
    const first = await call(env, req('/admin', { cookie: `${a.cookie}; ${flash}` }));
    assert.match(await first.text(), /Removed access for user@example\.com/);
    assert.ok(first.headers.getSetCookie().some((c) => c.startsWith('__Host-ab_flash=;') && /Max-Age=0/.test(c)), 'cleared after it is shown');
  });

  test('a flash cookie with a bad signature is ignored', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const u = await signIn(env, 'user@example.com', { status: 'approved' });
    const done = await call(env, req(`/admin/users/${u.user.id}/revoke`, { method: 'POST', cookie: a.cookie }));
    const flash = flashOf(done);
    const tampered = flash.slice(0, -2) + (flash.endsWith('AA') ? 'BB' : 'AA');
    assert.doesNotMatch(await (await call(env, req('/admin', { cookie: `${a.cookie}; ${tampered}` }))).text(), /Removed access for/);
  });
});

describe('the acting admin is checked inside the UPDATE', () => {
  test('an admin demoted after passing the role gate cannot complete another action', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const b = await signIn(env, 'second@example.com', { status: 'approved', role: 'admin' });
    const p = await signIn(env, 'p@example.com', { requested: true });
    const staleActor = b.user; // read as admin ...
    assert.equal((await db.applyAdminAction(env.DB, a.user, b.user.id, 'demote', Date.now())).ok, true); // ... then demoted
    for (const action of ['approve', 'deny'] as const) {
      const r = await db.applyAdminAction(env.DB, staleActor, p.user.id, action, Date.now());
      assert.equal(r.ok, false, action);
    }
    assert.equal((await db.userById(env.DB, p.user.id))?.status, 'pending');
    assert.equal((await db.recentAudit(env.DB)).filter((x) => x.who === 'second@example.com').length, 0);
  });

  test('a revoked admin cannot promote another user', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    const b = await signIn(env, 'second@example.com', { status: 'approved', role: 'admin' });
    const c = await signIn(env, 'third@example.com', { status: 'approved' });
    const staleActor = b.user;
    assert.equal((await db.applyAdminAction(env.DB, a.user, b.user.id, 'revoke', Date.now())).ok, true);
    assert.equal((await db.applyAdminAction(env.DB, staleActor, c.user.id, 'promote', Date.now())).ok, false);
    assert.equal((await db.userById(env.DB, c.user.id))?.role, 'user');
  });
});

describe('access requests', () => {
  const post = (env: Env, cookie: string, note: string) => call(env, req('/pending', { method: 'POST', cookie, type: 'application/x-www-form-urlencoded', body: new URLSearchParams({ note }).toString() }));

  test('the first request notifies the admins; a note update does not', async () => {
    const env = makeEnv();
    await signIn(env, ADMIN);
    const u = await signIn(env, 'asker@example.com', { name: 'Asker' });
    const res = await post(env, u.cookie, 'SA team, Jakarta retail\u0007 demo');
    assert.equal(res.headers.get('Location'), '/pending?n=sent');
    const row = await db.userById(env.DB, u.user.id);
    assert.equal(row?.note, 'SA team, Jakarta retail demo', 'control characters are dropped');
    assert.ok(row?.requested_at);
    assert.deepEqual(env.mails.map((m) => [m.to, m.subject]), [[ADMIN, 'Access request: Asker (asker@example.com)']]);
    assert.match(env.mails[0].text, /https:\/\/architect\.alikorea-demo\.com\/admin/);
    assert.equal((await post(env, u.cookie, 'updated')).headers.get('Location'), '/pending?n=updated');
    assert.equal(env.mails.length, 1);
    const page = await (await call(env, req('/pending', { cookie: u.cookie }))).text();
    assert.match(page, /Waiting for approval/);
    assert.match(page, />updated</);
  });

  test('a mail failure never blocks the request', async () => {
    const env = makeEnv({
      EMAIL: {
        async send() {
          throw Object.assign(new Error('boom'), { code: 'E_SENDER' });
        },
      },
    });
    await signIn(env, ADMIN);
    const u = await signIn(env, 'asker@example.com');
    const res = await post(env, u.cookie, '');
    assert.equal(res.status, 303);
    assert.ok((await db.userById(env.DB, u.user.id))?.requested_at);
  });

  test('a form body over 16 KB is refused with 413 and records nothing', async () => {
    const env = makeEnv();
    await signIn(env, ADMIN);
    const u = await signIn(env, 'asker@example.com');
    const res = await post(env, u.cookie, 'x'.repeat(20 * 1024));
    assert.equal(res.status, 413);
    assert.equal((await db.userById(env.DB, u.user.id))?.requested_at, null);
    assert.equal(env.mails.length, 0);
  });

  test('the admins are mailed for at most REQUEST_MAILS_PER_DAY new requests a day; the requests are still recorded', async () => {
    const env = makeEnv({ REQUEST_MAILS_PER_DAY: '2' });
    await signIn(env, ADMIN);
    const ids: string[] = [];
    for (const n of [1, 2, 3, 4]) {
      const u = await signIn(env, `junk${n}@example.com`);
      ids.push(u.user.id);
      assert.equal((await post(env, u.cookie, '')).headers.get('Location'), '/pending?n=sent');
    }
    assert.equal(env.mails.length, 2, 'two mails, then silence');
    for (const id of ids) assert.ok((await db.userById(env.DB, id))?.requested_at, 'every request is recorded');
  });

  test('the admin list puts real requests ahead of accounts that only signed in', async () => {
    const env = makeEnv();
    await signIn(env, ADMIN);
    const real = await signIn(env, 'real@example.com', { requested: true });
    await new Promise((r) => setTimeout(r, 5));
    for (const n of [1, 2, 3]) await signIn(env, `lurker${n}@example.com`);
    const pending = (await db.listUsers(env.DB, Date.now())).filter((u) => u.status === 'pending');
    assert.equal(pending[0].id, real.user.id);
  });

  test('a long note is cut to 500 characters', async () => {
    const env = makeEnv();
    const u = await signIn(env, 'asker@example.com');
    await post(env, u.cookie, '가'.repeat(700));
    assert.equal([...((await db.userById(env.DB, u.user.id))?.note ?? '')].length, 500);
  });

  test('a declined user cannot request again and sees the status', async () => {
    const env = makeEnv();
    const u = await signIn(env, 'no@example.com', { status: 'denied' });
    assert.equal((await post(env, u.cookie, 'please')).headers.get('Location'), '/pending');
    assert.equal(env.mails.length, 0);
    assert.match(await (await call(env, req('/pending', { cookie: u.cookie }))).text(), /An administrator declined this request/);
  });
});

describe('ADMIN_EMAILS seed', () => {
  const now = () => Date.now();
  test('applied on first sign-in, and to a listed user still pending', async () => {
    const env = makeEnv();
    const first = await db.upsertOnSignIn(env.DB, { sub: 's1', email: ADMIN, name: 'D', picture: null }, { seedAdmin: true, lang: null, now: now() });
    assert.deepEqual([first.user.status, first.user.role, first.seeded], ['approved', 'admin', true]);
    await db.upsertOnSignIn(env.DB, { sub: 's2', email: 'later@example.com', name: 'L', picture: null }, { seedAdmin: false, lang: null, now: now() });
    const listed = await db.upsertOnSignIn(env.DB, { sub: 's2', email: 'later@example.com', name: 'L', picture: null }, { seedAdmin: true, lang: null, now: now() });
    assert.deepEqual([listed.user.status, listed.user.role, listed.seeded], ['approved', 'admin', true]);
  });

  test("never overrides an admin's decision", async () => {
    const env = makeEnv();
    await db.upsertOnSignIn(env.DB, { sub: 's3', email: 'x@example.com', name: 'X', picture: null }, { seedAdmin: false, lang: null, now: now() });
    await env.DB.prepare(`UPDATE users SET status = 'revoked' WHERE email = 'x@example.com'`).run();
    const r = await db.upsertOnSignIn(env.DB, { sub: 's3', email: 'x@example.com', name: 'X', picture: null }, { seedAdmin: true, lang: null, now: now() });
    assert.deepEqual([r.user.status, r.user.role, r.seeded], ['revoked', 'user', false]);
  });
});
