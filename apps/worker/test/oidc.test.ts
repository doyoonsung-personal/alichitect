// Google OIDC: ID token verification (signature, kid rotation, iss, aud, exp, iat, nonce, email_verified), the JWKS
// cache, and the start/callback flow with state, nonce and PKCE.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { OidcError, createJwksSource, googleProvider, pkceChallenge, verifyIdToken } from '../src/oidc.ts';
import type { Jwk, Provider } from '../src/oidc.ts';
import { finishSignIn, startSignIn, OIDC_COOKIE } from '../src/auth.ts';
import { b64url, signJson, utf8 } from '../src/crypto.ts';
import { sessionSecret } from '../src/env.ts';
import { ADMIN, CLIENT_ID, goodClaims, makeCtx, makeEnv, makeKey, signToken } from './helpers.ts';
import type { TestKey } from './helpers.ts';
import * as db from '../src/db.ts';

const NONCE = 'nonce-0123456789abcdefghijklmnopqrstuvwxyz';

function keysOf(...ks: TestKey[]): (force: boolean) => Promise<Jwk[]> {
  return async () => ks.map((k) => k.jwk);
}

const prov = (ks: (force: boolean) => Promise<Jwk[]>): Pick<Provider, 'keys' | 'issuers'> => ({ keys: ks, issuers: ['https://accounts.google.com', 'accounts.google.com'] });

async function expectCode(p: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(p, (e: unknown) => e instanceof OidcError && e.code === code, `expected ${code}`);
}

describe('verifyIdToken', async () => {
  const key = await makeKey('k1');
  const other = await makeKey('k1'); // same kid, different key: a forgery
  const P = prov(keysOf(key));
  const v = (token: string, o: { nonce?: string; now?: number } = {}) => verifyIdToken(token, { provider: P, clientId: CLIENT_ID, nonce: o.nonce ?? NONCE, now: o.now });

  test('a valid token yields the claims, with the email lowercased', async () => {
    const c = await v(await signToken(key, goodClaims(NONCE)));
    assert.deepEqual(c, { sub: '1234567890', email: 'someone@example.com', name: 'Some One', picture: 'https://lh3.googleusercontent.com/a/abc=s96-c' });
  });

  test('the issuer without https:// is accepted (Google sends either)', async () => {
    await v(await signToken(key, goodClaims(NONCE, { iss: 'accounts.google.com' })));
  });

  test('a forged signature (another key under the same kid) is refused', async () => {
    await expectCode(v(await signToken(other, goodClaims(NONCE))), 'bad-signature');
  });

  test('a payload changed after signing is refused', async () => {
    const t = await signToken(key, goodClaims(NONCE));
    const [h, , s] = t.split('.');
    const p = b64url(utf8(JSON.stringify(goodClaims(NONCE, { email: 'attacker@example.com' }))));
    await expectCode(v(`${h}.${p}.${s}`), 'bad-signature');
  });

  test('alg none and HS256 are refused before any key is used', async () => {
    const claims = b64url(utf8(JSON.stringify(goodClaims(NONCE))));
    await expectCode(v(`${b64url(utf8(JSON.stringify({ alg: 'none', kid: 'k1' })))}.${claims}.`), 'bad-alg');
    await expectCode(v(`${b64url(utf8(JSON.stringify({ alg: 'HS256', kid: 'k1' })))}.${claims}.${b64url(utf8('x'))}`), 'bad-alg');
  });

  test('a wrong audience is refused, and so is a list without our azp', async () => {
    await expectCode(v(await signToken(key, goodClaims(NONCE, { aud: 'someone-else.apps.googleusercontent.com', azp: undefined }))), 'wrong-aud');
    await expectCode(v(await signToken(key, goodClaims(NONCE, { aud: [CLIENT_ID, 'x'], azp: 'x' }))), 'wrong-aud');
    await expectCode(v(await signToken(key, goodClaims(NONCE, { azp: 'other-client' }))), 'wrong-aud');
  });

  test('a wrong issuer is refused', async () => {
    await expectCode(v(await signToken(key, goodClaims(NONCE, { iss: 'https://evil.example.com' }))), 'wrong-iss');
  });

  test('an expired token is refused; within the 60 s skew it passes', async () => {
    const now = Date.now();
    const iat = Math.floor(now / 1000) - 300;
    await expectCode(v(await signToken(key, goodClaims(NONCE, { iat, exp: Math.floor(now / 1000) - 61 }))), 'expired');
    await v(await signToken(key, goodClaims(NONCE, { iat, exp: Math.floor(now / 1000) - 30 })));
  });

  test('iat in the future or older than 10 minutes is refused', async () => {
    const s = Math.floor(Date.now() / 1000);
    await expectCode(v(await signToken(key, goodClaims(NONCE, { iat: s + 120, exp: s + 3600 }))), 'iat');
    await expectCode(v(await signToken(key, goodClaims(NONCE, { iat: s - 700, exp: s + 3000 }))), 'iat');
  });

  test('a wrong or missing nonce is refused', async () => {
    await expectCode(v(await signToken(key, goodClaims('another-nonce-0123456789abcdefghijklmnopq'))), 'nonce');
    await expectCode(v(await signToken(key, goodClaims(NONCE, { nonce: undefined }))), 'nonce');
  });

  test('an unverified email is refused; a missing email too', async () => {
    await expectCode(v(await signToken(key, goodClaims(NONCE, { email_verified: false }))), 'email-unverified');
    await expectCode(v(await signToken(key, goodClaims(NONCE, { email_verified: undefined }))), 'email-unverified');
    await expectCode(v(await signToken(key, goodClaims(NONCE, { email: undefined }))), 'no-email');
  });

  test('a picture outside lh3.googleusercontent.com is dropped', async () => {
    const c = await v(await signToken(key, goodClaims(NONCE, { picture: 'https://evil.example.com/x.png' })));
    assert.equal(c.picture, null);
  });

  test('garbage is refused as bad-token', async () => {
    await expectCode(v('not-a-jwt'), 'bad-token');
    await expectCode(v('a.b.c'), 'bad-token');
  });

  test('kid rotation: an unknown kid refetches the keys once, then verifies', async () => {
    const rotated = await makeKey('k2');
    const calls: boolean[] = [];
    const ks = async (force: boolean): Promise<Jwk[]> => {
      calls.push(force);
      return force ? [key.jwk, rotated.jwk] : [key.jwk];
    };
    await verifyIdToken(await signToken(rotated, goodClaims(NONCE)), { provider: prov(ks), clientId: CLIENT_ID, nonce: NONCE });
    assert.deepEqual(calls, [false, true]);
    const unknown = await makeKey('k3');
    await expectCode(verifyIdToken(await signToken(unknown, goodClaims(NONCE)), { provider: prov(ks), clientId: CLIENT_ID, nonce: NONCE }), 'unknown-kid');
  });
});

describe('JWKS source', () => {
  test('caches for the max-age Google sends, and rate-limits forced refetches', async () => {
    let fetches = 0;
    let now = 1_000_000;
    const f = (async () => {
      fetches++;
      return new Response(JSON.stringify({ keys: [{ kty: 'RSA', kid: `k${fetches}`, n: 'x', e: 'AQAB' }] }), { headers: { 'cache-control': 'public, max-age=21600, must-revalidate' } });
    }) as unknown as typeof fetch;
    const src = createJwksSource('https://example.invalid/certs', f, () => now);
    assert.equal((await src(false))[0].kid, 'k1');
    await src(false);
    assert.equal(fetches, 1, 'served from cache');
    await src(true);
    assert.equal(fetches, 1, 'a forced refetch right after a fetch is suppressed');
    now += 61_000;
    assert.equal((await src(true))[0].kid, 'k2', 'a forced refetch after a minute goes out');
    now += 21_600_000;
    await src(false);
    assert.equal(fetches, 3, 'expired after max-age');
  });

  test('a failing JWKS endpoint is a jwks-failed error', async () => {
    const f = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    await expectCode(createJwksSource('https://example.invalid/certs', f)(false), 'jwks-failed');
  });
});

describe('sign-in flow (state, nonce, PKCE)', async () => {
  const key = await makeKey('flow');

  /** A provider whose exchange checks the PKCE verifier against the challenge sent to "Google". */
  function flowProvider(email: string, o: { verified?: boolean } = {}): Provider & { seen: { challenge?: string; verifier?: string } } {
    const seen: { challenge?: string; verifier?: string; nonce?: string } = {};
    return {
      name: 'google',
      authorizeEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      issuers: ['https://accounts.google.com'],
      keys: async () => [key.jwk],
      seen,
      async exchange(code, verifier, redirectUri) {
        assert.equal(code, 'the-code');
        assert.equal(redirectUri, 'https://architect.alikorea-demo.com/auth/callback');
        seen.verifier = verifier;
        assert.equal(await pkceChallenge(verifier), seen.challenge, 'S256(verifier) equals the challenge');
        return signToken(key, goodClaims(seen.nonce!, { email, sub: `sub-${email}`, email_verified: o.verified ?? true }));
      },
    } as Provider & { seen: { challenge?: string; verifier?: string; nonce?: string } };
  }

  async function begin(env: ReturnType<typeof makeEnv>, p: ReturnType<typeof flowProvider>, next = '/'): Promise<{ cookie: string; state: string }> {
    const res = await startSignIn(env, new URL(`https://architect.alikorea-demo.com/auth/google?next=${encodeURIComponent(next)}`), p);
    assert.equal(res.status, 302);
    const loc = new URL(res.headers.get('Location')!);
    assert.equal(loc.origin + loc.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
    assert.equal(loc.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(loc.searchParams.get('scope'), 'openid email profile');
    assert.equal(loc.searchParams.get('response_type'), 'code');
    assert.equal(loc.searchParams.get('client_id'), CLIENT_ID);
    p.seen.challenge = loc.searchParams.get('code_challenge')!;
    (p.seen as { nonce?: string }).nonce = loc.searchParams.get('nonce')!;
    const set = res.headers.get('Set-Cookie')!;
    assert.match(set, /^__Host-ab_oidc=/);
    assert.match(set, /HttpOnly/);
    assert.match(set, /Secure/);
    assert.match(set, /SameSite=Lax/);
    assert.match(set, /Max-Age=600/);
    return { cookie: set.split(';')[0], state: loc.searchParams.get('state')! };
  }

  const callback = (env: ReturnType<typeof makeEnv>, p: Provider, cookie: string | null, qs: string) =>
    finishSignIn(new Request(`https://architect.alikorea-demo.com/auth/callback?${qs}`, { headers: cookie ? { Cookie: cookie } : {} }), env, new URL(`https://architect.alikorea-demo.com/auth/callback?${qs}`), p, makeCtx());

  test('a new user lands on /pending with a session; the sign-in cookie is cleared', async () => {
    const env = makeEnv();
    const p = flowProvider('new.person@gmail.com');
    const { cookie, state } = await begin(env, p, '/somewhere');
    const res = await callback(env, p, cookie, `code=the-code&state=${state}`);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('Location'), '/pending');
    const sets = res.headers.getSetCookie();
    assert.ok(sets.some((s) => s.startsWith(`${OIDC_COOKIE}=;`) && /Max-Age=0/.test(s)), 'oidc cookie cleared');
    const session = sets.find((s) => s.startsWith('__Host-ab_session='))!;
    assert.match(session, /HttpOnly/);
    assert.match(session, /Secure/);
    assert.match(session, /SameSite=Lax/);
    assert.match(session, /Path=\//);
    assert.match(session, /Max-Age=604800/);
    assert.doesNotMatch(session, /Domain=/i);
    const u = await db.userByEmail(env.DB, 'new.person@gmail.com');
    assert.equal(u?.status, 'pending');
    assert.equal(u?.role, 'user');
  });

  test('an approved user is never sent off-site by a ?next= that normalises to //host', async () => {
    for (const next of ['/..//evil.com', '/.//evil.com', '/%2e%2e//evil.com', '/x/../..//evil.com']) {
      const env = makeEnv();
      const p = flowProvider(ADMIN);
      const { cookie, state } = await begin(env, p, next);
      const res = await callback(env, p, cookie, `code=the-code&state=${state}`);
      assert.equal(res.headers.get('Location'), '/', next);
    }
  });

  test('finishSignIn re-checks the stored return path (a cookie from an older build)', async () => {
    const env = makeEnv();
    const p = flowProvider(ADMIN);
    const { state } = await begin(env, p, '/');
    const forged = await signJson(sessionSecret(env)!, 'oidc-v1', { s: state, n: (p.seen as { nonce?: string }).nonce!, v: 'v'.repeat(48), r: '//evil.com', t: Date.now() });
    p.seen.challenge = await pkceChallenge('v'.repeat(48));
    const res = await callback(env, p, `${OIDC_COOKIE}=${forged}`, `code=the-code&state=${state}`);
    assert.equal(res.headers.get('Location'), '/');
  });

  test('the ADMIN_EMAILS address becomes an approved admin and returns to where it started', async () => {
    const env = makeEnv();
    const p = flowProvider(ADMIN);
    const { cookie, state } = await begin(env, p, '/admin');
    const res = await callback(env, p, cookie, `code=the-code&state=${state}`);
    assert.equal(res.headers.get('Location'), '/admin');
    const u = await db.userByEmail(env.DB, ADMIN);
    assert.equal(u?.status, 'approved');
    assert.equal(u?.role, 'admin');
    assert.equal(u?.decided_by, 'ADMIN_EMAILS');
  });

  test('a wrong state, a missing cookie and a tampered cookie are refused', async () => {
    const env = makeEnv();
    const p = flowProvider('x@gmail.com');
    const { cookie, state } = await begin(env, p);
    assert.equal((await callback(env, p, cookie, `code=the-code&state=${state}x`)).headers.get('Location'), '/login?error=expired');
    assert.equal((await callback(env, p, null, `code=the-code&state=${state}`)).headers.get('Location'), '/login?error=expired');
    const [name, value] = cookie.split('=');
    const [payload, sig] = value.split('.');
    const forged = `${name}=${payload.slice(0, -2)}AA.${sig}`;
    assert.equal((await callback(env, p, forged, `code=the-code&state=${state}`)).headers.get('Location'), '/login?error=expired');
    assert.equal(await db.userByEmail(env.DB, 'x@gmail.com'), null);
  });

  test('a user who backs out at Google sees "cancelled"', async () => {
    const env = makeEnv();
    const p = flowProvider('x@gmail.com');
    const { cookie } = await begin(env, p);
    assert.equal((await callback(env, p, cookie, 'error=access_denied')).headers.get('Location'), '/login?error=cancelled');
  });

  test('an unverified Google email is refused with its own message', async () => {
    const env = makeEnv();
    const p = flowProvider('x@gmail.com', { verified: false });
    const { cookie, state } = await begin(env, p);
    assert.equal((await callback(env, p, cookie, `code=the-code&state=${state}`)).headers.get('Location'), '/login?error=unverified');
  });

  test('a known email arriving with another Google account is refused', async () => {
    const env = makeEnv();
    await db.upsertOnSignIn(env.DB, { sub: 'original-sub', email: 'x@gmail.com', name: 'X', picture: null }, { seedAdmin: false, lang: null, now: Date.now() });
    const p = flowProvider('x@gmail.com');
    const { cookie, state } = await begin(env, p);
    assert.equal((await callback(env, p, cookie, `code=the-code&state=${state}`)).headers.get('Location'), '/login?error=account');
  });

  test('without a configured provider the start says so', async () => {
    const env = makeEnv();
    const res = await startSignIn(env, new URL('https://architect.alikorea-demo.com/auth/google'), null);
    assert.equal(res.headers.get('Location'), '/login?error=config');
  });

  test('googleProvider sends the code, verifier and secret to the token endpoint as a form', async () => {
    let seen: { url: string; body: string } | null = null;
    const f = (async (u: string | URL | Request, i?: RequestInit) => {
      seen = { url: String(u), body: String(i?.body) };
      return new Response(JSON.stringify({ id_token: 'tok', access_token: 'ignored' }), { headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    const g = googleProvider({ clientId: CLIENT_ID, clientSecret: 'shh', fetchImpl: f, keys: async () => [] });
    assert.equal(await g.exchange('c0de', 'verifier-xyz', 'https://architect.alikorea-demo.com/auth/callback'), 'tok');
    const body = new URLSearchParams(seen!.body);
    assert.equal(seen!.url, 'https://oauth2.googleapis.com/token');
    assert.equal(body.get('grant_type'), 'authorization_code');
    assert.equal(body.get('code_verifier'), 'verifier-xyz');
    assert.equal(body.get('client_secret'), 'shh');
    const bad = googleProvider({ clientId: CLIENT_ID, clientSecret: 'shh', fetchImpl: (async () => new Response('{"error":"invalid_grant"}', { status: 400 })) as unknown as typeof fetch, keys: async () => [] });
    await expectCode(bad.exchange('c', 'v', 'r'), 'exchange-failed');
  });
});
