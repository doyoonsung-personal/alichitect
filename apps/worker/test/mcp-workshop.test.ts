import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { calculateSolutionEstimate, pricingDesignKey } from '../../../packages/core/src/solution-pricing.ts';
import { turnsToday } from '../src/db.ts';
import { issueKey } from '../src/mcp-keys.ts';
import { prepareWorkshop, workshopInputSchema, workshopOutputSchema } from '../src/mcp-workshop.ts';
import { call, makeEnv, ORIGIN, req, signIn } from './helpers.ts';

const rpc = (method: string, params: object, token?: string) => req('/mcp', {
  method: 'POST', type: 'application/json', origin: null,
  headers: { Accept: 'application/json, text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
});

async function fixture(status: 'current' | 'stale' | 'missing' = 'current') {
  const env = makeEnv({ TURNS_PER_DAY: '0' });
  const owner = await signIn(env, 'workshop@example.org', { status: 'approved' });
  const memory = createMemory();
  memory.turns = [{ role: 'user', text: 'Review stock and require approval before purchasing.' },
    { role: 'assistant', text: 'A proposed purchasing workflow.' }];
  memory.requirements = ['Approval before purchase'];
  memory.constraints = [{ text: 'Keep the existing stock system' }];
  memory.assumptions = [{ id: 'volume', text: 'Monthly volume remains unconfirmed' }];
  memory.questions = [{ id: 'owner', text: 'Who approves a purchase?', options: ['Store manager', 'Procurement team'] }];
  memory.workflow = { nodes: {
    review: { id: 'review', kind: 'human', label: 'Review purchase', task: 'approve', subject: 'purchase' },
    purchase: { id: 'purchase', kind: 'act', label: 'Place purchase', approval: 'required', effect: 'write', runs: 'customer' },
    classify: { id: 'classify', kind: 'ai', label: 'Review stock', product: 'model-studio', runs: 'fc' },
  }, edges: { approved: { id: 'approved', from: 'review', to: 'purchase', kind: 'branch', outcome: 'approve' } }, groups: {} };
  memory.workflowSettings = { region: 'ap-southeast-1', approvalOn: ['write'] };
  memory.estimate = { runsPerMonth: 1200, scope: 'international', loops: { revision: { typical: 1, upper: 3 } } };
  memory.deploymentSource = 'older-workflow-fingerprint';
  const estimate = calculateSolutionEstimate({ items: [{ label: 'Current runtime', period: 'monthly', quantity: 3,
    unit: 'unit', unitUsd: 98765.25, basis: 'user', source: 'Customer supplied planning rate' }],
    assumptions: ['Sizing pending validation'], unknowns: ['Integration effort'] });
  const pricing = status === 'missing' ? undefined : { designKey: status === 'stale' ? 'old-design' : pricingDesignKey(memory), estimate,
    messages: [{ role: 'user', text: 'Use three runtime units.' }] };
  const designId = crypto.randomUUID();
  const snapshot = { title: 'Stock review', mode: 'workflow', memory, summary: 'A proposed purchasing workflow.', pricing };
  await env.DB.prepare("INSERT INTO mcp_revisions(user_id,request_id,fingerprint,design_id,revision,status,snapshot,created_at) VALUES (?,?,?,?,?,'done',?,?)")
    .bind(owner.user.id, 'workshop-fixture', '', designId, 4, JSON.stringify(snapshot), 123456).run();
  return { env, owner, designId, memory, estimate };
}

test('workshop returns evidence and instructions with no generated deck, model call, usage or snapshot mutation', async t => {
  const { env, owner, designId, memory, estimate } = await fixture();
  const before = await env.DB.prepare('SELECT snapshot FROM mcp_revisions').first();
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Workshop must not call a model or network'); });
  const goal = '</script><script>fetch("https://example.invalid")</script>';
  const brief = await prepareWorkshop(env, { ...owner.user, lang: 'ko' }, { designId, meetingGoal: goal });
  assert.equal(brief.lang, 'ko');
  assert.equal(brief.audience, 'client');
  assert.equal(brief.snapshot.revision, 4);
  assert.equal(brief.snapshot.updatedAt, 123456);
  assert.equal(brief.snapshot.sourceUrl, `${ORIGIN}/?design=${designId}`);
  assert.deepEqual(brief.snapshot.workflow, memory.workflow);
  assert.deepEqual(brief.snapshot.workflowSettings, memory.workflowSettings);
  assert.deepEqual(brief.snapshot.workflowEstimateSettings, memory.estimate);
  assert.equal(brief.snapshot.deployment?.stale, true);
  assert.equal(brief.snapshot.deployment?.sourceFingerprint, memory.deploymentSource);
  assert.ok(brief.snapshot.services.items.every(service => service.status && service.availability && service.verified));
  assert.equal(brief.snapshot.requirements[0].status, 'needs-validation');
  assert.equal(brief.snapshot.customerContext.statements[0].status, 'stated-in-input');
  assert.deepEqual(brief.snapshot.pricing.estimate, estimate);
  assert.equal(brief.snapshot.pricing.estimate!.oneTimeUsd, null, 'unpriced is retained as null, never zero');
  assert.equal(brief.meetingGoal?.text, goal);
  assert.ok(brief.authoring.instructions.every(instruction => !instruction.includes(goal)), 'source notes stay data');
  assert.match(brief.authoring.instructions.join('\n'), /textContent|Escape source strings/);
  assert.match(brief.authoring.instructions.join('\n'), /no external telemetry/);
  assert.equal(brief.authoring.author, 'calling-agent');
  assert.equal(brief.authoring.deliverable, 'local-standalone-html');
  assert.equal('html' in brief, false);
  assert.equal('downloadUrl' in brief, false);
  assert.ok(brief.discussion.some(item => item.id === 'approval-boundaries'));
  assert.ok(brief.discussion.some(item => item.id === 'integration-ownership'));
  assert.ok(brief.discussion.some(item => item.question === memory.questions![0].text));
  assert.ok(workshopOutputSchema.safeParse(brief).success);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(await turnsToday(env.DB, owner.user.id, Date.now()), 0);
  assert.deepEqual(await env.DB.prepare('SELECT snapshot FROM mcp_revisions').first(), before);
  assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM mcp_pdf_exports').first<{ n: number }>())!.n, 0);
});

test('stale pricing withholds every old estimate field; missing pricing remains distinct', async () => {
  for (const status of ['stale', 'missing'] as const) {
    const { env, owner, designId } = await fixture(status);
    const brief = await prepareWorkshop(env, owner.user, { designId, lang: 'zh', audience: 'alibaba' });
    assert.equal(brief.snapshot.pricing.status, status);
    assert.equal(brief.snapshot.pricing.stale, status === 'stale');
    assert.equal(brief.snapshot.pricing.estimate, undefined);
    assert.equal(brief.snapshot.pricing.statements, undefined);
    assert.equal(brief.snapshot.pricing.priorAnswersWithheld, status === 'stale');
    assert.equal(brief.snapshot.pricing.priorAnswerCount, status === 'stale' ? 1 : 0);
    assert.doesNotMatch(JSON.stringify(brief), /98765|296295|Sizing pending validation|Use three runtime units/);
    assert.equal(brief.lang, 'zh');
    assert.match(brief.authoring.instructions.join('\n'), /Alibaba account\/SA team/);
  }
});

test('workshop is discovered and callable with both key scopes, respects owner isolation and uses no allowance', async t => {
  const { env, owner, designId } = await fixture();
  const peer = await signIn(env, 'workshop-peer@example.org', { status: 'approved', role: 'admin' });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No external call expected'); });
  assert.equal((await call(env, rpc('tools/call', { name: 'prepare_workshop', arguments: { designId } }))).status, 401);
  for (const scope of ['read', 'write'] as const) {
    const key = (await issueKey(env.DB, owner.user.id, scope, scope, 30, Date.now()))!;
    const tools = (await (await call(env, rpc('tools/list', {}, key))).json()).result.tools;
    const tool = tools.find((item: { name: string }) => item.name === 'prepare_workshop');
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.inputSchema.properties.meetingGoal.maxLength, 2000);
    assert.equal(tool.inputSchema.properties.audience.default, 'client');
    const response = await (await call(env, rpc('tools/call', { name: 'prepare_workshop', arguments: { designId, lang: 'en' } }, key))).json();
    assert.equal(response.result.structuredContent.snapshot.revision, 4);
    assert.equal(response.result.content.length, 1);
    assert.equal(response.result.content[0].type, 'text');
    const invalid = await (await call(env, rpc('tools/call', { name: 'prepare_workshop', arguments: { designId, lang: 'fr' } }, key))).json();
    assert.ok(invalid.error || invalid.result?.isError);
  }
  const otherKey = (await issueKey(env.DB, peer.user.id, 'peer', 'read', 30, Date.now()))!;
  const denied = await (await call(env, rpc('tools/call', { name: 'prepare_workshop', arguments: { designId } }, otherKey))).json();
  assert.equal(denied.result.isError, true);
  assert.doesNotMatch(JSON.stringify(denied), /Stock review|98765|Approval before purchase/);
  await assert.rejects(prepareWorkshop(env, peer.user, { designId }), /not found/);
  assert.equal(await turnsToday(env.DB, owner.user.id, Date.now()), 0);
});

test('workshop inputs reject malformed IDs, oversized meeting notes and unknown audience', () => {
  const designId = crypto.randomUUID();
  assert.equal(workshopInputSchema.safeParse({ designId: 'not-an-id' }).success, false);
  assert.equal(workshopInputSchema.safeParse({ designId, meetingGoal: 'x'.repeat(2001) }).success, false);
  assert.equal(workshopInputSchema.safeParse({ designId, audience: 'sales' }).success, false);
});

test('legacy snapshots without optional context arrays still produce a workshop brief', async () => {
  const { env, owner, designId } = await fixture();
  const row = await env.DB.prepare('SELECT snapshot FROM mcp_revisions').first<{ snapshot: string }>();
  const snapshot = JSON.parse(row!.snapshot);
  delete snapshot.memory.questions;
  delete snapshot.memory.assumptions;
  delete snapshot.memory.constraints;
  await env.DB.prepare('UPDATE mcp_revisions SET snapshot=?').bind(JSON.stringify(snapshot)).run();
  const brief = await prepareWorkshop(env, owner.user, { designId });
  assert.deepEqual(brief.snapshot.questions, []);
  assert.deepEqual(brief.snapshot.assumptions, []);
  assert.deepEqual(brief.snapshot.constraints, []);
});
