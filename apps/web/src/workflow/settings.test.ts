import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEstimateEdit, approvalOverride, estimateEditRange, videoStepOptions } from './settings.ts';
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

test('video edits enforce integer seconds, model duration bounds and priced resolutions', () => {
  for (const [ai, min, max, resolutions] of [
    ['wan3.0-video', 1, 30, [480, 720, 1080]], ['wan3.0-video-prime', 1, 30, [480, 720, 1080]],
    ['happyhorse-1.1-t2v', 3, 15, [480, 720, 1080]], ['happyhorse-1.1-i2v', 3, 15, [480, 720, 1080]],
    ['happyhorse-1.1-r2v', 3, 15, [480, 720, 1080]], ['wan2.7-t2v', 2, 15, [720, 1080]], ['wan2.7-i2v', 2, 15, [720, 1080]],
  ] as const) {
    const graph: WorkflowGraph = { nodes: { a: { id: 'a', kind: 'ai', label: 'Video', task: 'create', ai } }, edges: {}, groups: {} };
    assert.deepEqual(videoStepOptions(graph, 'a'), { min, max, resolutions });
    assert.deepEqual(estimateEditRange({ map: 'steps', id: 'a', field: 'clipSeconds' }, graph), { min, max });
    for (const value of [min, max, 15]) assert.equal(
      applyEstimateEdit({}, { map: 'steps', id: 'a', field: 'clipSeconds', value }, graph).ok, true, ai);
    for (const value of [-1, 0, min - 1, max + 1, 15.5, NaN, Infinity, true]) assert.equal(
      applyEstimateEdit({}, { map: 'steps', id: 'a', field: 'clipSeconds', value }, graph).ok, false, ai);
    for (const value of resolutions) assert.equal(
      applyEstimateEdit({}, { map: 'steps', id: 'a', field: 'resolution', value }, graph).ok, true, ai);
    for (const value of [0, 721, 2160, 720.5, NaN, Infinity, true, ...(resolutions.length === 2 ? [480] : [])]) assert.equal(
      applyEstimateEdit({}, { map: 'steps', id: 'a', field: 'resolution', value }, graph).ok, false, ai);
  }
});

test('video settings reset immutably and reject new overrides on non-video steps', () => {
  const current = { runsPerMonth: 500, steps: { a: { clipSeconds: 10, resolution: 720 as const } } };
  const before = structuredClone(current);
  const reset = applyEstimateEdit(current, { map: 'steps', id: 'a', field: 'clipSeconds' }, wf);
  assert.deepEqual(reset, { ok: true, value: { runsPerMonth: 500, steps: { a: { resolution: 720 } } } });
  assert.deepEqual(current, before);
  assert.ok(reset.ok);
  assert.deepEqual(applyEstimateEdit(reset.value, { map: 'steps', id: 'a', field: 'resolution' }, wf),
    { ok: true, value: { runsPerMonth: 500 } });
  for (const ai of ['qwen3.8-flash', 'qwen-image-2.0', 'missing', 'wan3.0-video']) {
    const graph: WorkflowGraph = { nodes: { a: { id: 'a', kind: 'ai', label: 'Other', task: 'generate', ai } }, edges: {}, groups: {} };
    for (const [field, value] of [['clipSeconds', 15], ['resolution', 720]] as const) {
      assert.equal(applyEstimateEdit({}, { map: 'steps', id: 'a', field, value }, graph).ok, false);
      assert.equal(applyEstimateEdit({}, { map: 'steps', id: 'missing', field, value }, graph).ok, false);
    }
  }
});
