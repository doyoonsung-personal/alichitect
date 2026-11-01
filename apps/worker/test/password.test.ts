// Password hashing and checking (PBKDF2-SHA256, WonderClip's 100,000 iterations, per-password salt, versioned), the
// password rules, and the constant-time comparisons the Worker relies on.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_PASSWORD_VERSION, PASSWORD_SCHEMES, equalBytes, hashPassword, passwordProblem, verifyPassword } from '../src/password.ts';
import { b64url, fromB64url, timingSafeEqual, utf8 } from '../src/crypto.ts';

describe('hashing', () => {
  test('version 1 is PBKDF2-SHA256, 100,000 iterations (WonderClip and the Workers maximum), 16-byte salt, 32-byte key', () => {
    assert.equal(CURRENT_PASSWORD_VERSION, 1);
    assert.deepEqual(PASSWORD_SCHEMES[1], { hash: 'SHA-256', iterations: 100_000, saltBytes: 16, keyBits: 256 });
  });

  test('the stored value carries a fresh salt and its version, never the password', async () => {
    const a = await hashPassword('correct horse battery');
    const b = await hashPassword('correct horse battery');
    assert.equal(a.pw_version, 1);
    assert.equal(fromB64url(a.pw_salt).length, 16);
    assert.equal(fromB64url(a.pw_hash).length, 32);
    assert.notEqual(a.pw_salt, b.pw_salt, 'a salt per password');
    assert.notEqual(a.pw_hash, b.pw_hash, 'so equal passwords hash differently');
    assert.ok(!JSON.stringify(a).includes('horse'));
  });

  test('the hash is the standard PBKDF2 of the password and salt (checked against an independent derivation)', async () => {
    const p = await hashPassword('비밀번호-패스워드-密码');
    const key = await crypto.subtle.importKey('raw', utf8('비밀번호-패스워드-密码'), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64url(p.pw_salt), iterations: 100_000 }, key, 256);
    assert.equal(p.pw_hash, b64url(bits));
  });
});

describe('verifying', () => {
  test('the right password passes; a wrong one, a near miss and an empty one fail', async () => {
    const p = await hashPassword('correct horse battery');
    assert.deepEqual(await verifyPassword('correct horse battery', p), { ok: true, needsRehash: false });
    for (const wrong of ['correct horse batterY', 'correct horse battery ', '', 'x'.repeat(200)]) assert.equal((await verifyPassword(wrong, p)).ok, false, wrong);
  });

  test('an unknown or damaged stored hash fails closed', async () => {
    const p = await hashPassword('correct horse battery');
    assert.equal((await verifyPassword('correct horse battery', { ...p, pw_version: 99 })).ok, false, 'unknown version');
    assert.equal((await verifyPassword('correct horse battery', { ...p, pw_salt: '!!' })).ok, false, 'bad salt');
    assert.equal((await verifyPassword('correct horse battery', { ...p, pw_hash: p.pw_hash.slice(1) })).ok, false, 'short hash');
    assert.equal((await verifyPassword('correct horse battery', null)).ok, false, 'no account');
  });

  test('a hash of an older version passes and asks to be re-hashed', async () => {
    const legacy = { hash: 'SHA-256', iterations: 1000, saltBytes: 16, keyBits: 256 } as const;
    (PASSWORD_SCHEMES as Record<number, typeof legacy>)[0] = legacy;
    try {
      const salt = new Uint8Array(16).fill(7);
      const key = await crypto.subtle.importKey('raw', utf8('old password!'), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 1000 }, key, 256);
      const r = await verifyPassword('old password!', { pw_hash: b64url(bits), pw_salt: b64url(salt), pw_version: 0 });
      assert.deepEqual(r, { ok: true, needsRehash: true });
    } finally {
      delete (PASSWORD_SCHEMES as Record<number, unknown>)[0];
    }
  });

  test('no account costs the same PBKDF2 work as a wrong password (no timing hint that an address exists)', async () => {
    const p = await hashPassword('correct horse battery');
    const median = async (f: () => Promise<unknown>): Promise<number> => {
      const xs: number[] = [];
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        await f();
        xs.push(performance.now() - t0);
      }
      return xs.sort((a, b) => a - b)[2];
    };
    const known = await median(() => verifyPassword('wrong password!!', p));
    const unknown = await median(() => verifyPassword('wrong password!!', null));
    const ratio = known / unknown;
    assert.ok(ratio > 0.5 && ratio < 2, `known ${known.toFixed(1)} ms vs unknown ${unknown.toFixed(1)} ms`);
    assert.ok(unknown > 2, 'the unknown address really runs PBKDF2');
  });
});

describe('password rules', () => {
  test('10 to 200 characters (counted as characters, not bytes), not the email address', () => {
    assert.equal(passwordProblem('123456789', 'a@b.co'), 'short');
    assert.equal(passwordProblem('blue falcon', 'a@b.co'), null);
    assert.equal(passwordProblem('가나다라마바사아자차', 'a@b.co'), null, '10 Korean characters');
    assert.equal(passwordProblem('x'.repeat(201), 'a@b.co'), 'long');
    assert.equal(passwordProblem('Someone@Example.com', 'someone@example.com'), 'email');
  });

  test('weak passwords are refused: the common ones, repeats, runs, and anything built from the name or the address', () => {
    for (const weak of ['1234567890', 'qwertyuiop', 'password12', 'aaaaaaaaaa', '0000000000', 'iloveyou12', 'Password123', 'PASSWORD1234', '0987654321', 'abcdefghij', 'ababababab', '123123123123', 'Qwerty123!', 'alibaba2026!', 'Welcome1234', 'letmein!!!!']) {
      assert.equal(passwordProblem(weak, 'someone@example.com'), 'weak', weak);
    }
    assert.equal(passwordProblem('my-someone-secret-1', 'someone@example.com'), 'weak', 'contains the address before the @');
    assert.equal(passwordProblem('Mina Park rocks 2026', 'a@b.co', 'Mina Park'), 'weak', 'contains the name');
    assert.equal(passwordProblem('Mina Park rocks 2026', 'a@b.co'), null, 'a reset has no name to compare');
    assert.equal(passwordProblem('Mina Park', 'a@b.co', 'Mina Park'), 'short', 'length is checked first');
  });

  test('ordinary passphrases and strong passwords pass', () => {
    for (const ok of ['correct horse battery', 'blue falcon garden 7', 'tr0ub4dor&3xyz', 'Zq8!vLm2#pXr', '가나다라마바사아자차카', 'my dog ate the keyboard', 'password manager rules']) {
      assert.equal(passwordProblem(ok, 'someone@example.com', 'Mina Park'), null, ok);
    }
  });
});

describe('constant-time comparison', () => {
  test('equalBytes and timingSafeEqual give the right answers', () => {
    assert.equal(equalBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])), true);
    assert.equal(equalBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])), false);
    assert.equal(equalBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2])), false, 'length differs');
    assert.equal(equalBytes(new Uint8Array([0]), new Uint8Array([])), false, 'a zero byte is not "missing"');
    assert.equal(timingSafeEqual('abc', 'abc'), true);
    assert.equal(timingSafeEqual('abc', 'abd'), false);
    assert.equal(timingSafeEqual('abc', 'ab'), false);
  });

  // A comparison that stops at the first difference answers hundreds of times faster for a difference at the start
  // (ratio near 0). These take as long whichever byte differs. The two cases are timed in interleaved rounds so JIT
  // tier-up and machine noise hit both alike, and the bounds are loose (0.25-4) because shared CI runners are noisy:
  // an early exit still fails them by two orders of magnitude.
  const ratioOf = (f: () => void, g: () => void): number => {
    const ratios: number[] = [];
    for (let r = 0; r < 9; r++) {
      let t0 = performance.now();
      for (let i = 0; i < 200; i++) f();
      const tf = performance.now() - t0;
      t0 = performance.now();
      for (let i = 0; i < 200; i++) g();
      ratios.push(tf / (performance.now() - t0));
    }
    return ratios.sort((a, b) => a - b)[4];
  };

  test('timingSafeEqual: a difference in the first character takes as long as one in the last', () => {
    const a = 'x'.repeat(8192);
    const first = `y${'x'.repeat(8191)}`;
    const last = `${'x'.repeat(8191)}y`;
    for (let i = 0; i < 200; i++) { timingSafeEqual(a, first); timingSafeEqual(a, last); } // warm up both
    const ratio = ratioOf(() => timingSafeEqual(a, first), () => timingSafeEqual(a, last));
    assert.ok(ratio > 0.25 && ratio < 4, `ratio ${ratio.toFixed(2)}`);
  });

  test('equalBytes: the same, for byte arrays', () => {
    const a = new Uint8Array(8192).fill(1);
    const first = a.slice();
    first[0] = 2;
    const last = a.slice();
    last[8191] = 2;
    for (let i = 0; i < 200; i++) { equalBytes(a, first); equalBytes(a, last); } // warm up both
    const ratio = ratioOf(() => equalBytes(a, first), () => equalBytes(a, last));
    assert.ok(ratio > 0.25 && ratio < 4, `ratio ${ratio.toFixed(2)}`);
  });
});
