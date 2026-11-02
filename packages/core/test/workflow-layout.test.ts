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
function budget(
  prev: WorkflowLayoutState, next: WorkflowLayoutState, before: WorkflowGraph, after: WorkflowGraph,
  op: WorkflowOp, opts: WorkflowLayoutOptions = {},
): void {
  const diff = workflowLayoutDiff(prev, next);
  const touched = new Set(op.t === 'step' || op.t === 'splice' ? [op.id] : []);
  if ((op.t === 'step' || op.t === 'splice') && before.nodes[op.id]?.on !== after.nodes[op.id]?.on) {
    for (const id of touched) for (const node of Object.values(after.nodes)) if (node.on === id) touched.add(node.id);
  }
  const shifted = new Set<string>();
  if (op.t === 'splice') {
    const edge = before.edges[op.into];
    const a = edge && prev.workflow.cells[edge.from];
    const b = edge && prev.workflow.cells[edge.to];
    const applied = edge && after.edges[op.into]?.to !== edge.to && after.edges[op.into]?.from === edge.from;
    if (applied && a && b && b.column === a.column + 1 && b.row === a.row) {
      const reachable = new Set([edge.to]);
      const loops = new Set(workflowLoopIds(before));
      for (const id of reachable) for (const e of Object.values(before.edges)) {
        if (e.from === id && !loops.has(e.id) && !before.nodes[e.to].on) reachable.add(e.to);
      }
      const rows = new Set([...reachable].map((id) => prev.workflow.cells[id].row));
      for (const [id, cell] of Object.entries(prev.workflow.cells)) {
        if (rows.has(cell.row) && cell.column >= b.column && !touched.has(id)) shifted.add(id);
      }
    }
  }
  // Derive band overflow from occupied geometry and prior reservations, never the declared move list.
  const tops: number[] = [];
  const heights: number[] = [];
  const spare = opts.spareRows ?? W.spareRows;
  for (const row of next.workflow.branchRows) {
    const used = Math.max(0, ...Object.keys(next.cards).filter((id) => next.workflow.cells[id].row === row)
      .map((id) => (next.cards[id].y - next.workflow.rowTops[row]) / W.rowPitch));
    heights[row] = Math.max(prev.workflow.rowHeights[row] ?? 0, (1 + Math.max(spare, used)) * W.rowPitch + GEOMETRY.head);
    tops[row] = Math.max(prev.workflow.rowTops[row] ?? 0, row ? tops[row - 1] + heights[row - 1] : 0);
    assert.equal(next.workflow.rowTops[row], tops[row]);
    assert.equal(next.workflow.rowHeights[row], heights[row]);
  }
  for (const id of Object.keys(prev.cards).filter((id) => next.cards[id] && !touched.has(id))) {
    const row = prev.workflow.cells[id].row;
    const dy = tops[row] - prev.workflow.rowTops[row];
    assert.ok(dy >= 0 && dy <= W.rowPitch, `Overflow budget: ${id}`);
    if (op.t === 'link' || op.t === 'each') assert.equal(dy, 0);
    assert.equal(next.cards[id].x - prev.cards[id].x, shifted.has(id) ? W.columnPitch : 0, `Foreign x move: ${id}`);
    assert.equal(next.cards[id].y - prev.cards[id].y, dy, `Foreign y move: ${id}`);
  }
  for (const move of next.workflow.moves) {
    if (move.reason === 'splice') {
      assert.equal(op.t, 'splice');
      assert.deepEqual(move.ids, [...shifted].sort());
      assert.equal(move.dx, W.columnPitch);
      assert.equal(move.dy, 0);
    } else {
      assert.equal(move.dx, 0);
      assert.ok(move.dy > 0 && move.dy <= W.rowPitch);
      for (const id of move.ids) {
        const row = next.workflow.cells[id].row;
        assert.equal(move.dy, tops[row] - prev.workflow.rowTops[row]);
      }
    }
  }
  if (!next.workflow.moves.length) {
    assert.deepEqual(diff.moved.filter((id) => !touched.has(id)), []);
    assert.deepEqual(workflowUnrelatedMoves(prev, next, diff.moved).filter((id) => !touched.has(id)), []);
  }
}
function replay(ops: unknown[], opts: WorkflowLayoutOptions = {}): { wf: WorkflowGraph; state: WorkflowLayoutState } {
  const ctx = createWorkflowCtx();
  let wf = emptyWorkflow();
  let state = layoutWorkflow(wf);
  for (const raw of ops) {
    const op = validate(raw);
    const before = wf;
    wf = applyWorkflowOp(wf, op, ctx).workflow;
    const prev = freeze(clone(state));
    const options = freeze({ ...opts, op });
    const next = layoutWorkflow(freeze(wf), prev, options);
    assert.deepEqual(next, layoutWorkflow(wf, state, options), 'JSON round trip');
    assert.deepEqual(next, layoutWorkflow(wf, prev, options), 'deterministic');
    budget(state, next, before, wf, op, opts);
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

test('regression 1: detaching a previously inline node allocates a free cell', () => {
  const { state } = replay([step('host'), step('x'), { ...step('x'), on: 'host' }, step('x')]);
  assert.deepEqual([state.cards.host.x, state.cards.host.y], [0, 0]);
  assert.deepEqual([state.cards.x.x, state.cards.x.y], [200, 0]);
});

test('regression 2: moving a sub-agent preserves child offsets without overlapping siblings', () => {
  const { state } = replay([
    step('host'), step('sub'), { ...step('tool'), kind: 'tool', on: 'sub' },
    { ...step('sibling'), kind: 'tool', on: 'host' }, { ...step('sub'), on: 'host' },
  ]);
  assert.deepEqual(['host', 'sibling', 'sub', 'tool'].map((id) => [state.cards[id].x, state.cards[id].y]),
    [[0, 0], [0, 84], [0, 168], [0, 252]]);
});

test('regression 3: ordinary arrival flushing pending links is not a splice', () => {
  const { state } = replay([
    step('a'), step('b'), link('ab', 'a', 'b'), link('ab', 'a', 'x'), link('xb', 'x', 'b'), step('x'),
  ]);
  assert.deepEqual(state.workflow.cells.b, { column: 1, row: 0 });
  assert.deepEqual(state.workflow.cells.x, { column: 1, row: 1 });
  assert.deepEqual(state.workflow.moves, []);
});

test('the movement gate rejects a false splice declaration on ordinary arrival', () => {
  const ctx = createWorkflowCtx();
  let wf = emptyWorkflow();
  let state = layoutWorkflow(wf);
  for (const op of [step('a'), step('b'), link('ab', 'a', 'b'), link('ab', 'a', 'x'), link('xb', 'x', 'b')]) {
    wf = applyWorkflowOp(wf, op, ctx).workflow;
    state = layoutWorkflow(wf, state, { op });
  }
  const op = step('x');
  const after = applyWorkflowOp(wf, op, ctx).workflow;
  const forged = clone(layoutWorkflow(after, state, { op }));
  forged.cards.b.x = state.cards.b.x + W.columnPitch;
  forged.workflow.cells.b.column = state.workflow.cells.b.column + 1;
  forged.workflow.moves = [{ reason: 'splice', ids: ['b'], dx: W.columnPitch, dy: 0 }];
  assert.throws(() => budget(state, forged, wf, after, op), /Foreign x move: b/);
});

test('regression 4: deleted attachment slots do not consume live visibility', () => {
  const { state } = replay([
    step('host'), ...['a', 'b', 'c'].map((id) => ({ ...step(id), kind: 'tool', on: 'host' })),
    ...['a', 'b', 'c'].map((id) => ({ t: 'unstep', id })), { ...step('d'), kind: 'tool', on: 'host' },
  ]);
  assert.ok(state.cards.d);
  assert.equal(state.cards.host.hiddenAttached, 0);
  assert.deepEqual(state.workflow.attachmentSlots.host, ['a', 'b', 'c', 'd']);
  assert.equal(state.cards.d.y, 4 * W.rowPitch, 'deleted physical slots remain holes');
});

test('regression 5: an explicit splice overrides a reintroduced id tombstone', () => {
  const { state } = replay([
    step('a'), step('b'), link('ab', 'a', 'b'), step('x'), { t: 'unstep', id: 'x' },
    { t: 'splice', into: 'ab', id: 'x', kind: 'guard', label: 'x' },
  ]);
  assert.deepEqual(state.workflow.cells.a, { column: 0, row: 0 });
  assert.deepEqual(state.workflow.cells.x, { column: 1, row: 0 });
  assert.deepEqual(state.workflow.cells.b, { column: 2, row: 0 });
  assert.deepEqual(state.workflow.moves, [{ reason: 'splice', ids: ['b'], dx: W.columnPitch, dy: 0 }]);
});
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
  const op: WorkflowOp = { t: 'splice', into: 'ab', id: 'x', kind: 'guard', label: 'Review' };
  const nextWf = applyWorkflowOp(wf, op).workflow;
  const next = layoutWorkflow(nextWf, clone(state), { op });
  budget(state, next, wf, nextWf, op);
  assert.deepEqual(workflowLayoutDiff(state, next).moved, ['b', 'branch', 'c', 'tail', 'tool', 'unrelated']);
  assert.deepEqual(next.workflow.cells.x, { column: 1, row: 0 });
  assert.equal(next.workflow.cells.branch.column, state.workflow.cells.branch.column + 1);
  noOverlap(next);
  assert.deepEqual(layoutWorkflow(nextWf, next, { op }).workflow.moves, [], 'splice applied only once');
});
test('nonadjacent splice does not shift existing cards', () => {
  const { wf, state } = replay([step('a'), step('b'), step('c'), link('ac', 'a', 'c')]);
  const op: WorkflowOp = { t: 'splice', into: 'ac', id: 'x', kind: 'guard', label: 'X' };
  const nextWf = applyWorkflowOp(wf, op).workflow;
  const next = layoutWorkflow(nextWf, state, { op });
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
  assert.equal(next.cards.host.hiddenAttached, 0);
  assert.equal(tidyWorkflow(removed).cards.host.hiddenAttached, 0);
  assert.deepEqual(tidyWorkflow(wf).workflow.attachmentSlots.host, ['a', 'b', 'c', 'z']);
});
test('spare rows absorb flat stacks; overflow has a one-row vertical budget and never reverses', () => {
  const { wf, state } = replay([step('a'), step('host', 'a'), step('branch', 'a')]);
  let graph = wf;
  let small = replay([step('a'), step('host', 'a'), step('branch', 'a')], { spareRows: 1 }).state;
  let normal = state;
  for (const id of ['t1', 't2', 't3', 't4']) {
    const before = graph;
    const op: WorkflowOp = { t: 'step', id, kind: 'tool', label: id, on: 'host' };
    graph = applyWorkflowOp(graph, op).workflow;
    const next = layoutWorkflow(graph, small, { spareRows: 1 });
    budget(small, next, before, graph, op, { spareRows: 1 });
    assert.equal(next.cards.branch.y - small.cards.branch.y, id === 't2' || id === 't3' ? W.rowPitch : 0);
    small = next;
    const stable = layoutWorkflow(graph, normal);
    assert.deepEqual(workflowLayoutDiff(normal, stable).moved, []);
    normal = stable;
  }
  const before = graph;
  const op: WorkflowOp = { t: 'unstep', id: 't2' };
  graph = applyWorkflowOp(graph, op).workflow;
  const removed = layoutWorkflow(graph, small, { spareRows: 1 });
  budget(small, removed, before, graph, op, { spareRows: 1 });
  assert.deepEqual(workflowLayoutDiff(small, removed).moved, ['branch']);
  assert.equal(removed.cards.branch.y - small.cards.branch.y, W.rowPitch);
  assert.equal(removed.cards.t3.y, small.cards.t3.y);
  assert.ok(removed.cards.t4);
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
      assert.equal(camera.zoom, Math.min(1, 11 / Math.min(...Object.values(layout.cards).map((c) => c.title.px))));
      assert.equal(camera.panX, true);
      assert.equal(camera.panY, layout.height * camera.zoom > 700 - 2 * GEOMETRY.fitPad);
    }
  });
}
test('empty and tiny viewports have finite readable zoom', () => {
  const empty = layoutWorkflow(emptyWorkflow());
  assert.deepEqual(workflowViewport(empty, { width: 800, height: 700 }), { zoom: 1, panX: false, panY: false });
  assert.ok(Number.isFinite(workflowViewport(empty, { width: 0, height: 0 }).zoom));
});

test('viewport fits width and height using the actual title size, capped at natural size', () => {
  const { state } = replay([step('a')]);
  const sized = { ...state, width: 1000, height: 100 };
  sized.cards = { ...state.cards, a: { ...state.cards.a, title: { lines: ['A'], px: 14 } } };
  assert.deepEqual(workflowViewport(sized, { width: 948, height: 800 }), { zoom: .9, panX: false, panY: false });
  assert.deepEqual(workflowViewport(sized, { width: 2000, height: 800 }), { zoom: 1, panX: false, panY: false });
  assert.equal(workflowViewport(sized, { width: 400, height: 800 }).zoom, 11 / 14);
  assert.equal(workflowViewport({ ...sized, height: 1000 }, { width: 2000, height: 948 }).zoom, .9);
  sized.cards.a.title.px = 12;
  assert.equal(workflowViewport(sized, { width: 400, height: 800 }).zoom, 11 / 12);
});

test('regression: cycle search starts at the trigger, so forward links are never taken for the back edge', () => {
  // Searching from the first id ("check") marked draft -> check as the loop and folded a fresh layout into three rows.
  const build = (name: string): WorkflowGraph => {
    const f = JSON.parse(readFileSync(new URL(`./fixtures/workflows/${name}.json`, import.meta.url), 'utf8'));
    let g = emptyWorkflow(); const ctx = createWorkflowCtx();
    for (const op of f.ops) g = applyWorkflowOp(g, op, ctx).workflow;
    return g;
  };
  const email = build('support-email-triage');
  assert.deepEqual(workflowLoopIds(email), ['l13', 'l9']);
  const cells = tidyWorkflow(email).workflow.cells;
  const flow = ['in', 'guard', 'route', 'kb', 'rank', 'draft', 'check', 'gate', 'human', 'send', 'log', 'end'];
  assert.deepEqual(flow.map((id) => cells[id]), flow.map((_, column) => ({ column, row: 0 })));
  assert.deepEqual(workflowLoopIds(build('sre-incident-triage-and-rca')), ['l20']);
  assert.deepEqual(workflowLoopIds(build('ai-tutor-socratic-hint')), ['l1', 'l15']);
});
