// Google OpenID Connect, authorization-code flow with PKCE. The code is exchanged server-side; the ID token's RS256
// signature is checked against Google's JWKS (cached per isolate for the max-age Google sends, refetched once when an
// unknown kid appears, so key rotation is followed) and its iss, aud, exp, iat, nonce and email_verified claims are
// checked. Only the ID token is used: no access or refresh token is kept.
import { b64url, fromB64url, fromUtf8, sha256, timingSafeEqual, utf8 } from './crypto.ts';

export const GOOGLE = {
  authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  jwks: 'https://www.googleapis.com/oauth2/v3/certs',
  issuers: ['https://accounts.google.com', 'accounts.google.com'] as readonly string[],
} as const;

export const SCOPES = 'openid email profile';
/** Clock skew allowed on exp and iat. */
export const SKEW_S = 60;
/** An ID token older than this (by iat) is refused: it is minted at the exchange, seconds before we see it. */
export const MAX_TOKEN_AGE_S = 600;
/** An unknown kid refetches the JWKS at most this often. */
export const JWKS_REFETCH_MS = 60_000;

export type OidcCode =
  | 'bad-token'
  | 'bad-alg'
  | 'unknown-kid'
  | 'bad-signature'
  | 'wrong-iss'
  | 'wrong-aud'
  | 'expired'
  | 'iat'
  | 'nonce'
  | 'email-unverified'
  | 'no-email'
  | 'exchange-failed'
  | 'jwks-failed';

export class OidcError extends Error {
  code: OidcCode;
  constructor(code: OidcCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
  }
}

export interface Jwk {
  kty: string;
  kid?: string;
  n?: string;
  e?: string;
  alg?: string;
  use?: string;
}

/** Where the ID token comes from: Google in production, the in-process fake in local tests (fake-google.ts). */
export interface Provider {
  name: 'google' | 'fake';
  authorizeEndpoint: string;
  issuers: readonly string[];
  /** Exchanges the code (with the PKCE verifier) for an ID token. */
  exchange(code: string, verifier: string, redirectUri: string): Promise<string>;
  /** The signing keys; force asks for a refetch (rate-limited by the source). */
  keys(force: boolean): Promise<Jwk[]>;
}

export interface IdClaims {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

/** S256 PKCE challenge for a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64url(await sha256(verifier));
}

export function authorizeUrl(p: Provider, o: { clientId: string; redirectUri: string; state: string; nonce: string; challenge: string }): string {
  const q = new URLSearchParams({
    client_id: o.clientId,
    redirect_uri: o.redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state: o.state,
    nonce: o.nonce,
    code_challenge: o.challenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${p.authorizeEndpoint}?${q.toString()}`;
}

/** A JWKS fetcher with a cache. One per process for Google; tests make their own. */
export function createJwksSource(url: string, fetchImpl: typeof fetch, now: () => number = Date.now): (force: boolean) => Promise<Jwk[]> {
  let cache: { keys: Jwk[]; expiresAt: number; fetchedAt: number } | null = null;
  let pending: Promise<Jwk[]> | null = null;
  const load = async (): Promise<Jwk[]> => {
    let res: Response;
    try {
      res = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    } catch (e) {
      throw new OidcError('jwks-failed', (e as Error)?.name ?? 'network');
    }
    if (!res.ok) throw new OidcError('jwks-failed', `status ${res.status}`);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new OidcError('jwks-failed', 'not JSON');
    }
    const keys = (body as { keys?: unknown }).keys;
    if (!Array.isArray(keys)) throw new OidcError('jwks-failed', 'no keys');
    const m = /max-age=(\d+)/i.exec(res.headers.get('cache-control') ?? '');
    const maxAgeS = Math.min(86_400, Math.max(300, m ? Number(m[1]) : 3600));
    const t = now();
    cache = { keys: keys.filter((k): k is Jwk => !!k && typeof k === 'object' && typeof (k as Jwk).kty === 'string'), expiresAt: t + maxAgeS * 1000, fetchedAt: t };
    return cache.keys;
  };
  return async (force) => {
    const t = now();
    const fresh = cache && t < cache.expiresAt;
    const recentlyFetched = cache && t - cache.fetchedAt < JWKS_REFETCH_MS;
    if (cache && (fresh && !force)) return cache.keys;
    if (cache && force && recentlyFetched) return cache.keys;
    pending ??= load().finally(() => {
      pending = null;
    });
    return pending;
  };
}

let googleKeys: ((force: boolean) => Promise<Jwk[]>) | null = null;

/** Google as the provider. `fetchImpl` and `keys` are for tests; by default one JWKS cache serves the isolate. */
export function googleProvider(o: { clientId: string; clientSecret: string; fetchImpl?: typeof fetch; keys?: (force: boolean) => Promise<Jwk[]> }): Provider {
  const f = o.fetchImpl ?? ((u: RequestInfo | URL, i?: RequestInit) => fetch(u, i));
  googleKeys ??= createJwksSource(GOOGLE.jwks, (u, i) => fetch(u, i));
  const keys = o.keys ?? googleKeys;
  return {
    name: 'google',
    authorizeEndpoint: GOOGLE.authorize,
    issuers: GOOGLE.issuers,
    keys,
    async exchange(code, verifier, redirectUri) {
      const body = new URLSearchParams({ code, client_id: o.clientId, client_secret: o.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier });
      let res: Response;
      try {
        res = await f(GOOGLE.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: body.toString(), signal: AbortSignal.timeout(10_000) });
      } catch (e) {
        throw new OidcError('exchange-failed', (e as Error)?.name ?? 'network');
      }
      // Never log or return the body: it may echo the code.
      if (!res.ok) throw new OidcError('exchange-failed', `status ${res.status}`);
      let j: unknown;
      try {
        j = await res.json();
      } catch {
        throw new OidcError('exchange-failed', 'not JSON');
      }
      const idToken = (j as { id_token?: unknown }).id_token;
      if (typeof idToken !== 'string') throw new OidcError('exchange-failed', 'no id_token');
      return idToken;
    },
  };
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function importRsa(jwk: Jwk): Promise<CryptoKey> {
  const id = `${jwk.kid}|${jwk.n}|${jwk.e}`;
  let k = keyCache.get(id);
  if (!k) {
    k = crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    k.catch(() => keyCache.delete(id));
    if (keyCache.size > 32) keyCache.clear();
    keyCache.set(id, k);
  }
  return k;
}

const findKey = (keys: Jwk[], kid: string): Jwk | undefined =>
  keys.find((k) => k.kid === kid && k.kty === 'RSA' && typeof k.n === 'string' && typeof k.e === 'string' && (k.use === undefined || k.use === 'sig') && (k.alg === undefined || k.alg === 'RS256'));

const GOOGLE_AVATAR_RE = /^https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9_\-./=?&%~+]{1,1500}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,63}$/;

function parsePart(s: string): Record<string, unknown> {
  const v: unknown = JSON.parse(fromUtf8(fromB64url(s)));
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
  return v as Record<string, unknown>;
}

/**
 * Verifies a Google ID token and returns the claims the app keeps. Throws OidcError with the first failed check.
 * `now` is in milliseconds.
 */
export async function verifyIdToken(token: string, o: { provider: Pick<Provider, 'keys' | 'issuers'>; clientId: string; nonce: string; now?: number }): Promise<IdClaims> {
  if (typeof token !== 'string' || token.length > 16_384) throw new OidcError('bad-token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new OidcError('bad-token');
  let header: Record<string, unknown>;
  let claims: Record<string, unknown>;
  let sig: Uint8Array<ArrayBuffer>;
  try {
    header = parsePart(parts[0]);
    claims = parsePart(parts[1]);
    sig = fromB64url(parts[2]);
  } catch {
    throw new OidcError('bad-token');
  }
  if (header.alg !== 'RS256') throw new OidcError('bad-alg', String(header.alg));
  if (typeof header.kid !== 'string' || !header.kid) throw new OidcError('bad-token', 'no kid');
  let jwk = findKey(await o.provider.keys(false), header.kid);
  if (!jwk) jwk = findKey(await o.provider.keys(true), header.kid); // rotation: refetch once
  if (!jwk) throw new OidcError('unknown-kid');
  let ok = false;
  try {
    ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', await importRsa(jwk), sig, utf8(`${parts[0]}.${parts[1]}`));
  } catch {
    ok = false;
  }
  if (!ok) throw new OidcError('bad-signature');

  const nowS = Math.floor((o.now ?? Date.now()) / 1000);
  if (typeof claims.iss !== 'string' || !o.provider.issuers.includes(claims.iss)) throw new OidcError('wrong-iss');
  const aud = claims.aud;
  if (typeof aud === 'string') {
    if (aud !== o.clientId) throw new OidcError('wrong-aud');
  } else if (Array.isArray(aud)) {
    if (!aud.includes(o.clientId) || claims.azp !== o.clientId) throw new OidcError('wrong-aud');
  } else throw new OidcError('wrong-aud');
  if (claims.azp !== undefined && claims.azp !== o.clientId) throw new OidcError('wrong-aud', 'azp');
  if (typeof claims.exp !== 'number' || nowS >= claims.exp + SKEW_S) throw new OidcError('expired');
  if (typeof claims.iat !== 'number' || claims.iat > nowS + SKEW_S || nowS - claims.iat > MAX_TOKEN_AGE_S) throw new OidcError('iat');
  if (typeof claims.nonce !== 'string' || !timingSafeEqual(claims.nonce, o.nonce)) throw new OidcError('nonce');
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255) throw new OidcError('bad-token', 'sub');
  if (typeof claims.email !== 'string') throw new OidcError('no-email');
  const email = claims.email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) throw new OidcError('no-email');
  if (claims.email_verified !== true && claims.email_verified !== 'true') throw new OidcError('email-unverified');
  const name = typeof claims.name === 'string' ? claims.name.trim().slice(0, 120) : '';
  const picture = typeof claims.picture === 'string' && GOOGLE_AVATAR_RE.test(claims.picture) ? claims.picture : null;
  return { sub: claims.sub, email, name, picture };
}
