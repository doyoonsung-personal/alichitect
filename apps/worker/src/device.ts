// The device cookie: a signed "this browser has signed in to this account before" mark (__Host-ab_device, HttpOnly,
// Secure, SameSite=Lax, 180 days). It is set when a correct password (or a reset code) has proved the person owns the
// account, so only an owner can ever hold one. What it buys: sign-in from that browser is never held back by other
// people's failed guesses (the address-wide sign-in counter and the per-IP lock skip it); its own failures are counted
// separately (src/throttle.ts LOCK.signinDevice), so a stolen cookie still cannot walk passwords.
//
// The cookie names the account by an HMAC of the address (never the address) and carries a random device id. A browser
// keeps the mark for the account it signed in to last.
import { randomToken, signJson, verifyJson } from './crypto.ts';
import { cookie, parseCookies } from './http.ts';

export const DEVICE_COOKIE = '__Host-ab_device';
const PURPOSE = 'device-v1';
export const DEVICE_TTL_MS = 180 * 86_400_000;

interface Device {
  e: string; // HMAC key of the account's address (throttleKey(secret, 'device', email))
  d: string; // random device id
  t: number; // issued at (ms)
}

/** The device id when this browser carries a valid mark for this account (emailKey), else null. */
export async function readDevice(request: Request, secret: string, emailKey: string, now: number): Promise<string | null> {
  const p = await verifyJson<Device>(secret, PURPOSE, parseCookies(request.headers.get('Cookie')).get(DEVICE_COOKIE));
  if (!p || p.e !== emailKey || typeof p.d !== 'string' || p.d.length < 16 || typeof p.t !== 'number') return null;
  if (now - p.t > DEVICE_TTL_MS || p.t > now + 60_000) return null;
  return p.d;
}

/** The Set-Cookie value that marks this browser as known for the account; keeps its id when it already had one. */
export async function deviceCookie(secret: string, emailKey: string, existingId: string | null, now: number): Promise<string> {
  const payload: Device = { e: emailKey, d: existingId ?? randomToken(16), t: now };
  return cookie(DEVICE_COOKIE, await signJson(secret, PURPOSE, payload), { maxAge: DEVICE_TTL_MS / 1000 });
}
