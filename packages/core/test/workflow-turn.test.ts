import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import modelsFile from '../catalog/models.json' with { type: 'json' };
import { createModelTable } from '../src/models.ts';
import type { ModelFile } from '../src/models.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { buildMessages, buildSystemPrompt, createMemory } from '../src/prompt.ts';
import { buildWorkflowSystemPrompt, workflowUserContent, serializeWorkflow } from '../src/workflow-prompt.ts';
import { diffWorkflows, runTurn, streamTurn } from '../src/llm.ts';
import type { RunTurnOptions, TurnEvent } from '../src/llm.ts';
import { emptyWorkflow } from '../src/workflow.ts';
import { checkTurnRequest } from '../../../apps/server/src/request.ts';

const catalog = loadCatalog();
const models = createModelTable(modelsFile as ModelFile);
const start = { t: 'step', id: 'start', kind: 'trigger', label: '\u6536\u5230 \ubb38\uc758' };
const end = { t: 'step', id: 'end', kind: 'end', label: 'Finished' };
const link = { t: 'link', id: 'route', from: 'start', to: 'end' };
const done = { t: 'done', summary: 'Finished' };
const content = (ops: unknown[]): string => ops.map((o) => JSON.stringify(o)).join('\n') + '\n';
function fake(replies: Array<unknown[] | number>, bodies: any[] = []): typeof fetch {
  return (async (_url, init) => {
    bodies.push(JSON.parse(String(init!.body)));
    const reply = replies.shift();
    assert.notEqual(reply, undefined, 'unexpected model call');
    if (typeof reply === 'number') return new Response('{}', { status: reply });
    return new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: content(reply!) } }] })
      + '\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;
}
function options(replies: Array<unknown[] | number>, bodies: any[] = []): RunTurnOptions<'workflow'> {
  return { apiKey: 'fake', mode: 'workflow', models, retries: 0, fetchImpl: fake(replies, bodies) };
}

test('finding 1: pinned Direct Mail exclusion repairs a connected workflow', async () => {
  const memory = createMemory();
  memory.constraints = [{ text: 'Never use Direct Mail', avoid: ['direct-mail'] }];
  const bodies: any[] = [];
  const act = { t: 'step', id: 'act', kind: 'act', label: 'Send', product: 'direct-mail', effect: 'send', approval: 'skip' };
  const r = await runTurn(memory, 'Design', catalog, options([
    [start, act, end, { ...link, to: 'act' }, { ...link, id: 'finish', from: 'act' }, done],
    [{ ...act, product: 'sms' }, done],
  ], bodies));
  assert.equal(bodies.length, 2);
  assert.ok(r.stats.warningsBefore.some((w) => w.code === 'constraint-avoid' && w.view === 'workflow'));
  assert.match(bodies[1].messages.at(-1).content, /constraint-avoid/);
  assert.equal(r.memory.workflow!.nodes.act.product, 'sms');
  assert.deepEqual(r.memory.constraints, memory.constraints);
});

test('workflow runtime exclusions and regional narration use the pinned-constraint repair path', async () => {
  for (const narration of [false, true]) {
    const memory = createMemory();
    memory.constraints = narration ? [{ text: 'Stay in Singapore', regions: ['ap-southeast-1'] }]
      : [{ text: 'Never use Direct Mail', avoid: ['direct-mail'] }];
    const bodies: any[] = [];
    const main = narration ? [start, { t: 'say', text: 'Replicate data to Tokyo.' }]
      : [{ ...start, runs: 'direct-mail' }];
    const r = await runTurn(memory, 'Design', catalog, options([
      [...main, end, link, done], [start, { t: 'say', text: 'Keep data in Singapore.' }, done],
    ], bodies));
    assert.equal(bodies.length, 2);
    assert.ok(r.stats.warningsBefore.some((w) => w.code === (narration ? 'constraint-region' : 'constraint-avoid')
      && w.view === 'workflow' && w.severity === 'error'));
    assert.ok(!r.stats.warningsAfter.some((w) => w.code.startsWith('constraint-') && w.severity === 'error'));
  }
});

test('finding 4: seeded forbidden model references never reach prompts or commits', async () => {
  const memory = createMemory();
  memory.workflow = { nodes: { start: { id: 'start', kind: 'trigger', label: 'Start', ai: 'claude-opus-5-5' },
    end: { id: 'end', kind: 'end', label: 'End' } }, edges: { route: { id: 'route', from: 'start', to: 'end' } }, groups: {} };
  memory.workflowTombstones = [{ id: 'old', kind: 'ai', label: 'Old', ai: 'claude-opus-5-5' }];
  const parsed = checkTurnRequest({ sessionId: 's', mode: 'workflow', ask: 'Keep it', memory });
  assert.ok(parsed.ok);
  const bodies: any[] = [];
  const r = await runTurn(parsed.value.memory, 'Keep it', catalog, options([[done]], bodies));
  assert.doesNotMatch(JSON.stringify(bodies), /claude-opus-5-5/);
  assert.doesNotMatch(JSON.stringify(r.memory), /claude-opus-5-5/);
});

test('finding 5: stored prototype ids are rejected; canonical ids can be removed', async () => {
  for (const id of ['constructor', '__proto__']) {
    const memory = createMemory();
    memory.workflow = { nodes: Object.fromEntries([[id, { id, kind: 'trigger', label: 'Start' }]]), edges: {}, groups: {} };
    assert.equal(checkTurnRequest({ sessionId: 's', ask: 'Remove', mode: 'workflow', memory }).ok, false);
  }
  const memory = createMemory();
  memory.workflow = { nodes: { 'constructor-id': { id: 'constructor-id', kind: 'trigger', label: 'Start' } }, edges: {}, groups: {} };
  const parsed = checkTurnRequest({ sessionId: 's', ask: 'Remove', mode: 'workflow', memory });
  assert.ok(parsed.ok);
  const r = await runTurn(parsed.value.memory, 'Remove', catalog,
    { ...options([[{ t: 'unstep', id: 'constructor' }, done]]), repair: false });
  assert.equal(Object.keys(r.memory.workflow!.nodes).length, 0);
  assert.match(r.changes, /-constructor-id/);
});

test('alternating prompts keep the cloud hash and select workflow content', () => {
  const cloud = buildSystemPrompt(catalog);
  for (let i = 0; i < 3; i++) {
    assert.equal(buildSystemPrompt(catalog, 'workflow', models), buildWorkflowSystemPrompt(catalog, models));
    assert.equal(buildSystemPrompt(catalog), cloud);
  }
  assert.equal(createHash('sha256').update(cloud).digest('hex'), '998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313');
  const memory = createMemory();
  const msgs = buildMessages(memory, 'Design', { catalog, models, mode: 'workflow' });
  assert.equal(msgs.at(-1)!.content, workflowUserContent(memory, 'Design'));
  assert.deepEqual(buildMessages(memory, 'Design', { catalog }), buildMessages(memory, 'Design', { catalog, mode: 'cloud' }));
});

test('workflow commit round trips into the second request and isolates the cloud document', async () => {
  const memory = createMemory();
  memory.graph.nodes.db = { id: 'db', product: 'rds', label: 'Keep', group: null };
  memory.workflowSettings = { region: 'ap-southeast-1', approvalOff: ['send'] };
  memory.estimate = { runsPerMonth: 500, steps: { end: { inTokens: 10, thinking: true } } };
  const before = structuredClone(memory);
  const first = await runTurn(memory, 'Design', catalog, options([[start, end, link, done]]));
  assert.deepEqual(memory, before, 'input untouched');
  assert.deepEqual(first.memory.graph, before.graph);
  assert.deepEqual(first.memory.workflowSettings, before.workflowSettings);
  assert.deepEqual(first.memory.estimate, before.estimate);
  assert.ok(first.memory.turns.every((t) => t.mode === 'workflow'));
  const request = checkTurnRequest({ sessionId: 's', mode: 'workflow', ask: 'Next', memory: first.memory });
  assert.ok(request.ok);
  assert.deepEqual(request.value.memory, first.memory);
  const bodies: any[] = [];
  const second = await runTurn(request.value.memory, 'Next', catalog, options([[done]], bodies));
  assert.deepEqual(second.memory.workflow, first.memory.workflow);
  assert.match(bodies[0].messages.at(-1).content, /\u6536\u5230 \ubb38\uc758/);
  const cloud = await runTurn(first.memory, 'No changes', catalog, { ...options([[done]]), mode: 'cloud' });
  assert.deepEqual(cloud.memory.workflow, first.memory.workflow);
  assert.deepEqual(cloud.memory.workflowTombstones, first.memory.workflowTombstones);
});

test('a truncated workflow continues from its partial document, including repair fallback', async () => {
  const bodies: any[] = [];
  const r = await runTurn(createMemory(), 'Design', catalog, options([[start], 503, [end, link, done]], bodies));
  assert.equal(bodies.length, 3);
  assert.equal(r.stats.repair!.kind, 'continue');
  assert.equal(r.stats.finalDone, true);
  assert.deepEqual(Object.keys(r.memory.workflow!.nodes), ['start', 'end']);
  assert.match(bodies[1].messages.at(-1).content, /\u6536\u5230 \ubb38\uc758/);
  assert.deepEqual(bodies[1].messages, bodies[2].messages);
  assert.ok(r.stats.warningsBefore.every((w) => w.view === 'workflow'));
});

test('error-level workflow findings trigger exactly one follow-up using the workflow serializer', async () => {
  const bodies: any[] = [];
  const r = await runTurn(createMemory(), 'Design', catalog, options([[end, done], [start, link, done]], bodies));
  assert.equal(bodies.length, 2);
  assert.equal(r.stats.repair!.kind, 'repair');
  const partial = { nodes: { end: { id: 'end', kind: 'end' as const, label: 'Finished' } }, edges: {}, groups: {} };
  assert.ok(bodies[1].messages.at(-1).content.includes(serializeWorkflow(partial)));
  assert.match(bodies[1].messages.at(-1).content, /wf-no-trigger/);
  assert.equal(r.stats.warningsAfter.filter((w) => w.severity === 'error').length, 0);
});

test('workflow pending links flush on done and truncation, and every stream warning is tagged', async () => {
  for (const tail of [[], [done]]) {
    const events: TurnEvent<'workflow'>[] = [];
    const r = await streamTurn({ ...options([]), catalog, messages: [], fetchImpl: fake([[link, ...tail]]), onEvent: (e) => events.push(e) });
    assert.ok(r.warnings.some((w) => w.code === 'dangling-edge'));
    assert.ok(r.warnings.every((w) => w.view === 'workflow'));
    assert.ok(events.filter((e) => e.type === 'warn').every((e) => e.warning.view === 'workflow'));
  }
});

test('workflow removals use their own tombstones and stable sorted change lines', async () => {
  const first = await runTurn(createMemory(), 'Design', catalog, options([[start, end, link, done]]));
  const r = await runTurn(first.memory, 'Remove', catalog, options([[{ t: 'unstep', id: 'end' }, done]]));
  assert.deepEqual(r.memory.workflowTombstones!.map((x) => x.id), ['end', 'route']);
  assert.deepEqual(r.memory.tombstones, []);
  assert.equal(r.changes, '-end -route');
  const wf = first.memory.workflow!;
  const reordered = { ...wf, nodes: Object.fromEntries(Object.entries(wf.nodes).map(([id, n]) =>
    [id, Object.fromEntries(Object.entries(n).reverse())])) } as typeof wf;
  assert.deepEqual(diffWorkflows(wf, reordered).updated, []);
  assert.deepEqual(diffWorkflows(emptyWorkflow(), wf), diffWorkflows(emptyWorkflow(), {
    ...wf, nodes: Object.fromEntries(Object.entries(wf.nodes).reverse()),
  }));
});
