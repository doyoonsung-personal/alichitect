// Rate limits and progressive lockouts in D1: per (address, IP) pair, per IP, per code flow and per known device for
// sign-in, sign-up, codes, resends and resets; the lock doubling; the mail layers (per minute, per address and IP, per
// address, and the all-addresses pools); the admins' request mails; IPv6 /64 buckets; and that the stored keys never
// hold an address or an IP. (That strangers cannot lock an owner out: test/availability.test.ts.)
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../src/db.ts';
import { LOCK, budgetAddress, hit, ipBucket, lockDuration, throttleKey } from '../src/throttle.ts';
import { ADMIN, Browser, PASSWORD, SECRET, age, lastCode, mailsTo, makeEnv, makeUser, where } from './helpers.ts';
import type { TestEnv } from './helpers.ts';

const MIN = 60_000;

const lockRow = async (env: TestEnv, rule: string, value: string) =>
  env.DB.prepare('SELECT fails, locked_until FROM lockouts WHERE k = ?').bind(await throttleKey(SECRET, rule, value)).first<{ fails: number; locked_until: number }>();

describe('the counters', () => {
  test('a fixed window: the limit-th attempt passes, the next is refused until the window ends', async () => {
    const env = makeEnv();
    const rule = { limit: 3, windowMs: 10_000 };
    const k = { name: 'signinIp' as const, key: 'test:k', rule };
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) assert.equal((await hit(env.DB, [k], now + i)).ok, true);
    const r = await hit(env.DB, [k], now + 5000);
    assert.equal(r.ok, false);
    assert.equal(r.refused, 'signinIp');
    assert.equal(r.retryAfterMs, 5000);
    assert.equal((await hit(env.DB, [k], now + 10_001)).ok, true, 'a new window');
  });

  test('the lock doubles after the free failures and stops at its cap', () => {
    const rule = LOCK.signinPair;
    assert.deepEqual([0, 1, 5, 6, 7, 8, 9, 10, 11, 50].map((n) => lockDuration(rule, n) / MIN), [0, 0, 0, 1, 2, 4, 8, 15, 15, 15]);
    assert.equal(lockDuration(LOCK.codeFlow, 11), 15 * MIN);
    assert.equal(lockDuration(LOCK.codeFlow, 100), 24 * 60 * MIN);
  });

  test('IPv6 counts by /64; IPv4 as is; junk as unknown', () => {
    assert.equal(ipBucket('2001:db8:1234:5678:9abc:def0:1:2'), '2001:db8:1234:5678::/64');
    assert.equal(ipBucket('2001:DB8:1234:5678::1'), '2001:db8:1234:5678::/64');
    assert.equal(ipBucket('2001:db8::1'), '2001:db8:0:0::/64');
    assert.equal(ipBucket('2001:0db8:0000:0042::7'), '2001:db8:0:42::/64');
    assert.equal(ipBucket('203.0.113.7'), '203.0.113.7');
    assert.equal(ipBucket(null), 'unknown');
    assert.equal(ipBucket('<script>'), 'unknown');
  });

  test('stored keys are HMACs: no address and no IP in the tables', async () => {
    const env = makeEnv();
    await new Browser(env, '203.0.113.99').post('/login', { email: 'private@example.com', password: 'wrong password!' });
    await new Browser(env, '203.0.113.98').post('/signup', { name: 'N', email: 'private2@example.com', password: PASSWORD });
    const rows = env.DB.sqlite.prepare('SELECT k FROM rate UNION ALL SELECT k FROM lockouts').all() as Array<{ k: string }>;
    assert.ok(rows.length >= 8);
    for (const { k } of rows) {
      assert.doesNotMatch(k, /private|example|203\.0\.113/);
      assert.match(k, /^[a-zA-Z]+:[A-Za-z0-9_-]{32}$/);
    }
  });

  test('mail counters treat plus-tags and Gmail dots as one address', () => {
    assert.equal(budgetAddress('a.b.c+news@gmail.com'), 'abc@gmail.com');
    assert.equal(budgetAddress('a.b.c@googlemail.com'), 'abc@gmail.com');
    assert.equal(budgetAddress('first.last+x@example.com'), 'first.last@example.com', 'dots count elsewhere');
    assert.equal(budgetAddress('+odd@example.com'), '+odd@example.com');
  });
});

describe('sign-in limits', () => {
  test('after 5 wrong passwords this address and IP is locked, even for the right one; the lock grows; another IP is not held', async () => {
    const env = makeEnv();
    await makeUser(env, 'a@example.com', { status: 'approved' });
    const ip = '198.51.100.1';
    for (let i = 0; i < 5; i++) assert.equal((await new Browser(env, ip).post('/login', { email: 'a@example.com', password: `wrong ${i} password` })).status, 401);
    const sixth = await new Browser(env, ip).post('/login', { email: 'a@example.com', password: 'wrong 6 password' });
    assert.equal(sixth.status, 429);
    assert.equal(sixth.headers.get('Retry-After'), '60');
    assert.match(await sixth.text(), /Too many wrong attempts\. Try again in 1 min\./);
    const right = await new Browser(env, ip).post('/login', { email: 'a@example.com', password: PASSWORD });
    assert.equal(right.status, 429, 'locked means locked, on that IP');
    assert.equal((await new Browser(env, '198.51.100.2').post('/login', { email: 'a@example.com', password: 'wrong password!' })).status, 401, 'another IP is not held');
    await age(env, MIN + 1000);
    await new Browser(env, ip).post('/login', { email: 'a@example.com', password: 'wrong 7 password' });
    const row = await lockRow(env, 'signinPair', `a@example.com\n${ip}`);
    assert.equal(row?.fails, 7);
    assert.ok(row!.locked_until - Date.now() > 1.9 * MIN, 'two minutes now');
    await age(env, 3 * MIN);
    assert.equal(where(await new Browser(env, ip).post('/login', { email: 'a@example.com', password: PASSWORD })), '303 /');
    assert.equal(await lockRow(env, 'signinPair', `a@example.com\n${ip}`), null, 'a success forgets the failures');
  });

  test('an unknown address locks exactly like a known one', async () => {
    const env = makeEnv();
    await makeUser(env, 'known@example.com');
    const statuses = async (email: string, ip: string) => {
      const out: number[] = [];
      for (let i = 0; i < 7; i++) out.push((await new Browser(env, ip).post('/login', { email, password: 'wrong password!' })).status);
      return out;
    };
    const known = await statuses('known@example.com', '198.51.100.10');
    assert.deepEqual(known, [401, 401, 401, 401, 401, 429, 429]);
    assert.deepEqual(await statuses('unknown@example.com', '198.51.100.30'), known);
  });

  test('one IP: locked after 20 failures across many addresses', async () => {
    const env = makeEnv();
    const b = new Browser(env, '203.0.113.5');
    for (let i = 0; i < 20; i++) assert.equal((await b.post('/login', { email: `user${i}@example.com`, password: 'wrong password!' })).status, 401, `attempt ${i + 1}`);
    assert.equal((await b.post('/login', { email: 'user99@example.com', password: 'wrong password!' })).status, 429);
    await makeUser(env, 'real@example.com', { status: 'approved' });
    assert.equal((await b.post('/login', { email: 'real@example.com', password: PASSWORD })).status, 429, 'the IP is locked for every address');
    assert.equal(where(await new Browser(env, '203.0.113.6').post('/login', { email: 'real@example.com', password: PASSWORD })), '303 /', 'other IPs are not');
  });

  test('attempts per IP: at most 30 in 15 minutes, right or wrong', async () => {
    const env = makeEnv();
    for (let i = 0; i <= 30; i++) await makeUser(env, `a${i}@example.com`, { status: 'approved' });
    const b = new Browser(env, '203.0.113.7');
    for (let i = 0; i < 30; i++) {
      b.jar.clear();
      assert.equal((await b.post('/login', { email: `a${i}@example.com`, password: PASSWORD })).status, 303, `attempt ${i + 1}`);
    }
    const r = await b.post('/login', { email: 'a30@example.com', password: PASSWORD });
    assert.equal(r.status, 429);
    assert.match(await r.text(), /Too many attempts\. Try again in 15 min\./);
  });

  test("right passwords are never refused for the address's sake: any number of IPs, no per-address attempt limit", async () => {
    const env = makeEnv();
    await makeUser(env, 'a@example.com', { status: 'approved' });
    for (let i = 0; i < 25; i++) assert.equal((await new Browser(env, `198.51.100.${100 + i}`).post('/login', { email: 'a@example.com', password: PASSWORD })).status, 303);
  });

  test('the address-wide counter (signinSoft) counts failures from unknown devices only, and nothing else', async () => {
    const env = makeEnv();
    await makeUser(env, 'a@example.com', { status: 'approved' });
    const soft = async (): Promise<number> => (await env.DB.prepare('SELECT n FROM rate WHERE k = ?').bind(await throttleKey(SECRET, 'signinSoft', 'a@example.com')).first<{ n: number }>())?.n ?? 0;
    await new Browser(env, '198.51.100.1').post('/login', { email: 'a@example.com', password: PASSWORD });
    assert.equal(await soft(), 0, 'a success');
    await new Browser(env, '198.51.100.2').post('/login', { email: 'a@example.com', password: '' });
    await new Browser(env, '198.51.100.3').post('/login', { email: 'not an address', password: 'wrong password!' });
    assert.equal(await soft(), 0, 'blank and malformed attempts');
    await new Browser(env, '198.51.100.4').post('/login', { email: 'a@example.com', password: 'wrong password!' });
    assert.equal(await soft(), 1);
    const known = new Browser(env, '198.51.100.5');
    await known.post('/login', { email: 'a@example.com', password: PASSWORD });
    await known.post('/auth/logout');
    await known.post('/login', { email: 'a@example.com', password: 'wrong password!' });
    assert.equal(await soft(), 1, "a known device's failures count on its own");
  });

  test('a known device that guesses wrong is locked on its own counter (a stolen cookie cannot walk passwords)', async () => {
    const env = makeEnv();
    await makeUser(env, 'a@example.com', { status: 'approved' });
    const known = new Browser(env, '198.51.100.5');
    await known.post('/login', { email: 'a@example.com', password: PASSWORD });
    await known.post('/auth/logout');
    const got: number[] = [];
    for (let i = 0; i < 12; i++) got.push((await known.post('/login', { email: 'a@example.com', password: `wrong ${i} password` })).status);
    assert.deepEqual(got, [...Array<number>(10).fill(401), 429, 429]);
    assert.equal((await known.post('/login', { email: 'a@example.com', password: PASSWORD })).status, 429, 'locked, even for the right one');
  });
});

describe('sign-up, code and reset limits', () => {
  test('sign-ups per IP: 10 an hour', async () => {
    const env = makeEnv();
    const b = new Browser(env, '203.0.113.20');
    for (let i = 0; i < 10; i++) assert.equal((await b.post('/signup', { name: 'N', email: `n${i}@example.com`, password: PASSWORD })).status, 303);
    const r = await b.post('/signup', { name: 'N', email: 'n10@example.com', password: PASSWORD });
    assert.equal(r.status, 429);
    assert.equal(mailsTo(env, 'n10@example.com').length, 0);
  });

  test('sign-ups for one address are limited by its mail budget (8 an hour), never by a limit that shuts its owner out', async () => {
    const env = makeEnv();
    for (let i = 0; i < 10; i++) assert.equal((await new Browser(env, `198.51.100.${i + 1}`).post('/signup', { name: 'N', email: 'same@example.com', password: PASSWORD })).status, 303);
    assert.equal(mailsTo(env, 'same@example.com').length, 8);
    const late = await new Browser(env, '198.51.100.50').post('/signup', { name: 'N', email: 'same@example.com', password: PASSWORD });
    assert.match(where(late), /^303 \/verify\?n=wait&m=\d+$/, 'asked to wait, not refused');
  });

  test('code entries: failures count across resends in one flow, so a 6-digit code cannot be walked', async () => {
    const env = makeEnv();
    const b = new Browser(env, '203.0.113.30');
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    const wrongFor = (right: string): string => (right === '000000' ? '111111' : '000000');
    // 5 tries per code, then a new code; this browser's flow locks after 10 failures whatever the codes
    for (let round = 0; round < 2; round++) {
      const right = lastCode(env, 'n@example.com');
      for (let i = 0; i < 5; i++) {
        const r = await b.post('/verify', { code: wrongFor(right) });
        assert.equal(r.status, 400, `failure ${round * 5 + i + 1}`);
      }
      if (round === 0) {
        await age(env, MIN + 1000);
        assert.equal(where(await b.post('/verify/resend')), '303 /verify?n=resent');
      }
    }
    const eleventh = await b.post('/verify', { code: wrongFor(lastCode(env, 'n@example.com')) });
    assert.equal(eleventh.status, 429);
    assert.match(await eleventh.text(), /Too many wrong attempts\. Try again in 15 min\./);
    assert.equal((await b.post('/verify', { code: lastCode(env, 'n@example.com') })).status, 429, 'locked: even the right code waits');
    await age(env, 15 * MIN + 1000);
    await b.post('/verify/resend');
    assert.equal(where(await b.post('/verify', { code: lastCode(env, 'n@example.com') })), '303 /pending?n=verified');
  });

  test('code entries per IP lock after 30 failures, across addresses', async () => {
    const env = makeEnv();
    const b = new Browser(env, '203.0.113.40');
    let n = 0;
    for (let s = 0; s < 4; s++) {
      b.jar.clear();
      await b.post('/signup', { name: 'N', email: `w${s}@example.com`, password: PASSWORD });
      for (let i = 0; i < 8 && n < 30; i++, n++) assert.equal((await b.post('/verify', { code: '999999' })).status, 400, `failure ${n + 1}`);
    }
    const r = await b.post('/verify', { code: '999999' });
    assert.equal(r.status, 429);
  });

  test('a reset right after signing up still gets its code (the one-minute gap is per purpose)', async () => {
    const env = makeEnv();
    const b = new Browser(env, '203.0.113.60');
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    await b.post('/verify', { code: lastCode(env, 'n@example.com') });
    assert.equal(where(await new Browser(env, '203.0.113.61').post('/forgot', { email: 'n@example.com' })), '303 /reset');
    assert.match(mailsTo(env, 'n@example.com').at(-1)!.subject, /Password reset code \d{6}/);
  });

  test('forgot password: 10 an hour per IP; mails to one address: 1 a minute, 3 an hour per IP, 8 an hour and 20 a day in all', async () => {
    const env = makeEnv();
    await makeUser(env, 'r@example.com', { status: 'approved' });
    const b = new Browser(env, '203.0.113.50');
    assert.equal(where(await b.post('/forgot', { email: 'r@example.com' })), '303 /reset');
    assert.equal(where(await b.post('/forgot', { email: 'r@example.com' })), '303 /reset?n=wait&m=1');
    assert.equal(mailsTo(env, 'r@example.com').length, 1);
    for (let i = 0; i < 8; i++) await b.post('/forgot', { email: `x${i}@example.com` });
    assert.equal((await b.post('/forgot', { email: 'r@example.com' })).status, 429, 'the 11th request from this IP');

    // the address's own budget, from many IPs
    const askFromTen = async (base: number): Promise<void> => {
      for (let i = 0; i < 10; i++) {
        await age(env, MIN + 1000);
        await new Browser(env, `198.51.100.${base + i}`).post('/forgot', { email: 'r@example.com' });
      }
    };
    await askFromTen(1);
    assert.equal(mailsTo(env, 'r@example.com').length, 8, 'eight in an hour');
    for (const [round, want] of [
      [2, 16],
      [3, 20],
      [4, 20],
    ] as const) {
      await age(env, 61 * MIN);
      await askFromTen(round * 20);
      assert.equal(mailsTo(env, 'r@example.com').length, want, `hour ${round}`);
    }
  });

  test('all sign-up codes together stop at CODE_MAILS_PER_DAY; the page then says so', async () => {
    const env = makeEnv({ CODE_MAILS_PER_DAY: '3' });
    const got: string[] = [];
    for (let i = 0; i < 5; i++) got.push(where(await new Browser(env, `198.51.100.${i + 1}`).post('/signup', { name: 'N', email: `m${i}@example.com`, password: PASSWORD })));
    assert.deepEqual(got, ['303 /verify', '303 /verify', '303 /verify', '503', '503']);
    assert.equal(env.mails.length, 3);
  });
});

describe("the admins' request mails", () => {
  test('at most REQUEST_MAILS_PER_DAY a day; every request is still recorded and listed', async () => {
    const env = makeEnv({ REQUEST_MAILS_PER_DAY: '2' });
    await makeUser(env, ADMIN);
    for (let i = 0; i < 4; i++) {
      const b = new Browser(env, `198.51.100.${i + 1}`);
      await b.post('/signup', { name: `Junk ${i}`, email: `junk${i}@example.com`, password: PASSWORD });
      assert.equal(where(await b.post('/verify', { code: lastCode(env, `junk${i}@example.com`) })), '303 /pending?n=verified');
    }
    assert.equal(mailsTo(env, ADMIN).length, 2, 'two mails, then silence');
    const pending = (await db.listUsers(env.DB, Date.now())).filter((u) => u.status === 'pending');
    assert.equal(pending.length, 4);
  });

  test('a mail failure never blocks a sign-up', async () => {
    const env = makeEnv();
    await makeUser(env, ADMIN);
    const b = new Browser(env);
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    const code = lastCode(env, 'n@example.com');
    env.EMAIL = {
      async send() {
        throw Object.assign(new Error('boom'), { code: 'E_SENDER' });
      },
    };
    assert.equal(where(await b.post('/verify', { code })), '303 /pending?n=verified');
  });
});
