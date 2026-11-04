import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Browser, makeEnv, makeUser, PASSWORD, signIn, call, req } from './helpers.ts';

const claim = '/api/release-notice';

test('the main page offers an unseen release once across new and existing sessions', async () => {
  for (const role of ['user', 'verified', 'admin'] as const) {
    const env = makeEnv();
    const email = role + '@example.org';
    const user = await makeUser(env, email, { status: 'approved', role });
    const a = new Browser(env), b = new Browser(env);
    const next = '/account/keys';
    const login = await a.post('/login', { email, password: PASSWORD, next });
    assert.equal(login.status, 303);
    assert.equal(login.headers.get('Location'), next);
    assert.doesNotMatch(login.headers.get('Set-Cookie') ?? '', /__Host-ab_release/);
    const { cookie } = await signIn(env, email);
    const [key, value] = cookie.split('=');
    b.jar.set(key, value);
    for (const browser of [a, b]) {
      for (const path of [next, '/account', '/changelog', '/admin']) {
        assert.doesNotMatch(await browser.text(path), /login-notice\.js/, path);
      }
      assert.match(await browser.text('/'), /login-notice\.js/);
    }
    assert.equal(await env.DB.prepare('SELECT user_id FROM release_notices').first(), null);
    const claims = await Promise.all([a.post(claim+'?lang=ko'), b.post(claim+'?lang=ko')]);
    assert.deepEqual(claims.map(r => r.status).sort(), [200,204]);
    const { content } = await claims.find(r => r.status === 200)!.json();
    assert.ok(content.includes('비용 추산') && content.includes('/account/keys') && content.includes('/updates/keys-ko.webp'));
    const again = new Browser(env);
    await again.post('/login', { email, password: PASSWORD });
    assert.doesNotMatch(await again.text('/account'), /login-notice\.js/);
    assert.equal((await again.post(claim)).status,204);
    assert.match(await again.text('/account?whats-new=1'), /login-notice\.js/);
    assert.equal((await again.post(claim+'?preview=1')).status,200);
    const count = await env.DB.prepare('SELECT count(*) AS n FROM release_notices WHERE user_id=?').bind(user.id).first<{ n: number }>();
    assert.equal(count?.n,1);
  }
});

test('preview is independent of the automatic main-page notice and both require an approved account', async () => {
  const env = makeEnv(), admin = await signIn(env,'preview@example.org',{status:'approved',role:'admin'});
  const preview = await call(env,req(claim+'?preview=1&lang=zh',{method:'POST',cookie:admin.cookie}));
  assert.equal(preview.status,200);
  assert.match((await preview.json()).content,/Alichitect 新功能/);
  assert.equal(await env.DB.prepare('SELECT user_id FROM release_notices').first(),null);
  assert.equal((await call(env,req(claim,{method:'POST',cookie:admin.cookie}))).status,200);
  assert.equal((await call(env,req(claim,{method:'POST',cookie:admin.cookie}))).status,204);
  const pending = await signIn(env,'pending@example.org',{status:'pending'});
  for (const path of [claim, claim+'?preview=1']) {
    assert.equal((await call(env,req(path,{method:'POST'}))).status,401);
    assert.equal((await call(env,req(path,{method:'POST',cookie:pending.cookie}))).status,403);
  }
});

test('shared accounts get pricing instructions and personal-account guidance without a key issuance link', async () => {
  const env=makeEnv({ SHARED_ACCOUNTS:'shared@example.org' });
  const {cookie}=await signIn(env,'shared@example.org',{status:'approved'});
  const response=await call(env,req(claim+'?preview=1',{method:'POST',cookie}));
  const {content}=await response.json();
  assert.match(content,/Estimate costs/);
  assert.match(content,/personal account/);
  assert.doesNotMatch(content,/href="\/account\/keys"/);
});

test('the archive and notice share localized entries and an independent language preference', async () => {
  const env = makeEnv(), owner = await signIn(env, 'reader@example.org', { status: 'approved' });
  const browser = new Browser(env);
  for (const pair of owner.cookie.split(';')) {
    const [key, value] = pair.trim().split('=');
    browser.jar.set(key, value);
  }
  browser.jar.set('ab_lang', 'en');
  const initial = await browser.text('/changelog?fallbackLang=ko');
  assert.match(initial, /<html lang="ko"/);
  assert.match(initial, /<time datetime="2026-11-04">/);
  assert.match(initial, /data-changelog-link/);
  const chinese = await browser.text('/changelog?lang=zh');
  assert.match(chinese, /更新日志/);
  assert.equal(browser.jar.get('ab_release_lang'), 'zh');
  assert.equal(browser.jar.get('ab_lang'), 'en');
  assert.match(await browser.text('/changelog?fallbackLang=ko'), /<html lang="zh"/);
  const notice = await (await browser.post(claim + '?preview=1&fallbackLang=en')).json();
  assert.equal(notice.lang, 'zh');
  for (const lang of ['en', 'ko', 'zh']) {
    assert.match(notice.translations[lang], new RegExp('/updates/keys-' + lang + '\\.webp'));
    assert.ok(notice.translations[lang].includes(`data-language="${lang}" aria-pressed="true"`));
    assert.match(notice.translations[lang], /data-minimize/);
  }
  assert.match(await browser.text('/account'), /<html lang="en"/);
  assert.equal(await env.DB.prepare('SELECT user_id FROM release_notices').first(), null);
  assert.equal((await call(env, req('/changelog'))).status, 302);
});
