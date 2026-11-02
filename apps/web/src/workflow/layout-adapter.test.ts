import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { normalizeWorkflowLayout } from './layout-adapter.ts';
test('adapter changes geometry only and leaves the source immutable', () => {
  const wf = { nodes: { a: { id: 'a', kind: 'trigger' as const, label: 'A' } }, edges: {}, groups: {} };
  const l = layoutWorkflow(wf), before = structuredClone(l), r = normalizeWorkflowLayout(wf, l);
  assert.deepEqual(l, before); assert.equal(r.motion.mode, 'architecture');
  assert.equal(r.source.cards.a.w, l.cards.a.w); assert.equal(r.source.cards.a.h, l.cards.a.h);
  assert.equal(r.source.cards.a.title.px, 14); assert.equal(r.source.workflow, l.workflow);
});
