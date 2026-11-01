// The account flows through the Worker: sign-up and its email code (expiry, tries, resend throttling, the browser
// binding), the ADMIN_EMAILS seed, sign-in and the pages each status leads to, password reset (every session ends)
// and password change (the other sessions end), and resistance to finding out which addresses have accounts.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../src/db.ts';
import { AUTH_TIMING } from '../src/auth.ts';
import { CODE_TRIES } from '../src/codes.ts';
import { ADMIN, Browser, PASSWORD, age, call, lastCode, mailsTo, makeEnv, makeUser, req, signUp, where } from './helpers.ts';
import type { TestEnv } from './helpers.ts';

const MIN = 60_000;

/** The parts of a response that a visitor can see, with the per-request random values taken out. */
async function visible(res: Response): Promise<string> {
  const body = (await res.text()).replace(/value="[^"]*@[^"]*"/g, 'value="<email>"').replace(/[\w.+-]+@[\w.-]+/g, '<email>');
  const cookies = res.headers
    .getSetCookie()
    .map((c) => c.replace(/=[^;]*/, '=<v>'))
    .sort()
    .join(' | ');
  return `${where(res)}\n${cookies}\n${body}`;
}

describe('sign-up and the email code', () => {
  test('a 6-digit code is mailed (in the subject, as on WonderClip); entering it creates a pending account and signs in', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    const r1 = await b.post('/signup', { name: 'Mina Park', email: 'Mina.Park@Example.com ', password: PASSWORD, note: 'SA team, Jakarta' });
    assert.equal(where(r1), '303 /verify');
    assert.ok(b.jar.has('__Host-ab_flow'), 'the flow cookie carries the address, never the URL');
    const [m] = mailsTo(env, 'mina.park@example.com');
    assert.match(m.subject, /^\[Architecture Builder\] Verification code \d{6}$/);
    assert.match(m.text, /Enter this 6-digit code on the sign-up page\. It is valid for 15 minutes\./);
    assert.match(m.text, /If you did not ask for this, you can ignore this email\./);
    assert.ok(m.html.includes(lastCode(env, 'mina.park@example.com')), 'the code is in the HTML body too');
    assert.equal(await db.userByEmail(env.DB, 'mina.park@example.com'), null, 'no account before the code');
    const page = await b.text('/verify');
    assert.match(page, /We sent a 6-digit code to <strong>mina\.park@example\.com<\/strong>\. It is valid for 15 minutes\./);

    const r2 = await b.post('/verify', { code: lastCode(env, 'mina.park@example.com') });
    assert.equal(where(r2), '303 /pending?n=verified');
    const u = await db.userByEmail(env.DB, 'mina.park@example.com');
    assert.deepEqual([u?.status, u?.role, u?.name, u?.note], ['pending', 'user', 'Mina Park', 'SA team, Jakarta']);
    assert.ok(!b.jar.has('__Host-ab_flow'), 'the flow cookie is cleared');
    assert.ok(b.jar.has('__Host-ab_session'));
    const pending = await b.text('/pending?n=verified');
    assert.match(pending, /Email confirmed\. The administrators have been notified\./);
    assert.match(pending, /Waiting for approval/);
    assert.equal(await db.recentAudit(env.DB).then((a) => a[0].what), 'sign-up');
  });

  test('the admins are emailed once the address is confirmed, never before', async () => {
    const env = makeEnv();
    await makeUser(env, ADMIN);
    const b = new Browser(env);
    await b.post('/signup', { name: 'Asker', email: 'asker@example.com', password: PASSWORD, note: 'Retail demo' });
    assert.equal(mailsTo(env, ADMIN).length, 0);
    await b.post('/verify', { code: lastCode(env, 'asker@example.com') });
    const [m] = mailsTo(env, ADMIN);
    assert.equal(m.subject, '[Architecture Builder] New access request · Asker (asker@example.com)');
    assert.match(m.text, /Retail demo/);
    assert.match(m.text, /https:\/\/architect\.alikorea-demo\.com\/admin/);
  });

  test('a wrong code counts a try; after 5 even the right code fails; a new code works', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    const right = lastCode(env, 'n@example.com');
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < CODE_TRIES; i++) {
      const r = await b.post('/verify', { code: wrong });
      assert.equal(r.status, 400);
      assert.match(await r.text(), /That code is wrong or has expired\./);
    }
    assert.equal((await b.post('/verify', { code: right })).status, 400, 'used up');
    assert.equal(await db.userByEmail(env.DB, 'n@example.com'), null);
    await age(env, MIN + 1000); // the resend gap
    assert.equal(where(await b.post('/verify/resend')), '303 /verify?n=resent');
    const fresh = lastCode(env, 'n@example.com');
    assert.equal(where(await b.post('/verify', { code: fresh })), '303 /pending?n=verified');
  });

  test('a code expires after 15 minutes', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    const code = lastCode(env, 'n@example.com');
    await age(env, 15 * MIN + 1000);
    assert.equal((await b.post('/verify', { code })).status, 400);
    assert.equal(await db.userByEmail(env.DB, 'n@example.com'), null);
  });

  test('a code is single use', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    const code = lastCode(env, 'n@example.com');
    const twin = new Browser(env);
    twin.jar = new Map(b.jar); // the same flow cookie, as a second tab would have
    assert.equal(where(await b.post('/verify', { code })), '303 /pending?n=verified');
    assert.equal((await twin.post('/verify', { code })).status, 400, 'the code is gone');
    assert.equal((await db.recentAudit(env.DB)).filter((a) => a.what === 'sign-up').length, 1);
  });

  test('resend: one mail a minute; one IP gets at most 3 an hour for an address; the page says how long to wait', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    const r = await b.post('/verify/resend');
    assert.equal(where(r), '303 /verify?n=wait&m=1');
    assert.equal(mailsTo(env, 'n@example.com').length, 1, 'no second mail within the minute');
    assert.match(await b.text('/verify?n=wait&m=1'), /You can ask for another in 1 min\./);
    for (let i = 0; i < 2; i++) {
      await age(env, MIN + 1000);
      assert.equal(where(await b.post('/verify/resend')), '303 /verify?n=resent');
    }
    assert.equal(mailsTo(env, 'n@example.com').length, 3);
    await age(env, MIN + 1000);
    const fourth = await b.post('/verify/resend');
    assert.match(where(fourth), /^303 \/verify\?n=wait&m=\d+$/);
    assert.ok(Number(new URL(fourth.headers.get('Location')!, 'https://x.invalid').searchParams.get('m')) > 1, 'the hourly cap says how long');
    assert.equal(mailsTo(env, 'n@example.com').length, 3);
  });

  test('a ?m= from a crafted link can only ever show a whole number of minutes', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD });
    const page = await b.text('/verify?n=wait&m=%3Cscript%3E');
    assert.match(page, /in 1 min/);
    assert.doesNotMatch(page, /<script>/);
  });

  test('the code works only in the browser that signed up (a code alone is not enough)', async () => {
    const env = makeEnv();
    const owner = new Browser(env, '198.51.100.10');
    await owner.post('/signup', { name: 'Owner', email: 'o@example.com', password: PASSWORD });
    const code = lastCode(env, 'o@example.com');
    const other = new Browser(env, '198.51.100.11');
    assert.equal(where(await other.post('/verify', { code })), '303 /signup?n=again', 'no flow cookie: start again');
    // even with its own flow for the same address, another browser's cookie does not match the code
    await age(env, MIN + 1000);
    await other.post('/signup', { name: 'Attacker', email: 'o@example.com', password: 'orange tiger lamp 42' });
    assert.equal((await owner.post('/verify', { code: lastCode(env, 'o@example.com') })).status, 400, "the owner's browser cannot use a code issued to another flow");
  });

  test('someone else signing up with your address cannot attach their password to your code (no pre-verification takeover)', async () => {
    const env = makeEnv();
    const victim = new Browser(env, '198.51.100.20');
    await victim.post('/signup', { name: 'Victim', email: 'v@example.com', password: 'blue falcon garden 7' });
    const victimCode = lastCode(env, 'v@example.com');
    // another browser on the same IP, inside the mail gap, changes nothing at all
    const sameIp = new Browser(env, '198.51.100.20');
    assert.equal(where(await sameIp.post('/signup', { name: 'Attacker', email: 'v@example.com', password: 'orange tiger lamp 42' })), '303 /verify?n=wait&m=1');
    // one elsewhere gets a sign-up and a code of its own, which the victim's browser cannot use and which does not replace the victim's
    const attacker = new Browser(env, '203.0.113.66');
    assert.equal(where(await attacker.post('/signup', { name: 'Attacker', email: 'v@example.com', password: 'orange tiger lamp 42' })), '303 /verify');
    const attackerCode = lastCode(env, 'v@example.com');
    assert.notEqual(attackerCode, victimCode);
    assert.equal((await victim.post('/verify', { code: attackerCode })).status, 400, "the attacker's code does not open the victim's sign-up");
    assert.equal(where(await victim.post('/verify', { code: victimCode })), '303 /pending?n=verified', "the victim's code still works");
    const victimLogin = await new Browser(env).post('/login', { email: 'v@example.com', password: 'blue falcon garden 7' });
    assert.equal(where(victimLogin), '303 /pending');
    const attackerLogin = await new Browser(env).post('/login', { email: 'v@example.com', password: 'orange tiger lamp 42' });
    assert.equal(attackerLogin.status, 401);
    assert.equal((await attacker.post('/verify', { code: attackerCode })).status, 400, "the attacker's own code no longer opens anything: the account exists and is the victim's");
    assert.equal((await db.userByEmail(env.DB, 'v@example.com'))?.name, 'Victim');
  });

  test("after the gap, another browser's sign-up adds its own; the victim's resend and code still open the victim's account", async () => {
    const env = makeEnv();
    const victim = new Browser(env, '198.51.100.20');
    await victim.post('/signup', { name: 'Victim', email: 'v@example.com', password: 'blue falcon garden 7' });
    await age(env, MIN + 1000);
    const attacker = new Browser(env, '203.0.113.66');
    await attacker.post('/signup', { name: 'Attacker', email: 'v@example.com', password: 'orange tiger lamp 42' });
    const attackerCode = lastCode(env, 'v@example.com');
    const mailsBefore = mailsTo(env, 'v@example.com').length;
    await age(env, MIN + 1000);
    // the victim presses "send a new code": the waiting sign-up in this browser is the victim's own
    await victim.post('/verify/resend');
    assert.equal(mailsTo(env, 'v@example.com').length, mailsBefore + 1);
    assert.equal((await victim.post('/verify', { code: attackerCode })).status, 400, "the attacker's code does not work in the victim's browser");
    assert.equal(where(await victim.post('/verify', { code: lastCode(env, 'v@example.com') })), '303 /pending?n=verified');
    assert.equal(where(await new Browser(env).post('/login', { email: 'v@example.com', password: 'blue falcon garden 7' })), '303 /pending');
    assert.equal((await new Browser(env).post('/login', { email: 'v@example.com', password: 'orange tiger lamp 42' })).status, 401);
    assert.equal((await attacker.post('/verify', { code: attackerCode })).status, 400, "the attacker's own code no longer opens anything: the account exists and is the victim's");
    assert.equal((await db.userByEmail(env.DB, 'v@example.com'))?.name, 'Victim');
  });

  test('the same browser may correct its details within the gap and keep its code', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    await b.post('/signup', { name: 'Typo', email: 'n@example.com', password: 'first password!' });
    const code = lastCode(env, 'n@example.com');
    await b.post('/signup', { name: 'Right Name', email: 'n@example.com', password: 'second password!' });
    assert.equal(mailsTo(env, 'n@example.com').length, 1);
    assert.equal(where(await b.post('/verify', { code })), '303 /pending?n=verified');
    assert.equal((await db.userByEmail(env.DB, 'n@example.com'))?.name, 'Right Name');
    assert.equal(where(await new Browser(env).post('/login', { email: 'n@example.com', password: 'second password!' })), '303 /pending');
  });

  test('form checks: name, address and password rules, with the values kept (never the password)', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    const r = await b.post('/signup', { name: '', email: 'not-an-address', password: 'short', note: 'hello' });
    assert.equal(r.status, 400);
    const page = await r.text();
    assert.match(page, /Enter your name\./);
    assert.match(page, /Enter a valid email address\./);
    assert.match(page, /Use at least 10 characters\./);
    assert.match(page, /value="not-an-address"/);
    assert.doesNotMatch(page, /value="short"/);
    assert.equal(env.mails.length, 0);
    const same = await b.post('/signup', { name: 'N', email: 'n@example.com', password: 'N@Example.com' });
    assert.match(await same.text(), /Do not use your email address as the password\./);
  });

  test('a note over 500 characters is cut, and a form over 16 KB is refused', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    await b.post('/signup', { name: 'N', email: 'n@example.com', password: PASSWORD, note: '가'.repeat(700) });
    await b.post('/verify', { code: lastCode(env, 'n@example.com') });
    assert.equal([...((await db.userByEmail(env.DB, 'n@example.com'))?.note ?? '')].length, 500);
    assert.equal((await new Browser(env).post('/signup', { name: 'N', email: 'm@example.com', password: PASSWORD, note: 'x'.repeat(20_000) })).status, 413);
  });

  test('the verify, reset and sign-up-again pages without a flow cookie start over', async () => {
    const env = makeEnv();
    const b = new Browser(env);
    assert.equal(where(await b.fetch('/verify')), '302 /signup?n=again');
    assert.equal(where(await b.fetch('/reset')), '302 /forgot?n=again');
    assert.match(await b.text('/signup?n=again'), /That sign-up has expired/);
    assert.match(await b.text('/forgot?n=again'), /That reset has expired/);
  });
});

describe('ADMIN_EMAILS', () => {
  test('the admin address becomes an approved admin once it confirms its email, and lands in the builder', async () => {
    const env = makeEnv();
    const { browser, res } = await signUp(env, ADMIN, { name: 'Doyoon Sung' });
    assert.equal(where(res), '303 /');
    const u = await db.userByEmail(env.DB, ADMIN);
    assert.deepEqual([u?.status, u?.role, u?.decided_by], ['approved', 'admin', 'ADMIN_EMAILS']);
    assert.equal((await browser.fetch('/admin')).status, 200);
    assert.equal(env.mails.filter((m) => /New access request/.test(m.subject)).length, 0, 'nobody is asked to approve the seed');
    assert.equal((await db.recentAudit(env.DB))[0].what, 'seed-admin');
  });

  test('applies at sign-in to a listed address still pending, never over a decline or removal', async () => {
    const env = makeEnv({ ADMIN_EMAILS: `${ADMIN}, later@example.com, gone@example.com` });
    await makeUser(env, 'later@example.com');
    const r = await new Browser(env).post('/login', { email: 'later@example.com', password: PASSWORD });
    assert.equal(where(r), '303 /');
    assert.deepEqual(await db.userByEmail(env.DB, 'later@example.com').then((u) => [u?.status, u?.role]), ['approved', 'admin']);
    await makeUser(env, 'gone@example.com', { status: 'revoked' });
    assert.equal(where(await new Browser(env).post('/login', { email: 'gone@example.com', password: PASSWORD })), '303 /pending');
    assert.deepEqual(await db.userByEmail(env.DB, 'gone@example.com').then((u) => [u?.status, u?.role]), ['revoked', 'user']);
  });
});

describe('sign-in', () => {
  test('approved: to the page asked for; pending, declined and removed: to /pending, which says which', async () => {
    const env = makeEnv();
    await makeUser(env, 'ok@example.com', { status: 'approved' });
    await makeUser(env, 'wait@example.com');
    await makeUser(env, 'no@example.com', { status: 'denied' });
    await makeUser(env, 'gone@example.com', { status: 'revoked' });
    assert.equal(where(await new Browser(env).post('/login', { email: 'ok@example.com', password: PASSWORD, next: '/admin?x=1' })), '303 /admin?x=1');
    const cases: Array<[string, RegExp]> = [
      ['wait@example.com', /Waiting for approval/],
      ['no@example.com', /An administrator declined this request/],
      ['gone@example.com', /An administrator removed this account&#39;s access/],
    ];
    for (const [email, text] of cases) {
      const b = new Browser(env);
      assert.equal(where(await b.post('/login', { email, password: PASSWORD })), '303 /pending', email);
      assert.match(await b.text('/pending'), text, email);
      assert.equal((await b.fetch('/')).headers.get('Location'), '/pending');
      assert.equal((await b.fetch('/api/me')).status, 403);
    }
  });

  test('the address is matched without case or surrounding spaces; next is kept only on this site', async () => {
    const env = makeEnv();
    await makeUser(env, 'ok@example.com', { status: 'approved' });
    assert.equal(where(await new Browser(env).post('/login', { email: '  OK@Example.COM ', password: PASSWORD, next: '//evil.example/x' })), '303 /');
    assert.equal(where(await new Browser(env).post('/login', { email: 'ok@example.com', password: PASSWORD, next: 'https://evil.example' })), '303 /');
  });

  test('signing in ends the session the browser had before', async () => {
    const env = makeEnv();
    await makeUser(env, 'ok@example.com', { status: 'approved' });
    const b = new Browser(env);
    await b.post('/login', { email: 'ok@example.com', password: PASSWORD });
    const old = b.cookie;
    await b.post('/login', { email: 'ok@example.com', password: PASSWORD });
    assert.equal((await call(env, req('/api/me', { cookie: old }))).status, 401);
    assert.equal((await b.fetch('/api/me')).status, 200);
  });

  test('a wrong password and an unknown address get the same answer', async () => {
    const env = makeEnv();
    await makeUser(env, 'known@example.com', { status: 'approved' });
    const known = await new Browser(env, '198.51.100.30').post('/login', { email: 'known@example.com', password: 'wrong password!' });
    const unknown = await new Browser(env, '198.51.100.31').post('/login', { email: 'nobody@example.com', password: 'wrong password!' });
    assert.equal(known.status, 401);
    assert.equal(await visible(known), await visible(unknown));
    assert.match(await (await new Browser(env).post('/login', { email: 'known@example.com', password: 'x' })).text(), /The email address or password is not right\./);
  });

  test('a re-hash happens on sign-in when the stored version is older', async () => {
    const env = makeEnv();
    const u = await makeUser(env, 'old@example.com', { status: 'approved' });
    const { PASSWORD_SCHEMES } = await import('../src/password.ts');
    (PASSWORD_SCHEMES as Record<number, unknown>)[0] = { hash: 'SHA-256', iterations: 1000, saltBytes: 16, keyBits: 256 };
    try {
      const { b64url, utf8 } = await import('../src/crypto.ts');
      const salt = new Uint8Array(16).fill(3);
      const key = await crypto.subtle.importKey('raw', utf8(PASSWORD), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 1000 }, key, 256);
      await env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_version = 0 WHERE id = ?').bind(b64url(bits), b64url(salt), u.id).run();
      assert.equal(where(await new Browser(env).post('/login', { email: 'old@example.com', password: PASSWORD })), '303 /');
      assert.equal((await db.credentialsById(env.DB, u.id))?.pw_version, 1);
      assert.equal(where(await new Browser(env).post('/login', { email: 'old@example.com', password: PASSWORD })), '303 /', 'the new hash works');
    } finally {
      delete (PASSWORD_SCHEMES as Record<number, unknown>)[0];
    }
  });
});

describe('who has an account stays private', () => {
  test('sign-up with a registered address looks exactly like a new one; the owner gets a "you already have an account" mail', async () => {
    const env = makeEnv();
    await makeUser(env, 'taken@example.com', { status: 'approved' });
    const a = new Browser(env, '198.51.100.40');
    const b = new Browser(env, '198.51.100.41');
    const ra = await a.post('/signup', { name: 'X', email: 'taken@example.com', password: PASSWORD });
    const rb = await b.post('/signup', { name: 'X', email: 'fresh@example.com', password: PASSWORD });
    assert.equal(await visible(ra), await visible(rb));
    assert.equal(await visible(await a.fetch('/verify')), await visible(await b.fetch('/verify')));
    // any code entered for the registered address fails exactly like a wrong code for the new one
    assert.equal(await visible(await a.post('/verify', { code: '123456' })), await visible(await b.post('/verify', { code: lastCode(env, 'fresh@example.com') === '123456' ? '654321' : '123456' })));
    const owner = mailsTo(env, 'taken@example.com');
    assert.equal(owner.length, 1);
    assert.equal(owner[0].subject, '[Architecture Builder] You already have an account');
    assert.match(owner[0].text, /https:\/\/architect\.alikorea-demo\.com\/forgot/);
    assert.doesNotMatch(owner[0].subject, /\d{6}/, 'no code');
    assert.equal((await db.userByEmail(env.DB, 'taken@example.com'))?.status, 'approved', 'the account is untouched');
  });

  test('the resend button and its throttle behave the same for both', async () => {
    const env = makeEnv();
    await makeUser(env, 'taken@example.com');
    const a = new Browser(env, '198.51.100.40');
    const b = new Browser(env, '198.51.100.41');
    await a.post('/signup', { name: 'X', email: 'taken@example.com', password: PASSWORD });
    await b.post('/signup', { name: 'X', email: 'fresh@example.com', password: PASSWORD });
    assert.equal(await visible(await a.post('/verify/resend')), await visible(await b.post('/verify/resend')), 'within the gap');
    await age(env, MIN + 1000);
    assert.equal(await visible(await a.post('/verify/resend')), await visible(await b.post('/verify/resend')), 'after the gap');
  });

  test('"forgot password" answers the same for an unknown address, and mails nothing', async () => {
    const env = makeEnv();
    await makeUser(env, 'known@example.com', { status: 'approved' });
    const a = new Browser(env, '198.51.100.50');
    const b = new Browser(env, '198.51.100.51');
    const ra = await a.post('/forgot', { email: 'known@example.com' });
    const rb = await b.post('/forgot', { email: 'nobody@example.com' });
    assert.equal(where(ra), '303 /reset');
    assert.equal(await visible(ra), await visible(rb));
    assert.equal(await visible(await a.fetch('/reset')), await visible(await b.fetch('/reset')));
    assert.match(await (await a.fetch('/reset')).text(), /If an account uses <strong>known@example\.com<\/strong>, we sent a 6-digit code to it\./);
    assert.equal(mailsTo(env, 'known@example.com').length, 1);
    assert.equal(mailsTo(env, 'nobody@example.com').length, 0);
    assert.equal(await visible(await a.post('/reset', { code: '123456', password: 'new password!!' })), await visible(await b.post('/reset', { code: '123456', password: 'new password!!' })));
  });

  test('the answers wait out the same floor whether or not the address is registered', async () => {
    const env = makeEnv();
    await makeUser(env, 'known@example.com', { status: 'approved' });
    AUTH_TIMING.padMs = 120;
    try {
      const time = async (f: () => Promise<unknown>): Promise<number> => {
        const t0 = performance.now();
        await f();
        return performance.now() - t0;
      };
      for (const [path, form] of [
        ['/forgot', (e: string) => ({ email: e })],
        ['/signup', (e: string) => ({ name: 'X', email: e, password: PASSWORD })],
        ['/login', (e: string) => ({ email: e, password: 'wrong password!' })],
      ] as const) {
        const known = await time(() => new Browser(env, '198.51.100.60').post(path, form('known@example.com')));
        const unknown = await time(() => new Browser(env, '198.51.100.61').post(path, form(`nobody-${path.slice(1)}@example.com`)));
        assert.ok(known >= 115 && unknown >= 115, `${path}: ${known.toFixed(0)} / ${unknown.toFixed(0)} ms`);
        assert.ok(Math.abs(known - unknown) < 80, `${path}: ${known.toFixed(0)} vs ${unknown.toFixed(0)} ms`);
      }
    } finally {
      AUTH_TIMING.padMs = 0;
    }
  });
});

describe('password reset', () => {
  test('a reset by email code sets the new password, ends every session and mails the owner', async () => {
    const env = makeEnv();
    await makeUser(env, 'r@example.com', { status: 'approved' });
    const laptop = new Browser(env, '198.51.100.70');
    const phone = new Browser(env, '198.51.100.71');
    await laptop.post('/login', { email: 'r@example.com', password: PASSWORD });
    await phone.post('/login', { email: 'r@example.com', password: PASSWORD });
    assert.equal((await laptop.fetch('/api/me')).status, 200);

    const b = new Browser(env, '198.51.100.72');
    await b.post('/forgot', { email: 'r@example.com' });
    const m = mailsTo(env, 'r@example.com').at(-1)!;
    assert.match(m.subject, /^\[Architecture Builder\] Password reset code \d{6}$/);
    const r = await b.post('/reset', { code: lastCode(env, 'r@example.com'), password: 'a brand new password' });
    assert.equal(where(r), '303 /login?n=reset');
    assert.match(await b.text('/login?n=reset'), /Your password is changed, and every session was signed out\./);

    assert.equal((await laptop.fetch('/api/me')).status, 401, 'the laptop is signed out');
    assert.equal((await phone.fetch('/api/me')).status, 401, 'and the phone');
    assert.equal((await new Browser(env).post('/login', { email: 'r@example.com', password: PASSWORD })).status, 401, 'the old password is gone');
    assert.equal(where(await new Browser(env).post('/login', { email: 'r@example.com', password: 'a brand new password' })), '303 /');
    assert.equal(mailsTo(env, 'r@example.com').at(-1)?.subject, '[Architecture Builder] Your password was changed');
    assert.equal((await db.recentAudit(env.DB))[0].what, 'password-reset');
  });

  test('a bad new password is refused without spending a code try', async () => {
    const env = makeEnv();
    await makeUser(env, 'r@example.com', { status: 'approved' });
    const b = new Browser(env);
    await b.post('/forgot', { email: 'r@example.com' });
    const r = await b.post('/reset', { code: lastCode(env, 'r@example.com'), password: 'short' });
    assert.equal(r.status, 400);
    assert.match(await r.text(), /Use at least 10 characters\./);
    assert.equal((await env.DB.prepare(`SELECT tries FROM codes WHERE email = 'r@example.com'`).first<{ tries: number }>())?.tries, 0);
  });

  test('a reset ends the sign-in lock on this address and IP, and the flood counter, and marks this browser as known', async () => {
    const env = makeEnv();
    await makeUser(env, 'r@example.com', { status: 'approved' });
    const home = '203.0.113.3';
    for (let i = 0; i < 6; i++) await new Browser(env, home).post('/login', { email: 'r@example.com', password: 'guess guess guess' });
    assert.equal((await new Browser(env, home).post('/login', { email: 'r@example.com', password: PASSWORD })).status, 429, 'locked on this IP');
    const b = new Browser(env, home);
    await b.post('/forgot', { email: 'r@example.com' });
    await b.post('/reset', { code: lastCode(env, 'r@example.com'), password: 'a brand new password' });
    assert.ok(b.jar.has('__Host-ab_device'), 'the code proved the inbox');
    assert.equal(where(await new Browser(env, home).post('/login', { email: 'r@example.com', password: 'a brand new password' })), '303 /');
  });
});

describe('change password (signed in)', () => {
  async function signedIn(env: TestEnv, email: string): Promise<Browser> {
    await makeUser(env, email, { status: 'approved' });
    const b = new Browser(env);
    await b.post('/login', { email, password: PASSWORD });
    return b;
  }

  test('needs the current password; ends the other sessions, keeps this one, and mails the owner', async () => {
    const env = makeEnv();
    const here = await signedIn(env, 'c@example.com');
    const there = new Browser(env, '198.51.100.80');
    await there.post('/login', { email: 'c@example.com', password: PASSWORD });
    const bad = await here.post('/account/password', { current: 'not my password', password: 'another good password' });
    assert.equal(bad.status, 400);
    assert.match(await bad.text(), /The current password is not right\./);
    const ok = await here.post('/account/password', { current: PASSWORD, password: 'another good password' });
    assert.equal(where(ok), '303 /account?n=changed');
    assert.equal((await here.fetch('/api/me')).status, 200, 'this session stays');
    assert.equal((await there.fetch('/api/me')).status, 401, 'the other one ends');
    assert.match(await here.text('/account?n=changed'), /Password changed\. Your other sessions were signed out\./);
    assert.equal(mailsTo(env, 'c@example.com').at(-1)?.subject, '[Architecture Builder] Your password was changed');
    assert.equal(where(await new Browser(env).post('/login', { email: 'c@example.com', password: 'another good password' })), '303 /');
  });

  test('the same password, a short one, or the address are refused', async () => {
    const env = makeEnv();
    const b = await signedIn(env, 'c@example.com');
    assert.match(await (await b.post('/account/password', { current: PASSWORD, password: PASSWORD })).text(), /different from the current one/);
    assert.match(await (await b.post('/account/password', { current: PASSWORD, password: 'short' })).text(), /at least 10 characters/);
    assert.match(await (await b.post('/account/password', { current: PASSWORD, password: 'c@example.com' })).text(), /Do not use your email address/);
  });

  test('the new password typed into both boxes reports a wrong current password, not "the same"', async () => {
    const env = makeEnv();
    const b = await signedIn(env, 'c@example.com');
    const page = await (await b.post('/account/password', { current: 'another good password', password: 'another good password' })).text();
    assert.doesNotMatch(page, /different from the current one/);
    assert.match(page, /aria-invalid="true"/);
    assert.equal(where(await new Browser(env).post('/login', { email: 'c@example.com', password: PASSWORD })), '303 /', 'the password is unchanged');
  });

  test('wrong current passwords lock the form after 5', async () => {
    const env = makeEnv();
    const b = await signedIn(env, 'c@example.com');
    for (let i = 0; i < 5; i++) assert.equal((await b.post('/account/password', { current: `wrong ${i} password`, password: 'another good password' })).status, 400);
    const r = await b.post('/account/password', { current: 'wrong again password', password: 'another good password' });
    assert.equal(r.status, 429);
    assert.equal((await b.post('/account/password', { current: PASSWORD, password: 'another good password' })).status, 429, 'even the right one, until the lock ends');
  });

  test('the account page needs a session; pending users can reach it', async () => {
    const env = makeEnv();
    assert.equal(where(await new Browser(env).fetch('/account')), '302 /login?next=%2Faccount');
    await makeUser(env, 'p@example.com');
    const b = new Browser(env);
    await b.post('/login', { email: 'p@example.com', password: PASSWORD });
    const page = await b.text('/account');
    assert.match(page, /Change password/);
    assert.match(page, /Waiting for approval/);
  });
});

describe('shared demo accounts (SHARED_ACCOUNTS)', () => {
  const SHARED = 'shared@demo.com';

  test('signs in, but its password cannot be changed and the account page says why', async () => {
    const env = makeEnv({ SHARED_ACCOUNTS: SHARED });
    await makeUser(env, SHARED, { status: 'approved' });
    const a = new Browser(env, '198.51.100.90');
    const b = new Browser(env, '198.51.100.91');
    assert.equal(where(await a.post('/login', { email: SHARED, password: PASSWORD })), '303 /');
    assert.equal(where(await b.post('/login', { email: SHARED, password: PASSWORD })), '303 /');
    const page = await a.text('/account');
    assert.match(page, /shared demo account/);
    assert.doesNotMatch(page, /action="\/account\/password"/);
    const r = await a.post('/account/password', { current: PASSWORD, password: 'another good password' });
    assert.equal(r.status, 403);
    assert.equal((await b.fetch('/api/me')).status, 200, 'the other user of the account stays signed in');
    assert.equal(where(await new Browser(env, '198.51.100.92').post('/login', { email: SHARED, password: PASSWORD })), '303 /', 'the password is unchanged');
  });

  test('is never mailed: a reset request sends nothing, so nobody can reset it', async () => {
    const env = makeEnv({ SHARED_ACCOUNTS: SHARED });
    await makeUser(env, SHARED, { status: 'approved' });
    const r = await new Browser(env, '198.51.100.93').post('/forgot', { email: SHARED });
    assert.ok(r.status === 303 || r.status === 200, `status ${r.status}`);
    assert.equal(mailsTo(env, SHARED).length, 0);
    await new Browser(env, '198.51.100.94').post('/signup', { name: 'X', email: SHARED, password: PASSWORD });
    assert.equal(mailsTo(env, SHARED).length, 0, 'no "already registered" mail either');
  });
});
