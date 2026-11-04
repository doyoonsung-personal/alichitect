import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { call, makeCtx, makeEnv, ORIGIN, req, signIn } from './helpers.ts';
import { issueKey } from '../src/mcp-keys.ts';
import worker from '../src/index.ts';
import { changeDesign, getDesign } from '../src/mcp-designs.ts';
import { turnsToday } from '../src/db.ts';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { pricingDesignKey } from '../../../packages/core/src/solution-pricing.ts';

const rpc = (method: string, params = {}, token?: string, origin: string | null = null) => req('/mcp', {
  method: 'POST', origin, type: 'application/json', headers: { Accept: 'application/json, text/event-stream', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
});
const form = (path: string, cookie: string, values: Record<string, string>, origin?: string) =>
  req(path, { method: 'POST', cookie, body: new URLSearchParams(values).toString(), type: 'application/x-www-form-urlencoded', origin });

test('MCP writes the handoff from the saved design, charges once, and pins the private download', async t => {
  const assets = new URL('../../web/dist/', import.meta.url);
  const env = makeEnv({ ASSETS: { fetch: async request => new Response(await readFile(new URL(new URL(request.url).pathname.slice(1), assets))) } });
  const owner = await signIn(env, 'pdf@example.org', { status: 'approved' });
  const peer = await signIn(env, 'other@example.org', { status: 'approved', role: 'admin' });
  const writer = (await issueKey(env.DB, owner.user.id, 'writer', 'write', 30, Date.now()))!;
  const reader = (await issueKey(env.DB, owner.user.id, 'reader', 'read', 30, Date.now()))!;
  const peerKey = (await issueKey(env.DB, peer.user.id, 'peer', 'write', 30, Date.now()))!;
  const memory = createMemory();
  memory.graph.nodes.web = { id: 'web', product: 'ecs', label: 'Application', group: null };
  const designId = crypto.randomUUID();
  const snapshot = JSON.stringify({ title: 'Portal', mode: 'cloud', memory, summary: 'Application tier' });
  const save = (revision: number) => env.DB.prepare("INSERT INTO mcp_revisions(user_id,request_id,fingerprint,design_id,revision,status,snapshot,created_at) VALUES (?,?,?,?,?,'done',?,?)")
    .bind(owner.user.id, 'test-pdf-' + revision, '', designId, revision, snapshot, Date.now()).run();
  await save(1);
  const input = { designId, revision: 1, lang: 'ko', title: '포털 설계', narrative: { exec: '고객 전용 포털을 구축합니다.' } };
  const authored = '지원팀이 먼저 고객 전용 포털에서 접수 절차를 검증하도록 제안합니다.';
  const sections = [
    { k: 'exec', text: authored },
    { k: 'need', id: 'a', source: 'general', need: '접수 경로', answer: '문의를 한 곳에서 확인합니다.', products: ['ecs'] },
    { k: 'need', id: 'b', source: 'general', need: '담당자 확인', answer: '담당자가 요청을 확인합니다.', products: [] },
    { k: 'why', product: 'ecs', text: '지원팀이 접수 창구를 독립적으로 운영할 수 있습니다.' },
    { k: 'outcome', title: '접수 확인', text: '담당자가 요청을 추적할 수 있습니다.' },
    { k: 'tradeoff', text: '연동 범위를 먼저 결정해야 합니다.', mitigation: '접수 흐름을 시험합니다.' },
    { k: 'next', text: '접수부터 담당자 확인까지 시험합니다.' },
  ];
  const upstream = t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, 'qwen3.8-max');
    assert.equal(body.enable_thinking, true);
    assert.equal(body.thinking_budget, 6_144);
    assert.ok(JSON.stringify(body.messages).includes(input.narrative.exec));
    const delta = { choices: [{ delta: { content: sections.map(s => JSON.stringify(s)).join('\n') + '\n' }, finish_reason: 'stop' }] };
    return new Response('data: ' + JSON.stringify(delta) + '\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const invoke = async (key: string, args: object) => (await (await call(env, rpc('tools/call', { name: 'export_proposal_pdf', arguments: args }, key))).json());
  const denied = await invoke(reader, input);
  assert.ok(denied.error || denied.result?.isError);
  assert.equal((await invoke(peerKey, input)).result.isError, true);
  const preparing = (await invoke(writer, { ...input, includeFile: true })).result.structuredContent;
  assert.equal(preparing.status, 'preparing');
  assert.equal((await invoke(writer, input)).result.structuredContent.url, preparing.url);
  const pendingPage = await call(env, req(new URL(preparing.url).pathname, { cookie: owner.cookie }));
  assert.equal(pendingPage.status, 202);
  assert.equal(pendingPage.headers.get('Refresh'), '15');
  assert.equal((await call(env, req(new URL(preparing.url).pathname, { cookie: peer.cookie }))).status, 404);
  const ctx = makeCtx();
  await Promise.all([worker.scheduled({}, env, ctx), worker.scheduled({}, env, ctx)]);
  await ctx.flush();
  const result = (await invoke(writer, { ...input, includeFile: true })).result;
  assert.ok(!result.isError, result.content[0].text);
  const info = result.structuredContent;
  assert.equal(info.status, 'ready');
  assert.equal(info.revision, 1);
  assert.match(info.fileName, /^포털-설계.*\.pdf$/u);
  const attachment = result.content[1].resource;
  assert.equal(attachment.mimeType, 'application/pdf');
  assert.equal(attachment.uri, info.url);
  assert.equal(Buffer.from(attachment.blob, 'base64').subarray(0,5).toString(), '%PDF-');
  const again = (await invoke(writer, input)).result;
  assert.equal(again.structuredContent.url, info.url);
  assert.equal(again.content.length, 1);
  await save(2);
  assert.equal((await invoke(writer, input)).result.structuredContent.url, info.url);
  assert.equal((await invoke(writer, { ...input, title: 'Different export' })).result.isError, true);
  const path = new URL(info.url).pathname;
  assert.equal((await call(env, req(path))).status, 302);
  assert.equal((await call(env, req(path, { cookie: peer.cookie }))).status, 404);
  const pdf = await call(env, req(path, { cookie: owner.cookie }));
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('Content-Type'), 'application/pdf');
  assert.match(pdf.headers.get('Content-Disposition')!, /filename\*=UTF-8''/);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(), '%PDF-');
  assert.equal((await env.DB.prepare('SELECT revision FROM mcp_pdf_exports').first<{revision:number}>())?.revision, 1);
  assert.equal(upstream.mock.callCount(), 1);
  const saved = await env.DB.prepare('SELECT options FROM mcp_pdf_exports').first<{options:string}>();
  assert.equal(JSON.parse(saved!.options).draft.exec, authored);
  assert.equal(await turnsToday(env.DB, owner.user.id, Date.now()), 1);
  env.TURNS_PER_DAY = '1';
  const second = { ...input, revision: 2 };
  const pending = (await invoke(writer, second)).result.structuredContent;
  await worker.scheduled({}, env, ctx);
  await ctx.flush();
  assert.equal((await invoke(writer, second)).result.isError, true);
  assert.equal((await call(env, req(new URL(pending.url).pathname, { cookie: owner.cookie }))).status, 503);
  assert.equal(upstream.mock.callCount(), 1);
  env.TURNS_PER_DAY = '3';
  assert.equal((await invoke(writer, { ...second, retryFailed: true })).result.structuredContent.status, 'preparing');
  await worker.scheduled({}, env, ctx);
  await ctx.flush();
  assert.equal((await invoke(writer, second)).result.structuredContent.status, 'ready');
  assert.equal(upstream.mock.callCount(), 2);
});

test('the key page explains remote setup in each language and gives valid client-specific examples', async () => {
  const env = makeEnv(), owner = await signIn(env, 'onboarding@example.org', { status: 'approved' });
  for (const [lang, title] of [['en', 'Connect an agentic IDE'], ['ko', '에이전트 IDE 연결하기'], ['zh', '连接智能体 IDE']]) {
    const page = await (await call(env, req('/account/keys', { cookie: owner.cookie, headers: { 'Accept-Language': lang } }))).text();
    assert.ok(page.includes(title));
    assert.match(page, /<textarea id="mcp-prompt"[^>]+>[^<]*design_solution[^<]*estimate_solution/);
    assert.ok(page.includes('data-copy-from="mcp-prompt"'));
    assert.ok(page.includes('<code>Authorization: Bearer &lt;YOUR_API_KEY&gt;</code>'));
    for (const name of ['Streamable HTTP', 'get_design', 'design_solution', 'estimate_solution', 'export_proposal_pdf']) assert.ok(page.includes(name));
    const examples = [...page.matchAll(/<details><summary>[^<]+<\/summary><pre class="mcp-config">([^<]+)<\/pre>/g)]
      .map(([, html]) => JSON.parse(html.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>')));
    const servers = { alichitect: { type: 'http', url: ORIGIN + '/mcp', headers: { Authorization: 'Bearer <YOUR_API_KEY>' } } };
    assert.deepEqual(examples, [{ mcpServers: servers }, { servers }]);
  }
});

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
  assert.match(hello.result.instructions, /write the client report yourself/);
  const discovery = (await (await call(env, rpc('tools/list', {}, key))).json()).result.tools;
  const draft = discovery.find((tool: { name: string }) => tool.name === 'design_solution');
  assert.match(draft.description, /first for a new solution brief/);
  assert.match(draft.inputSchema.properties.mode.description, /human approvals/);
  assert.equal(draft.annotations.destructiveHint, false);
  const list = async (k: string) => (await (await call(env, rpc('tools/list', {}, k))).json()).result.tools.map((v: { name: string }) => v.name).sort();
  assert.deepEqual(await list(key), ['design_solution', 'estimate_solution', 'export_proposal_pdf', 'get_design']);
  const read = (await issueKey(env.DB, owner.user.id, 'reader', 'read', 30, Date.now()))!;
  assert.deepEqual(await list(read), ['get_design']);
  const readHello = await (await call(env, rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }, read))).json();
  assert.match(readHello.result.instructions, /get_design/);
  assert.doesNotMatch(readHello.result.instructions, /design_solution|estimate_solution/);
  const denied = await (await call(env, rpc('tools/call', { name: 'estimate_solution', arguments: {} }, read))).json();
  assert.ok(denied.error || denied.result?.isError);
  await call(env, form('/account/keys/revoke', other.cookie, { id: key.slice(8, 24) }));
  assert.deepEqual(await list(key), ['design_solution', 'estimate_solution', 'export_proposal_pdf', 'get_design']);
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

test('a Korean business brief produces a workflow explanation and questions, then keeps a sizing answer in Korean', async () => {
  const env = makeEnv(), { user } = await signIn(env, 'discovery@example.org', { status: 'approved' });
  const brief = 'IT 지원 요청을 분류하고 테스트한 뒤 관리자 승인을 받아 재고를 확인해 주세요.';
  const explanation = '요청을 분류하고 테스트 환경에서 검증한 뒤 관리자 승인을 거쳐 재고를 조회합니다.';
  const question = '월간 지원 요청은 몇 건인가요?';
  const memory = createMemory();
  memory.turns = [{ role: 'user', text: brief }, { role: 'assistant', text: explanation }];
  memory.questions = [{ id: 'volume', text: question }];
  const runners = {
    turn: async (req: Request) => {
      const input = await req.json();
      assert.equal(input.mode, 'workflow');
      assert.equal(input.ask, brief);
      return Response.json({ type: 'commit', memory, changes: '+triage +approval' });
    },
    price: async (req: Request) => {
      const input = await req.json();
      assert.equal(input.lang, 'ko');
      return Response.json({ pricing: {
        designKey: pricingDesignKey(memory), messages: [{ role: 'assistant', text: '건당 처리 시간은 얼마나 되나요?' }],
        estimate: { currency: 'USD', monthlyUsd: null, oneTimeUsd: null, items: [], assumptions: [], unknowns: ['건당 처리 시간'] },
      } });
    },
  };
  const design = await changeDesign('design_solution', { ask: brief, requestId: 'business_brief' }, env, makeCtx(), user, runners);
  assert.equal(design.mode, 'workflow');
  assert.equal(design.summary, explanation);
  assert.equal(design.questions?.[0].text, question);
  const estimate = await changeDesign('estimate_solution', { ask: '2000', requestId: 'business_volume',
    designId: design.designId, revision: design.revision }, env, makeCtx(), { ...user, lang: 'en' }, runners);
  assert.equal(estimate.designId, design.designId);
  assert.equal(estimate.revision, 2);
  assert.equal(estimate.pricingReply, '건당 처리 시간은 얼마나 되나요?');
});

test('explicit mode and existing design mode take precedence, and the model’s done summary survives an empty narration', async () => {
  const env = makeEnv(), { user } = await signIn(env, 'topology@example.org', { status: 'approved' });
  const modes: string[] = [];
  const runners = {
    turn: async (req: Request) => {
      const input = await req.json();
      modes.push(input.mode);
      return new Response([
        { type: 'done', phase: 'main', summary: 'The compute tier connects to an external database.' },
        { type: 'commit', memory: createMemory(), changes: '+ecs' },
      ].map(e => JSON.stringify(e)).join('\n'));
    },
    price: async () => { throw new Error('Unexpected pricing call'); },
  };
  const create = (ask: string, requestId: string, mode?: 'cloud' | 'workflow') =>
    changeDesign('design_solution', { ask, requestId, mode }, env, makeCtx(), user, runners);
  const first = await create('Design a cloud architecture for a ticket approval workflow.', 'cloud_topology');
  assert.equal(first.summary, 'The compute tier connects to an external database.');
  const chosen = await create('Classify tickets and require approval.', 'explicit_cloud', 'cloud');
  await changeDesign('design_solution', { ask: 'Add a workflow.', requestId: 'retain_mode',
    designId: chosen.designId, revision: chosen.revision }, env, makeCtx(), user, runners);
  await create('Price an ECS instance.', 'ambiguous_default');
  assert.deepEqual(modes, ['cloud', 'cloud', 'cloud', 'cloud']);
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
