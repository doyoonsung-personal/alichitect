import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Browser, makeEnv, makeUser, PASSWORD, signIn, call, req } from './helpers.ts';

const claim = '/api/release-notice';

test('the next approved login preserves the destination and shows the release only once across browsers', async () => {
  for (const role of ['user', 'verified', 'admin'] as const) {
    const env = makeEnv();
    const email = role + '@example.org';
    const user = await makeUser(env, email, { status: 'approved', role });
    const a = new Browser(env), b = new Browser(env);
    const next = '/account/keys';
    for (const browser of [a,b]) {
      const login = await browser.post('/login', { email, password: PASSWORD, next });
      assert.equal(login.status, 303);
      assert.equal(login.headers.get('Location'), next);
      assert.match(await browser.text(next), /login-notice\.js/);
    }
    const claims = await Promise.all([a.post(claim+'?lang=ko'), b.post(claim+'?lang=ko')]);
    assert.deepEqual(claims.map(r => r.status).sort(), [200,204]);
    const { content } = await claims.find(r => r.status === 200)!.json();
    assert.ok(content.includes('비용 추산') && content.includes('/account/keys') && content.includes('/updates/keys-ko.webp'));
    const again = new Browser(env);
    await again.post('/login', { email, password: PASSWORD });
    assert.doesNotMatch(await again.text('/account'), /login-notice\.js/);
    assert.equal((await again.post(claim)).status,204);
    assert.match(await again.text('/account?whats-new=1'),/login-notice\.js" data-preview/);
    assert.equal((await again.post(claim+'?preview=1')).status,200);
    const count = await env.DB.prepare('SELECT count(*) AS n FROM release_notices WHERE user_id=?').bind(user.id).first<{ n: number }>();
    assert.equal(count?.n,1);
  }
});

test('preview works for an already signed-in admin without consuming the next login notice', async () => {
  const env = makeEnv(), admin = await signIn(env,'preview@example.org',{status:'approved',role:'admin'});
  assert.equal((await call(env,req(claim,{method:'POST',cookie:admin.cookie}))).status,204);
  const preview = await call(env,req(claim+'?preview=1&lang=zh',{method:'POST',cookie:admin.cookie}));
  assert.equal(preview.status,200);
  assert.match((await preview.json()).content,/Alichitect 新功能/);
  assert.equal(await env.DB.prepare('SELECT user_id FROM release_notices').first(),null);
  assert.equal((await call(env,req(claim+'?preview=1',{method:'POST'}))).status,401);
  const pending = await signIn(env,'pending@example.org',{status:'pending'});
  assert.equal((await call(env,req(claim+'?preview=1',{method:'POST',cookie:pending.cookie}))).status,403);
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
