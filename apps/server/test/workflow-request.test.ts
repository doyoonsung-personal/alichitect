import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemory } from '../../../packages/core/src/prompt.ts';
import { checkTurnRequest, LIMITS } from '../src/request.ts';
import { compactTurnMemory } from '../src/turn.ts';
import type { SessionMemory } from '../../../packages/core/src/types.ts';

const request = (memory = createMemory(), mode?: unknown) => ({ sessionId: 's', ask: 'Design', memory, ...(mode === undefined ? {} : { mode }) });

test('mode is closed, defaults to cloud, and stored turns keep their mode', () => {
  const parsed = checkTurnRequest(request());
  assert.ok(parsed.ok);
  assert.equal(parsed.value.mode, 'cloud');
  for (const mode of [null, '', 'other', 1, {}]) assert.equal(checkTurnRequest(request(createMemory(), mode)).ok, false);
  const memory = createMemory();
  memory.turns = [{ role: 'user', text: 'hello', mode: 'workflow' }];
  const r = checkTurnRequest(request(memory, 'workflow'));
  assert.ok(r.ok);
  assert.equal(r.value.memory.turns[0].mode, 'workflow');
});

function dual(): SessionMemory {
  const memory = createMemory();
  memory.workflow = { nodes: {}, edges: {}, groups: {} };
  memory.workflowSettings = { region: 'ap-southeast-1', approvalOff: ['send'], approvalOn: ['reply'] };
  memory.estimate = { runsPerMonth: 1000, scope: 'international', steps: { start: { inTokens: 800, outTokens: 200, offline: false } },
    items: { batch: { typical: 5, upper: 10 } }, shares: { route: 0.5 }, loops: { route: { typical: 2, upper: 3 } },
    agents: { start: { typical: 2, upper: 5, resultTokens: 100, searchesPerRequest: 1 } }, guardTypes: { start: 3 } };
  memory.workflow.nodes.start = { id: 'start', kind: 'agent', label: '\ud55c\uad6d \u4e2d\u6587', ai: 'qwen3.8-max', tool: 'web_search', turns: 5 };
  memory.workflowTombstones = [{ id: 'old', kind: 'ai', label: 'Removed', ai: 'qwen3.8-flash' },
    { id: 'old-link', from: 'start', to: 'old' }, { id: 'old-group', over: 'locale' }];
  return memory;
}

test('workflow parser round trips all settings, independently parses tombstones and strips unknown fields', () => {
  const memory = dual();
  const r = checkTurnRequest(request(memory, 'workflow'));
  assert.ok(r.ok);
  assert.deepEqual(r.value.memory, memory);
  const raw: any = structuredClone(memory);
  raw.workflow.nodes.start.provider = 'hidden';
  raw.estimate.steps.start.model = 'hidden';
  const clean = checkTurnRequest(request(raw));
  assert.ok(clean.ok);
  assert.deepEqual(clean.value.memory, memory);
});

test('workflow parser rejects bad shapes, prototype keys, oversized maps and unbounded estimates', () => {
  const mutations = [
    (m: any) => m.workflow.nodes.start.kind = 'node',
    (m: any) => m.workflow.nodes.start.id = 'different',
    (m: any) => m.workflow.nodes.start.turns = 51,
    (m: any) => m.workflow.nodes.start.private = 'true',
    (m: any) => m.workflow.nodes.start.label = 'x'.repeat(401),
    (m: any) => m.workflowSettings.approvalOn = ['unknown'],
    (m: any) => m.workflowTombstones = Array(81).fill(m.workflowTombstones[0]),
    (m: any) => m.estimate.runsPerMonth = Infinity,
    (m: any) => m.estimate.shares.route = 1.1,
    (m: any) => m.estimate.guardTypes.start = 4,
    (m: any) => m.estimate.steps = JSON.parse('{"__proto__":{}}'),
    (m: any) => m.workflow.nodes = Object.fromEntries(Array.from({ length: 41 }, (_, i) => ['n-' + i, { id: 'n-' + i, kind: 'end', label: '' }])),
    (m: any) => m.workflow.edges = Object.fromEntries(Array.from({ length: 61 }, (_, i) => ['e-' + i, { id: 'e-' + i, from: 'a', to: 'b' }])),
    (m: any) => m.workflow.groups = Object.fromEntries(Array.from({ length: 9 }, (_, i) => ['g-' + i, { id: 'g-' + i, over: '' }])),
  ];
  for (const mutate of mutations) {
    const m = dual(); mutate(m);
    assert.equal(checkTurnRequest(request(m)).ok, false, String(mutate));
  }
});

test('large Korean and Chinese dual-document request is compacted below 512 KiB in UTF-8', (t) => {
  const m = dual();
  const text = '\ud55c\uad6d \u4e2d\u6587'.repeat(40);
  for (let i = 0; i < LIMITS.nodes; i++) m.graph.nodes['n-' + i] = {
    id: 'n-' + i, product: 'ecs', label: text.slice(0, 40), why: text.slice(0, 160), group: null,
  };
  for (let i = 0; i < LIMITS.edges; i++) m.graph.edges['e-' + i] = { id: 'e-' + i, from: 'n-0', to: 'n-1', label: text.slice(0, 40) };
  for (let i = 0; i < LIMITS.groups; i++) m.graph.groups['g-' + i] = { id: 'g-' + i, kind: 'vpc', label: text.slice(0, 40), parent: null };
  m.workflow!.nodes = {};
  for (let i = 0; i < LIMITS.workflowNodes; i++) m.workflow!.nodes['s-' + i] = { id: 's-' + i, kind: 'end', label: text.slice(0, 40), why: text.slice(0, 160) };
  for (let i = 0; i < LIMITS.workflowEdges; i++) m.workflow!.edges['l-' + i] = { id: 'l-' + i, from: 's-0', to: 's-1', label: text.slice(0, 40) };
  for (let i = 0; i < LIMITS.workflowGroups; i++) m.workflow!.groups['r-' + i] = { id: 'r-' + i, over: text.slice(0, 40) };
  m.tombstones = Array.from({ length: 80 }, () => m.graph.nodes['n-0']);
  m.workflowTombstones = Array.from({ length: 80 }, () => m.workflow!.nodes['s-0']);
  m.turns = Array.from({ length: 200 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: text.repeat(4), changes: text.repeat(5) }));
  const before = structuredClone(m);
  const bytes = (memory: SessionMemory) => Buffer.byteLength(JSON.stringify({ ...request(memory, 'workflow'), ask: '\ud55c\uad6d\u4e2d\u6587'.repeat(1500) }));
  assert.ok(bytes(m) > 512 * 1024);
  const compact = compactTurnMemory(m);
  assert.ok(bytes(compact) < 512 * 1024);
  assert.deepEqual(compact.graph, m.graph);
  assert.deepEqual(compact.workflow, m.workflow);
  assert.deepEqual(m, before);
  assert.ok(checkTurnRequest(request(compact, 'workflow')).ok);
  t.diagnostic(`UTF-8 request: ${bytes(m)} bytes before; ${bytes(compact)} after compaction (limit 524288)`);
  assert.equal(compactTurnMemory(createMemory()).turns.length, 0);
});
