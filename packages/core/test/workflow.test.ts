import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow, endWorkflowTurn, makeStep, makeLink } from '../src/workflow.ts';
import { createCatalog } from '../src/catalog.ts';
import { createModelTable } from '../src/models.ts';
import { ID_PATTERN, normalizeId } from '../src/reducer.ts';
import { repairWorkflow, validateWorkflowOp } from '../src/workflow-validate.ts';
import type { WorkflowGraph, WorkflowOp } from '../src/types.ts';
const step = (id: string): WorkflowOp => ({ t: 'step', id, kind: 'trigger', label: id });
const build = (...ops: WorkflowOp[]): WorkflowGraph => {
  let wf = emptyWorkflow(); const ctx = createWorkflowCtx();
  for (const op of ops) wf = applyWorkflowOp(wf, op, ctx).workflow;
  return wf;
};
const freeze = (value: object): void => { Object.freeze(value); for (const v of Object.values(value)) if (v && typeof v === 'object') freeze(v); };
test('step replaces optional fields, preserves after, and returns the same graph on no-op', () => {
  const wf = build({ t: 'step', id: 'a', kind: 'ai', label: 'A', after: 'start', ai: 'qwen-flash', why: 'old' });
  freeze(wf);
  const r = applyWorkflowOp(wf, { t: 'step', id: 'a', kind: 'end', label: 'End' });
  assert.deepEqual(r.workflow.nodes.a, { id: 'a', kind: 'end', label: 'End', after: 'start' });
  assert.deepEqual(r.updated, ['a']); assert.equal(wf.nodes.a.why, 'old');
  assert.equal(applyWorkflowOp(r.workflow, { t: 'step', ...r.workflow.nodes.a }).workflow, r.workflow);
});
test('collisions across all element kinds get deterministic suffixes', () => {
  const wf = build(step('a'), step('b'), { t: 'each', id: 'a', over: 'items' }, { t: 'link', id: 'a', from: 'a', to: 'b' }, step('a-2'));
  assert.ok(wf.groups['a-2']); assert.ok(wf.edges['a-3']); assert.ok(wf.nodes['a-2-2']);
});
test('pending links replace by id, flush, and expire at turn end', () => {
  const ctx = createWorkflowCtx(); let wf = emptyWorkflow();
  const op: WorkflowOp = { t: 'link', id: 'e', from: 'a', to: 'b' };
  assert.equal(applyWorkflowOp(wf, op, ctx).workflow, wf);
  applyWorkflowOp(wf, { ...op, label: 'latest' }, ctx); assert.equal(ctx.pending.length, 1);
  wf = applyWorkflowOp(wf, step('a'), ctx).workflow;
  wf = applyWorkflowOp(wf, step('b'), ctx).workflow;
  assert.equal(wf.edges.e.label, 'latest'); assert.equal(ctx.pending.length, 0);
  applyWorkflowOp(wf, { ...op, id: 'late', to: 'missing' }, ctx);
  ctx.removedThisTurn.push('old'); assert.equal(endWorkflowTurn(ctx)[0].code, 'dangling-edge');
  assert.deepEqual(ctx.pending, []); assert.deepEqual(ctx.removedThisTurn, []);
});
test('splice preserves first half metadata and uses a free second link id', () => {
  const wf = build(step('a'), step('b'), { t: 'link', id: 'e', from: 'a', to: 'b', kind: 'branch', outcome: 'approve', label: 'yes', max: 2 });
  freeze(wf);
  const r = applyWorkflowOp(wf, { t: 'splice', into: 'e', id: 'x', kind: 'guard', label: 'Guard' });
  assert.deepEqual(r.workflow.edges.e, { id: 'e', from: 'a', to: 'x', kind: 'branch', label: 'yes', max: 2, outcome: 'approve' });
  assert.deepEqual(r.workflow.edges['x-b'], { id: 'x-b', from: 'x', to: 'b', kind: 'next' });
  const missing = applyWorkflowOp(wf, { t: 'splice', into: 'missing', id: 'x', kind: 'end', label: 'End' });
  assert.ok(missing.workflow.nodes.x); assert.equal(missing.warnings[0].code, 'unknown-id');
});
test('unstep cascades attachments and links with tombstones and suppresses repeated removal warnings', () => {
  const wf = build(step('a'), { t: 'step', id: 'b', kind: 'agent', label: 'B', on: 'a' }, { t: 'step', id: 'c', kind: 'tool', label: 'C', on: 'b' }, { t: 'link', id: 'e', from: 'a', to: 'c' });
  freeze(wf); const ctx = createWorkflowCtx(); const r = applyWorkflowOp(wf, { t: 'unstep', id: 'a' }, ctx);
  assert.deepEqual(r.removed, ['a', 'b', 'c', 'e']); assert.equal(r.tombstones.length, 4);
  assert.equal(applyWorkflowOp(r.workflow, { t: 'unstep', id: 'c' }, ctx).warnings.length, 0);
  assert.equal(applyWorkflowOp(r.workflow, { t: 'unstep', id: 'unknown' }, ctx).workflow, r.workflow);
});
test('unstep group clears member repeat; unstep link removes only the link', () => {
  const wf = build({ t: 'each', id: 'g', over: 'items' }, { t: 'step', id: 'a', kind: 'trigger', label: 'A', repeat: 'g' }, step('b'), { t: 'link', id: 'e', from: 'a', to: 'b' });
  const r = applyWorkflowOp(wf, { t: 'unstep', id: 'g' }); assert.equal('repeat' in r.workflow.nodes.a, false); assert.deepEqual(r.updated, ['a']);
  const link = applyWorkflowOp(wf, { t: 'unstep', id: 'e' }); assert.deepEqual(link.removed, ['e']); assert.equal(Object.keys(link.workflow.nodes).length, 2);
});
test('node, edge, group and pending caps drop overflow; self links are rejected', () => {
  const ctx = createWorkflowCtx({ maxNodes: 2, maxEdges: 0, maxGroups: 0, maxPending: 0 }); const wf = build(step('a'), step('b'));
  for (const op of [step('c'), { t: 'each', id: 'g', over: 'items' }, { t: 'link', id: 'e', from: 'a', to: 'b' }, { t: 'link', id: 'p', from: 'a', to: 'missing' }] as WorkflowOp[]) {
    const r = applyWorkflowOp(wf, op, ctx); assert.equal(r.workflow, wf); assert.equal(r.warnings[0].code, 'cap-exceeded');
  }
  assert.equal(applyWorkflowOp(wf, { t: 'link', id: 'self', from: 'a', to: 'a' }).warnings[0].code, 'wf-bad-op');
});
test('builders use fixed order and omit undefined optional keys', () => {
  assert.deepEqual(Object.keys(makeStep({ label: 'A', kind: 'ai', id: 'a', why: undefined })), ['id', 'kind', 'label']);
  assert.deepEqual(Object.keys(makeLink({ to: 'b', id: 'e', from: 'a', max: undefined })), ['id', 'from', 'to']);
});
test('identical links and groups return the same input object', () => {
  const wf = build(step('a'), step('b'), { t: 'each', id: 'g', over: 'items', parallel: true }, { t: 'link', id: 'e', from: 'a', to: 'b' });
  freeze(wf);
  for (const op of [{ t: 'link', ...wf.edges.e }, { t: 'each', ...wf.groups.g }] as WorkflowOp[]) {
    const r = applyWorkflowOp(wf, op);
    assert.equal(r.workflow, wf);
    assert.deepEqual(r.added, []); assert.deepEqual(r.updated, []);
  }
});
test('caps permit replacement but a splice cannot leave a half-rewired graph', () => {
  const wf = build(step('a'), step('b'), { t: 'link', id: 'e', from: 'a', to: 'b' });
  freeze(wf);
  const ctx = createWorkflowCtx({ maxNodes: 2, maxEdges: 1 });
  assert.deepEqual(applyWorkflowOp(wf, { t: 'step', id: 'a', kind: 'trigger', label: 'Changed' }, ctx).updated, ['a']);
  assert.deepEqual(applyWorkflowOp(wf, { t: 'link', id: 'e', from: 'b', to: 'a' }, ctx).updated, ['e']);
  const r = applyWorkflowOp(wf, { t: 'splice', id: 'x', into: 'e', kind: 'guard', label: 'X' }, ctx);
  assert.equal(r.workflow, wf); assert.equal(r.warnings[0].code, 'cap-exceeded');
});
test('splice second half skips an occupied id and removals preserve tombstone values', () => {
  const wf = build(step('a'), step('b'), { t: 'each', id: 'x-b', over: 'items' }, { t: 'link', id: 'e', from: 'a', to: 'b' });
  freeze(wf);
  const r = applyWorkflowOp(wf, { t: 'splice', id: 'x', into: 'e', kind: 'guard', label: 'X' });
  assert.equal(r.workflow.edges['x-b-2'].to, 'b');
  const removed = applyWorkflowOp(wf, { t: 'unstep', id: 'a' });
  assert.deepEqual(removed.tombstones, [wf.nodes.a, wf.edges.e]);
});
test('splice cap failure leaves the original graph intact', () => {
  const wf = build(step('a'), step('b'), { t: 'link', id: 'e', from: 'a', to: 'b' });
  const r = applyWorkflowOp(wf, { t: 'splice', into: 'e', id: 'x', kind: 'guard', label: 'X' }, createWorkflowCtx({ maxEdges: 1 }));
  assert.equal(r.workflow, wf); assert.equal(r.warnings[0].code, 'cap-exceeded');
});
test('a reused link id with new endpoints replaces the link and says so', () => {
  const ctx = createWorkflowCtx();
  let wf = emptyWorkflow();
  for (const op of [step('a'), step('b'), step('c'), { t: 'link', id: 'l', from: 'a', to: 'b' } as WorkflowOp]) wf = applyWorkflowOp(wf, op, ctx).workflow;
  const r = applyWorkflowOp(wf, { t: 'link', id: 'l', from: 'a', to: 'c' }, ctx);
  assert.deepEqual(r.workflow.edges.l, { id: 'l', from: 'a', to: 'c' });
  assert.deepEqual(r.warnings.map((w) => [w.code, w.severity]), [['wf-id-collision', 'info']]);
  assert.match(r.warnings[0].msg, /a -> b/);
  // Re-sending the same link is quiet.
  assert.deepEqual(applyWorkflowOp(r.workflow, { t: 'link', id: 'l', from: 'a', to: 'c' }, ctx).warnings, []);
});

test('unstep cancels materialized and pending versions of a link', () => {
  const ctx = createWorkflowCtx(); let wf = emptyWorkflow();
  const ops: WorkflowOp[] = [
    { t: 'step', id: 'a', kind: 'trigger', label: 'a' },
    { t: 'step', id: 'b', kind: 'end', label: 'b' },
    { t: 'link', id: 'e', from: 'a', to: 'b' },
    { t: 'link', id: 'e', from: 'a', to: 'c' },
    { t: 'unstep', id: 'e' },
    { t: 'step', id: 'c', kind: 'end', label: 'c' },
  ];
  for (const op of ops) {
    const r = applyWorkflowOp(wf, op, ctx); wf = r.workflow;
    if (op.t === 'unstep') {
      assert.deepEqual(r.removed, ['e']);
      assert.deepEqual(r.tombstones, [{ id: 'e', from: 'a', to: 'b' }]);
      assert.deepEqual(ctx.pending, []); assert.deepEqual(r.warnings, []);
    }
  }
  assert.equal(wf.edges.e, undefined);
  applyWorkflowOp(wf, { t: 'link', id: 'pending', from: 'a', to: 'missing' }, ctx);
  const removed = applyWorkflowOp(wf, { t: 'unstep', id: 'pending' }, ctx);
  assert.equal(removed.workflow, wf);
  assert.deepEqual(removed.warnings, []); assert.deepEqual(removed.tombstones, []);
  assert.deepEqual(removed.removed, []); assert.deepEqual(ctx.pending, []);
  assert.deepEqual(ctx.removedThisTurn, ['e']);
});

test('splice reserves both halves before flushing pending links and rolls back failures', () => {
  const ctx = createWorkflowCtx({ maxEdges: 2 }); let wf = emptyWorkflow();
  const ops: WorkflowOp[] = [
    { t: 'step', id: 'a', kind: 'trigger', label: 'a' },
    { t: 'step', id: 'b', kind: 'end', label: 'b' },
    { t: 'link', id: 'e', from: 'a', to: 'b' },
    { t: 'link', id: 'p', from: 'a', to: 'x' },
  ];
  for (const op of ops) wf = applyWorkflowOp(wf, op, ctx).workflow;
  freeze(wf);
  const splice: WorkflowOp = { t: 'splice', into: 'e', id: 'x', kind: 'guard', label: 'x' };
  const r = applyWorkflowOp(wf, splice, ctx);
  assert.deepEqual(r.workflow.edges, {
    e: { id: 'e', from: 'a', to: 'x' },
    'x-b': { id: 'x-b', from: 'x', to: 'b', kind: 'next' },
  });
  assert.deepEqual(r.workflow.nodes.x, { id: 'x', kind: 'guard', label: 'x' });
  assert.deepEqual(r.warnings.filter(w => w.code === 'cap-exceeded').map(w => w.ids), [['p']]);
  assert.deepEqual(ctx.pending, []);

  // Capacity rejection must not upsert x or consume any queued requests.
  const full = createWorkflowCtx({ maxEdges: 1 });
  applyWorkflowOp(wf, ops[3], full);
  const pending = full.pending, before = structuredClone(pending);
  const rejected = applyWorkflowOp(wf, splice, full);
  assert.equal(rejected.workflow, wf); assert.deepEqual(rejected.added, []); assert.deepEqual(rejected.updated, []);
  assert.equal(rejected.warnings[0].code, 'cap-exceeded');
  assert.equal(full.pending, pending); assert.deepEqual(full.pending, before);

  // Even malformed input graphs must roll back a failure in either half.
  for (const missing of ['a', 'b']) {
    const broken = { ...wf, nodes: { ...wf.nodes } }; delete broken.nodes[missing];
    const rollback = createWorkflowCtx({ maxEdges: 2 });
    applyWorkflowOp(broken, ops[3], rollback);
    const queued = rollback.pending, snapshot = structuredClone(queued);
    const failed = applyWorkflowOp(broken, splice, rollback);
    assert.equal(failed.workflow, broken); assert.deepEqual(failed.added, []); assert.deepEqual(failed.updated, []);
    assert.equal(rollback.pending, queued); assert.deepEqual(rollback.pending, snapshot);
  }
});

const validationCatalog = createCatalog([], []);
const validationModels = createModelTable({ version: 'test', scope: 'international', models: [], tools: [] });
const validated = (raw: WorkflowOp): WorkflowOp => {
  const r = validateWorkflowOp(raw, validationCatalog, validationModels);
  assert.ok(r.op && ['step', 'link', 'each', 'splice', 'unstep'].includes(r.op.t));
  return r.op as WorkflowOp;
};

test('the literal overlong collision reference retains its normalization behavior', () => {
  const ctx = createWorkflowCtx(); let wf = emptyWorkflow();
  const ops: WorkflowOp[] = [
    { t: 'each', id: 'a1234567890123456789012345678901234567890', over: 'items' },
    { t: 'step', id: 'a1234567890123456789012345678901234567890', kind: 'end', label: 'node' },
    { t: 'unstep', id: 'a1234567890123456789012345678901234567890-2' },
  ];
  for (const raw of ops) {
    const op = validated(raw);
    if (op.t === 'unstep') assert.equal(op.id, ops[0].id);
    wf = applyWorkflowOp(wf, op, ctx).workflow;
  }
  // The literal legacy reference still names the group after normalization.
  assert.deepEqual(wf.groups, {});
  const [id] = Object.keys(wf.nodes);
  assert.equal(id, ops[0].id.slice(0, 39) + '-2');
  assert.match(id, ID_PATTERN); assert.equal(normalizeId(id), id);
});

test('generated ids round-trip through validation and removal deletes only the named element', () => {
  const base = 'a1234567890123456789012345678901234567890';
  const ctx = createWorkflowCtx(); let wf = emptyWorkflow();
  for (const raw of [
    { t: 'each', id: base, over: 'items' },
    { t: 'step', id: base, kind: 'end', label: 'node' },
  ] as WorkflowOp[]) wf = applyWorkflowOp(wf, validated(raw), ctx).workflow;
  const [id] = Object.keys(wf.nodes);
  assert.match(id, ID_PATTERN); assert.equal(normalizeId(id), id);
  const removed = applyWorkflowOp(wf, validated({ t: 'unstep', id }), ctx);
  assert.deepEqual(removed.removed, [id]); assert.deepEqual(removed.workflow.nodes, {});
  assert.deepEqual(removed.workflow.groups, wf.groups);

  // Truncation at a hyphen and growing suffixes must also remain canonical.
  const hyphenBase = 'a'.repeat(38) + '-bc';
  let collisions = build({ t: 'each', id: hyphenBase, over: 'items' });
  for (let i = 0; i < 10; i++) {
    const r = applyWorkflowOp(collisions, { t: 'step', id: hyphenBase, kind: 'end', label: 'node' });
    const [generated] = r.added;
    assert.ok(generated); assert.match(generated, ID_PATTERN); assert.equal(normalizeId(generated), generated);
    collisions = r.workflow;
  }

  const source = build(step('a'), { t: 'step', id: base, kind: 'end', label: 'end' }, { t: 'link', id: 'e', from: 'a', to: base });
  const spliced = applyWorkflowOp(source, { t: 'splice', into: 'e', id: 'x', kind: 'guard', label: 'x' }).workflow;
  const repairSource: WorkflowGraph = { ...source, nodes: { ...source.nodes, x: { id: 'x', kind: 'knowledge', label: 'x', on: base } } };
  const repaired = repairWorkflow(repairSource, validationCatalog, validationModels).workflow;
  for (const graph of [spliced, repaired]) {
    const generated = Object.values(graph.edges).find(e => e.id !== 'e');
    assert.ok(generated);
    assert.match(generated.id, ID_PATTERN); assert.equal(normalizeId(generated.id), generated.id);
    const r = applyWorkflowOp(graph, validated({ t: 'unstep', id: generated.id }));
    assert.deepEqual(r.removed, [generated.id]); assert.deepEqual(r.workflow.nodes, graph.nodes);
    assert.deepEqual(r.workflow.groups, graph.groups); assert.ok(r.workflow.edges.e);
  }
});

test('pending ids reserve the namespace and flushing preserves unrelated requests', () => {
  const ctx = createWorkflowCtx(); let wf = emptyWorkflow();
  const ops: WorkflowOp[] = [
    { t: 'step', id: 'a', kind: 'trigger', label: 'a' },
    { t: 'link', id: 'e', from: 'a', to: 'b' },
    { t: 'each', id: 'e', over: 'items' },
    { t: 'link', id: 'e-2', from: 'a', to: 'c' },
    { t: 'step', id: 'b', kind: 'end', label: 'b' },
    { t: 'step', id: 'c', kind: 'end', label: 'c' },
  ];
  for (const op of ops) wf = applyWorkflowOp(wf, op, ctx).workflow;
  assert.deepEqual(wf.groups, { 'e-2': { id: 'e-2', over: 'items' } });
  assert.deepEqual(wf.edges, { e: { id: 'e', from: 'a', to: 'b' }, 'e-2-2': { id: 'e-2-2', from: 'a', to: 'c' } });
  assert.deepEqual(ctx.pending, []);

  // A queue from an existing context can still collide with an imported graph.
  const imported = build(step('a'), { t: 'each', id: 'e', over: 'items' });
  const queued = createWorkflowCtx();
  queued.pending = [{ id: 'e', from: 'a', to: 'b' }, { id: 'e-2', from: 'a', to: 'c' }];
  const unrelated = queued.pending[1];
  const first = applyWorkflowOp(imported, { t: 'step', id: 'b', kind: 'end', label: 'b' }, queued);
  assert.equal(first.workflow.edges['e-3'].to, 'b');
  assert.equal(queued.pending.length, 1); assert.equal(queued.pending[0], unrelated);
  const second = applyWorkflowOp(first.workflow, { t: 'step', id: 'c', kind: 'end', label: 'c' }, queued);
  assert.equal(second.workflow.edges['e-2'].to, 'c'); assert.deepEqual(queued.pending, []);
});

test('splice rejects either endpoint before changing the graph or pending queue', () => {
  const ctx = createWorkflowCtx(); let wf = emptyWorkflow();
  for (const op of [
    { t: 'step', id: 'a', kind: 'trigger', label: 'a' },
    { t: 'step', id: 'b', kind: 'end', label: 'b' },
    { t: 'link', id: 'e', from: 'a', to: 'b' },
  ] as WorkflowOp[]) wf = applyWorkflowOp(wf, op, ctx).workflow;
  freeze(wf);
  for (const id of ['a', 'b']) {
    const pending = ctx.pending;
    const r = applyWorkflowOp(wf, { t: 'splice', into: 'e', id, kind: 'guard', label: 'Inserted guard' }, ctx);
    assert.equal(r.workflow, wf);
    assert.deepEqual(r.added, []); assert.deepEqual(r.updated, []); assert.deepEqual(r.removed, []); assert.deepEqual(r.tombstones, []);
    assert.deepEqual(r.warnings.map(w => [w.code, w.severity]), [['wf-bad-op', 'warn']]);
    assert.equal(ctx.pending, pending); assert.deepEqual(ctx.pending, []);
    assert.deepEqual(ctx.removedThisTurn, []);
  }
});

test('removal records are sorted independently of graph insertion order', () => {
  const wf: WorkflowGraph = {
    nodes: {
      a: { id: 'a', kind: 'agent', label: 'a', ai: 'qwen3.8-max', turns: 10 },
      b: { id: 'b', kind: 'tool', label: 'b', on: 'a' },
      c: { id: 'c', kind: 'tool', label: 'c', on: 'a' },
    },
    edges: {}, groups: {},
  };
  const compare = (graph: WorkflowGraph, id: string): void => {
    const reversed: WorkflowGraph = {
      nodes: { a: graph.nodes.a, ...Object.fromEntries(Object.entries(graph.nodes).filter(([key]) => key !== 'a').reverse()) },
      edges: Object.fromEntries(Object.entries(graph.edges).reverse()),
      groups: Object.fromEntries(Object.entries(graph.groups).reverse()),
    };
    freeze(graph); freeze(reversed);
    const firstCtx = createWorkflowCtx(), secondCtx = createWorkflowCtx();
    const first = applyWorkflowOp(graph, { t: 'unstep', id }, firstCtx);
    const second = applyWorkflowOp(reversed, { t: 'unstep', id }, secondCtx);
    assert.deepEqual(second, first);
    assert.deepEqual(secondCtx.removedThisTurn, firstCtx.removedThisTurn);
    assert.deepEqual(first.updated, [...first.updated].sort());
    if (id === 'a') assert.deepEqual(first.removed, ['a', 'b', 'c', ...Object.keys(graph.edges).sort()]);
  };
  compare(wf, 'a');
  compare({ ...wf, edges: { z: { id: 'z', from: 'a', to: 'b' }, d: { id: 'd', from: 'a', to: 'c' } } }, 'a');
  compare({ ...wf, nodes: Object.fromEntries(Object.values(wf.nodes).map(n => [n.id, { ...n, repeat: 'g' }])), groups: { g: { id: 'g', over: 'items' } } }, 'g');
});
