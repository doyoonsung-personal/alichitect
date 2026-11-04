// The route-gating matrix through the Worker's fetch handler (anonymous, pending, approved, admin), the security
// headers on every response, CSRF (Origin), the canonical origin, the open-redirect guard, and the production config.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mailLogAllowed } from '../src/env.ts';
import { API_KEY, ADMIN, ORIGIN, SECRET, call, makeEnv, req, signIn, where } from './helpers.ts';

type Who = 'anon' | 'pending' | 'approved' | 'admin';
const WHO: Who[] = ['anon', 'pending', 'approved', 'admin'];

async function world(): Promise<{ env: ReturnType<typeof makeEnv>; cookies: Record<Who, string | undefined> }> {
  const env = makeEnv();
  const admin = await signIn(env, ADMIN);
  const pending = await signIn(env, 'pending@example.com');
  const approved = await signIn(env, 'approved@example.com', { status: 'approved' });
  return { env, cookies: { anon: undefined, pending: pending.cookie, approved: approved.cookie, admin: admin.cookie } };
}

const all = (v: string): Record<Who, string> => ({ anon: v, pending: v, approved: v, admin: v });
const form = (c: string | undefined, path: string, body = ''): Request => req(path, { method: 'POST', cookie: c, type: 'application/x-www-form-urlencoded', body });

describe('route gating', async () => {
  const { env, cookies } = await world();

  // expected status (and Location for redirects) per route and per visitor
  const MATRIX: Array<{ name: string; make: (cookie?: string) => Request; expect: Record<Who, string> }> = [
    { name: 'GET /', make: (c) => req('/', { cookie: c }), expect: { anon: '302 /login', pending: '302 /pending', approved: '200', admin: '200' } },
    { name: 'GET /assets/app.js', make: (c) => req('/assets/app.js', { cookie: c }), expect: { anon: '302 /login?next=%2Fassets%2Fapp.js', pending: '302 /pending', approved: '200', admin: '200' } },
    { name: 'GET /login', make: (c) => req('/login', { cookie: c }), expect: { anon: '200', pending: '302 /pending', approved: '302 /', admin: '302 /' } },
    { name: 'GET /signup', make: (c) => req('/signup', { cookie: c }), expect: { anon: '200', pending: '302 /pending', approved: '302 /', admin: '302 /' } },
    { name: 'GET /verify (no flow cookie)', make: (c) => req('/verify', { cookie: c }), expect: all('302 /signup?n=again') },
    { name: 'GET /forgot', make: (c) => req('/forgot', { cookie: c }), expect: all('200') },
    { name: 'GET /reset (no flow cookie)', make: (c) => req('/reset', { cookie: c }), expect: all('302 /forgot?n=again') },
    { name: 'POST /verify/resend (no flow cookie)', make: (c) => form(c, '/verify/resend'), expect: all('303 /signup?n=again') },
    { name: 'GET /verify/resend', make: (c) => req('/verify/resend', { cookie: c }), expect: all('405') },
    { name: 'GET /pending', make: (c) => req('/pending', { cookie: c }), expect: { anon: '302 /login?next=%2Fpending', pending: '200', approved: '302 /', admin: '302 /' } },
    { name: 'GET /account', make: (c) => req('/account', { cookie: c }), expect: { anon: '302 /login?next=%2Faccount', pending: '200', approved: '200', admin: '200' } },
    { name: 'POST /account/password (empty)', make: (c) => form(c, '/account/password'), expect: { anon: '401', pending: '400', approved: '400', admin: '400' } },
    { name: 'GET /admin', make: (c) => req('/admin', { cookie: c }), expect: { anon: '302 /login?next=%2Fadmin', pending: '302 /pending', approved: '302 /', admin: '200' } },
    { name: 'GET /api/me', make: (c) => req('/api/me', { cookie: c }), expect: { anon: '401', pending: '403', approved: '200', admin: '200' } },
    { name: 'POST /api/turn', make: (c) => req('/api/turn', { method: 'POST', cookie: c, type: 'application/json', body: '{}' }), expect: { anon: '401', pending: '403', approved: '400', admin: '400' } },
    { name: 'GET /admin/api/users', make: (c) => req('/admin/api/users', { cookie: c }), expect: { anon: '401', pending: '403', approved: '403', admin: '200' } },
    { name: 'GET /api/health', make: (c) => req('/api/health', { cookie: c }), expect: all('200') },
    { name: 'GET /_auth/pages.css', make: (c) => req('/_auth/pages.css', { cookie: c }), expect: all('200') },
    { name: 'GET /brand/alibaba-cloud-logo-en.svg', make: (c) => req('/brand/alibaba-cloud-logo-en.svg', { cookie: c }), expect: all('200') },
    { name: 'GET /auth/logout', make: (c) => req('/auth/logout', { cookie: c }), expect: all('405') },
    { name: 'GET /auth/google (removed)', make: (c) => req('/auth/google', { cookie: c }), expect: { anon: '302 /login', pending: '302 /pending', approved: '404', admin: '404' } },
    { name: 'GET /_auth/google-g.svg (removed)', make: (c) => req('/_auth/google-g.svg', { cookie: c }), expect: all('404') },
  ];

  for (const row of MATRIX) {
    test(row.name, async () => {
      for (const who of WHO) {
        const res = await call(env, row.make(cookies[who]));
        assert.equal(where(res), row.expect[who], `${row.name} as ${who}`);
      }
    });
  }

  test('POST /api/turn rejections are fatal events the SPA shows (signed-out, not-approved)', async () => {
    const anon = await call(env, req('/api/turn', { method: 'POST', type: 'application/json', body: '{}' }));
    assert.deepEqual(Object.keys(await anon.json()).sort(), ['code', 'message', 'retryable', 'type']);
    const pending = (await (await call(env, req('/api/turn', { method: 'POST', cookie: cookies.pending, type: 'application/json', body: '{}' }))).json()) as { type: string; code: string };
    assert.equal(pending.type, 'fatal');
    assert.equal(pending.code, 'not-approved');
  });

  test('/api/me says who is signed in, the quota and the account links; never a password hash', async () => {
    const res = await call(env, req('/api/me', { cookie: cookies.approved }));
    const text = await res.text();
    const me = JSON.parse(text) as Record<string, unknown>;
    assert.deepEqual(Object.keys(me).sort(), ['createdAt', 'email', 'lang', 'links', 'name', 'role', 'status', 'turnsPerDay', 'turnsToday']);
    assert.equal(me.email, 'approved@example.com');
    assert.equal(me.turnsPerDay, 3);
    assert.deepEqual(me.links, { account: '/account', admin: null, signOut: '/auth/logout', keys: '/account/keys' });
    assert.doesNotMatch(text, /pw_|hash|salt/);
    const admin = (await (await call(env, req('/api/me', { cookie: cookies.admin }))).json()) as Record<string, unknown>;
    assert.equal(admin.turnsPerDay, null, 'admins are unlimited');
    assert.deepEqual(admin.links, { account: '/account', admin: '/admin', signOut: '/auth/logout', keys: '/account/keys' });
  });

  test('/api/health: the SPA shape and no secret for signed-in users', async () => {
    for (const who of ['approved', 'admin'] as const) {
      const res = await call(env, req('/api/health', { cookie: cookies[who] }));
      const text = await res.text();
      const h = JSON.parse(text) as { ok: boolean; keyConfigured: boolean; catalog: { version: string }; limits: { askChars: number } };
      assert.equal(h.ok, true);
      assert.equal(h.keyConfigured, true);
      assert.equal(typeof h.catalog.version, 'string');
      assert.equal(typeof h.limits.askChars, 'number');
      for (const secret of [API_KEY, SECRET]) assert.ok(!text.includes(secret));
    }
  });

  test('/api/health tells anonymous and pending callers only that the Worker is up', async () => {
    for (const who of ['anon', 'pending'] as const) {
      const res = await call(env, req('/api/health', { cookie: cookies[who] }));
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true }, who);
    }
  });

  test('a signed-in ?next= that normalises to //host never redirects off-site', async () => {
    for (const next of ['/..//evil.com', '/.//evil.com', '/%2e%2e//evil.com']) {
      const res = await call(env, req(`/login?next=${encodeURIComponent(next)}`, { cookie: cookies.approved }));
      assert.equal(res.headers.get('Location'), '/', next);
    }
  });

  test('every response carries the security headers; forms may post only to this origin', async () => {
    for (const r of [req('/'), req('/login'), req('/signup'), req('/forgot'), req('/api/health'), req('/_auth/pages.js'), req('/nope', { cookie: cookies.approved }), req('/api/turn', { method: 'POST', origin: 'https://evil.example.com' })]) {
      const res = await call(env, r);
      const csp = res.headers.get('Content-Security-Policy') ?? '';
      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /img-src 'self' data: blob:(;|$)/);
      assert.match(csp, /form-action 'self'(;|$)/);
      assert.doesNotMatch(csp, /google/);
      assert.doesNotMatch(csp, /'unsafe-inline'|'unsafe-eval'/);
      assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.equal(res.headers.get('Referrer-Policy'), 'same-origin');
      assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
      assert.match(res.headers.get('Strict-Transport-Security') ?? '', /max-age=31536000/);
    }
  });

  test("only the SPA's module worker scripts may eval (libavoid's embind glue); pages never", async () => {
    const env2 = makeEnv({
      ASSETS: { fetch: async () => new Response('self.onmessage = () => {}', { headers: { 'Content-Type': 'text/javascript' } }) },
    });
    const a = await signIn(env2, 'w@example.com', { status: 'approved' });
    const w = await call(env2, req('/assets/avoid.worker-Jq4LuCb_.js', { cookie: a.cookie }));
    assert.match(w.headers.get('Content-Security-Policy') ?? '', /script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'/);
    for (const p of ['/', '/assets/index-BmEM56EU.js', '/assets/x.worker.js/evil']) {
      const res = await call(env2, req(p, { cookie: a.cookie }));
      assert.doesNotMatch(res.headers.get('Content-Security-Policy') ?? '', /'unsafe-eval'/, p);
    }
    const anon = await call(env2, req('/assets/avoid.worker-Jq4LuCb_.js'));
    assert.equal(anon.status, 302);
    assert.doesNotMatch(anon.headers.get('Content-Security-Policy') ?? '', /'unsafe-eval'/, 'a redirect gets the strict policy');
  });

  test('pages and the API are never cached; hashed assets are cached privately', async () => {
    for (const p of ['/login', '/signup', '/forgot']) assert.equal((await call(env, req(p))).headers.get('Cache-Control'), 'no-store', p);
    assert.equal((await call(env, req('/account', { cookie: cookies.pending }))).headers.get('Cache-Control'), 'no-store');
    assert.equal((await call(env, req('/api/me', { cookie: cookies.approved }))).headers.get('Cache-Control'), 'no-store');
    assert.equal((await call(env, req('/assets/app.js', { cookie: cookies.approved }))).headers.get('Cache-Control'), 'private, max-age=31536000, immutable');
    assert.equal((await call(env, req('/', { cookie: cookies.approved }))).headers.get('Cache-Control'), 'private, no-cache');
  });

  test('state-changing requests must come from this origin, the sign-in forms included', async () => {
    const type = 'application/x-www-form-urlencoded';
    const body = 'note=hi';
    assert.equal((await call(env, req('/pending', { method: 'POST', cookie: cookies.pending, body, type, origin: 'https://evil.example.com' }))).status, 403);
    assert.equal((await call(env, req('/pending', { method: 'POST', cookie: cookies.pending, body, type, origin: null }))).status, 403, 'no Origin header');
    assert.equal((await call(env, req('/pending', { method: 'POST', cookie: cookies.pending, body, type, headers: { 'Sec-Fetch-Site': 'cross-site' } }))).status, 403);
    assert.equal((await call(env, req('/admin/api/users/x', { method: 'POST', cookie: cookies.admin, body: '{"action":"approve"}', type: 'application/json', origin: 'null' }))).status, 403);
    for (const p of ['/login', '/signup', '/verify', '/forgot', '/reset', '/account/password', '/auth/logout']) {
      assert.equal((await call(env, req(p, { method: 'POST', body: 'email=a%40b.co&password=x', type, origin: 'https://evil.example.com' }))).status, 403, `${p}: login CSRF and friends`);
    }
    assert.equal((await call(env, req('/pending', { method: 'POST', cookie: cookies.pending, body, type }))).status, 303, 'same origin passes');
  });

  test('another host is sent to the canonical origin (pages) or refused (API and writes)', async () => {
    const res = await call(env, new Request('https://alichitect.example.workers.dev/admin?x=1'));
    assert.equal(where(res), `302 ${ORIGIN}/admin?x=1`);
    assert.equal((await call(env, new Request('https://alichitect.example.workers.dev/api/me'))).status, 421);
  });

  test('?lang= sets the language cookie and comes back without it, on every sign-in page', async () => {
    const res = await call(env, req('/login?lang=ko&next=%2Fadmin'));
    assert.equal(where(res), '302 /login?next=%2Fadmin');
    assert.match(res.headers.get('Set-Cookie') ?? '', /^ab_lang=ko; Path=\/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax$/);
    const page = await (await call(env, req('/login', { headers: { Cookie: 'ab_lang=ko' } }))).text();
    assert.match(page, /<html lang="ko" data-lang-chosen="1">/);
    assert.match(page, /계정 만들기/);
    for (const p of ['/signup', '/forgot']) assert.equal(where(await call(env, req(`${p}?lang=zh`))), `302 ${p}`);
    const zh = await (await call(env, req('/signup', { headers: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' } }))).text();
    assert.match(zh, /<html lang="zh">/);
    assert.match(zh, /alibaba-cloud-logo-zh\.svg/);
    assert.match(zh, /创建账号/);
  });

  test('no redirect ever leaves the site (protocol-relative paths, ?lang=, ?next=)', async () => {
    for (const p of ['//evil.example/?lang=ko', '//evil.example/x', '/\\evil.example/?lang=zh', '/login?next=//evil.example', '/login?next=https://evil.example', '/signup?lang=ko&x=//evil.example']) {
      for (const cookie of [undefined, cookies.approved, cookies.pending]) {
        const res = await call(env, new Request(`${ORIGIN}${p}`, { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' }));
        const loc = res.headers.get('Location');
        if (!loc) continue;
        const target = new URL(loc, ORIGIN);
        assert.equal(target.origin, ORIGIN, `${p} -> ${loc}`);
        assert.ok(!loc.startsWith('//'), `${p} -> ${loc}`);
      }
    }
  });

  test('sign-out revokes the session and clears the cookie', async () => {
    const s = await signIn(env, 'leaving@example.com', { status: 'approved' });
    const res = await call(env, req('/auth/logout', { method: 'POST', cookie: s.cookie }));
    assert.equal(where(res), '303 /login?signed_out=1');
    assert.match(res.headers.get('Set-Cookie') ?? '', /^__Host-ab_session=; Path=\/; Max-Age=0/);
    assert.equal((await call(env, req('/api/me', { cookie: s.cookie }))).status, 401, 'the old cookie is dead even if the browser keeps it');
  });

  test('a misconfigured Worker fails closed', async () => {
    const env2 = { ...env, SESSION_SECRET: undefined };
    assert.equal(where(await call(env2, req('/', { cookie: cookies.admin }))), '302 /login');
    for (const r of [req('/login'), req('/signup'), form(undefined, '/login', 'email=a%40b.co&password=0123456789'), form(undefined, '/signup')]) {
      const res = await call(env2, r);
      assert.equal(res.status, 503);
      assert.match(await res.text(), /not set up on this server/);
    }
    const short = { ...env, SESSION_SECRET: 'too-short' };
    assert.equal((await call(short, req('/login'))).status, 503);
  });
});

describe('the production configuration', () => {
  test('MAIL_LOG is ignored unless ALLOWED_ORIGIN is a plain-http loopback address', () => {
    assert.equal(mailLogAllowed(makeEnv({ MAIL_LOG: '1' })), false, 'production origin');
    assert.equal(mailLogAllowed(makeEnv({ MAIL_LOG: '1', ALLOWED_ORIGIN: 'https://localhost:8800' })), false, 'https');
    assert.equal(mailLogAllowed(makeEnv({ MAIL_LOG: '1', ALLOWED_ORIGIN: 'http://evil.example' })), false, 'not loopback');
    assert.equal(mailLogAllowed(makeEnv({ MAIL_LOG: '1', ALLOWED_ORIGIN: 'http://localhost:8800' })), true);
    assert.equal(mailLogAllowed(makeEnv({ ALLOWED_ORIGIN: 'http://localhost:8800' })), false, 'flag off');
  });

  test("with MAIL_LOG set by mistake in production, codes are mailed, never logged", async () => {
    const env = makeEnv({ MAIL_LOG: '1' });
    const lines: string[] = [];
    const log = console.log;
    console.log = (...a: unknown[]) => void lines.push(a.join(' '));
    try {
      await call(env, req('/signup', { method: 'POST', type: 'application/x-www-form-urlencoded', body: 'name=N&email=n%40example.com&password=correct+horse+battery' }));
    } finally {
      console.log = log;
    }
    assert.equal(env.mails.length, 1);
    assert.ok(!lines.some((l) => /mail-logged|\d{6}/.test(l)), lines.join('\n'));
  });

  test("wrangler.jsonc: no Google settings, the mail log only in dev, the one custom domain", () => {
    const raw = readFileSync(fileURLToPath(new URL('../wrangler.jsonc', import.meta.url)), 'utf8');
    assert.doesNotMatch(raw, /GOOGLE|google/);
    const cfg = JSON.parse(raw.replace(/\/\/[^\n"]*$/gm, '').replace(/\/\/ [^\n]*/g, '').replace(/,(\s*[}\]])/g, '$1')) as {
      vars: Record<string, string>;
      routes: unknown[];
      env: { dev: { vars: Record<string, string>; secrets: { required: string[] } } };
      workers_dev: boolean;
    };
    assert.equal(cfg.vars.MAIL_LOG, undefined);
    assert.equal(cfg.vars.ALLOWED_ORIGIN, 'https://architect.alikorea-demo.com');
    assert.equal(cfg.vars.ADMIN_EMAILS, 'dysung.alicloud@gmail.com');
    assert.equal(cfg.vars.MAIL_FROM, 'no-reply@alikorea-demo.com');
    assert.deepEqual(cfg.routes, [{ pattern: 'architect.alikorea-demo.com', custom_domain: true }]);
    assert.equal(cfg.workers_dev, false);
    assert.equal(cfg.env.dev.vars.MAIL_LOG, '1');
    assert.match(cfg.env.dev.vars.ALLOWED_ORIGIN, /^http:\/\/localhost:88\d\d$/);
    assert.deepEqual(cfg.env.dev.secrets.required.sort(), ['DASHSCOPE_API_KEY', 'SESSION_SECRET']);
  });
});
