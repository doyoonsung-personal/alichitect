import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authenticateKey, issueKey, listKeys, MAX_ACTIVE_KEYS, revokeKey } from '../src/mcp-keys.ts';
import { randomHex, randomToken, sha256Hex } from '../src/crypto.ts';
import { t as translate, type Lang } from '../src/pages/i18n.ts';
import { call, makeEnv, req, signIn, type TestEnv } from './helpers.ts';

const post = (path: string, cookie: string, values: Record<string, string>, lang: Lang = 'en', origin?: string) =>
  req(path, { method: 'POST', cookie, body: new URLSearchParams(values).toString(), type: 'application/x-www-form-urlencoded', headers: { 'Accept-Language': lang }, origin });
const keyId = (secret: string) => secret.slice(8, 24);
const auth = (env: TestEnv, secret: string, now: number) => authenticateKey(req('/mcp', { headers: { Authorization: 'Bearer ' + secret } }), env.DB, now);
const page = async (env: TestEnv, cookie: string, lang: Lang = 'en') => (await call(env, req('/account/keys', { cookie, headers: { 'Accept-Language': lang } }))).text();

// Import-like fixture for an account that had keys before the cap changed.
async function legacyKey(env: TestEnv, owner: string, name: string, now: number, revoked: number | null = null, expiry = now + 86400000) {
  const id = randomHex(8), secret = `ali_mcp_${id}_${randomToken(32)}`;
  await env.DB.prepare(`INSERT INTO mcp_keys(id,user_id,name,digest,scope,created_at,expires_at,revoked_at,issuance_id)
    VALUES(?,?,?,?,?,?,?,?,?)`).bind(id, owner, name, await sha256Hex(secret), 'read', now, expiry, revoked, randomHex(16)).run();
  return secret;
}

test('atomic issuance permits only three active keys per owner, including simultaneous final-slot requests', async () => {
  const env = makeEnv(), { user } = await signIn(env, 'cap@example.test', { status: 'approved' });
  const now = Date.now();
  assert.equal(MAX_ACTIVE_KEYS, 3);
  for (let i = 0; i < 2; i++) assert.ok(await issueKey(env.DB, user.id, `key ${i}`, 'read', 30, now));
  const attempts = await Promise.all(Array.from({ length: 5 }, (_, i) => issueKey(env.DB, user.id, `race ${i}`, 'write', 90, now)));
  assert.equal(attempts.filter(Boolean).length, 1);
  assert.equal(await issueKey(env.DB, user.id, 'fourth', 'read', 30, now), null);
  assert.equal((await listKeys(env.DB, user.id, now)).length, 3);
  const peer = await signIn(env, 'peer@example.test', { status: 'approved' });
  assert.ok(await issueKey(env.DB, peer.user.id, 'independent quota', 'read', 30, now));
});

test('legacy owners above three retain authentication and must drop below three before issuing', async () => {
  const env = makeEnv(), owner = await signIn(env, 'legacy@example.test', { status: 'approved' });
  const now = Date.now(), keys: string[] = [];
  for (let i = 0; i < 5; i++) keys.push(await legacyKey(env, owner.user.id, `Legacy ${i}`, now));
  assert.equal(await issueKey(env.DB, owner.user.id, 'blocked', 'read', 30, now), null);
  assert.equal((await listKeys(env.DB, owner.user.id, now)).filter(k => k.revoked_at === null).length, 5);
  for (const key of keys) assert.ok(await auth(env, key, now));
  const html = await page(env, owner.cookie);
  assert.match(html, /5 of 3 active keys/);
  assert.ok(html.includes(translate('en', 'mcp.overLimit', { max: 3 })));
  assert.match(html, /type="submit" disabled aria-describedby="mcp-limit"/);
  for (const key of keys.slice(0, 2)) await revokeKey(env.DB, owner.user.id, keyId(key), now);
  assert.equal(await issueKey(env.DB, owner.user.id, 'still blocked at three', 'read', 30, now), null);
  await revokeKey(env.DB, owner.user.id, keyId(keys[2]), now);
  assert.ok(await issueKey(env.DB, owner.user.id, 'replacement', 'write', 90, now));
  for (const key of keys.slice(3)) assert.ok(await auth(env, key, now));
});

test('revoked and expired keys free slots, with expiry at the exact boundary', async () => {
  const env = makeEnv(), { user } = await signIn(env, 'expiry@example.test', { status: 'approved' });
  const now = Date.now();
  const revoked = await legacyKey(env, user.id, 'Revoked', now, now);
  const expired = await legacyKey(env, user.id, 'Expired', now - 86400000, null, now);
  for (let i = 0; i < 3; i++) assert.ok(await issueKey(env.DB, user.id, `Active ${i}`, 'read', 30, now));
  assert.equal(await auth(env, revoked, now), null);
  assert.equal(await auth(env, expired, now), null);
  assert.equal(await issueKey(env.DB, user.id, 'fourth', 'read', 30, now), null);
});

test('list and revoke are owner-scoped, require same-origin writes, and revoke stops authentication immediately', async () => {
  const env = makeEnv(), owner = await signIn(env, 'owner@example.test', { status: 'approved' });
  const peer = await signIn(env, 'peer@example.test', { status: 'approved', role: 'admin' });
  const now = Date.now();
  const secret = (await issueKey(env.DB, owner.user.id, 'Owner private key', 'write', 30, now))!;
  assert.deepEqual(await listKeys(env.DB, peer.user.id, now), []);
  assert.ok(!(await page(env, peer.cookie)).includes('Owner private key'));
  assert.equal((await call(env, post('/account/keys/revoke', peer.cookie, { id: keyId(secret) }))).status, 303);
  assert.ok(await auth(env, secret, now));
  assert.equal((await call(env, post('/account/keys/revoke', owner.cookie, { id: keyId(secret) }, 'en', 'https://other.example'))).status, 403);
  assert.ok(await auth(env, secret, now));
  assert.equal((await call(env, post('/account/keys/revoke', owner.cookie, { id: keyId(secret) }))).status, 303);
  assert.equal(await auth(env, secret, now), null);
});

test('management shows the localized active count, metadata and collapsed history before setup', async () => {
  const env = makeEnv(), owner = await signIn(env, 'page@example.test', { status: 'approved' });
  const now = Date.now();
  for (let i = 0; i < 3; i++) assert.ok(await issueKey(env.DB, owner.user.id, `Active <${i}>`, i === 1 ? 'read' : 'write', 30, now));
  for (let i = 0; i < 2; i++) await legacyKey(env, owner.user.id, `Revoked ${i}`, now - 1, now);
  await legacyKey(env, owner.user.id, 'Expired example', now - 2, null, now - 1);
  await env.DB.prepare('UPDATE mcp_keys SET last_used_at=? WHERE user_id=? AND name=?').bind(now, owner.user.id, 'Active <1>').run();
  for (const lang of ['en', 'ko', 'zh'] as const) {
    const html = await page(env, owner.cookie, lang);
    assert.ok(html.includes(translate(lang, 'mcp.activeCount', { count: 3, max: 3 })));
    assert.ok(html.indexOf('id="mcp-active"') < html.indexOf('id="mcp-create"'));
    assert.ok(html.indexOf('id="mcp-create"') < html.indexOf('id="mcp-setup"'));
    const history = html.match(/<details class="section" id="mcp-history">([\s\S]*?)<\/details>/)?.[1];
    assert.ok(history, 'history uses native details without open');
    assert.ok(history.includes('Revoked 0') && history.includes('Revoked 1') && history.includes('Expired example'));
    assert.ok(history.includes(translate(lang, 'mcp.expired')));
    assert.ok(!history.includes('/revoke') && !history.includes('Active &lt;'));
    assert.equal((html.match(/action="\/account\/keys\/revoke"/g) ?? []).length, 3);
    assert.equal((html.match(/data-confirm=/g) ?? []).length, 3);
    for (const label of ['mcp.created', 'mcp.expires', 'mcp.used', 'mcp.scopeRead', 'mcp.scopeWrite', 'mcp.never'] as const) assert.ok(html.includes(translate(lang, label)));
    assert.ok(html.includes(`datetime="${new Date(now).toISOString()}"`));
    assert.ok(html.includes('Active &lt;0&gt;'));
    assert.doesNotMatch(html, /ali_mcp_[a-f0-9]{16}_[\w-]{43}/);
    const result = await call(env, post('/account/keys', owner.cookie, { name: 'Fourth', scope: 'write', days: '90', issuance: randomHex(16) }, lang));
    assert.equal(result.status, 400);
    const rejected = await result.text();
    assert.ok(rejected.includes(translate(lang, 'mcp.limit', { max: 3 })));
    assert.match(rejected, /id="mcp-limit" role="alert"/);
    assert.match(rejected, /type="submit" disabled aria-describedby="mcp-limit"/);
  }
});

test('successful issue shows the updated count and list with a one-time secret; reload and replay cannot reveal it', async () => {
  const env = makeEnv(), owner = await signIn(env, 'once@example.test', { status: 'approved' });
  const fields = { name: 'Laptop', scope: 'write', days: '90', issuance: randomHex(16) };
  const response = await call(env, post('/account/keys', owner.cookie, fields));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const html = await response.text();
  assert.match(html, /1 of 3 active keys/);
  assert.match(html, /<h3[^>]*><span class="mcp-config">Laptop<\/span>/);
  assert.match(html, /id="mcp-secret"/);
  assert.match(html, /ali_mcp_[a-f0-9]{16}_[\w-]{43}/);
  assert.doesNotMatch(await page(env, owner.cookie), /ali_mcp_[a-f0-9]{16}_[\w-]{43}/);
  const replay = await call(env, post('/account/keys', owner.cookie, fields));
  assert.equal(replay.status, 303);
  assert.equal((await listKeys(env.DB, owner.user.id)).length, 1);
  assert.doesNotMatch(JSON.stringify(env.DB.sqlite.prepare('SELECT * FROM mcp_keys').all()), /ali_mcp_[a-f0-9]{16}_[\w-]{43}/);
});

test('history stays bounded and cannot hide any active key, even beyond the old list limit', async () => {
  const env = makeEnv(), owner = await signIn(env, 'history@example.test', { status: 'approved' });
  const now = Date.now();
  for (let i = 0; i < 101; i++) await legacyKey(env, owner.user.id, `Active ${i}`, now - 1000 - i);
  for (let i = 0; i < 105; i++) await legacyKey(env, owner.user.id, `Revoked ${i}`, now - i, now);
  const keys = await listKeys(env.DB, owner.user.id, now);
  assert.equal(keys.filter(k => k.revoked_at === null).length, 101);
  assert.equal(keys.length, 201);
  assert.ok(keys.slice(0, 101).every(k => k.revoked_at === null));
  assert.ok(keys.slice(101).every(k => k.revoked_at !== null));
  assert.match(await page(env, owner.cookie), /101 of 3 active keys/);
});
