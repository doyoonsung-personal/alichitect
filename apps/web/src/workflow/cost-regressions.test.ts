// Exact final-review inputs for cost formatting, assumptions and settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '@ali/core/workflow.ts';
import type { WorkflowOp, WorkflowGraph } from '@ali/core/types.ts';
import { estimateWorkflow, workflowChoiceSets } from '@ali/core/workflow-estimate.ts';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import { models } from './models.ts';
import { applyEstimateEdit, estimateEditRange } from './settings.ts';
import type { EstimateEdit } from './settings.ts';
import { usd, monthlyUsd, unitText, costLineLabel, assumptionText, unpricedReason } from './panel-model.ts';
import { makeT } from '../i18n/t.ts';

const fixture = JSON.parse(readFileSync(new URL('../../../../packages/core/test/fixtures/workflows/support-email-triage.json',
  import.meta.url), 'utf8'));
const ctx = createWorkflowCtx();
let wf = emptyWorkflow();
for (const op of fixture.ops as WorkflowOp[]) wf = applyWorkflowOp(wf, op, ctx).workflow;

test('C19 C20 backend C9: Grounded shares include escalate but exclude edit retries', () => {
  assert.equal(applyEstimateEdit({}, { map: 'shares', id: 'l8', value: 0.8 }, wf).ok, true);
  assert.equal(applyEstimateEdit({ shares: { l8: 0.8 } }, { map: 'shares', id: 'l10', value: 0.2 }, wf).ok, true);
  assert.equal(applyEstimateEdit({ shares: { l11: 0.5, l12: 0.2 } }, { map: 'shares', id: 'l13', value: 0.3 }, wf).ok, false);
  assert.equal(applyEstimateEdit({}, { map: 'loops', id: 'l13', field: 'typical', value: 0 }, wf).ok, true);
  assert.equal(applyEstimateEdit({}, { map: 'loops', id: 'l13', field: 'upper', value: 4 }, wf).ok, false);
});

test('C27 Codex #3 backend C7: reject settings beyond admission and arithmetic caps', () => {
  for (const value of [2e9, 1e100]) assert.equal(applyEstimateEdit({}, { map: 'runsPerMonth', value }, wf).ok, false);
  assert.equal(applyEstimateEdit({}, { map: 'steps', id: 'route', field: 'inTokens', value: 5e6 }, wf).ok, false);
  for (const value of [4, 500]) assert.equal(applyEstimateEdit({}, { map: 'guardTypes', id: 'guard', value }, wf).ok, false);
});

test('C22 Codex #4: sub-cent precision, decimal notation and grouped large values', () => {
  assert.equal(usd(0.01476812), '$0.0148');
  assert.equal(usd(0.00734937), '$0.00735');
  assert.equal(usd(8.2e-7), '$0.00000082');
  assert.equal(usd(9910.13), '$9,910.13');
  assert.equal(usd(0.009999), '$0.01');
});

test('C24: colon and digit in AI and agent labels cannot become token counts', () => {
  for (const kind of ['ai', 'agent'] as const) {
    const workflow: WorkflowGraph = { nodes: { a: { id: 'a', kind, label: 'Escalate: tier 2', task: 'classify',
      ai: 'qwen3.8-flash' } }, edges: {}, groups: {} };
    const estimate = estimateWorkflow(workflow, models, loadCatalog());
    for (const [suffix, value] of [['input', kind === 'ai' ? '700' : '2000'],
      ['output', kind === 'ai' ? '40' : '250'], ['prefix', kind === 'ai' ? '400' : '2000']]) {
      const a = estimate.assumptions.find(a => a.key === 'a:' + suffix)!;
      assert.ok(assumptionText(a, workflow, makeT('en')).includes(value + ' '), suffix);
    }
  }
});

test('C25 C31 backend C12: default counts exclude sentence punctuation in all locales', () => {
  for (const lang of ['en', 'ko', 'zh'] as const) for (const value of ['1', '4', '8', '0.5', '1,000']) {
    const text = assumptionText({ key: 'loops:l9:typical', text: `loops:l9: typical assumes ${value}.` }, wf, makeT(lang));
    assert.doesNotMatch(text, /\.\.|\.을|\.。/);
    assert.ok(text.includes(value));
  }
});

test('C26 C32 C47: loop assumptions identify paths rather than internal edge ids', () => {
  const estimate = estimateWorkflow(wf, models, loadCatalog());
  for (const a of estimate.assumptions.filter(a => /^loops?:/.test(a.key))) {
    const text = assumptionText(a, wf, makeT('en'));
    assert.doesNotMatch(text, /^l\d+:/);
    assert.ok(text.includes('Revise') || text.includes('Approve exact email'));
  }
});

test('C28: MCP and future unpriced reasons never fall through to catalog English', () => {
  const note = 'Tokens plus whatever each server charges. SSE servers only, at most 10 per request, on listed models.';
  for (const lang of ['ko', 'zh'] as const) {
    assert.notEqual(unpricedReason(note, makeT(lang)), note);
    assert.notEqual(unpricedReason('Unknown provider fee.', makeT(lang)), 'Unknown provider fee.');
  }
});

test('C33 Codex #7: legacy huge-value cap assumptions are localized', () => {
  const estimate = estimateWorkflow(wf, models, loadCatalog(), { runsPerMonth: 2e9,
    steps: { route: { inTokens: 5e6 } }, guardTypes: { guard: 500 } });
  for (const lang of ['en', 'ko', 'zh'] as const) for (const a of estimate.assumptions.filter(a => a.key.endsWith(':limit'))) {
    const text = assumptionText(a, wf, makeT(lang));
    assert.notEqual(text, a.text);
    assert.doesNotMatch(text, /runsPerMonth|route:input|guard:guard-types/);
  }
});

test('limits cover every numeric driver and follow estimator rounding of model-supplied maxima', () => {
  const graph: WorkflowGraph = { nodes: { a: { id: 'a', kind: 'agent', label: 'Agent', turns: 100, repeat: 'g' } },
    edges: { e: { id: 'e', from: 'a', to: 'a', kind: 'loop', max: 200 } }, groups: { g: { id: 'g', over: 'Records' } } };
  const cases: Array<[EstimateEdit, number, number]> = [
    [{ map: 'runsPerMonth' }, 0, 1e9],
    [{ map: 'steps', id: 'a', field: 'inTokens' }, 0, 1e6],
    [{ map: 'steps', id: 'a', field: 'outTokens' }, 0, 1e6],
    [{ map: 'agents', id: 'a', field: 'resultTokens' }, 0, 1e6],
    [{ map: 'agents', id: 'a', field: 'searchesPerRequest' }, 0, 100],
    [{ map: 'agents', id: 'a', field: 'upper' }, 1, 50],
    [{ map: 'items', id: 'g', field: 'upper' }, 0, 10000],
    [{ map: 'loops', id: 'e', field: 'upper' }, 0, 100],
  ];
  for (const [edit, min, max] of cases) {
    assert.deepEqual(estimateEditRange(edit, graph), { min, max });
    assert.equal(applyEstimateEdit({}, { ...edit, value: max } as EstimateEdit, graph).ok, true);
    assert.equal(applyEstimateEdit({}, { ...edit, value: max + 1 } as EstimateEdit, graph).ok, false);
  }
  graph.nodes.a.turns = 3.2; graph.edges.e.max = 2.8;
  assert.deepEqual(estimateEditRange({ map: 'agents', id: 'a', field: 'upper' }, graph), { min: 1, max: 4 });
  assert.deepEqual(estimateEditRange({ map: 'loops', id: 'e', field: 'upper' }, graph), { min: 0, max: 2 });
});

test('forward edits keep shares while retries and parallel links do not', () => {
  const graph: WorkflowGraph = { nodes: {
    h: { id: 'h', kind: 'human', task: 'approve', label: 'Review' },
    a: { id: 'a', kind: 'end', label: 'Approved' }, b: { id: 'b', kind: 'end', label: 'Edit next' },
  }, edges: {
    yes: { id: 'yes', from: 'h', to: 'a', kind: 'branch', outcome: 'approve' },
    edit: { id: 'edit', from: 'h', to: 'b', kind: 'branch', outcome: 'edit' },
  }, groups: {} };
  assert.equal(applyEstimateEdit({}, { map: 'shares', id: 'edit', value: 0.2 }, graph).ok, true);
  assert.equal(applyEstimateEdit({}, { map: 'loops', id: 'edit', field: 'typical', value: 1 }, graph).ok, false);
  assert.equal(applyEstimateEdit({}, { map: 'shares', id: 'l13', value: 0 }, wf).ok, false);
  assert.deepEqual(Object.keys(workflowChoiceSets(wf).shares).sort(), ['l10', 'l11', 'l12', 'l8']);
});

test('C23 C34: all emitted unit codes and indexing suffixes have localized labels', () => {
  const units = ['mtok', 'reviewer hour', 'detection call', 'event', 'message', 'CU-second', 'GB-month / capacity',
    'document tokens', 'compute CU', 'compute second', 'instance-month', 'control-plane hour', '10k-chars', 'image',
    'call', 'page', 'transition', 'model usage'];
  for (const lang of ['en', 'ko', 'zh'] as const) {
    const t = makeT(lang);
    for (const unit of units) {
      assert.notEqual(unitText(unit, t), unit);
      assert.doesNotMatch(unitText(unit, t), /workflow\.cost/);
    }
    const label = costLineLabel({ id: 'route:indexing', label: 'Intent and urgency: indexing and ingestion' }, wf, t);
    assert.equal(label, t('workflow.cost.labelValue', { label: wf.nodes.route.label, value: t('workflow.cost.indexing') }));
    assert.equal(monthlyUsd(0.01476812, lang), '$0.01');
    assert.equal(usd(0.01476812, lang), '$0.0148');
    for (const key of ['arithmetic:limit', 'resources']) {
      assert.notEqual(assumptionText({ key, text: 'Internal diagnostic.' }, wf, t), 'Internal diagnostic.');
    }
  }
});
