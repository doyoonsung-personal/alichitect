// Web Crypto helpers: base64url, random tokens, SHA-256, and HMAC-SHA256 signing with a purpose label, so a value
// signed for one cookie can never be replayed as another. Verification uses crypto.subtle.verify (constant time).

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const B64URL_RE = /^[A-Za-z0-9_-]*$/;

/** Decodes base64url (no padding). Throws on any other character. */
export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  if (!B64URL_RE.test(s) || s.length % 4 === 1) throw new Error('bad base64url');
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export const utf8 = (s: string): Uint8Array<ArrayBuffer> => enc.encode(s);
export const fromUtf8 = (b: Uint8Array): string => dec.decode(b);

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** A random base64url token of `bytes` random bytes (32 bytes: 43 characters). */
export function randomToken(bytes = 32): string {
  return b64url(randomBytes(bytes));
}

export function randomHex(bytes: number): string {
  return [...randomBytes(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(s: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(s)));
}

export async function sha256Hex(s: string): Promise<string> {
  return [...(await sha256(s))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison (length is not secret here: both sides are fixed-length tokens). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

type ImportedKey = ReturnType<typeof crypto.subtle.importKey>;
const keys = new Map<string, ImportedKey>();

function hmacKey(secret: string): ImportedKey {
  let k = keys.get(secret);
  if (!k) {
    k = crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    if (keys.size > 8) keys.clear(); // secrets rotate rarely; never let the cache grow
    keys.set(secret, k);
  }
  return k;
}

const macInput = (purpose: string, payload: string): Uint8Array<ArrayBuffer> => utf8(`${purpose}\n${payload}`);

export async function hmacSign(secret: string, purpose: string, payload: string): Promise<string> {
  return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), macInput(purpose, payload)));
}

export async function hmacVerify(secret: string, purpose: string, payload: string, sig: string): Promise<boolean> {
  let raw: Uint8Array<ArrayBuffer>;
  try {
    raw = fromB64url(sig);
  } catch {
    return false;
  }
  if (raw.length !== 32) return false;
  return crypto.subtle.verify('HMAC', await hmacKey(secret), raw, macInput(purpose, payload));
}

/**
 * Signs a JSON value as `base64url(json).signature`. The purpose is part of the MAC input, so a token signed for one
 * use (the session cookie, the code-flow cookie, the admin notice) is rejected for every other.
 */
export async function signJson(secret: string, purpose: string, value: unknown): Promise<string> {
  const payload = b64url(utf8(JSON.stringify(value)));
  return `${payload}.${await hmacSign(secret, purpose, payload)}`;
}

/** The value signed by signJson, or null when the token is malformed or its signature does not verify. */
export async function verifyJson<T>(secret: string, purpose: string, token: string | null | undefined): Promise<T | null> {
  if (!token || token.length > 4096) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!(await hmacVerify(secret, purpose, payload, sig))) return null;
  try {
    return JSON.parse(fromUtf8(fromB64url(payload))) as T;
  } catch {
    return null;
  }
}
