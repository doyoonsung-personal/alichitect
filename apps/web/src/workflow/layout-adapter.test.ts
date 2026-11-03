import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { normalizeWorkflowLayout, WORKFLOW_WEB_SLOT, WORKFLOW_CARD_H } from './layout-adapter.ts';
test('adapter changes geometry only and leaves the source immutable', () => {
  const wf = { nodes: { a: { id: 'a', kind: 'trigger' as const, label: 'A' } }, edges: {}, groups: {} };
  const l = layoutWorkflow(wf), before = structuredClone(l), r = normalizeWorkflowLayout(wf, l);
  assert.deepEqual(l, before); assert.equal(r.motion.mode, 'architecture');
  assert.equal(r.source.cards.a.w, l.cards.a.w); assert.equal(r.source.cards.a.h, WORKFLOW_CARD_H);
  assert.equal(r.source.cards.a.title.px, 14); assert.equal(r.source.workflow, l.workflow);
});


test('uniform cards retain model, product, badges, hidden descendants and integer ports', async () => {
  const { buildWorkflowScene } = await import('./scene.ts');
  const { loadCatalog, loadModels } = await import('@ali/core/catalog-node.ts');
  const { makeT } = await import('../i18n/t.ts');
  const wf = { nodes: {
    host: { id: 'host', kind: 'agent' as const, label: 'A long title wrapping over several lines',
      product: 'model-studio', ai: 'qwen-plus', turns: 5, effect: 'write' as const },
    ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['t' + i,
      { id: 't' + i, kind: 'tool' as const, label: 'Tool', on: 'host' }])),
  }, edges: {}, groups: {} };
  const measure = { title: (s: string, px: number) => s.length * px / 2, body: (s: string) => s.length * 6 };
  const settings = { approvalOn: ['write' as const] };
  const raw = layoutWorkflow(wf);
  const layout = normalizeWorkflowLayout(wf, raw, { measure: measure.title, settings });
  const scene = buildWorkflowScene({ workflow: wf, layout, settings, measure,
    catalog: loadCatalog(), models: loadModels(), lang: 'en', t: makeT('en') });
  assert.equal(scene.byId.get('host')!.hidden.length, 2);
  assert.equal(scene.byId.get('host')!.badges.length, 3);
  for (const c of scene.cards) {
    assert.equal(c.h, layout.source.cards[c.id].h);
    assert.ok(Number.isInteger(c.y + c.h / 2));
  }
  assert.equal(scene.byId.get('t0')!.y, WORKFLOW_WEB_SLOT);
  assert.deepEqual(normalizeWorkflowLayout(wf, raw, { measure: measure.title, settings }), layout);
});


import { readdirSync, readFileSync } from 'node:fs';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import { validateWorkflowOp } from '@ali/core/workflow-validate.ts';
import { loadCatalog, loadModels } from '@ali/core/catalog-node.ts';
import { WORKFLOW_GEOMETRY } from '@ali/core/workflow-layout.ts';
import type { WorkflowGraph, WorkflowOp } from '@ali/core/types.ts';
import type { WorkflowLayout } from './layout-adapter.ts';
import { makeMeasurer } from '../canvas/measure.ts';
const catalog = loadCatalog(), models = loadModels();
const directory = new URL('../../../../packages/core/test/fixtures/workflows/', import.meta.url);
const fixtures = readdirSync(directory).filter((name) => name.endsWith('.json')).sort().map((name) =>
  JSON.parse(readFileSync(new URL(name, directory), 'utf8')) as { id: string; ops: WorkflowOp[] });
function motion(before: WorkflowGraph, prev: WorkflowLayout, after: WorkflowGraph, next: WorkflowLayout): void {
  for (const measure of [makeMeasurer('Arial, sans-serif').title, (s: string, px: number) => s.length * px / 2]) {
    const a = normalizeWorkflowLayout(before, prev, { measure }).source;
    const b = normalizeWorkflowLayout(after, next, { measure }).source;
    const prior = { ...a.cards, ...a.frames }, current = { ...b.cards, ...b.frames };
    const coreBefore = { ...prev.cards, ...prev.frames };
    for (const frame of Object.values(b.frames)) {
      const row = next.workflow.cells[frame.nodes[0]].row;
      const matches = Object.values(a.frames).filter((f) => f.group === frame.group
        && prev.workflow.cells[f.nodes[0]].row === row && f.nodes.some((id) => frame.nodes.includes(id)));
      for (const old of matches) assert.ok(frame.y >= old.y, `Re-keyed bracket jumped up: ${old.id} -> ${frame.id}`);
      if (matches.length === 1) {
        const descendants = Object.values(b.frames).filter((f) => f.group === frame.group
          && f.nodes.some((id) => matches[0].nodes.includes(id)));
        if (descendants.length === 1) assert.equal(frame.id, matches[0].id, 'A surviving run keeps its bracket identity');
      }
    }
    const rects = Object.values(current);
    for (const r of rects) for (const s of rects) if (r.id < s.id) {
      assert.ok(r.x + r.w <= s.x || s.x + s.w <= r.x || r.y + r.h <= s.y || s.y + s.h <= r.y,
        `${r.id} overlaps ${s.id}`);
    }
    for (const [id, rect] of Object.entries(current)) {
      if (!prior[id]) continue;
      const moves = next.workflow.moves.filter((m) => m.ids.includes(id));
      assert.ok(moves.every((m) => m.reason === 'splice' || m.reason === 'host-reserve'));
      const dx = moves.reduce((sum, m) => sum + m.dx, 0), dy = moves.reduce((sum, m) => sum + m.dy, 0);
      assert.equal(rect.x, prior[id].x + dx, `Unrecorded web x: ${id}`);
      assert.equal(rect.y, Math.round((coreBefore[id].y + dy) * WORKFLOW_WEB_SLOT / WORKFLOW_GEOMETRY.rowPitch),
        `Unrecorded web y: ${id}`);
      assert.ok(rect.y >= prior[id].y, `Upward web move: ${id}`);
    }
  }
}
for (const fixture of fixtures) test(`web motion: ${fixture.id} stream, updates, hidden attachments and removal`, () => {
  let wf = emptyWorkflow(), state = layoutWorkflow(wf);
  const ctx = createWorkflowCtx();
  for (const raw of fixture.ops) {
    const op = validateWorkflowOp(raw, catalog, models).op!;
    if (op.t !== 'step' && op.t !== 'link' && op.t !== 'each' && op.t !== 'splice' && op.t !== 'unstep') assert.fail(op.t);
    const nextWf = applyWorkflowOp(wf, op, ctx).workflow;
    if (nextWf === wf) continue;
    const next = layoutWorkflow(nextWf, state, { op });
    motion(wf, state, nextWf, next);
    wf = nextWf; state = next;
  }
  for (const host of Object.values(wf.nodes).filter((n) => n.kind === 'agent' || n.kind === 'ai')) {
    let current = wf, previous = state;
    const count = Object.values(current.nodes).filter((n) => n.on === host.id).length;
    for (let i = count; i < Math.max(5, count + 2); i++) {
      const op: WorkflowOp = { t: 'step', id: 'late-' + host.id + '-' + i, kind: 'tool', label: 'Lookup', on: host.id };
      const nextWf = applyWorkflowOp(current, op).workflow;
      const next = layoutWorkflow(nextWf, previous, { op });
      motion(current, previous, nextWf, next);
      if (i >= 3) assert.deepEqual(next.workflow.moves, [], 'Hidden attachments move nothing');
      current = nextWf; previous = next;
    }
    const update: WorkflowOp = { t: 'step', ...host, label: 'Longer label with many words '.repeat(20), turns: 50 };
    const updated = applyWorkflowOp(wf, update).workflow;
    motion(wf, state, updated, layoutWorkflow(updated, state, { op: update }));
  }
  const projected = normalizeWorkflowLayout(wf, state).source;
  const tallest = Object.values(projected.cards).sort((a, b) => b.h - a.h)[0];
  if (tallest) {
    const op: WorkflowOp = { t: 'unstep', id: tallest.id };
    const nextWf = applyWorkflowOp(wf, op).workflow;
    const next = layoutWorkflow(nextWf, state, { op });
    motion(wf, state, nextWf, next);
    assert.deepEqual(next.workflow.moves, [], 'Removing the tallest card moves nothing');
  }
});

test('recorded host-reserve and splice moves project exactly, including repeat brackets', () => {
  const ops: WorkflowOp[] = [
    { t: 'each', id: 'r', over: 'Items' },
    { t: 'step', id: 'a', kind: 'trigger', label: 'A' },
    { t: 'step', id: 'b', kind: 'human', label: 'B', after: 'a', repeat: 'r' },
    { t: 'step', id: 'c', kind: 'end', label: 'C', after: 'a' },
    { t: 'step', id: 'b', kind: 'agent', label: 'B', after: 'a', repeat: 'r' },
    { t: 'link', id: 'ab', from: 'a', to: 'b' },
    { t: 'splice', id: 'x', into: 'ab', kind: 'guard', label: 'X' },
  ];
  let wf = emptyWorkflow(), state = layoutWorkflow(wf);
  let frameMoves = 0;
  for (const op of ops) {
    const nextWf = applyWorkflowOp(wf, op).workflow, next = layoutWorkflow(nextWf, state, { op });
    motion(wf, state, nextWf, next);
    frameMoves += next.workflow.moves.filter((m) => m.ids.some((id) => next.frames[id])).length;
    wf = nextWf; state = next;
  }
  assert.ok(frameMoves >= 2);
});


for (const [name, id] of [
  ['ecommerce-product-listing-enrichment', 's7'], ['ecommerce-product-listing-enrichment', 'retry-check'],
  ['rfp-security-questionnaire-answerer', 'retry-check'],
]) for (const remove of [true, false]) test(`bracket identity: ${name} ${id} ${remove ? 'unstep' : 'drop repeat'}`, () => {
  let wf = emptyWorkflow(), state = layoutWorkflow(wf);
  const ctx = createWorkflowCtx();
  for (const op of fixtures.find((f) => f.id === name)!.ops) {
    wf = applyWorkflowOp(wf, op, ctx).workflow; state = layoutWorkflow(wf, state, { op });
  }
  const { repeat, ...node } = wf.nodes[id];
  const op: WorkflowOp = remove ? { t: 'unstep', id } : { t: 'step', ...node };
  const nextWf = applyWorkflowOp(wf, op).workflow, next = layoutWorkflow(nextWf, state, { op });
  motion(wf, state, nextWf, next);
  for (const frame of Object.values(state.frames).filter((f) => f.nodes.includes(id))) {
    const survivors = frame.nodes.filter((key) => nextWf.nodes[key]?.repeat === frame.group);
    if (!survivors.length) continue;
    const retained = next.frames[frame.id];
    assert.ok(retained, 'Bracket must not exit and re-enter under a different id');
    assert.equal(retained.y, frame.y);
    assert.equal(retained.x, frame.x);
  }
});

test('adding an earlier host to a repeat run retains its bracket id and records its move', () => {
  let wf = emptyWorkflow(), state = layoutWorkflow(wf);
  const ctx = createWorkflowCtx();
  for (const op of fixtures.find((f) => f.id === 'multilingual-document-localisation')!.ops) {
    wf = applyWorkflowOp(wf, op, ctx).workflow; state = layoutWorkflow(wf, state, { op });
  }
  const op: WorkflowOp = { t: 'step', ...wf.nodes.s3, repeat: 'locales' };
  const nextWf = applyWorkflowOp(wf, op).workflow, next = layoutWorkflow(nextWf, state, { op });
  motion(wf, state, nextWf, next);
  const before = Object.values(state.frames).find((f) => f.nodes.includes('s6'))!;
  assert.ok(next.frames[before.id].nodes.includes('s3'));
  assert.ok(next.workflow.moves.some((m) => m.reason === 'host-reserve' && m.ids.includes(before.id)));
});

for (const [name, edge] of [
  ['code-review-pr-agent', 'l4'], ['disruption-rebooking-agent', 'l4'], ['social-listening-review-analysis', 'l4'],
]) test(`splice host above branch: ${name}`, () => {
  let wf = emptyWorkflow(), state = layoutWorkflow(wf);
  const ctx = createWorkflowCtx();
  for (const op of fixtures.find((f) => f.id === name)!.ops) {
    wf = applyWorkflowOp(wf, op, ctx).workflow; state = layoutWorkflow(wf, state, { op });
    if (op.t === 'link' && op.id === edge) break;
  }
  const op: WorkflowOp = { t: 'splice', id: 'inserted', into: edge, kind: 'act', label: 'Inserted step' };
  const nextWf = applyWorkflowOp(wf, op).workflow, next = layoutWorkflow(nextWf, state, { op });
  motion(wf, state, nextWf, next);
  assert.ok(next.workflow.moves.some((m) => m.reason === 'host-reserve' && m.ids.some((id) => next.cards[id])));
});


test('splitting a repeat run retains its height without overlapping the resulting brackets', () => {
  let wf = emptyWorkflow(), state = layoutWorkflow(wf);
  const ctx = createWorkflowCtx();
  for (const op of fixtures.find((f) => f.id === 'ecommerce-product-listing-enrichment')!.ops) {
    wf = applyWorkflowOp(wf, op, ctx).workflow; state = layoutWorkflow(wf, state, { op });
  }
  const { repeat, ...node } = wf.nodes.s8;
  const op: WorkflowOp = { t: 'step', ...node };
  const nextWf = applyWorkflowOp(wf, op).workflow, next = layoutWorkflow(nextWf, state, { op });
  motion(wf, state, nextWf, next);
});
