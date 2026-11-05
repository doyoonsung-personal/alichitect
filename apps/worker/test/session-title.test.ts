import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cachedSessionTitle, handleSessionTitle, TitleUnavailable } from '../src/session-title.ts';
import { getDesign } from '../src/mcp-designs.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { call, makeEnv, makeUser, req, signIn } from './helpers.ts';

test('legacy title cache is owner-scoped, counts cost without turns and stores no brief', async () => {
  const env = makeEnv();
  const user = await makeUser(env, 'title@example.org'), peer = await makeUser(env, 'peer@example.org');
  let calls = 0;
  const deps = { draft: async () => ({ title: `재고 분석 ${++calls}`, costUsd: 0.00004 }) };
  const first = await cachedSessionTitle(env, user.id, '매장마다 재고가 부족해서 분석하고 싶습니다.', undefined, deps);
  assert.equal(first.titleVersion, 1);
  assert.deepEqual(await cachedSessionTitle(env, user.id, '매장마다 재고가 부족해서 분석하고 싶습니다.', undefined, deps), first);
  assert.notDeepEqual(await cachedSessionTitle(env, peer.id, '매장마다 재고가 부족해서 분석하고 싶습니다.', undefined, deps), first);
  assert.equal(calls, 2);
  const usage = await env.DB.prepare('SELECT turns, est_cost_usd FROM usage WHERE user_id=?').bind(user.id).first<{ turns: number; est_cost_usd: number }>();
  assert.equal(usage?.turns, 0);
  assert.equal(usage?.est_cost_usd, 0.00004);
  const rows = await env.DB.prepare('SELECT * FROM session_titles').all();
  assert.ok(!JSON.stringify(rows).includes('매장마다'));
});

test('title claims are idempotent during concurrent loads and the daily cap bounds new work', async () => {
  const env = makeEnv(), user = await makeUser(env, 'limit@example.org');
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const first = cachedSessionTitle(env, user.id, 'same brief', undefined, { draft: async () => { calls++; await blocked; return { title: 'One title', costUsd: 0 }; } });
  while (!calls) await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(cachedSessionTitle(env, user.id, 'same brief'), error => error instanceof TitleUnavailable && error.code === 'title-pending');
  release(); await first;
  for (let n = 1; n < 40; n++) await cachedSessionTitle(env, user.id, 'brief ' + n, undefined, { draft: async () => ({ title: 'Short title', costUsd: 0 }) });
  await assert.rejects(cachedSessionTitle(env, user.id, 'over budget'), error => error instanceof TitleUnavailable && error.status === 429);
  assert.equal((await cachedSessionTitle(env, user.id, 'same brief')).title, 'One title', 'cached results stay available after the cap');
});

test('title endpoint retains cookie approval, same-origin and input boundaries', async () => {
  const env = makeEnv();
  const approved = await signIn(env, 'approved-title@example.org', { status: 'approved' });
  const pending = await signIn(env, 'pending-title@example.org', { status: 'pending' });
  const request = (cookie?: string, origin?: string) => req('/api/session-title', { method: 'POST', cookie, origin,
    type: 'application/json', body: JSON.stringify({ ask: 'Inventory workflow' }) });
  assert.equal((await call(env, request())).status, 401);
  assert.equal((await call(env, request(pending.cookie))).status, 403);
  assert.equal((await call(env, request(approved.cookie, 'https://other.invalid'))).status, 403);
  const invalid = new Request('https://test/api/session-title', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ask: 'x'.repeat(6001) }) });
  assert.equal((await handleSessionTitle(invalid, env, approved.user.id)).status, 400);
  const valid = new Request('https://test/api/session-title', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ask: 'Inventory workflow' }) });
  const response = await handleSessionTitle(valid, env, approved.user.id, { draft: async () => ({ title: 'Inventory planning', costUsd: 0 }) });
  assert.deepEqual(await response.json(), { title: 'Inventory planning', titleVersion: 1 });
});

test('legacy MCP reads persist a Flash title once without changing revision, activity or requirements', async t => {
  const env = makeEnv(), user = await makeUser(env, 'mcp-title@example.org');
  const memory = createMemory();
  const brief = '여러 매장의 재고 현황을 검토하고 부족하거나 남는 품목의 재배치를 제안해 주세요.';
  memory.turns = [{ role: 'user', text: brief }];
  memory.requirements = ['담당자 승인 전 재고 변경 금지'];
  const snapshot = JSON.stringify({ title: brief, mode: 'workflow', memory, summary: 'Current design' });
  await env.DB.prepare("INSERT INTO mcp_revisions(user_id,request_id,fingerprint,design_id,revision,status,snapshot,created_at) VALUES (?,?,?,?,?,'done',?,?)")
    .bind(user.id, 'title-test', '', 'legacy-design', 3, snapshot, 1234).run();
  const upstream = t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    assert.equal(JSON.parse(String(init.body)).model, 'qwen3.8-flash');
    return new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: '{"title":"매장 재고 재배치"}' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
  });
  assert.equal((await getDesign(env, user, 'legacy-design')).title, '매장 재고 재배치');
  assert.equal((await getDesign(env, user, 'legacy-design')).revision, 3);
  assert.equal(upstream.mock.callCount(), 1);
  const row = await env.DB.prepare('SELECT snapshot,created_at FROM mcp_revisions WHERE user_id=?').bind(user.id).first<{ snapshot: string; created_at: number }>();
  assert.deepEqual(JSON.parse(row!.snapshot).memory, memory);
  assert.equal(row!.created_at, 1234);
});
