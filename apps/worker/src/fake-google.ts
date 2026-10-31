// A fake Google for local end-to-end tests ONLY. It stands in for accounts.google.com (a page where you type the
// address to sign in as), the token endpoint and the JWKS, in process: it checks the PKCE verifier and mints a real
// RS256 ID token with a key generated in memory, so the Worker's own verification code (oidc.ts) runs unchanged.
//
// Guard: it answers only when DEV_FAKE_GOOGLE is "1" AND the request is to a loopback host AND ALLOWED_ORIGIN is a
// plain-http loopback origin. Production (https://architect.alikorea-demo.com) fails all three: the production vars
// never set DEV_FAKE_GOOGLE (a test checks wrangler.jsonc), and even with it set, the guard refuses.
import type { Env } from './env.ts';
import { allowedOrigin, isLoopbackHost, sessionSecret } from './env.ts';
import { b64url, randomHex, signJson, timingSafeEqual, utf8, verifyJson } from './crypto.ts';
import { pkceChallenge } from './oidc.ts';
import type { Jwk, Provider } from './oidc.ts';
import { escapeHtml, html, redirect } from './http.ts';

export const FAKE_PREFIX = '/__fake-google';
const CODE_PURPOSE = 'fake-google-code';

export function fakeGoogleAllowed(env: Env, url: URL): boolean {
  if (env.DEV_FAKE_GOOGLE !== '1') return false;
  const origin = allowedOrigin(env);
  if (!origin) return false;
  const a = new URL(origin);
  return a.protocol === 'http:' && isLoopbackHost(a.hostname) && url.protocol === 'http:' && isLoopbackHost(url.hostname);
}

let keyPair: Promise<{ privateKey: CryptoKey; jwk: Jwk }> | null = null;

function fakeKey(): Promise<{ privateKey: CryptoKey; jwk: Jwk }> {
  keyPair ??= (async () => {
    const kp = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const pub = (await crypto.subtle.exportKey('jwk', kp.publicKey)) as JsonWebKey;
    return { privateKey: kp.privateKey, jwk: { kty: 'RSA', n: pub.n, e: pub.e, alg: 'RS256', use: 'sig', kid: `fake-${randomHex(4)}` } };
  })();
  return keyPair;
}

interface FakeCode {
  email: string;
  name: string;
  ev: boolean;
  nonce: string;
  cc: string;
  ruri: string;
  aud: string;
  exp: number;
}

const subOf = (email: string): string => `fake-${[...utf8(email)].reduce((h, b) => (h * 31 + b) >>> 0, 7).toString(16)}`;

export function fakeProvider(env: Env): Provider {
  const origin = allowedOrigin(env)!;
  const issuer = `${origin}${FAKE_PREFIX}`;
  return {
    name: 'fake',
    authorizeEndpoint: `${origin}${FAKE_PREFIX}/authorize`,
    issuers: [issuer],
    keys: async () => [(await fakeKey()).jwk],
    async exchange(code, verifier, redirectUri) {
      const secret = sessionSecret(env)!;
      const c = await verifyJson<FakeCode>(secret, CODE_PURPOSE, code);
      if (!c || c.exp < Date.now() || c.ruri !== redirectUri) throw new Error('fake: bad code');
      if (!timingSafeEqual(await pkceChallenge(verifier), c.cc)) throw new Error('fake: PKCE verifier does not match');
      const { privateKey, jwk } = await fakeKey();
      const iat = Math.floor(Date.now() / 1000);
      const header = b64url(utf8(JSON.stringify({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })));
      const payload = b64url(utf8(JSON.stringify({ iss: issuer, aud: c.aud, azp: c.aud, sub: subOf(c.email), email: c.email, email_verified: c.ev, name: c.name, nonce: c.nonce, iat, exp: iat + 3600 })));
      const sig = b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, utf8(`${header}.${payload}`)));
      return `${header}.${payload}.${sig}`;
    },
  };
}

/** /__fake-google/authorize (the account picker) and /__fake-google/consent (issues the code). */
export async function handleFakeGoogle(env: Env, url: URL): Promise<Response> {
  const q = url.searchParams;
  const origin = allowedOrigin(env)!;
  const ruri = q.get('redirect_uri') ?? '';
  if (ruri !== `${origin}/auth/callback` || q.get('client_id') !== env.GOOGLE_CLIENT_ID) return html(400, '<p>fake Google: wrong client_id or redirect_uri</p>');
  if (q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge') || !q.get('state') || !q.get('nonce')) return html(400, '<p>fake Google: PKCE, state and nonce are required</p>');
  if (url.pathname === `${FAKE_PREFIX}/authorize`) {
    const keep = ['client_id', 'redirect_uri', 'state', 'nonce', 'code_challenge', 'code_challenge_method'].map((k) => `<input type="hidden" name="${k}" value="${escapeHtml(q.get(k))}">`).join('');
    return html(
      200,
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fake Google (local test)</title><link rel="stylesheet" href="/_auth/pages.css"></head>
<body class="page page--centre"><main class="centre"><section class="block"><h1 class="title">Fake Google sign-in</h1>
<p class="hint">Local test only. This page does not exist in production.</p>
<form method="get" action="${FAKE_PREFIX}/consent" class="form">${keep}
<label class="label" for="email">Sign in as</label><input class="input" id="email" name="email" type="email" required value="someone@example.com">
<label class="label" for="name">Name</label><input class="input" id="name" name="name" value="Test User">
<label class="check"><input type="checkbox" name="email_verified" value="true" checked> Email verified</label>
<button class="btn btn--primary" type="submit">Continue</button></form></section></main></body></html>`,
    );
  }
  if (url.pathname === `${FAKE_PREFIX}/consent`) {
    const email = (q.get('email') ?? '').trim().toLowerCase();
    const code = await signJson(sessionSecret(env)!, CODE_PURPOSE, {
      email,
      name: (q.get('name') ?? '').slice(0, 80),
      ev: q.get('email_verified') === 'true',
      nonce: q.get('nonce')!,
      cc: q.get('code_challenge')!,
      ruri,
      aud: q.get('client_id')!,
      exp: Date.now() + 60_000,
    } satisfies FakeCode);
    const back = new URL(ruri);
    back.searchParams.set('code', code);
    back.searchParams.set('state', q.get('state')!);
    return redirect(back.toString());
  }
  return html(404, '<p>Not found</p>');
}
