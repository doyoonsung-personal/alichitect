import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { workflowInitialViewport, minimumWorkflowZoom, overviewColumns, overviewViewport, workflowFollowViewport } from './camera.ts';
test('camera retains readable titles and initial column on a narrow stage', () => {
  const l = layoutWorkflow({ nodes: { a: { id: 'a', kind: 'trigger', label: 'Start' },
    b: { id: 'b', kind: 'end', label: 'End' } }, edges: { e: { id: 'e', from: 'a', to: 'b' } }, groups: {} });
  const v = workflowInitialViewport(l, { width: 200, height: 200 });
  assert.equal(v.x, 24); assert.equal(v.zoom, minimumWorkflowZoom([14]));
  assert.deepEqual(overviewColumns(l), [0, 1]);
  assert.equal(overviewViewport({ x: -100, y: -20, zoom: 1 }, { width: 200, height: 100 }).x, 100);
  assert.ok(workflowFollowViewport(v, { x: 1000, y: 300, w: 200, h: 60 }, { x: 0, y: 0, w: 200, h: 100 }).x < v.x);
});

test('fit respects both dimensions, title metrics, bounds origins and natural size', () => {
  const raw = layoutWorkflow({ nodes: { a: { id: 'a', kind: 'trigger', label: 'Start' } }, edges: {}, groups: {} });
  const l = { ...raw, width: 600, height: 100, bounds: { x: -20, y: -30, w: 600, h: 100 } };
  const fit = workflowInitialViewport(l, { width: 588, height: 600 });
  assert.equal(fit.zoom, .9);
  assert.equal(fit.x + l.bounds.x * fit.zoom, 24);
  assert.equal(fit.y + l.bounds.y * fit.zoom, (600 - 100 * .9) / 2);
  assert.equal(workflowInitialViewport(l, { width: 1200, height: 800 }).zoom, 1);
  assert.equal(workflowInitialViewport({ ...l, height: 1000 }, { width: 1200, height: 948 }).zoom, .9);
  assert.equal(minimumWorkflowZoom([14, 12, 13]), 11 / 12);
  assert.equal(minimumWorkflowZoom([]), 11 / 14);
});

test('follow reveals a newest column in either direction without changing zoom', () => {
  const visible = { x: 0, y: 110, w: 440, h: 500 }, zoom = 11 / 14;
  const card = { x: 2000, y: 400, w: 168, h: 100 };
  const next = workflowFollowViewport({ x: 24, y: 134, zoom }, card, visible);
  assert.equal(next.zoom, zoom);
  assert.ok(card.x * zoom + next.x >= 24);
  assert.ok((card.x + card.w) * zoom + next.x <= 416);
  const back = workflowFollowViewport(next, { ...card, x: 0, y: 0 }, visible);
  assert.equal(back.x, 24); assert.equal(back.y, 134);
  assert.deepEqual(workflowFollowViewport(back, { ...card, x: 0, y: 0 }, visible), back);
});

for (const [width, columns] of [[790, 4], [560, 3], [440, 2]]) {
  test(`readable floor shows ${columns} full columns in a ${width}px canvas`, () => {
    const nodes = Object.fromEntries(Array.from({ length: 11 }, (_, i) =>
      ['n' + i, { id: 'n' + i, kind: 'ai' as const, label: 'Step ' + i }]));
    const edges = Object.fromEntries(Array.from({ length: 10 }, (_, i) =>
      ['e' + i, { id: 'e' + i, from: 'n' + i, to: 'n' + (i + 1) }]));
    const l = layoutWorkflow({ nodes, edges, groups: {} });
    const v = workflowInitialViewport(l, { width, height: 640 });
    assert.equal(v.zoom, 11 / 14);
    assert.ok(Object.values(l.cards).filter((c) => c.x * v.zoom + v.x >= 0
      && (c.x + c.w) * v.zoom + v.x <= width).length >= columns);
  });
}

test('Codex #6 follows new branches and changed earlier nodes rather than geometry order', async () => {
  const { newestWorkflowStep } = await import('./camera.ts');
  const a = { id: 'a', kind: 'trigger' as const, label: 'a' };
  const b = { id: 'b', kind: 'ai' as const, label: 'b', after: 'a' };
  const c = { id: 'c', kind: 'ai' as const, label: 'c', after: 'a' };
  const before = { nodes: { a, b }, edges: {}, groups: {} };
  const branch = { ...before, nodes: { a, b, c } };
  assert.equal(newestWorkflowStep(before, branch, 'b'), 'c');
  const revised = { ...branch, nodes: { a, b: { ...b, label: 'Changed' }, c } };
  assert.equal(newestWorkflowStep(branch, revised, 'c'), 'b');
  assert.equal(newestWorkflowStep(revised, structuredClone(revised), 'b'), 'b');
});

test('C15 zoom keeps the visible centre fixed including panel occlusion', async () => {
  const { zoomWorkflowViewport } = await import('./camera.ts');
  for (const h of [440, 140]) {
    const visible = { x: 0, y: 110, w: 800, h }, current = { x: -300, y: 134, zoom: .8 };
    const next = zoomWorkflowViewport(current, .9, visible);
    assert.ok(Math.abs((400 - next.x) / next.zoom - (400 - current.x) / current.zoom) < 1e-9);
    assert.ok(Math.abs((110 + h / 2 - next.y) / next.zoom - (110 + h / 2 - current.y) / current.zoom) < 1e-9);
  }
});
