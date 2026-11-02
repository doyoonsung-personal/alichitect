import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { workflowInitialViewport, minimumWorkflowZoom, overviewColumns, overviewViewport, workflowFollowViewport } from './camera.ts';
test('camera retains readable titles and initial column on a narrow stage', () => {
  const l = layoutWorkflow({ nodes: { a: { id: 'a', kind: 'trigger', label: 'Start' },
    b: { id: 'b', kind: 'end', label: 'End' } }, edges: { e: { id: 'e', from: 'a', to: 'b' } }, groups: {} });
  const v = workflowInitialViewport(l, { width: 200, height: 200 });
  assert.equal(v.x, 24); assert.ok(v.zoom >= minimumWorkflowZoom([11]));
  assert.deepEqual(overviewColumns(l), [0, 1]);
  assert.equal(overviewViewport({ x: -100, y: -20, zoom: 1 }, { width: 200, height: 100 }).x, 100);
  assert.ok(workflowFollowViewport(v, { x: 1000, y: 300, w: 200, h: 60 }, { x: 0, y: 0, w: 200, h: 100 }).x < v.x);
});
