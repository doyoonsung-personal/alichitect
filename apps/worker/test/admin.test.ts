// Admin rules (never demote or remove the last admin, never act on yourself, legal state changes only), the admin
// page's forms and JSON API, revocation taking effect at once, the approval mail, and the note a pending user can
// update. (Sign-up, its notification to the admins and the ADMIN_EMAILS seed: test/auth.test.ts.)
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../src/db.ts';
import { ADMIN, Browser, PASSWORD, call, makeEnv, makeUser, req, signIn, where } from './helpers.ts';
import type { Env } from '../src/env.ts';

/** The Cookie pair for the one-shot notice cookie a form action sets. */
const flashOf = (res: Response): string => {
  const set = res.headers.getSetCookie().find((c) => c.startsWith('__Host-ab_flash='));
  assert.ok(set, 'a flash cookie is set');
  return set.split(';')[0];
};

const api = (env: Env, cookie: string, id: string, action: string) =>
  call(env, req(`/admin/api/users/${id}`, { method: 'POST', cookie, type: 'application/json', body: JSON.stringify({ action }) }));

test('an admin can grant and restore unlimited turns without granting account management rights', async () => {
  const env = makeEnv({ TURNS_PER_DAY: '1' });
  const admin = await signIn(env, ADMIN);
  const member = await signIn(env, 'member@example.com', { status: 'approved' });
  const pending = await signIn(env, 'pending@example.com', { status: 'pending' });
  const profile = () => call(env, req('/api/me', { cookie: member.cookie })).then(r => r.json());
  const grant = `/admin/users/${member.user.id}/verify`;
  const panel = await (await call(env, req('/admin', { cookie: admin.cookie }))).text();
  assert.ok(panel.includes(`action="${grant}"`));
  assert.equal((await api(env, member.cookie, member.user.id, 'verify')).status, 403);
  assert.equal((await api(env, admin.cookie, pending.user.id, 'verify')).status, 409);
  assert.equal((await api(env, admin.cookie, admin.user.id, 'verify')).status, 409);
  await db.recordUsage(env.DB, member.user.id, db.utcDay(Date.now()), 0.3, 5);
  const granted = await call(env, req(grant, { method: 'POST', cookie: admin.cookie }));
  assert.equal(granted.status, 303);
  const verified = await profile();
  assert.deepEqual([verified.role, verified.turnsPerDay, verified.turnsToday, verified.links.admin], ['verified', null, 5, null]);
  assert.match(await (await call(env, req('/account', { cookie: member.cookie }))).text(), />Verified</);
  assert.equal((await api(env, member.cookie, member.user.id, 'promote')).status, 403);
  assert.equal((await call(env, req('/admin/api/audit', { cookie: member.cookie }))).status, 403);
  assert.equal((await api(env, admin.cookie, member.user.id, 'unverify')).status, 200);
  const standard = await profile();
  assert.deepEqual([standard.role, standard.turnsPerDay, standard.turnsToday], ['user', 1, 5]);
  const changes = (await db.recentAudit(env.DB)).filter(a => a.target === member.user.email);
  assert.deepEqual(changes.slice(0, 2).map(a => a.what), ['unverify', 'verify']);
});

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
    assert.deepEqual(env.mails.map((m) => [m.to, m.subject]), [['new@example.com', '[Architecture Builder] You have access']]);
    assert.match(env.mails[0].text, /new, your access to Architecture Builder is approved\. Sign in with your email address and password to start\./);
    assert.match(env.mails[0].text, /https:\/\/architect\.alikorea-demo\.com\/login/);
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

  test('the JSON list carries status, role and usage, never a password hash', async () => {
    const env = makeEnv();
    const a = await signIn(env, ADMIN);
    await signIn(env, 'p@example.com', { requested: true });
    const body = (await (await call(env, req('/admin/api/users', { cookie: a.cookie }))).json()) as { users: Array<Record<string, unknown>> };
    assert.deepEqual(body.users.map((u) => [u.email, u.status, u.role]).sort(), [
      [ADMIN, 'approved', 'admin'],
      ['p@example.com', 'pending', 'user'],
    ]);
    for (const u of body.users) for (const k of Object.keys(u)) assert.doesNotMatch(k, /pw|hash|salt|picture/i, k);
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

describe('the note on /pending', () => {
  const post = (env: Env, cookie: string, note: string) => call(env, req('/pending', { method: 'POST', cookie, type: 'application/x-www-form-urlencoded', body: new URLSearchParams({ note }).toString() }));

  test('a pending user can update the note the admins see; control characters are dropped; no mail', async () => {
    const env = makeEnv();
    await signIn(env, ADMIN);
    const u = await signIn(env, 'asker@example.com', { name: 'Asker' });
    const res = await post(env, u.cookie, 'SA team, Jakarta retail\u0007 demo');
    assert.equal(res.headers.get('Location'), '/pending?n=updated');
    assert.equal((await db.userById(env.DB, u.user.id))?.note, 'SA team, Jakarta retail demo');
    assert.equal(env.mails.length, 0);
    const page = await (await call(env, req('/pending?n=updated', { cookie: u.cookie }))).text();
    assert.match(page, /Note updated\./);
    assert.match(page, />SA team, Jakarta retail demo</);
  });

  test('a form body over 16 KB is refused with 413 and changes nothing', async () => {
    const env = makeEnv();
    const u = await signIn(env, 'asker@example.com');
    assert.equal((await post(env, u.cookie, 'x'.repeat(20 * 1024))).status, 413);
    assert.equal((await db.userById(env.DB, u.user.id))?.note, null);
  });

  test('a long note is cut to 500 characters', async () => {
    const env = makeEnv();
    const u = await signIn(env, 'asker@example.com');
    await post(env, u.cookie, '가'.repeat(700));
    assert.equal([...((await db.userById(env.DB, u.user.id))?.note ?? '')].length, 500);
  });

  test('a declined user cannot change the note and sees the status', async () => {
    const env = makeEnv();
    const u = await signIn(env, 'no@example.com', { status: 'denied' });
    assert.equal((await post(env, u.cookie, 'please')).headers.get('Location'), '/pending');
    assert.equal((await db.userById(env.DB, u.user.id))?.note, null);
    assert.match(await (await call(env, req('/pending', { cookie: u.cookie }))).text(), /An administrator declined this request/);
  });
});

describe('a person approved on /admin signs in with their password', () => {
  test('sign up, wait, get approved, sign in, use the app', async () => {
    const env = makeEnv();
    const admin = await signIn(env, ADMIN);
    const b = new Browser(env);
    await b.post('/signup', { name: 'Mina Park', email: 'mina@example.com', password: PASSWORD, note: 'Retail demos' });
    const code = /\b(\d{6})\b/.exec(env.mails.at(-1)!.subject)![1];
    assert.equal(where(await b.post('/verify', { code })), '303 /pending?n=verified');
    assert.equal(where(await b.fetch('/')), '302 /pending');
    const u = (await db.userByEmail(env.DB, 'mina@example.com'))!;
    const adminPage = await (await call(env, req('/admin', { cookie: admin.cookie }))).text();
    assert.match(adminPage, /Retail demos/);
    assert.equal((await call(env, req(`/admin/users/${u.id}/approve`, { method: 'POST', cookie: admin.cookie }))).status, 303);
    assert.equal((await b.fetch('/')).status, 200, 'the same session is let in at once');
    const fresh = new Browser(env);
    assert.equal(where(await fresh.post('/login', { email: 'mina@example.com', password: PASSWORD })), '303 /');
  });
});

describe('declining old requests in bulk', () => {
  const DAY = 86_400_000;
  const makeAged = async (env: ReturnType<typeof makeEnv>, email: string, daysAgo: number) => {
    const u = await makeUser(env, email);
    const at = Date.now() - daysAgo * DAY;
    await env.DB.prepare('UPDATE users SET requested_at = ?, created_at = ? WHERE id = ?').bind(at, at, u.id).run();
    return u;
  };

  test('declines pending requests older than 7 days, leaves newer ones, approved accounts and admins alone, and says how many', async () => {
    const env = makeEnv();
    const admin = await signIn(env, ADMIN);
    const old1 = await makeAged(env, 'old1@example.com', 9);
    const old2 = await makeAged(env, 'old2@example.com', 30);
    const fresh = await makeAged(env, 'fresh@example.com', 2);
    const approvedOld = await makeUser(env, 'ok@example.com', { status: 'approved' });
    await env.DB.prepare('UPDATE users SET created_at = ?, requested_at = ? WHERE id = ?').bind(Date.now() - 40 * DAY, Date.now() - 40 * DAY, approvedOld.id).run();
    assert.match(await (await call(env, req('/admin', { cookie: admin.cookie }))).text(), /Decline requests older than 7 days \(2\)/);

    const res = await call(env, req('/admin/pending/deny-old', { method: 'POST', cookie: admin.cookie }));
    assert.equal(where(res), '303 /admin#requests');
    const status = async (id: string) => (await db.userById(env.DB, id))?.status;
    assert.deepEqual([await status(old1.id), await status(old2.id), await status(fresh.id), await status(approvedOld.id), await status(admin.user.id)], ['denied', 'denied', 'pending', 'approved', 'approved']);
    assert.equal((await db.userById(env.DB, old1.id))?.decided_by, ADMIN);
    const page = await (await call(env, req('/admin', { cookie: `${admin.cookie}; ${flashOf(res)}` }))).text();
    assert.match(page, /Declined 2 requests that had waited more than 7 days\./);
    assert.doesNotMatch(page, /Decline requests older than 7 days \(/, 'no old request is left to clear');
    assert.equal((await db.recentAudit(env.DB))[0].what, 'bulk-deny');
  });

  test('only an admin can; a pending user, a signed-out visitor and a cross-site post cannot', async () => {
    const env = makeEnv();
    await signIn(env, ADMIN);
    const old = await makeAged(env, 'old@example.com', 20);
    const user = await signIn(env, 'user@example.com', { status: 'approved' });
    const pending = await signIn(env, 'pending@example.com');
    assert.equal((await call(env, req('/admin/pending/deny-old', { method: 'POST', cookie: user.cookie }))).status, 403);
    assert.equal((await call(env, req('/admin/pending/deny-old', { method: 'POST', cookie: pending.cookie }))).status, 403);
    assert.equal((await call(env, req('/admin/pending/deny-old', { method: 'POST' }))).status, 401);
    const admin = await signIn(env, ADMIN);
    assert.equal((await call(env, req('/admin/pending/deny-old', { method: 'POST', cookie: admin.cookie, origin: 'https://evil.example' }))).status, 403);
    assert.equal((await db.userById(env.DB, old.id))?.status, 'pending');
  });
});
