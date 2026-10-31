// Cookie signing and tampering, the session cookie's attributes, expiry and revocation, and the open-redirect guard.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { signJson, verifyJson, hmacSign, hmacVerify, b64url, utf8 } from '../src/crypto.ts';
import { cookie, parseCookies, safeNext } from '../src/http.ts';
import { SESSION_COOKIE, currentUser, issueSession, _resetSessionCache } from '../src/session.ts';
import * as db from '../src/db.ts';
import { SECRET, makeEnv, req, signIn } from './helpers.ts';

describe('signed values', () => {
  test('round trip', async () => {
    const tok = await signJson(SECRET, 'session-v1', { sid: 'abc', exp: 123 });
    assert.deepEqual(await verifyJson(SECRET, 'session-v1', tok), { sid: 'abc', exp: 123 });
  });

  test('a changed payload, a changed signature, another secret or another purpose fail', async () => {
    const tok = await signJson(SECRET, 'session-v1', { sid: 'abc', exp: 123 });
    const [p, s] = tok.split('.');
    const otherPayload = b64url(utf8(JSON.stringify({ sid: 'abd', exp: 123 })));
    assert.equal(await verifyJson(SECRET, 'session-v1', `${otherPayload}.${s}`), null, 'payload swapped');
    assert.equal(await verifyJson(SECRET, 'session-v1', `${p}.${s.slice(0, -1)}${s.endsWith('A') ? 'B' : 'A'}`), null, 'signature changed');
    assert.equal(await verifyJson(`${SECRET}x`, 'session-v1', tok), null, 'another secret');
    assert.equal(await verifyJson(SECRET, 'oidc-v1', tok), null, 'a session token is not a sign-in token');
  });

  test('malformed tokens are null, never an exception', async () => {
    for (const t of ['', '.', 'abc', 'a.b.c', '!!!.###', `${'a'.repeat(5000)}.x`, null, undefined]) assert.equal(await verifyJson(SECRET, 'p', t), null);
    assert.equal(await hmacVerify(SECRET, 'p', 'x', 'not base64url!'), false);
    assert.equal(await hmacVerify(SECRET, 'p', 'x', await hmacSign(SECRET, 'p', 'x')), true);
  });
});

describe('cookies', () => {
  test('__Host- cookies always carry Secure and Path=/ and never a Domain', () => {
    const c = cookie('__Host-x', 'v', { maxAge: 60, secure: false });
    assert.match(c, /^__Host-x=v; Path=\/; Max-Age=60; HttpOnly; Secure; SameSite=Lax$/);
  });

  test('a deleting cookie expires at once', () => {
    assert.match(cookie('__Host-x', '', { maxAge: 0 }), /Max-Age=0; Expires=Thu, 01 Jan 1970/);
  });

  test('parseCookies keeps the first of duplicate names', () => {
    const m = parseCookies('a=1; b=2; a=3; bad; c==x');
    assert.equal(m.get('a'), '1');
    assert.equal(m.get('b'), '2');
    assert.equal(m.get('c'), '=x');
  });
});

describe('sessions', () => {
  test('the session cookie: __Host-, HttpOnly, Secure, SameSite=Lax, 7 days', async () => {
    const env = makeEnv();
    const { user } = await signIn(env, 'a@example.com');
    const set = await issueSession(env, user.id, Date.now());
    assert.match(set, new RegExp(`^${SESSION_COOKIE}=[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax$`));
  });

  test('a valid cookie finds the user; a tampered one does not', async () => {
    const env = makeEnv();
    const { cookie: c, user } = await signIn(env, 'a@example.com');
    assert.equal((await currentUser(req('/', { cookie: c }), env, { fresh: true }))?.user.id, user.id);
    const [name, value] = [c.slice(0, c.indexOf('=')), c.slice(c.indexOf('=') + 1)];
    const [p, s] = value.split('.');
    const flipped = `${name}=${p.slice(0, 5)}${p[5] === 'A' ? 'B' : 'A'}${p.slice(6)}.${s}`;
    assert.equal(await currentUser(req('/', { cookie: flipped }), env, { fresh: true }), null);
    assert.equal(await currentUser(req('/', { cookie: `${name}=${p}` }), env, { fresh: true }), null);
  });

  test('a cookie signed with another SESSION_SECRET is refused', async () => {
    const env = makeEnv();
    const { cookie: c } = await signIn(env, 'a@example.com');
    const env2 = { ...env, SESSION_SECRET: `${SECRET}-rotated` };
    assert.equal(await currentUser(req('/', { cookie: c }), env2, { fresh: true }), null);
  });

  test('an expired session is refused even though the signature is good', async () => {
    const env = makeEnv();
    const { cookie: c } = await signIn(env, 'a@example.com');
    assert.equal(await currentUser(req('/', { cookie: c }), env, { fresh: true, now: Date.now() + 8 * 86_400_000 }), null);
  });

  test('a revoked session stops working at once, even for cached static requests in this isolate', async () => {
    _resetSessionCache();
    const env = makeEnv();
    const { cookie: c, user } = await signIn(env, 'a@example.com');
    assert.ok(await currentUser(req('/assets/app.js', { cookie: c }), env, { fresh: false }));
    await db.revokeUserSessions(env.DB, user.id, Date.now());
    assert.equal(await currentUser(req('/', { cookie: c }), env, { fresh: true }), null, 'pages read D1');
    assert.equal(await currentUser(req('/assets/app.js', { cookie: c }), env, { fresh: false }), null, 'the cache entry was dropped by the fresh miss');
  });

  test('without SESSION_SECRET (or with a short one) nobody is signed in', async () => {
    const env = makeEnv();
    const { cookie: c } = await signIn(env, 'a@example.com');
    assert.equal(await currentUser(req('/', { cookie: c }), { ...env, SESSION_SECRET: 'short' }, { fresh: true }), null);
  });
});

describe('safeNext (open-redirect guard)', () => {
  test('only same-site paths survive', () => {
    assert.equal(safeNext('/admin'), '/admin');
    assert.equal(safeNext('/?a=1'), '/?a=1');
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'evil', '/%0d%0aSet-Cookie:x', '/auth/logout', '/login', '', null, '\\\\evil']) {
      const out = safeNext(bad);
      assert.ok(out === '/' || out.startsWith('/%0d'), `${String(bad)} -> ${out}`);
      assert.ok(!out.startsWith('//'));
    }
  });
});

describe('safeNext: dot-segments cannot build a protocol-relative URL', () => {
  const VECTORS = ['/..//evil.com', '/.//evil.com', '/%2e%2e//evil.com', '/%2E%2E//evil.com', '/a/..//evil.com', '/x/../..//evil.com', '/..//evil.com/path?q=1'];
  test('every vector maps to /', () => {
    for (const v of VECTORS) assert.equal(safeNext(v), '/', v);
  });
  test('ordinary paths still pass unchanged', () => {
    assert.equal(safeNext('/assets/x.js?y=1'), '/assets/x.js?y=1');
    assert.equal(safeNext('/pending?n=sent'), '/pending?n=sent');
    assert.equal(safeNext('/a/b/../c'), '/a/c');
  });
});

