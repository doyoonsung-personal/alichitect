import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEstimateEdit, approvalOverride } from './settings.ts';
import type { WorkflowGraph } from '@ali/core/types.ts';
const wf: WorkflowGraph = { nodes: { a: { id: 'a', kind: 'agent', label: 'A', turns: 5 },
  b: { id: 'b', kind: 'end', label: 'B' } }, edges: { e: { id: 'e', from: 'a', to: 'b', kind: 'branch' },
  f: { id: 'f', from: 'a', to: 'b', kind: 'branch' } }, groups: {} };
test('settings reject invalid counts and bounds, preserve unrelated overrides and delete defaults', () => {
  for (const value of [-1, NaN, Infinity, 1.5]) assert.equal(applyEstimateEdit({}, { map: 'runsPerMonth', value }, wf).ok, false);
  assert.equal(applyEstimateEdit({}, { map: 'agents', id: 'a', field: 'upper', value: 6 }, wf).ok, false);
  assert.equal(applyEstimateEdit({ shares: { f: 0.5 } }, { map: 'shares', id: 'e', value: 0.8 }, wf).ok, false);
  assert.deepEqual(applyEstimateEdit({ steps: { a: { inTokens: 5, outTokens: 8 } }, scope: 'global' },
    { map: 'steps', id: 'a', field: 'inTokens' }, wf),
  { ok: true, value: { steps: { a: { outTokens: 8 } }, scope: 'global' } });
});
test('approval choices remove both old overrides', () => {
  assert.deepEqual(approvalOverride({ approvalOn: ['send'], approvalOff: ['send', 'pay'] }, 'send', 'default'),
    { approvalOn: [], approvalOff: ['pay'] });
});
