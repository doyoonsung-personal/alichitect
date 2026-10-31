// Password hashing: PBKDF2-SHA256 through Web Crypto with a per-password random salt, as on the WonderClip platform.
// 100,000 iterations is WonderClip's count and also the most the Workers runtime allows (crypto.subtle refuses more
// with NotSupportedError in production; local workerd has no cap, so the limit is fixed here, not discovered). Measured
// on local workerd 1.20261023: about 42 ms of CPU per hash (49.6 ms median request, minus 7.3 ms for an empty one), well
// inside the Worker's CPU limit. Every stored hash carries its version, so a stronger scheme can be added as version 2
// and each password re-hashed at its owner's next sign-in (verifyPassword's needsRehash).
import { b64url, fromB64url, randomBytes, utf8 } from './crypto.ts';

export interface PasswordScheme {
  hash: 'SHA-256';
  iterations: number;
  saltBytes: number;
  keyBits: number;
}

export const PASSWORD_SCHEMES: Readonly<Record<number, PasswordScheme>> = {
  1: { hash: 'SHA-256', iterations: 100_000, saltBytes: 16, keyBits: 256 },
};
export const CURRENT_PASSWORD_VERSION = 1;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

export interface StoredPassword {
  pw_hash: string;
  pw_salt: string;
  pw_version: number;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, s: PasswordScheme): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: s.hash, salt, iterations: s.iterations }, key, s.keyBits));
}

/** A new hash of the password with the current scheme and a fresh random salt. */
export async function hashPassword(password: string): Promise<StoredPassword> {
  const s = PASSWORD_SCHEMES[CURRENT_PASSWORD_VERSION];
  const salt = randomBytes(s.saltBytes);
  return { pw_hash: b64url(await derive(password, salt, s)), pw_salt: b64url(salt), pw_version: CURRENT_PASSWORD_VERSION };
}

/** Constant-time comparison of two byte arrays: every byte is visited whatever the inputs. */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return d === 0;
}

const DUMMY_SALT = new Uint8Array(16);

/**
 * Checks a password against a stored hash. With no stored hash (no such account) the same derivation still runs, so
 * the answer takes as long for an unknown address as for a known one. An unknown version fails closed.
 */
export async function verifyPassword(password: string, stored: StoredPassword | null): Promise<{ ok: boolean; needsRehash: boolean }> {
  const scheme = stored ? PASSWORD_SCHEMES[stored.pw_version] : undefined;
  if (!stored || !scheme) {
    await derive(password, DUMMY_SALT, PASSWORD_SCHEMES[CURRENT_PASSWORD_VERSION]);
    return { ok: false, needsRehash: false };
  }
  let salt: Uint8Array<ArrayBuffer>;
  let want: Uint8Array<ArrayBuffer>;
  try {
    salt = fromB64url(stored.pw_salt);
    want = fromB64url(stored.pw_hash);
  } catch {
    await derive(password, DUMMY_SALT, scheme);
    return { ok: false, needsRehash: false };
  }
  const got = await derive(password, salt, scheme);
  const ok = equalBytes(got, want);
  return { ok, needsRehash: ok && stored.pw_version !== CURRENT_PASSWORD_VERSION };
}

export type PasswordProblem = 'short' | 'long' | 'email' | 'weak';

/**
 * The most common passwords of 10 or more characters, and the words people build the rest from. A password is weak when
 * it is one of the first, or when it is one of the second plus at most six digits or symbols ("Password123",
 * "iloveyou12", "qwertyuiop!"). Matching is on the lower-cased letters, so case and a trailing 1 or ! change nothing.
 * Small on purpose: it stops the guesses an online attacker tries first. It is not a strength meter, and it does not
 * call a breach list (a k-anonymity lookup of the Pwned Passwords range API could be added as a second check).
 */
const COMMON_WHOLE = new Set([
  '1234567890', '0987654321', '12345678910', '1234567891', '123456789a', '1q2w3e4r5t', '1qaz2wsx3edc', 'q1w2e3r4t5', 'qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./',
  'qazwsxedc1', '1q2w3e4r5t6y', 'passw0rd12', 'p@ssw0rd12', 'p@ssword12', 'p@ssw0rd123', 'abcdefghij', 'abcd123456', 'abc1234567', 'a1b2c3d4e5', 'zaq12wsxcde',
]);
const COMMON_WORDS = new Set([
  'password', 'passwort', 'passw', 'qwerty', 'qwertyuiop', 'qwertyuiopasdfghjkl', 'asdfghjkl', 'zxcvbnm', 'iloveyou', 'ilovemyself', 'letmein', 'welcome', 'welcome', 'trustno',
  'administrator', 'admin', 'login', 'monkey', 'dragon', 'football', 'baseball', 'basketball', 'master', 'sunshine', 'princess', 'superman', 'batman', 'whatever',
  'freedom', 'shadow', 'michael', 'jennifer', 'jordan', 'mustang', 'starwars', 'secret', 'changeme', 'default', 'computer', 'internet', 'hello', 'helloworld',
  'cloud', 'alibaba', 'alibabacloud', 'aliyun', 'alicloud', 'dashscope', 'architect', 'architecture', 'builder', 'qwen', 'tongyi', 'samsung', 'dkssudgktpdy', 'rkskekfk', 'tkdlel',
]);
const SEQUENCES = ['01234567890123456789', 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz', 'qwertyuiopasdfghjklzxcvbnm', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1q2w3e4r5t6y7u8i9o0p', 'qazwsxedcrfvtgbyhnujmikolp'];
const reversed = (s: string): string => [...s].reverse().join('');
const SEQUENCES_BOTH = [...SEQUENCES, ...SEQUENCES.map(reversed)];

/** Whether a password is one an attacker's first guesses would find, or is built from the account's own details. */
export function isWeakPassword(password: string, email: string, name = ''): boolean {
  const lower = password.normalize('NFKC').toLowerCase();
  const compact = lower.replace(/[\s._-]/g, '');
  if (new Set([...compact]).size <= 3) return true; // aaaaaaaaaa, 0000000000, ababababab
  if (compact.length >= 6 && SEQUENCES_BOTH.some((s) => s.includes(compact))) return true; // 1234567890, abcdefghij, qwertyuiop, 0987654321
  if (/^(.{1,4})\1{2,}.{0,3}$/su.test(compact)) return true; // abcdabcdabcd, 123123123123
  if (COMMON_WHOLE.has(lower) || COMMON_WHOLE.has(compact)) return true;
  const letters = compact.replace(/[^\p{L}]/gu, '');
  if (letters && COMMON_WORDS.has(letters) && compact.length <= letters.length + 6) return true; // password123, Iloveyou12!
  // built from the account's own details
  const local = (email.split('@')[0] ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (local.length >= 4 && compact.replace(/[^\p{L}\p{N}]/gu, '').includes(local)) return true;
  const person = name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (person.length >= 4 && compact.replace(/[^\p{L}\p{N}]/gu, '').includes(person)) return true;
  return false;
}

/**
 * The password rules: 10 to 200 characters, not the account's own email address, and not a weak one (isWeakPassword).
 * `name` is optional (a reset has none).
 */
export function passwordProblem(password: string, email: string, name = ''): PasswordProblem | null {
  const n = [...password].length;
  if (n < PASSWORD_MIN) return 'short';
  if (n > PASSWORD_MAX) return 'long';
  if (email && password.trim().toLowerCase() === email.toLowerCase()) return 'email';
  if (isWeakPassword(password, email, name)) return 'weak';
  return null;
}
