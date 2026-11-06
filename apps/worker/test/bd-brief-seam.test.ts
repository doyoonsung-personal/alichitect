// Seam integration tests (coordinator-owned): the BD brief module through the REAL worker.fetch
// dispatch — origin checks, sign-in, approval, the /api/me capability advertisement and the
// route registration in index.ts. The feature's own unit tests call handleBdBrief directly;
// these prove the composition points behave with the feature off, on, allowlisted and with its
// tables missing (plan §5, §11 "Independence and removability").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, makeD1Without, makeEnv, req, signIn } from './helpers.ts';
import { thinSnapshot } from '../../../packages/bd-brief/src/fixtures.ts';

const PREFIX = '/api/features/bd-brief';

const me = async (cookie: string, env = makeEnv()): Promise<Record<string, unknown>> =>
  (await call(env, req('/api/me', { cookie }))).json() as Promise<Record<string, unknown>>;

const createBody = (sourceKey: string): string =>
  JSON.stringify({ sourceKey, lang: 'en', snapshot: thinSnapshot({ sourceKey }) });

test('combined trial advertises and serves both modules only to the allowlisted admin', async () => {
  const allowlist = 'owner-trial@example.org,member-trial@example.org,verified-trial@example.org';
  const env = makeEnv({ BUSINESS_CASE_ENABLED: '1', BUSINESS_CASE_ADMIN_ONLY: '1', BUSINESS_CASE_ALLOWLIST: allowlist,
    BD_BRIEF_ENABLED: '1', BD_BRIEF_ADMIN_ONLY: '1', BD_BRIEF_ALLOWLIST: allowlist });
  const admin = await signIn(env, 'owner-trial@example.org', { status: 'approved', role: 'admin' });
  assert.deepEqual((await me(admin.cookie, env)).features, { businessCase: true, bdBrief: true });
  assert.equal((await call(env, req('/api/features/business-case?sessionId=trial-session', { cookie: admin.cookie }))).status, 200);
  assert.equal((await call(env, req(`${PREFIX}/briefs?sourceKey=trial-session`, { cookie: admin.cookie }))).status, 200);
  for (const [email, role] of [['member-trial@example.org', 'user'], ['verified-trial@example.org', 'verified'], ['outside-admin@example.org', 'admin']] as const) {
    const account = await signIn(env, email, { status: 'approved', role });
    const body = await me(account.cookie, env);
    assert.equal(body.features, undefined, `${role} must see neither capability`);
    assert.equal((await call(env, req('/api/features/business-case?sessionId=trial-session', { cookie: account.cookie }))).status, 404);
    assert.equal((await call(env, req(`${PREFIX}/briefs?sourceKey=trial-session`, { cookie: account.cookie }))).status, 404);
    assert.equal((await call(env, req('/api/features/business-case', { method: 'POST', cookie: account.cookie, type: 'application/json', body: '{}' }))).status, 404);
    assert.equal((await call(env, req(`${PREFIX}/briefs`, { method: 'POST', cookie: account.cookie, type: 'application/json', body: createBody('trial-session') }))).status, 404);
  }
});

test('feature off (the production default): /api/me advertises nothing and every BD route is not-available', async () => {
  const env = makeEnv(); // BD_BRIEF_ENABLED unset: the deployment default
  const bd = await signIn(env, 'bd@example.org', { status: 'approved' });
  const account = await me(bd.cookie, env);
  assert.equal(account.email, 'bd@example.org', 'the account itself still parses');
  assert.equal(account.features, undefined, 'no capability is advertised while the flag is off');
  const get = await call(env, req(`${PREFIX}/briefs?sourceKey=s1`, { cookie: bd.cookie }));
  assert.equal(get.status, 404);
  assert.deepEqual(await get.json(), { error: 'not-available' });
  // A write is refused by the feature too — and still same-origin protected by the platform.
  const post = await call(env, req(`${PREFIX}/briefs`, { method: 'POST', cookie: bd.cookie, type: 'application/json', body: createBody('s1') }));
  assert.equal(post.status, 404);
  assert.deepEqual(await post.json(), { error: 'not-available' });
  const crossSite = await call(env, req(`${PREFIX}/briefs`, { method: 'POST', cookie: bd.cookie, origin: null, type: 'application/json', body: createBody('s1') }));
  assert.equal(crossSite.status, 403, 'the existing platform same-origin check still guards the prefix');
});

test('feature on: /api/me carries features.bdBrief and the registered routes serve the owner', async () => {
  // an empty allowlist now means NOBODY (fail closed), so the on-tests list the signed-in address
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: 'bd@example.org' });
  const bd = await signIn(env, 'bd@example.org', { status: 'approved' });
  const account = await me(bd.cookie, env);
  assert.deepEqual(account.features, { bdBrief: true });
  const created = await call(env, req(`${PREFIX}/briefs`, { method: 'POST', cookie: bd.cookie, type: 'application/json', body: createBody('sess-1') }));
  assert.equal(created.status, 200);
  const { brief } = await created.json() as { brief: { id: string; ownerId: string; version: number } };
  assert.equal(brief.ownerId, bd.user.id);
  assert.equal(brief.version, 0);
  const list = await call(env, req(`${PREFIX}/briefs?sourceKey=sess-1`, { cookie: bd.cookie }));
  assert.equal(list.status, 200);
  assert.equal(((await list.json()) as { brief: { id: string } }).brief.id, brief.id);
  const read = await call(env, req(`${PREFIX}/briefs/${brief.id}`, { cookie: bd.cookie }));
  assert.equal(read.status, 200);
  const del = await call(env, req(`${PREFIX}/briefs/${brief.id}`, { method: 'DELETE', cookie: bd.cookie }));
  assert.equal(del.status, 204);
  assert.equal((await call(env, req(`${PREFIX}/briefs/${brief.id}`, { cookie: bd.cookie }))).status, 404);
});

test('feature on but the allowlist is empty/unset: NOBODY is eligible — no capability, routes not-available', async () => {
  for (const over of [{}, { BD_BRIEF_ALLOWLIST: '' }, { BD_BRIEF_ALLOWLIST: '   ' }]) {
    const env = makeEnv({ BD_BRIEF_ENABLED: '1', ...over });
    const bd = await signIn(env, 'bd@example.org', { status: 'approved' });
    assert.equal((await me(bd.cookie, env)).features, undefined, JSON.stringify(over));
    const get = await call(env, req(`${PREFIX}/briefs?sourceKey=s1`, { cookie: bd.cookie }));
    assert.equal(get.status, 404);
    assert.deepEqual(await get.json(), { error: 'not-available' });
    const post = await call(env, req(`${PREFIX}/briefs`, { method: 'POST', cookie: bd.cookie, type: 'application/json', body: createBody('s1') }));
    assert.equal(post.status, 404);
    assert.deepEqual(await post.json(), { error: 'not-available' });
  }
});

test('the allowlist is server-side: a non-listed approved account gets neither the flag nor the routes', async () => {
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: 'trial@example.org' });
  const listed = await signIn(env, 'trial@example.org', { status: 'approved' });
  const other = await signIn(env, 'other@example.org', { status: 'approved' });
  assert.deepEqual((await me(listed.cookie, env)).features, { bdBrief: true });
  assert.equal((await me(other.cookie, env)).features, undefined);
  const refused = await call(env, req(`${PREFIX}/briefs?sourceKey=s1`, { cookie: other.cookie }));
  assert.equal(refused.status, 404);
  assert.deepEqual(await refused.json(), { error: 'not-available' }, 'a browser cannot opt itself in');
});

test('unapproved and signed-out callers never reach the feature', async () => {
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: 'pending@example.org' });
  const pending = await signIn(env, 'pending@example.org', { status: 'pending' });
  const pendingRes = await call(env, req(`${PREFIX}/briefs?sourceKey=s1`, { cookie: pending.cookie }));
  assert.equal(pendingRes.status, 403, 'the existing approval gate answers before the feature route');
  const anon = await call(env, req(`${PREFIX}/briefs?sourceKey=s1`));
  assert.equal(anon.status, 401, 'the existing sign-in gate answers first');
});

test('ownership is enforced through the real dispatch: another owner sees not-found', async () => {
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: 'a@example.org,b@example.org' });
  const a = await signIn(env, 'a@example.org', { status: 'approved' });
  const b = await signIn(env, 'b@example.org', { status: 'approved' });
  const created = await call(env, req(`${PREFIX}/briefs`, { method: 'POST', cookie: a.cookie, type: 'application/json', body: createBody('sess-a') }));
  const { brief } = await created.json() as { brief: { id: string } };
  const readByOther = await call(env, req(`${PREFIX}/briefs/${brief.id}`, { cookie: b.cookie }));
  assert.equal(readByOther.status, 404);
  assert.deepEqual(await readByOther.json(), { error: 'not-found' });
  const listByOther = await call(env, req(`${PREFIX}/briefs?sourceKey=sess-a`, { cookie: b.cookie }));
  assert.equal(((await listByOther.json()) as { brief: unknown }).brief, null);
  assert.equal((await call(env, req(`${PREFIX}/briefs/${brief.id}`, { method: 'DELETE', cookie: b.cookie }))).status, 404);
  assert.equal((await call(env, req(`${PREFIX}/briefs/${brief.id}`, { cookie: a.cookie }))).status, 200, 'the owner keeps access');
});

test('missing feature tables fail only the BD routes: /api/me, capability discovery and turns are unaffected', async () => {
  // An older deployment: every migration except 0011 applied. Capability advertising must not
  // require the tables to exist (plan §5), and a BD route must fail structured, not crash.
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: 'bd@example.org', DB: makeD1Without('0011_') });
  const bd = await signIn(env, 'bd@example.org', { status: 'approved' });
  const account = await me(bd.cookie, env);
  assert.deepEqual(account.features, { bdBrief: true }, 'capability discovery needs no BD tables');
  const health = await call(env, req('/api/health'));
  assert.equal(health.status, 200);
  const get = await call(env, req(`${PREFIX}/briefs?sourceKey=s1`, { cookie: bd.cookie }));
  assert.equal(get.status, 500);
  assert.deepEqual(await get.json(), { error: 'internal' });
  const post = await call(env, req(`${PREFIX}/briefs`, { method: 'POST', cookie: bd.cookie, type: 'application/json', body: createBody('s1') }));
  assert.equal(post.status, 500, 'a missing table fails the BD route only');
  // The rest of the app still works on the same database.
  assert.equal((await call(env, req('/api/me', { cookie: bd.cookie }))).status, 200);
});

test('the MCP surface is untouched by the feature being enabled', async () => {
  const env = makeEnv({ BD_BRIEF_ENABLED: '1', BD_BRIEF_ALLOWLIST: 'bd@example.org' });
  const bd = await signIn(env, 'bd@example.org', { status: 'approved' });
  // /mcp answers its own protocol error for a plain GET (API-key auth, never cookies) — the
  // point is that it is NOT the feature's not-available body and NOT a fatal 500.
  const mcp = await call(env, req('/mcp'));
  assert.notEqual(mcp.status, 500);
  const body = await mcp.text();
  assert.ok(!body.includes('not-available'), 'MCP does not answer with the feature error');
  void bd;
});
