// The route-gating matrix through the Worker's fetch handler (anonymous, pending, approved, admin), the security
// headers on every response, CSRF (Origin), the canonical origin, and the fake-Google guard in the production config.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.ts';
import { fakeGoogleAllowed } from '../src/fake-google.ts';
import { providerFor } from '../src/auth.ts';
import { API_KEY, ADMIN, ORIGIN, SECRET, makeCtx, makeEnv, req, signIn } from './helpers.ts';
import type { Env } from '../src/env.ts';

type Who = 'anon' | 'pending' | 'approved' | 'admin';
const WHO: Who[] = ['anon', 'pending', 'approved', 'admin'];

async function world(): Promise<{ env: ReturnType<typeof makeEnv>; cookies: Record<Who, string | undefined> }> {
  const env = makeEnv();
  const admin = await signIn(env, ADMIN);
  const pending = await signIn(env, 'pending@example.com', { requested: true });
  const approved = await signIn(env, 'approved@example.com', { status: 'approved' });
  return { env, cookies: { anon: undefined, pending: pending.cookie, approved: approved.cookie, admin: admin.cookie } };
}

async function call(env: Env, r: Request): Promise<Response> {
  const ctx = makeCtx();
  const res = await worker.fetch(r, env, ctx);
  await ctx.flush();
  return res;
}

const where = (res: Response): string => `${res.status}${res.headers.get('Location') ? ` ${res.headers.get('Location')}` : ''}`;

describe('route gating', async () => {
  const { env, cookies } = await world();

  // expected status (and Location for redirects) per route and per visitor
  const MATRIX: Array<{ name: string; make: (cookie?: string) => Request; expect: Record<Who, string> }> = [
    { name: 'GET /', make: (c) => req('/', { cookie: c }), expect: { anon: '302 /login', pending: '302 /pending', approved: '200', admin: '200' } },
    { name: 'GET /assets/app.js', make: (c) => req('/assets/app.js', { cookie: c }), expect: { anon: '302 /login?next=%2Fassets%2Fapp.js', pending: '302 /pending', approved: '200', admin: '200' } },
    { name: 'GET /login', make: (c) => req('/login', { cookie: c }), expect: { anon: '200', pending: '302 /pending', approved: '302 /', admin: '302 /' } },
    { name: 'GET /pending', make: (c) => req('/pending', { cookie: c }), expect: { anon: '302 /login?next=%2Fpending', pending: '200', approved: '302 /', admin: '302 /' } },
    { name: 'GET /admin', make: (c) => req('/admin', { cookie: c }), expect: { anon: '302 /login?next=%2Fadmin', pending: '302 /pending', approved: '302 /', admin: '200' } },
    { name: 'GET /api/me', make: (c) => req('/api/me', { cookie: c }), expect: { anon: '401', pending: '403', approved: '200', admin: '200' } },
    { name: 'POST /api/turn', make: (c) => req('/api/turn', { method: 'POST', cookie: c, type: 'application/json', body: '{}' }), expect: { anon: '401', pending: '403', approved: '400', admin: '400' } },
    { name: 'GET /admin/api/users', make: (c) => req('/admin/api/users', { cookie: c }), expect: { anon: '401', pending: '403', approved: '403', admin: '200' } },
    { name: 'GET /api/health', make: (c) => req('/api/health', { cookie: c }), expect: { anon: '200', pending: '200', approved: '200', admin: '200' } },
    { name: 'GET /_auth/pages.css', make: (c) => req('/_auth/pages.css', { cookie: c }), expect: { anon: '200', pending: '200', approved: '200', admin: '200' } },
    { name: 'GET /brand/alibaba-cloud-logo-en.svg', make: (c) => req('/brand/alibaba-cloud-logo-en.svg', { cookie: c }), expect: { anon: '200', pending: '200', approved: '200', admin: '200' } },
    { name: 'GET /__fake-google/authorize (production)', make: (c) => req('/__fake-google/authorize', { cookie: c }), expect: { anon: '404', pending: '404', approved: '404', admin: '404' } },
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

  test('/api/me says who is signed in and the quota', async () => {
    const me = (await (await call(env, req('/api/me', { cookie: cookies.approved }))).json()) as Record<string, unknown>;
    assert.equal(me.email, 'approved@example.com');
    assert.equal(me.turnsPerDay, 3);
    const admin = (await (await call(env, req('/api/me', { cookie: cookies.admin }))).json()) as Record<string, unknown>;
    assert.equal(admin.turnsPerDay, null, 'admins are unlimited');
    assert.deepEqual(admin.links, { admin: '/admin', signOut: '/auth/logout' });
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
      for (const secret of [API_KEY, SECRET, 'test-google-secret']) assert.ok(!text.includes(secret));
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

  test('every response carries the security headers', async () => {
    for (const r of [req('/'), req('/login'), req('/api/health'), req('/_auth/pages.js'), req('/nope', { cookie: cookies.approved }), req('/api/turn', { method: 'POST', origin: 'https://evil.example.com' })]) {
      const res = await call(env, r);
      const csp = res.headers.get('Content-Security-Policy') ?? '';
      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.match(csp, /img-src 'self' data: blob: https:\/\/lh3\.googleusercontent\.com/);
      assert.match(csp, /form-action 'self' https:\/\/accounts\.google\.com/);
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
    assert.equal((await call(env, req('/login'))).headers.get('Cache-Control'), 'no-store');
    assert.equal((await call(env, req('/api/me', { cookie: cookies.approved }))).headers.get('Cache-Control'), 'no-store');
    assert.equal((await call(env, req('/assets/app.js', { cookie: cookies.approved }))).headers.get('Cache-Control'), 'private, max-age=31536000, immutable');
    assert.equal((await call(env, req('/', { cookie: cookies.approved }))).headers.get('Cache-Control'), 'private, no-cache');
  });

  test('state-changing requests must come from this origin', async () => {
    const body = 'note=hi';
    const type = 'application/x-www-form-urlencoded';
    assert.equal((await call(env, req('/pending', { method: 'POST', cookie: cookies.pending, body, type, origin: 'https://evil.example.com' }))).status, 403);
    assert.equal((await call(env, req('/pending', { method: 'POST', cookie: cookies.pending, body, type, origin: null }))).status, 403, 'no Origin header');
    assert.equal((await call(env, req('/pending', { method: 'POST', cookie: cookies.pending, body, type, headers: { 'Sec-Fetch-Site': 'cross-site' } }))).status, 403);
    assert.equal((await call(env, req('/admin/api/users/x', { method: 'POST', cookie: cookies.admin, body: '{"action":"approve"}', type: 'application/json', origin: 'null' }))).status, 403);
    assert.equal((await call(env, req('/pending', { method: 'POST', cookie: cookies.pending, body, type }))).status, 303, 'same origin passes');
  });

  test('another host is sent to the canonical origin (pages) or refused (API and writes)', async () => {
    const res = await call(env, new Request('https://alichitect.example.workers.dev/admin?x=1'));
    assert.equal(where(res), `302 ${ORIGIN}/admin?x=1`);
    assert.equal((await call(env, new Request('https://alichitect.example.workers.dev/api/me'))).status, 421);
  });

  test('?lang= sets the language cookie and comes back without it', async () => {
    const res = await call(env, req('/login?lang=ko&next=%2Fadmin'));
    assert.equal(where(res), '302 /login?next=%2Fadmin');
    assert.match(res.headers.get('Set-Cookie') ?? '', /^ab_lang=ko; Path=\/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax$/);
    const page = await (await call(env, req('/login', { headers: { Cookie: 'ab_lang=ko' } }))).text();
    assert.match(page, /<html lang="ko" data-lang-chosen="1">/);
    assert.match(page, /Google로 계속하기/);
    const zh = await (await call(env, req('/login', { headers: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' } }))).text();
    assert.match(zh, /<html lang="zh">/);
    assert.match(zh, /alibaba-cloud-logo-zh\.svg/);
  });

  test('no redirect ever leaves the site (protocol-relative paths, ?lang=, ?next=)', async () => {
    for (const p of ['//evil.example/?lang=ko', '//evil.example/x', '/\\evil.example/?lang=zh', '/login?next=//evil.example', '/login?next=https://evil.example']) {
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
    const login = await (await call(env2, req('/login'))).text();
    assert.match(login, /not set up on this server/);
    assert.equal(where(await call(env2, req('/auth/google'))), '302 /login?error=config');
  });
});

describe('fake Google guard', () => {
  const prodLike = (over: Partial<Env>) => makeEnv({ DEV_FAKE_GOOGLE: '1', ...over });

  test('refused on the production origin even with DEV_FAKE_GOOGLE=1', () => {
    const env = prodLike({});
    assert.equal(fakeGoogleAllowed(env, new URL(`${ORIGIN}/auth/google`)), false);
    assert.equal(providerFor(env, new URL(`${ORIGIN}/auth/google`))?.name, 'google');
  });

  test('refused when the page is loopback but ALLOWED_ORIGIN is not, and vice versa', () => {
    assert.equal(fakeGoogleAllowed(prodLike({}), new URL('http://localhost:8800/auth/google')), false);
    assert.equal(fakeGoogleAllowed(prodLike({ ALLOWED_ORIGIN: 'http://localhost:8800' }), new URL('https://architect.alikorea-demo.com/auth/google')), false);
    assert.equal(fakeGoogleAllowed(prodLike({ ALLOWED_ORIGIN: 'https://localhost:8800' }), new URL('https://localhost:8800/auth/google')), false, 'plain http only');
  });

  test('allowed only for local dev: flag on, loopback page, loopback http ALLOWED_ORIGIN', () => {
    assert.equal(fakeGoogleAllowed(prodLike({ ALLOWED_ORIGIN: 'http://localhost:8800' }), new URL('http://localhost:8800/auth/google')), true);
    assert.equal(fakeGoogleAllowed(makeEnv({ ALLOWED_ORIGIN: 'http://localhost:8800' }), new URL('http://localhost:8800/auth/google')), false, 'flag off');
  });

  test("wrangler.jsonc's production vars never turn on the fake or the mail log", () => {
    const raw = readFileSync(fileURLToPath(new URL('../wrangler.jsonc', import.meta.url)), 'utf8');
    const cfg = JSON.parse(raw.replace(/\/\/[^\n"]*$/gm, '').replace(/\/\/ [^\n]*/g, '').replace(/,(\s*[}\]])/g, '$1')) as { vars: Record<string, string>; routes: unknown[]; env: { dev: { vars: Record<string, string> } }; workers_dev: boolean; send_email: unknown[] };
    assert.equal(cfg.vars.DEV_FAKE_GOOGLE, undefined);
    assert.equal(cfg.vars.MAIL_LOG, undefined);
    assert.equal(cfg.vars.ALLOWED_ORIGIN, 'https://architect.alikorea-demo.com');
    assert.deepEqual(cfg.routes, [{ pattern: 'architect.alikorea-demo.com', custom_domain: true }]);
    assert.equal(cfg.workers_dev, false);
    assert.equal(cfg.env.dev.vars.DEV_FAKE_GOOGLE, '1');
    assert.match(cfg.env.dev.vars.ALLOWED_ORIGIN, /^http:\/\/localhost:88\d\d$/);
  });
});
