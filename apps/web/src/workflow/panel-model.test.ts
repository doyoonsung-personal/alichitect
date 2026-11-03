import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkflowPanelModel, workflowPanelOrder, workflowCostDrivers, usd, unitText, assumptionText, unpricedReason } from './panel-model.ts';
import { readdirSync, readFileSync } from 'node:fs';
import { layoutWorkflow } from '@ali/core/workflow-layout.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import type { WorkflowOp } from '@ali/core/types.ts';
import { buildProposal } from '../export/model.ts';
import { createInitialState } from '../store/reducer.ts';
import { parseStored } from '../store/sessions.ts';
import { applyEstimateEdit } from './settings.ts';
import { models } from './models.ts';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import { estimateWorkflow } from '@ali/core/workflow-estimate.ts';
import { makeT } from '../i18n/t.ts';
import type { WorkflowGraph } from '@ali/core/types.ts';

const video: WorkflowGraph = { nodes: {
  video: { id: 'video', kind: 'ai', label: 'Ad: take 2', task: 'create', ai: 'wan3.0-video' },
}, edges: {}, groups: {} };

test('video cost drivers persist edits and price 15 seconds at 720P at $1.50 per run', () => {
  const catalog = loadCatalog(), t = makeT('en'), estimate = estimateWorkflow(video, models, catalog);
  assert.equal(estimate.typical.perRunUsd, 1.5);
  const drivers = workflowCostDrivers(video, {}, estimate, t);
  assert.deepEqual(drivers.map((d) => d.edit), [
    { map: 'runsPerMonth' }, { map: 'steps', id: 'video', field: 'clipSeconds' }, { map: 'steps', id: 'video', field: 'resolution' },
  ]);
  assert.deepEqual(drivers[2].options, [480, 720, 1080]);
  assert.ok(drivers[1].label.includes('seconds of video'));
  assert.ok(drivers[1].edit.map === 'steps');
  assert.ok(drivers[2].edit.map === 'steps');
  const changed = applyEstimateEdit({}, { ...drivers[1].edit, value: 10 }, video);
  assert.ok(changed.ok);
  const resolved = applyEstimateEdit(changed.value, { ...drivers[2].edit, value: 480 }, video);
  assert.ok(resolved.ok);
  const state = createInitialState({ lang: 'en', id: 'video', now: 0 });
  const session = { ...state.session, mode: 'workflow', memory: { ...state.session.memory, workflow: video, estimate: resolved.value } };
  const saved = parseStored(JSON.stringify({ v: 1, sessions: [session] }))[0];
  assert.deepEqual(saved.memory.estimate, { steps: { video: { clipSeconds: 10, resolution: 480 } } });
  const next = estimateWorkflow(video, models, catalog, saved.memory.estimate);
  assert.equal(next.typical.perRunUsd, 0.5);
  assert.equal(next.upper.perRunUsd, 6);
  assert.deepEqual(workflowCostDrivers(video, saved.memory.estimate!, next, t).slice(1).map((d) => d.value), [10, 480]);
  const wan27 = structuredClone(video);
  wan27.nodes.video.ai = 'wan2.7-t2v';
  assert.deepEqual(workflowCostDrivers(wan27, {}, estimateWorkflow(wan27, models, catalog), t)[2].options, [720, 1080]);
});

test('video units, coverage, assumptions and unpriced media reasons are localized in all three languages', () => {
  const catalog = loadCatalog(), graph = structuredClone(video);
  graph.nodes.video.ai = 'happyhorse-1.1-r2v';
  for (const lang of ['en', 'ko', 'zh'] as const) {
    const t = makeT(lang);
    assert.equal(unitText('second', t), t('workflow.cost.unitName.videoSecond'));
    assert.notEqual(unitText('second', t), t('workflow.cost.unitName.unknown'));
    assert.match(t('workflow.cost.coverageText'), /720P/);
    assert.match(t('workflow.cost.coverageText'), /1080P/);
    for (const settings of [{}, { steps: { video: { clipSeconds: 1 } } }, { steps: { video: { clipSeconds: 31 } } }]) {
      const estimate = estimateWorkflow(graph, models, catalog, settings);
      for (const a of estimate.assumptions.filter((a) => a.key.startsWith('video:'))) {
        const text = assumptionText(a, graph, t);
        assert.notEqual(text, t('workflow.cost.assumptionUnknown'), a.key);
        assert.doesNotMatch(text, /\{\w+\}|\?\?|workflow\.cost/);
        assert.ok(text.includes(graph.nodes.video.label));
        if (lang !== 'en') assert.notEqual(text, a.text);
        if (a.key === 'video:video') assert.match(text, /1080P/);
      }
    }
    const reason = 'Image, voice or unsupported media quantities are not estimated in this release.';
    assert.equal(unpricedReason(reason, t), t('workflow.cost.reason.modality'));
    assert.equal(unpricedReason('No confirmed video rate for 480P typical and 1080P upper.', t),
      t('workflow.cost.reason.videoResolution', { resolution: 480 }));
  }
});
test('mapping includes attachments without inferring runtime and preserves estimator identity', () => {
  const workflow: WorkflowGraph = { nodes: { a: { id: 'a', kind: 'agent', label: 'A', runs: 'customer' },
    b: { id: 'b', kind: 'tool', label: 'B', on: 'a', product: 'function-compute' } }, edges: {}, groups: {} };
  const catalog = loadCatalog(), estimate = estimateWorkflow(workflow, models, catalog);
  const model = buildWorkflowPanelModel({ workflow, models, catalog, estimate, t: makeT('en') });
  assert.equal(model.rows[0].runtime, 'Customer system'); assert.equal(model.rows[1].runtime, '');
  assert.ok(model.rows.every((r) => r.task === '' && r.why === ''));
  assert.equal(model.rows[1].glyph, 'tool');
  assert.equal(model.rows[1].host, 'A'); assert.equal(model.estimate, estimate);
  assert.notEqual(usd(0.000001), '$0.00');
});

test('column then lane order keeps repeat members together and attachments immediately after their host', () => {
  const workflow: WorkflowGraph = { nodes: {
    a: { id: 'a', kind: 'end', label: 'End' }, z: { id: 'z', kind: 'trigger', label: 'Start' },
    b: { id: 'b', kind: 'ai', label: 'B', repeat: 'g' }, c: { id: 'c', kind: 'ai', label: 'C', repeat: 'g' },
    d: { id: 'd', kind: 'human', label: 'Other lane' },
    t: { id: 't', kind: 'tool', label: 'Attached', on: 'b' },
    u: { id: 'u', kind: 'memory', label: 'Nested attachment', on: 't' },
  }, edges: {}, groups: { g: { id: 'g', over: 'items' } } };
  const layout = layoutWorkflow(workflow);
  layout.workflow.cells = { z: { column: 0, row: 0 }, b: { column: 1, row: 0 }, d: { column: 1, row: 1 },
    c: { column: 2, row: 0 }, a: { column: 3, row: 0 } };
  const before = structuredClone(workflow);
  assert.deepEqual(workflowPanelOrder(workflow, layout).map((n) => n.id), ['z', 'b', 't', 'u', 'c', 'd', 'a']);
  assert.deepEqual(workflow, before);
});

const mismatches: string[] = [];
test('32 fixtures retain every step and compare actual PDF sections', () => {
  const dir = new URL('../../../../packages/core/test/fixtures/workflows/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 32);
  const catalog = loadCatalog();
  for (const file of files) {
    const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8')), ctx = createWorkflowCtx();
    let workflow = emptyWorkflow(), layout = layoutWorkflow(workflow);
    for (const op of fixture.ops as WorkflowOp[]) {
      workflow = applyWorkflowOp(workflow, op, ctx).workflow;
      layout = layoutWorkflow(workflow, layout);
    }
    const rows = workflowPanelOrder(workflow, layout);
    assert.deepEqual(rows.map((n) => n.id).sort(), Object.keys(workflow.nodes).sort(), file);
    for (const host of rows) {
      const children = rows.filter((n) => n.on === host.id);
      if (children.length) assert.equal(rows[rows.indexOf(host) + 1].on, host.id, file + ': ' + host.id);
    }
    const s = createInitialState({ lang: 'en', canvas: { w: 1040, h: 800 }, id: file, now: 0 });
    const session = { ...s.session, mode: 'workflow' as const, memory: { ...s.session.memory, workflow } };
    const pdf = buildProposal({ session, graph: session.memory.graph, layout: null, workflowLayout: layout, catalog, lang: 'en', now: new Date(0) });
    const panelIds = rows.filter((n) => !n.on && n.kind !== 'trigger' && n.kind !== 'end').map((n) => n.id);
    const pdfIds = pdf.workflow!.steps.map((n) => n.id);
    if (JSON.stringify(panelIds) !== JSON.stringify(pdfIds)) mismatches.push(file);
    assert.deepEqual(pdf.workflow!.mapping.map((n) => n.id), rows.filter((n) => n.kind !== 'end').map((n) => n.id), file);
  }
});

test('panel and PDF step section orders agree on all 32 fixtures', () => {
  assert.deepEqual(mismatches, []);
});
