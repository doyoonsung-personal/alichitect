// /auth/google (start), /auth/callback and /auth/logout.
// Start: a random state, nonce and PKCE verifier go into a short-lived signed cookie (__Host-ab_oidc, 10 minutes),
// and the browser is sent to Google. Callback: the cookie is checked and cleared, the state compared, the code
// exchanged server-side, the ID token verified (oidc.ts), the user created or refreshed in D1 and a session issued.
// Approved users go back where they started; everyone else goes to /pending.
import type { Env, ExecutionContextLike } from './env.ts';
import { adminEmails, allowedOrigin, sessionSecret } from './env.ts';
import { randomToken, signJson, timingSafeEqual, verifyJson } from './crypto.ts';
import { cookie, parseCookies, redirect, safeNext } from './http.ts';
import { OidcError, authorizeUrl, googleProvider, pkceChallenge, verifyIdToken } from './oidc.ts';
import type { Provider } from './oidc.ts';
import { fakeGoogleAllowed, fakeProvider } from './fake-google.ts';
import { AccountMismatch, upsertOnSignIn } from './db.ts';
import { endSession, issueSession, sessionHashOf } from './session.ts';
import { langOfRequest } from './pages/i18n.ts';

export const OIDC_COOKIE = '__Host-ab_oidc';
const OIDC_PURPOSE = 'oidc-v1';
const OIDC_TTL_MS = 10 * 60_000;
const PLACEHOLDER_ID = /^REPLACE_WITH_/;

interface OidcState {
  s: string; // state
  n: string; // nonce
  v: string; // PKCE verifier
  r: string; // where to go after sign-in
  t: number; // issued at (ms)
}

export type LoginError = 'cancelled' | 'expired' | 'failed' | 'unverified' | 'account' | 'config';

/** The identity provider for this request: the local fake when its guard allows it, else Google (null: not configured). */
export function providerFor(env: Env, url: URL): Provider | null {
  if (fakeGoogleAllowed(env, url)) return fakeProvider(env);
  if (!env.GOOGLE_CLIENT_ID || PLACEHOLDER_ID.test(env.GOOGLE_CLIENT_ID) || !env.GOOGLE_CLIENT_SECRET) return null;
  return googleProvider({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET });
}

const clearOidc = (): string => cookie(OIDC_COOKIE, '', { maxAge: 0 });
const toLogin = (error: LoginError, extra: Array<[string, string]> = []): Response => redirect(`/login?error=${error}`, 302, [['Set-Cookie', clearOidc()], ...extra]);

export async function startSignIn(env: Env, url: URL, provider: Provider | null, now = Date.now()): Promise<Response> {
  const secret = sessionSecret(env);
  const origin = allowedOrigin(env);
  if (!secret || !origin || !provider) return toLogin('config');
  const state: OidcState = { s: randomToken(32), n: randomToken(32), v: randomToken(48), r: safeNext(url.searchParams.get('next')), t: now };
  const location = authorizeUrl(provider, { clientId: env.GOOGLE_CLIENT_ID, redirectUri: `${origin}/auth/callback`, state: state.s, nonce: state.n, challenge: await pkceChallenge(state.v) });
  return redirect(location, 302, [['Set-Cookie', cookie(OIDC_COOKIE, await signJson(secret, OIDC_PURPOSE, state), { maxAge: OIDC_TTL_MS / 1000 })]]);
}

export async function finishSignIn(request: Request, env: Env, url: URL, provider: Provider | null, ctx: ExecutionContextLike, now = Date.now()): Promise<Response> {
  const secret = sessionSecret(env);
  const origin = allowedOrigin(env);
  if (!secret || !origin || !provider) return toLogin('config');
  const st = await verifyJson<OidcState>(secret, OIDC_PURPOSE, parseCookies(request.headers.get('Cookie')).get(OIDC_COOKIE));
  if (!st || typeof st.t !== 'number' || now - st.t > OIDC_TTL_MS || st.t > now + 60_000) return toLogin('expired');
  if (url.searchParams.get('error')) return toLogin('cancelled'); // access_denied and the like: the user backed out
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  if (!code || code.length > 4096 || !timingSafeEqual(state, st.s)) return toLogin('expired');
  try {
    const idToken = await provider.exchange(code, st.v, `${origin}/auth/callback`);
    const id = await verifyIdToken(idToken, { provider, clientId: env.GOOGLE_CLIENT_ID, nonce: st.n, now });
    const r = await upsertOnSignIn(env.DB, id, { seedAdmin: adminEmails(env).includes(id.email), lang: langOfRequest(request, url).chosen, now });
    // a session the browser already had is ended, so signing in always starts a fresh one
    if (await sessionHashOf(request, env, now)) ctx.waitUntil(endSession(request, env, now).catch(() => undefined));
    const setSession = await issueSession(env, r.user.id, now);
    console.log(JSON.stringify({ evt: 'sign-in', user: r.user.id, status: r.user.status, role: r.user.role, created: r.created, seeded: r.seeded, provider: provider.name }));
    const to = r.user.status === 'approved' ? safeNext(st.r) : '/pending'; // checked again: the cookie is ours, but the guard is cheap
    return redirect(to, 302, [
      ['Set-Cookie', clearOidc()],
      ['Set-Cookie', setSession],
    ]);
  } catch (e) {
    if (e instanceof AccountMismatch) return toLogin('account');
    if (e instanceof OidcError) {
      console.warn(JSON.stringify({ evt: 'sign-in-refused', code: e.code, provider: provider.name }));
      return toLogin(e.code === 'email-unverified' ? 'unverified' : 'failed');
    }
    console.error(JSON.stringify({ evt: 'sign-in-error', error: (e as Error)?.name ?? 'error' }));
    return toLogin('failed');
  }
}

export async function signOut(request: Request, env: Env, now = Date.now()): Promise<Response> {
  const clear = await endSession(request, env, now);
  return redirect('/login?signed_out=1', 303, [['Set-Cookie', clear]]);
}
