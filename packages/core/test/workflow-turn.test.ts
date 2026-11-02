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
