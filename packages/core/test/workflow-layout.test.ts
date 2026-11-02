import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { loadCatalog, loadModels } from '../src/catalog-node.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '../src/workflow.ts';
import { validateWorkflowOp } from '../src/workflow-validate.ts';
import { GEOMETRY } from '../src/layout.ts';
import {
  layoutWorkflow, tidyWorkflow, workflowViewport, workflowLoopIds, workflowLayoutDiff, workflowUnrelatedMoves, WORKFLOW_GEOMETRY,
} from '../src/workflow-layout.ts';
import type { WorkflowLayoutState, WorkflowLayoutOptions } from '../src/workflow-layout.ts';
import type { WorkflowGraph, WorkflowOp } from '../src/types.ts';

const catalog = loadCatalog();
const models = loadModels();
const W = WORKFLOW_GEOMETRY;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
function validate(raw: unknown): WorkflowOp {
  const result = validateWorkflowOp(raw, catalog, models);
  assert.ok(result.op);
  assert.equal(result.warnings.some((w) => w.code === 'wf-bad-op' || w.code === 'wf-unknown-ref'), false);
  const op = result.op;
  if (op.t !== 'step' && op.t !== 'link' && op.t !== 'each' && op.t !== 'splice' && op.t !== 'unstep') assert.fail(op.t);
  return op;
}
function noOverlap(s: WorkflowLayoutState): void {
  const cards = Object.values(s.cards);
  for (let i = 0; i < cards.length; i++) for (const b of cards.slice(i + 1)) {
    const a = cards[i];
    assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} overlaps ${b.id}`);
  }
}
function budget(prev: WorkflowLayoutState, next: WorkflowLayoutState, touched: string[]): void {
  const diff = workflowLayoutDiff(prev, next);
  for (const id of diff.moved.filter((id) => !touched.includes(id))) {
    const allowed = next.workflow.moves.filter((m) => m.ids.includes(id));
    assert.ok(allowed.length, `Foreign move: ${id}`);
    assert.equal(next.cards[id].x - prev.cards[id].x, allowed.reduce((n, m) => n + m.dx, 0));
    assert.equal(next.cards[id].y - prev.cards[id].y, allowed.reduce((n, m) => n + m.dy, 0));
  }
  for (const move of next.workflow.moves) {
    if (move.reason === 'splice') { assert.equal(move.dx, W.columnPitch); assert.equal(move.dy, 0); }
    else { assert.equal(move.dx, 0); assert.ok(move.dy > 0 && move.dy <= W.rowPitch); }
  }
  if (!next.workflow.moves.length) {
    assert.deepEqual(diff.moved.filter((id) => !touched.includes(id)), []);
    assert.deepEqual(workflowUnrelatedMoves(prev, next, diff.moved).filter((id) => !touched.includes(id)), []);
  }
}
function replay(ops: unknown[], opts: WorkflowLayoutOptions = {}): { wf: WorkflowGraph; state: WorkflowLayoutState } {
  const ctx = createWorkflowCtx();
  let wf = emptyWorkflow();
  let state = layoutWorkflow(wf);
  for (const raw of ops) {
    const op = validate(raw);
    wf = applyWorkflowOp(wf, op, ctx).workflow;
    const prev = freeze(clone(state));
    const next = layoutWorkflow(freeze(wf), prev, opts);
    assert.deepEqual(next, layoutWorkflow(wf, state, opts), 'JSON round trip');
    assert.deepEqual(next, layoutWorkflow(wf, prev, opts), 'deterministic');
    budget(state, next, op.t === 'step' || op.t === 'splice' ? [op.id] : []);
    noOverlap(next);
    state = next;
  }
  return { wf, state };
}
function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  let seed = 20261102;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function reverseTopological(ops: WorkflowOp[]): WorkflowOp[] {
  let wf = emptyWorkflow();
  const ctx = createWorkflowCtx();
  for (const op of ops) wf = applyWorkflowOp(wf, op, ctx).workflow;
  const loops = new Set(workflowLoopIds(wf));
  const edges = Object.values(wf.edges).filter((e) => !loops.has(e.id));
  const remaining = new Set(Object.keys(wf.nodes));
  const order: string[] = [];
  while (remaining.size) {
    const id = [...remaining].sort().find((id) => !edges.some((e) => e.from === id && remaining.has(e.to)));
    assert.ok(id);
    order.push(id);
    remaining.delete(id);
  }
  // Links arrive first to exercise the reducer's pending buffer as endpoints arrive backwards.
  return [
    ...ops.filter((op) => op.t !== 'step'),
    ...ops.filter((op) => op.t === 'step').sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)),
  ];
}
const directory = new URL('./fixtures/workflows/', import.meta.url);
const samples = readdirSync(directory).filter((name) => name.endsWith('.json')).sort().map((name) =>
  JSON.parse(readFileSync(new URL(name, directory), 'utf8')) as { id: string; ops: unknown[] });
test('all 32 workflow fixtures are present', () => assert.equal(samples.length, 32));
for (const sample of samples) for (const order of ['arrival', 'reverse', 'shuffle']) {
  test(`${sample.id}: ${order} streaming stability, tidy, and JSON`, () => {
    const validated = sample.ops.map(validate);
    const ops = order === 'arrival' ? validated : order === 'reverse' ? reverseTopological(validated) : shuffled(validated);
    const { wf } = replay(ops);
    const tidy = tidyWorkflow(wf);
    noOverlap(tidy);
    const reversed = {
      nodes: Object.fromEntries(Object.entries(wf.nodes).reverse()),
      edges: Object.fromEntries(Object.entries(wf.edges).reverse()),
      groups: Object.fromEntries(Object.entries(wf.groups).reverse()),
    };
    assert.deepEqual(tidy, tidyWorkflow(reversed));
    assert.deepEqual(workflowLoopIds(wf), workflowLoopIds(reversed));
  });
}

const step = (id: string, after?: string): WorkflowOp => ({ t: 'step', id, kind: 'agent', label: id, ...(after ? { after } : {}) });
const link = (id: string, from: string, to: string): WorkflowOp => ({ t: 'link', id, from, to });
test('predecessor priority, trigger column, branch rows and late backward dependencies', () => {
  const { state } = replay([
    step('a'), step('b'), link('bc', 'b', 'c'), { ...step('c', 'a') }, step('d', 'a'), step('e', 'a'),
    { t: 'step', id: 'trigger', kind: 'trigger', label: 'Start' }, link('ca', 'c', 'a'),
  ]);
  assert.deepEqual(state.workflow.cells, {
    a: { column: 0, row: 0 }, b: { column: 1, row: 0 }, c: { column: 2, row: 0 },
    d: { column: 1, row: 1 }, e: { column: 1, row: 2 }, trigger: { column: 0, row: 2 },
  });
  assert.deepEqual(state.workflow.routes.ca, { loop: false, backwards: true });
  assert.deepEqual(state.workflow.branchRows, [0, 1, 2]);
});
test('DFS cycles and explicit loops are independent of positions', () => {
  const { wf, state } = replay([step('a'), step('b'), step('c'), link('ab', 'a', 'b'), link('bc', 'b', 'c'), link('ca', 'c', 'a')]);
  assert.deepEqual(workflowLoopIds(wf), ['ca']);
  assert.equal(state.workflow.routes.ca.loop, true);
  const ctx = createWorkflowCtx();
  const explicit = applyWorkflowOp(wf, { ...link('ac', 'a', 'c'), kind: 'loop' } as WorkflowOp, ctx).workflow;
  assert.deepEqual(workflowLoopIds(explicit), ['ac', 'ca']);
  assert.equal(layoutWorkflow(explicit, state).workflow.routes.ac.backwards, false);
});
test('tidy uses longest paths, including joins, and ignores after for column rank', () => {
  const { wf } = replay([
    step('a'), step('b'), step('c'), step('d'), step('e'),
    link('ab', 'a', 'b'), link('bc', 'b', 'c'), link('ad', 'a', 'd'), link('ce', 'c', 'e'), link('de', 'd', 'e'),
  ]);
  const tidy = tidyWorkflow(wf);
  assert.deepEqual(Object.fromEntries(Object.entries(tidy.workflow.cells).map(([id, c]) => [id, c.column])), { a: 0, b: 1, c: 2, d: 1, e: 3 });
  assert.equal(tidy.workflow.cells.d.row, 1);
  assert.equal(tidy.workflow.cells.e.row, 0);
  noOverlap(tidy);
});
test('splice shifts reachable rows uniformly, including bystanders to their right and attachments', () => {
  const { wf, state } = replay([
    step('a'), step('b'), step('c'), step('branch', 'a'), step('tail', 'branch'), step('unrelated', 'tail'),
    link('ab', 'a', 'b'), link('bc', 'b', 'c'), link('bt', 'b', 'tail'),
    { t: 'step', id: 'tool', kind: 'tool', label: 'Tool', on: 'b' },
  ]);
  const nextWf = applyWorkflowOp(wf, { t: 'splice', into: 'ab', id: 'x', kind: 'guard', label: 'Review' }).workflow;
  const next = layoutWorkflow(nextWf, clone(state));
  budget(state, next, ['x']);
  assert.deepEqual(workflowLayoutDiff(state, next).moved, ['b', 'branch', 'c', 'tail', 'tool', 'unrelated']);
  assert.deepEqual(next.workflow.cells.x, { column: 1, row: 0 });
  assert.equal(next.workflow.cells.branch.column, state.workflow.cells.branch.column + 1);
  noOverlap(next);
  assert.deepEqual(layoutWorkflow(nextWf, next).workflow.moves, [], 'splice applied only once');
});
test('nonadjacent splice does not shift existing cards', () => {
  const { wf, state } = replay([step('a'), step('b'), step('c'), link('ac', 'a', 'c')]);
  const nextWf = applyWorkflowOp(wf, { t: 'splice', into: 'ac', id: 'x', kind: 'guard', label: 'X' }).workflow;
  const next = layoutWorkflow(nextWf, state);
  assert.deepEqual(workflowLayoutDiff(state, next).moved, []);
  assert.deepEqual(next.workflow.cells.x, { column: 1, row: 1 });
});
test('attachments keep occupied slots, collapse past three, and removals leave holes', () => {
  const { wf, state } = replay([
    step('host'), ...['z', 'b', 'c', 'a'].map((id): WorkflowOp => ({ t: 'step', id, kind: 'tool', label: id, on: 'host' })),
  ]);
  assert.deepEqual(state.workflow.stacks.host, ['a', 'b', 'c', 'z']);
  assert.deepEqual(state.workflow.attachmentSlots.host, ['z', 'b', 'c', 'a']);
  assert.equal(state.cards.host.hiddenAttached, 1);
  assert.equal(state.cards.a, undefined);
  const removed = applyWorkflowOp(wf, { t: 'unstep', id: 'b' }).workflow;
  const next = layoutWorkflow(removed, state);
  assert.deepEqual(workflowLayoutDiff(state, next).moved, []);
  assert.equal(next.cards.c.y, state.cards.c.y);
  assert.equal(next.cards.host.hiddenAttached, 1);
  assert.equal(tidyWorkflow(removed).cards.host.hiddenAttached, 0);
  assert.deepEqual(tidyWorkflow(wf).workflow.attachmentSlots.host, ['a', 'b', 'c', 'z']);
});
test('spare rows absorb flat stacks; overflow has a one-row vertical budget and never reverses', () => {
  const { wf, state } = replay([step('a'), step('host', 'a'), step('branch', 'a')]);
  let graph = wf;
  let small = replay([step('a'), step('host', 'a'), step('branch', 'a')], { spareRows: 1 }).state;
  let normal = state;
  for (const id of ['t1', 't2', 't3', 't4']) {
    graph = applyWorkflowOp(graph, { t: 'step', id, kind: 'tool', label: id, on: 'host' }).workflow;
    const next = layoutWorkflow(graph, small, { spareRows: 1 });
    budget(small, next, [id]);
    assert.equal(next.cards.branch.y - small.cards.branch.y, id === 't2' || id === 't3' ? W.rowPitch : 0);
    small = next;
    const stable = layoutWorkflow(graph, normal);
    assert.deepEqual(workflowLayoutDiff(normal, stable).moved, []);
    normal = stable;
  }
  graph = applyWorkflowOp(graph, { t: 'unstep', id: 't2' }).workflow;
  const removed = layoutWorkflow(graph, small, { spareRows: 1 });
  assert.deepEqual(workflowLayoutDiff(small, removed).moved, []);
  noOverlap(removed);
});
test('nested attachments grow without moving siblings', () => {
  const { state } = replay([
    step('a'), step('host', 'a'), step('branch', 'a'),
    { t: 'step', id: 'sub', kind: 'agent', label: 'Sub', on: 'host' },
    { t: 'step', id: 'sibling', kind: 'tool', label: 'Sibling', on: 'host' },
    ...['one', 'two', 'three'].map((id): WorkflowOp => ({ t: 'step', id, kind: 'tool', label: id, on: 'sub' })),
  ]);
  assert.equal(state.cards.sibling.y, 2 * W.rowPitch);
  noOverlap(state);
});
test('out-of-order hosts and collapsed sub-agent descendants retain serializable cells', () => {
  const { wf, state } = replay([
    { t: 'step', id: 'child', kind: 'tool', label: 'Child', on: 'sub' },
    ...['one', 'two', 'three'].map((id): WorkflowOp => ({ t: 'step', id, kind: 'tool', label: id, on: 'host' })),
    { t: 'step', id: 'sub', kind: 'agent', label: 'Sub', on: 'host' }, step('host'),
  ]);
  assert.equal(state.cards.sub, undefined);
  assert.equal(state.cards.child, undefined);
  assert.deepEqual(state.workflow.cells.child, state.workflow.cells.host);
  assert.deepEqual(state.workflow.cells.sub, state.workflow.cells.host);
  const reordered = { ...wf, nodes: Object.fromEntries(Object.entries(wf.nodes).reverse()) };
  assert.deepEqual(layoutWorkflow(reordered, clone(state)), layoutWorkflow(wf, state));
});
test('changing an attachment into an inline step moves only that step', () => {
  const { wf, state } = replay([
    step('host'), { t: 'step', id: 'tool', kind: 'tool', label: 'Tool', on: 'host' }, step('tail', 'host'),
  ]);
  const updated = applyWorkflowOp(wf, { t: 'step', id: 'tool', kind: 'tool', label: 'Inline', after: 'tail' }).workflow;
  const next = layoutWorkflow(updated, state);
  assert.deepEqual(workflowLayoutDiff(state, next).moved, ['tool']);
  assert.deepEqual(next.workflow.cells.tool, { column: 2, row: 0 });
  noOverlap(next);
});
test('repeat brackets split at holes and row boundaries', () => {
  const { state } = replay([
    { t: 'each', id: 'group', over: 'Each locale' },
    { ...step('a'), repeat: 'group' } as WorkflowOp, { ...step('b'), repeat: 'group' } as WorkflowOp,
    step('gap'), { ...step('c'), repeat: 'group' } as WorkflowOp,
    { ...step('branch', 'a'), repeat: 'group' } as WorkflowOp,
  ]);
  assert.deepEqual(state.workflow.spans.group, [
    { row: 0, from: 0, to: 1, nodes: ['a', 'b'] }, { row: 0, from: 3, to: 3, nodes: ['c'] },
    { row: 1, from: 1, to: 1, nodes: ['branch'] },
  ]);
  assert.equal(Object.keys(state.frames).length, 3);
  for (const frame of Object.values(state.frames)) {
    assert.equal(frame.bracket, true);
    assert.equal(frame.label, 'Each locale');
    assert.ok(frame.nodes.every((id) => state.cards[id].x >= frame.x && state.cards[id].x + GEOMETRY.cardW <= frame.x + frame.w));
  }
});
test('removing inline steps leaves holes; tidy drops them; inputs and options are immutable', () => {
  const { wf, state } = replay([step('a'), step('b'), step('c'), link('ac', 'a', 'c')]);
  const removed = applyWorkflowOp(wf, { t: 'unstep', id: 'b' }).workflow;
  const next = layoutWorkflow(freeze(removed), freeze(state), freeze({}));
  assert.equal(next.cards.c.x, state.cards.c.x);
  assert.deepEqual(next.workflow.cells.b, state.workflow.cells.b);
  assert.equal(tidyWorkflow(removed).workflow.cells.c.column, 1);
  assert.deepEqual(layoutWorkflow(removed, next, { tidy: true }), tidyWorkflow(removed));
});
for (const count of [10, 15, 25]) for (const width of [800, 920, 1150]) {
  test(`legibility: ${count} steps at ${width}x700`, () => {
    const ops: WorkflowOp[] = [];
    for (let i = 0; i < count; i++) {
      ops.push({ ...step(`n${i}`), label: 'A deliberately long workflow card title' } as WorkflowOp);
      if (i) ops.push(link(`e${i}`, `n${i - 1}`, `n${i}`));
    }
    ops.push(step('branch', 'n1'), link('branch-link', 'n1', 'branch'));
    ops.push({ t: 'link', id: 'retry', from: 'n5', to: 'n2', kind: 'loop' });
    for (let i = 0; i < 4; i++) ops.push({ t: 'step', id: `tool${i}`, kind: 'tool', label: 'Search', on: 'n3' });
    const { wf, state } = replay(ops);
    for (const layout of [state, tidyWorkflow(wf)]) {
      const camera = workflowViewport(layout, { width, height: 700 });
      assert.ok(camera.zoom >= 11 / GEOMETRY.titleMinPx);
      assert.ok(Object.values(layout.cards).every((c) => c.title.px * camera.zoom >= 11));
      assert.equal(camera.panX, true);
      assert.equal(camera.panY, layout.height * camera.zoom > 700 - 2 * GEOMETRY.fitPad);
    }
  });
}
test('empty and tiny viewports have finite readable zoom', () => {
  const empty = layoutWorkflow(emptyWorkflow());
  assert.deepEqual(workflowViewport(empty, { width: 800, height: 700 }), { zoom: GEOMETRY.maxZoom, panX: false, panY: false });
  assert.ok(Number.isFinite(workflowViewport(empty, { width: 0, height: 0 }).zoom));
});
