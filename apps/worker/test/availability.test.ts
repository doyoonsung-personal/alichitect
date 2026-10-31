// Availability: a stranger who knows an address (ADMIN_EMAILS is public) must not be able to lock its owner out of
// sign-in, out of the emailed codes, or out of the mail budget, and the all-addresses mail cap must not fail silently.
// Each test here was first written against the Google-free account build and failed there (the review's t2, t3, t9,
// t10, t13, t15), then passed after the fixes in src/auth.ts, src/codes.ts and src/throttle.ts.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as db from '../src/db.ts';
import { AUTH_TIMING, normEmail } from '../src/auth.ts';
import { ADMIN, Browser, PASSWORD, age, lastCode, mailsTo, makeEnv, makeUser, signUp, where } from './helpers.ts';
import type { TestEnv } from './helpers.ts';

const MIN = 60_000;
const OWNER = 'owner@example.com';

describe('sign-in cannot be locked by strangers', () => {
  test('wrong passwords from other addresses do not stop the owner from another address', async () => {
    const env = makeEnv();
    await makeUser(env, OWNER, { status: 'approved' });
    for (let i = 0; i < 7; i++) assert.equal((await new Browser(env, `203.0.113.${i + 1}`).post('/login', { email: OWNER, password: `wrong guess ${i}!` })).status, 401);
    assert.equal(where(await new Browser(env, '198.51.100.77').post('/login', { email: OWNER, password: PASSWORD })), '303 /');
  });

  test('blank attempts from many addresses count against nobody', async () => {
    const env = makeEnv();
    await makeUser(env, OWNER, { status: 'approved' });
    for (let i = 0; i < 20; i++) await new Browser(env, `203.0.113.${i + 1}`).post('/login', { email: OWNER, password: '' });
    assert.equal(where(await new Browser(env, '198.51.100.77').post('/login', { email: OWNER, password: PASSWORD })), '303 /');
    const row = env.DB.sqlite.prepare(`SELECT COUNT(*) AS n FROM lockouts WHERE locked_until > 0`).get() as { n: number };
    assert.equal(row.n, 0);
  });

  test('a browser that signed in before gets in even when another person on its address failed many times', async () => {
    const env = makeEnv();
    await makeUser(env, OWNER, { status: 'approved' });
    const mine = new Browser(env, '192.0.2.50');
    assert.equal(where(await mine.post('/login', { email: OWNER, password: PASSWORD })), '303 /');
    assert.ok(mine.jar.has('__Host-ab_device'), 'the device cookie is set at sign-in');
    await mine.post('/auth/logout');
    const stranger = new Browser(env, '192.0.2.50'); // the same address (a shared network)
    for (let i = 0; i < 12; i++) await stranger.post('/login', { email: OWNER, password: `wrong guess ${i}!` });
    assert.equal((await new Browser(env, '192.0.2.50').post('/login', { email: OWNER, password: PASSWORD })).status, 429, 'a browser with no device cookie is held back on that address');
    assert.equal(where(await mine.post('/login', { email: OWNER, password: PASSWORD })), '303 /', 'the known browser is not');
  });

  test('a flood of wrong guesses from everywhere stops new browsers, never the known one, and a reset by email ends it', async () => {
    const env = makeEnv();
    await makeUser(env, OWNER, { status: 'approved' });
    const mine = new Browser(env, '192.0.2.60');
    await mine.post('/login', { email: OWNER, password: PASSWORD });
    await mine.post('/auth/logout');
    for (let i = 0; i < 40; i++) await new Browser(env, `203.0.113.${i + 1}`).post('/login', { email: OWNER, password: `wrong guess ${i}!` });
    const fresh = new Browser(env, '198.51.100.90');
    const refused = await fresh.post('/login', { email: OWNER, password: PASSWORD });
    assert.equal(refused.status, 429);
    assert.match(await refused.text(), /reset your password/i, 'it says what to do');
    assert.equal(where(await mine.post('/login', { email: OWNER, password: PASSWORD })), '303 /', 'the known browser signs in');
    // the way back for a new browser: the emailed code
    await fresh.post('/forgot', { email: OWNER });
    assert.equal(where(await fresh.post('/reset', { code: lastCode(env, OWNER), password: 'a brand new password' })), '303 /login?n=reset');
    assert.equal(where(await fresh.post('/login', { email: OWNER, password: 'a brand new password' })), '303 /');
  });
});

describe('emailed codes cannot be locked by strangers', () => {
  test('guesses in an attacker\'s own reset flow leave the owner\'s emailed code working', async () => {
    const env = makeEnv();
    await makeUser(env, OWNER, { status: 'approved' });
    const attacker = new Browser(env, '203.0.113.9');
    await attacker.post('/forgot', { email: OWNER });
    for (let i = 0; i < 12; i++) await attacker.post('/reset', { code: '000000', password: 'attacker new password' });
    await age(env, MIN + 1000);
    const owner = new Browser(env, '198.51.100.5');
    await owner.post('/forgot', { email: OWNER });
    assert.equal(where(await owner.post('/reset', { code: lastCode(env, OWNER), password: 'a brand new password' })), '303 /login?n=reset');
  });

  test('guesses against the admin address cannot lock the real admin\'s sign-up code, and the attacker gets nothing', async () => {
    const env = makeEnv();
    const attacker = new Browser(env, '203.0.113.9');
    await attacker.post('/signup', { name: 'Evil', email: ADMIN, password: 'attacker password 123' });
    for (let i = 0; i < 12; i++) await attacker.post('/verify', { code: '000000' });
    await age(env, MIN + 1000);
    const { browser, res } = await signUp(env, ADMIN, { name: 'Doyoon Sung', browser: new Browser(env, '198.51.100.5') });
    assert.equal(where(res), '303 /');
    assert.equal(where(await new Browser(env).post('/login', { email: ADMIN, password: PASSWORD })), '303 /');
    assert.equal((await new Browser(env).post('/login', { email: ADMIN, password: 'attacker password 123' })).status, 401);
    assert.equal((await browser.fetch('/admin')).status, 200);
  });
});

describe('the mail budget cannot be burned by strangers', () => {
  test('someone else signing up with your address does not take your code or your minute', async () => {
    const env = makeEnv();
    const attacker = new Browser(env, '203.0.113.66');
    await attacker.post('/signup', { name: 'Attacker', email: 'v@example.com', password: 'orange tiger lamp 42' });
    const victim = new Browser(env, '198.51.100.20');
    assert.equal(where(await victim.post('/signup', { name: 'Victim', email: 'v@example.com', password: 'blue falcon garden 7' })), '303 /verify');
    assert.equal(mailsTo(env, 'v@example.com').length, 2, 'each browser gets its own code');
    assert.equal(where(await victim.post('/verify', { code: lastCode(env, 'v@example.com') })), '303 /pending?n=verified');
    assert.equal(where(await new Browser(env).post('/login', { email: 'v@example.com', password: 'blue falcon garden 7' })), '303 /pending');
    assert.equal((await new Browser(env).post('/login', { email: 'v@example.com', password: 'orange tiger lamp 42' })).status, 401);
    assert.equal(await env.DB.prepare(`SELECT COUNT(*) AS n FROM signups WHERE email = 'v@example.com'`).first<{ n: number }>().then((r) => r?.n), 0, 'the other sign-ups for the address are dropped');
  });

  test('a code mailed for a sign-up is not replaced by another browser\'s code', async () => {
    const env = makeEnv();
    const first = new Browser(env, '198.51.100.20');
    await first.post('/signup', { name: 'First', email: 'v@example.com', password: 'green lake window 55' });
    const firstCode = lastCode(env, 'v@example.com');
    await new Browser(env, '203.0.113.66').post('/signup', { name: 'Other', email: 'v@example.com', password: 'red maple stone 91' });
    assert.equal(where(await first.post('/verify', { code: firstCode })), '303 /pending?n=verified', 'the first browser\'s code still works');
  });

  test('a stranger on one address cannot use up the owner\'s reset mails', async () => {
    const env = makeEnv();
    await makeUser(env, OWNER, { status: 'approved' });
    const attacker = new Browser(env, '203.0.113.9');
    for (let i = 0; i < 5; i++) {
      await age(env, MIN + 1000);
      await attacker.post('/forgot', { email: OWNER });
    }
    const before = mailsTo(env, OWNER).length;
    assert.ok(before <= 3, `one address gets at most 3 an hour: ${before}`);
    await age(env, MIN + 1000);
    assert.equal(where(await new Browser(env, '198.51.100.5').post('/forgot', { email: OWNER })), '303 /reset');
    assert.equal(mailsTo(env, OWNER).length, before + 1, 'the owner gets a mail');
  });

  test('several addresses together can still fill an ordinary address, but the ADMIN_EMAILS address keeps room', async () => {
    const env = makeEnv();
    await makeUser(env, ADMIN);
    await makeUser(env, OWNER, { status: 'approved' });
    for (const target of [ADMIN, OWNER]) {
      for (let ip = 0; ip < 4; ip++) {
        const attacker = new Browser(env, `203.0.113.${ip + 1}`);
        for (let i = 0; i < 3; i++) {
          await age(env, MIN + 1000);
          await attacker.post('/forgot', { email: target });
        }
      }
    }
    assert.equal(mailsTo(env, OWNER).length, 8, 'an ordinary address: 8 an hour, whoever asks');
    const adminMails = mailsTo(env, ADMIN).length;
    assert.equal(adminMails, 12);
    await age(env, MIN + 1000);
    await new Browser(env, '198.51.100.5').post('/forgot', { email: ADMIN });
    assert.equal(mailsTo(env, ADMIN).length, adminMails + 1, 'the real admin still gets a code');
  });

  test('plus-tags and Gmail dots count as one address for the mail budget', async () => {
    const env = makeEnv();
    for (let ip = 0; ip < 4; ip++) {
      for (let i = 0; i < 3; i++) {
        await age(env, MIN + 1000);
        await new Browser(env, `203.0.113.${ip + 1}`).post('/signup', { name: 'N', email: `p.e.r.s.o.n+${ip}${i}@gmail.com`, password: PASSWORD });
      }
    }
    const sent = env.mails.filter((m) => /@gmail\.com$/.test(m.to)).length;
    assert.equal(sent, 8, 'one inbox, one budget');
  });
});

describe('the all-addresses mail cap is split and visible', () => {
  test('when the sign-up pool is spent the page says so, and resets and the admin address still work', async () => {
    const env = makeEnv({ CODE_MAILS_PER_DAY: '2' });
    await makeUser(env, 'known@example.com', { status: 'approved' });
    for (let i = 0; i < 2; i++) assert.equal(where(await new Browser(env, `198.51.100.${i + 1}`).post('/signup', { name: 'N', email: `m${i}@example.com`, password: PASSWORD })), '303 /verify');
    const late = await new Browser(env, '198.51.100.30').post('/signup', { name: 'Late', email: 'late@example.com', password: PASSWORD });
    assert.equal(late.status, 503);
    assert.match(await late.text(), /temporarily unavailable/i);
    assert.equal(mailsTo(env, 'late@example.com').length, 0);
    assert.equal(where(await new Browser(env, '198.51.100.31').post('/forgot', { email: 'known@example.com' })), '303 /reset');
    assert.match(mailsTo(env, 'known@example.com').at(-1)?.subject ?? '', /Password reset code \d{6}/);
    assert.equal(where(await new Browser(env, '198.51.100.32').post('/signup', { name: 'Admin', email: ADMIN, password: PASSWORD })), '303 /verify');
    assert.match(mailsTo(env, ADMIN).at(-1)?.subject ?? '', /Verification code \d{6}/);
  });

  test('when the reset pool is spent the page says so and sign-ups still work', async () => {
    const env = makeEnv({ RESET_MAILS_PER_DAY: '1' });
    await makeUser(env, 'a@example.com', { status: 'approved' });
    await makeUser(env, 'b@example.com', { status: 'approved' });
    assert.equal(where(await new Browser(env, '198.51.100.1').post('/forgot', { email: 'a@example.com' })), '303 /reset');
    const busy = await new Browser(env, '198.51.100.2').post('/forgot', { email: 'b@example.com' });
    assert.equal(busy.status, 503);
    assert.match(await busy.text(), /temporarily unavailable/i);
    assert.equal(where(await new Browser(env, '198.51.100.3').post('/signup', { name: 'N', email: 'new@example.com', password: PASSWORD })), '303 /verify');
  });

  test('the cap is the same for an address with an account and one without', async () => {
    const env = makeEnv({ RESET_MAILS_PER_DAY: '1' });
    await makeUser(env, 'a@example.com', { status: 'approved' });
    await new Browser(env, '198.51.100.1').post('/forgot', { email: 'nobody@example.com' });
    const busy = await new Browser(env, '198.51.100.2').post('/forgot', { email: 'a@example.com' });
    assert.equal(busy.status, 503, 'the pool counts attempts, not accounts');
    assert.equal((await db.userByEmail(env.DB, 'a@example.com'))?.status, 'approved');
  });
});

describe('known and unknown addresses cost the same database work', () => {
  /**
   * Records, in order, whether each statement prepared is a read (R) or a write (W), and the size of each batch of more
   * than one, while `f` runs: the database work an observer could time. (A write is a write whether INSERT, UPDATE or
   * DELETE, and a batch of one costs what a lone statement does.)
   */
  async function trace(env: TestEnv, f: () => Promise<unknown>): Promise<string[]> {
    const log: string[] = [];
    const prepare = env.DB.prepare;
    const batch = env.DB.batch;
    env.DB.prepare = (sql: string) => {
      log.push(/^\s*select\b/i.test(sql) ? 'R' : 'W');
      return prepare(sql);
    };
    env.DB.batch = async (s) => {
      if (s.length > 1) log.push(`batch(${s.length})`);
      return batch(s);
    };
    try {
      await f();
    } finally {
      env.DB.prepare = prepare;
      env.DB.batch = batch;
    }
    return log;
  }

  test('sign-up: a registered address and a new one run the same statements', async () => {
    const env = makeEnv();
    await makeUser(env, 'taken@example.com', { status: 'approved' });
    const known = await trace(env, () => new Browser(env, '198.51.100.1').post('/signup', { name: 'X', email: 'taken@example.com', password: PASSWORD }));
    const unknown = await trace(env, () => new Browser(env, '198.51.100.2').post('/signup', { name: 'X', email: 'fresh@example.com', password: PASSWORD }));
    assert.deepEqual(known, unknown);
    assert.ok(known.filter((v) => v === 'W').length >= 8, 'sign-up writes: rate counters, sign-up, code');
  });

  test('sign-up inside the mail gap: the same', async () => {
    const env = makeEnv();
    await makeUser(env, 'taken@example.com', { status: 'approved' });
    const a = new Browser(env, '198.51.100.1');
    const b = new Browser(env, '198.51.100.2');
    await a.post('/signup', { name: 'X', email: 'taken@example.com', password: PASSWORD });
    await b.post('/signup', { name: 'X', email: 'fresh@example.com', password: PASSWORD });
    const known = await trace(env, () => a.post('/signup', { name: 'X', email: 'taken@example.com', password: PASSWORD }));
    const unknown = await trace(env, () => b.post('/signup', { name: 'X', email: 'fresh@example.com', password: PASSWORD }));
    assert.deepEqual(known, unknown);
  });

  test('forgot password and both resend buttons: the same', async () => {
    const env = makeEnv();
    await makeUser(env, 'known@example.com', { status: 'approved' });
    await makeUser(env, 'taken@example.com', { status: 'approved' });
    const forgotKnown = await trace(env, () => new Browser(env, '198.51.100.1').post('/forgot', { email: 'known@example.com' }));
    const forgotUnknown = await trace(env, () => new Browser(env, '198.51.100.2').post('/forgot', { email: 'nobody@example.com' }));
    assert.deepEqual(forgotKnown, forgotUnknown);

    const rk = new Browser(env, '198.51.100.3');
    const ru = new Browser(env, '198.51.100.4');
    await rk.post('/forgot', { email: 'known@example.com' });
    await ru.post('/forgot', { email: 'nobody@example.com' });
    await age(env, MIN + 1000);
    assert.deepEqual(await trace(env, () => rk.post('/reset/resend')), await trace(env, () => ru.post('/reset/resend')));

    const vk = new Browser(env, '198.51.100.5');
    const vu = new Browser(env, '198.51.100.6');
    await vk.post('/signup', { name: 'X', email: 'taken@example.com', password: PASSWORD });
    await vu.post('/signup', { name: 'X', email: 'fresh@example.com', password: PASSWORD });
    await age(env, MIN + 1000);
    assert.deepEqual(await trace(env, () => vk.post('/verify/resend')), await trace(env, () => vu.post('/verify/resend')));
  });

  test('the floor has random jitter, so the time of an answer varies by a little', async () => {
    const env = makeEnv();
    AUTH_TIMING.padMs = 30;
    AUTH_TIMING.jitterMs = 60;
    try {
      const times: number[] = [];
      for (let i = 0; i < 12; i++) {
        const t0 = performance.now();
        await new Browser(env, `198.51.100.${i + 1}`).post('/forgot', { email: `nobody${i}@example.com` });
        times.push(performance.now() - t0);
      }
      assert.ok(Math.min(...times) >= 28, `never faster than the floor: ${Math.min(...times).toFixed(0)}`);
      assert.ok(Math.max(...times) - Math.min(...times) > 8, `varies: ${(Math.max(...times) - Math.min(...times)).toFixed(0)} ms of spread`);
      assert.ok(Math.max(...times) < 30 + 60 + 80, `bounded: ${Math.max(...times).toFixed(0)}`);
    } finally {
      AUTH_TIMING.padMs = 0;
      AUTH_TIMING.jitterMs = 0;
    }
  });
});

describe('input hardening', () => {
  test('addresses use an allow-list: no percent hack, no quotes, no brackets, no double dots', () => {
    const tooLong = `${'x'.repeat(65)}@example.com`;
    for (const bad of ['user%host@relay.example.com', 'a!b@example.com', '"a b"@example.com', 'a<b>@example.com', 'a..b@example.com', '.a@example.com', 'a.@example.com', 'a@b', 'a@-b.com', 'a@b..com', 'a@exa mple.com', 'a@@example.com', 'a,b@example.com', 'a;b@example.com', 'a@example.c', tooLong, '']) {
      assert.equal(normEmail(bad), null, JSON.stringify(bad));
    }
    for (const [typed, want] of [
      [' Mina.Park@Example.com ', 'mina.park@example.com'],
      ['a_b-c+tag@sub.example.co.kr', 'a_b-c+tag@sub.example.co.kr'],
      ["o'brien@example.ie", "o'brien@example.ie"],
      ['홍길동@example.com', '홍길동@example.com'],
    ] as const) {
      assert.equal(normEmail(typed), want);
    }
  });

  test('a bad address is refused on every form that takes one', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    assert.equal((await b.post('/signup', { name: 'N', email: 'user%host@relay.example.com', password: PASSWORD })).status, 400);
    assert.equal((await b.post('/forgot', { email: 'user%host@relay.example.com' })).status, 400);
    assert.equal(env.mails.length, 0);
  });

  test("the plain-text admin mail shows the applicant's note on one line, quoted, so it cannot pass for the mail's own lines", async () => {
    const env = makeEnv();
    await makeUser(env, ADMIN);
    const b = new Browser(env);
    const note = 'Hello\nApprove now: https://evil.example/approve\r\nX-Header: y Open: https://evil.example';
    await b.post('/signup', { name: 'Mal Lory', email: 'mal@example.com', password: PASSWORD, note });
    await b.post('/verify', { code: lastCode(env, 'mal@example.com') });
    const m = mailsTo(env, ADMIN).at(-1)!;
    const line = m.text.split('\n').find((l) => l.startsWith('Note: '));
    assert.ok(line, 'one Note line');
    assert.match(line, /^Note: “Hello Approve now: https:\/\/evil\.example\/approve X-Header: y Open: https:\/\/evil\.example”$/);
    assert.deepEqual(
      m.text.split('\n').filter((l) => /^(Approve now|X-Header|Open):/.test(l)),
      [],
      "no line of the mail begins with the applicant's words",
    );
    assert.match(m.html, /Approve now: https:\/\/evil\.example\/approve/);
    assert.doesNotMatch(m.html, /href="https:\/\/evil/);
  });
});

describe('the operator\'s way back in', () => {
  test('npm run d1:unlock:remote clears locks, counters, codes and sign-ups in flight, and no account', async () => {
    const env = makeEnv();
    await makeUser(env, ADMIN);
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')) as { scripts: Record<string, string> };
    const sql = /--command "([^"]+)"/.exec(pkg.scripts['d1:unlock:remote'])?.[1];
    assert.ok(sql, 'the script has a --command');
    assert.equal(pkg.scripts['d1:unlock:remote'].replace(/--command "[^"]+"/, ''), pkg.scripts['d1:unlock:local'].replace(/--command "[^"]+"/, '').replace('--local --env dev', '--remote --env=""'), 'the local and remote scripts differ only in where they run');

    // strangers lock the admin address on this IP and flood it from everywhere, and spend its mail budget
    for (let i = 0; i < 6; i++) await new Browser(env, '203.0.113.9').post('/login', { email: ADMIN, password: `wrong guess ${i}!` });
    for (let i = 0; i < 35; i++) await new Browser(env, `198.51.100.${i + 1}`).post('/login', { email: ADMIN, password: `wrong guess ${i}!` });
    for (let ip = 0; ip < 8; ip++) {
      await age(env, MIN + 1000);
      await new Browser(env, `192.0.2.${ip + 1}`).post('/forgot', { email: ADMIN });
    }
    const real = new Browser(env, '203.0.113.9');
    assert.equal((await real.post('/login', { email: ADMIN, password: PASSWORD })).status, 429, 'locked out');

    env.DB.sqlite.exec(sql);
    assert.equal(where(await new Browser(env, '203.0.113.9').post('/login', { email: ADMIN, password: PASSWORD })), '303 /', 'in again');
    assert.equal((await db.userByEmail(env.DB, ADMIN))?.role, 'admin', 'the account is untouched');
  });
});
