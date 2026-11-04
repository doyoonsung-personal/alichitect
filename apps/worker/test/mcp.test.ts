import assert from 'node:assert/strict';
import { test } from 'node:test';
import { call, makeCtx, makeEnv, ORIGIN, req, signIn } from './helpers.ts';
import { issueKey } from '../src/mcp-keys.ts';
import { changeDesign, getDesign } from '../src/mcp-designs.ts';
import { turnsToday } from '../src/db.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';

const rpc = (method: string, params = {}, token?: string, origin: string | null = null) => req('/mcp', {
  method: 'POST', origin, type: 'application/json', headers: { Accept: 'application/json, text/event-stream', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
});
const form = (path: string, cookie: string, values: Record<string, string>, origin?: string) =>
  req(path, { method: 'POST', cookie, body: new URLSearchParams(values).toString(), type: 'application/x-www-form-urlencoded', origin });

test('personal keys are shown once, scoped to MCP and rechecked for expiry, revocation and approval', async () => {
  const env = makeEnv();
  const owner = await signIn(env, 'dev@example.org', { status: 'approved' });
  const other = await signIn(env, 'peer@example.org', { status: 'approved' });
  const keyPage = await (await call(env, req('/account/keys', { cookie: owner.cookie }))).text();
  const issuance = keyPage.match(/name="issuance" value="([0-9a-f]+)"/)![1];
  const fields = { name: 'Qoder', days: '90', scope: 'write', issuance };
  const create = await call(env, form('/account/keys', owner.cookie, fields));
  assert.equal(create.status, 200);
  assert.equal(create.headers.get('Cache-Control'), 'no-store');
  const key = (await create.text()).match(/ali_mcp_[a-f0-9]{16}_[\w-]{43}/)?.[0];
  assert.ok(key);
  assert.equal((await call(env, form('/account/keys', owner.cookie, fields))).status, 303, 'resubmitting the form never mints another secret');
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM mcp_keys').get()?.n, 1);
  assert.ok(!(await (await call(env, req('/account/keys', { cookie: owner.cookie }))).text()).includes(key));
  assert.ok(!JSON.stringify(env.DB.sqlite.prepare('SELECT * FROM mcp_keys').all()).includes(key));
  assert.equal((await call(env, form('/account/keys', owner.cookie, { name: 'x', scope: 'write', days: '30' }, 'https://other.example'))).status, 403);
  assert.equal((await call(env, rpc('tools/list'))).status, 401);
  assert.equal((await call(env, req('/mcp', { cookie: owner.cookie }))).status, 401);
  assert.equal((await call(env, req('/api/me', { headers: { Authorization: 'Bearer ' + key } }))).status, 401);
  assert.equal((await call(env, rpc('tools/list', {}, key, 'https://other.example'))).status, 403);
  const hello = await (await call(env, rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }, key))).json();
  assert.equal(hello.result.serverInfo.name, 'alichitect');
  assert.match(hello.result.instructions, /estimate_solution/);
  assert.match(hello.result.instructions, /requestId/);
  const list = async (k: string) => (await (await call(env, rpc('tools/list', {}, k))).json()).result.tools.map((v: { name: string }) => v.name).sort();
  assert.deepEqual(await list(key), ['design_solution', 'estimate_solution', 'get_design']);
  const read = (await issueKey(env.DB, owner.user.id, 'reader', 'read', 30, Date.now()))!;
  assert.deepEqual(await list(read), ['get_design']);
  const readHello = await (await call(env, rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }, read))).json();
  assert.match(readHello.result.instructions, /get_design/);
  assert.doesNotMatch(readHello.result.instructions, /design_solution|estimate_solution/);
  const denied = await (await call(env, rpc('tools/call', { name: 'estimate_solution', arguments: {} }, read))).json();
  assert.ok(denied.error || denied.result?.isError);
  await call(env, form('/account/keys/revoke', other.cookie, { id: key.slice(8, 24) }));
  assert.deepEqual(await list(key), ['design_solution', 'estimate_solution', 'get_design']);
  await call(env, form('/account/keys/revoke', owner.cookie, { id: key.slice(8, 24) }));
  assert.equal((await call(env, rpc('tools/list', {}, key))).status, 401);
  await env.DB.prepare('UPDATE users SET status=? WHERE id=?').bind('revoked', owner.user.id).run();
  assert.equal((await call(env, rpc('tools/list', {}, read))).status, 401);
  const expired = (await issueKey(env.DB, other.user.id, 'old', 'write', 30, Date.now() - 31 * 86400000))!;
  assert.equal((await call(env, rpc('tools/list', {}, expired))).status, 401);
});

test('a design revision is committed once, isolated by owner, and readable through the browser and MCP', async () => {
  const env = makeEnv(), ctx = makeCtx();
  const owner = await signIn(env, 'owner@example.org', { status: 'approved' }), peer = await signIn(env, 'peer@example.org', { status: 'approved' });
  const input = { ask: 'Design a Singapore web tier.', requestId: 'request_0001' };
  const memory = createMemory();
  memory.graph.nodes.web = { id: 'web', product: 'ecs', label: 'Linux servers', group: null };
  let runs = 0;
  const runners = {
    turn: async () => { runs++; return new Response(JSON.stringify({ type: 'commit', memory, changes: 'Added ECS' }) + '\n'); },
    price: async () => { throw new Error('unexpected'); },
  };
  const one = await changeDesign('design_solution', input, env, ctx, owner.user, runners);
  assert.equal(one.revision, 1);
  assert.deepEqual(await changeDesign('design_solution', input, env, ctx, owner.user, runners), one);
  await assert.rejects(changeDesign('design_solution', { ...input, ask: 'Changed' }, env, ctx, owner.user, runners), /different inputs/);
  assert.equal(runs, 1);
  const second = { ...input, designId: one.designId, revision: 1, requestId: 'request_0002' };
  const parallel = await Promise.allSettled([changeDesign('design_solution', second, env, ctx, owner.user, runners),
  changeDesign('design_solution', { ...second, requestId: 'request_0003' }, env, ctx, owner.user, runners)]);
  assert.equal(parallel.filter(p => p.status === 'fulfilled').length, 1);
  assert.equal(runs, 2);
  assert.deepEqual(await changeDesign('design_solution', input, env, ctx, owner.user, runners), one, 'old receipt is stable after edits');
  assert.equal((await getDesign(env, owner.user, one.designId)).revision, 2);
  await assert.rejects(getDesign(env, peer.user, one.designId), /not found/);
  const path = '/api/agent-designs/' + one.designId;
  assert.equal((await call(env, req(path, { cookie: peer.cookie }))).status, 404);
  assert.deepEqual((await (await call(env, req(path, { cookie: owner.cookie }))).json()).memory, memory);
  const read = (await issueKey(env.DB, owner.user.id, 'reader', 'read', 30, Date.now()))!;
  const wire = await (await call(env, rpc('tools/call', { name: 'get_design', arguments: { designId: one.designId } }, read))).json();
  assert.equal(wire.result.structuredContent.revision, 2);
  assert.equal(wire.result.structuredContent.url, ORIGIN + '/?design=' + one.designId);
  assert.equal(await turnsToday(env.DB, owner.user.id, Date.now()), 0);
});

test('estimating through MCP persists the result, shares web usage and replays without another model call', async (t) => {
  const env = makeEnv(), owner = await signIn(env, 'estimator@example.org', { status: 'approved' });
  const key = (await issueKey(env.DB, owner.user.id, 'Qoder', 'write', 30, Date.now()))!;
  const memory = createMemory();
  memory.graph.nodes.ecs = { id: 'ecs', product: 'ecs', label: 'Singapore ecs.g7.large', group: null };
  const design = await changeDesign('design_solution', { ask: 'Design the compute tier.', requestId: 'create_estimate_base' },
    env, makeCtx(), owner.user, {
    turn: async () => Response.json({ type: 'commit', memory, changes: 'Added ECS' }),
    price: async () => { throw new Error('unexpected'); },
  });
  const upstream = t.mock.method(globalThis, 'fetch', async () => {
    const msg = JSON.stringify({
      reply: 'Monthly compute updated.', changes: [{
        label: 'Linux servers', period: 'monthly',
        quantity: 600, basis: 'catalog', rateId: 'sg-g7-large-hour'
      }]
    });
    const chunk = { choices: [{ delta: { content: msg }, finish_reason: 'stop' }] };
    return new Response('data: ' + JSON.stringify(chunk) + '\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const params = {
    name: 'estimate_solution', arguments: {
      designId: design.designId, revision: 1, requestId: 'compute_estimate',
      ask: 'Two Singapore ecs.g7.large servers run 300 hours each monthly.'
    }
  };
  for (let i = 0; i < 2; i++) {
    const packet = await (await call(env, rpc('tools/call', params, key))).json();
    assert.ok(!packet.result?.isError, JSON.stringify(packet));
    assert.equal(packet.result.structuredContent.estimate.monthlyUsd, 64.8);
    assert.equal(packet.result.structuredContent.revision, 2);
  }
  assert.equal(upstream.mock.callCount(), 1);
  assert.equal(await turnsToday(env.DB, owner.user.id, Date.now()), 1);
});

test('MCP calls use the ordinary account quota and retries of a rejected call never spend another turn', async () => {
  const env = makeEnv({ TURNS_PER_DAY: '0' }), owner = await signIn(env, 'limited@example.org', { status: 'approved' });
  const key = (await issueKey(env.DB, owner.user.id, 'Qoder', 'write', 30, Date.now()))!;
  const params = { name: 'design_solution', arguments: { ask: 'Design an ECS tier.', requestId: 'unique_00001' } };
  for (let i = 0; i < 2; i++) {
    const body = await (await call(env, rpc('tools/call', params, key))).json();
    assert.equal(body.result.isError, true);
    assert.match(body.result.content[0].text, /quota-exceeded/);
  }
  assert.equal(await turnsToday(env.DB, owner.user.id, Date.now()), 0);
});
