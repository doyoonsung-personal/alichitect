import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkflowPanelModel, usd } from './panel-model.ts';
import { models } from './models.ts';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import { estimateWorkflow } from '@ali/core/workflow-estimate.ts';
import { makeT } from '../i18n/t.ts';
import type { WorkflowGraph } from '@ali/core/types.ts';
test('mapping includes attachments without inferring runtime and preserves estimator identity', () => {
  const workflow: WorkflowGraph = { nodes: { a: { id: 'a', kind: 'agent', label: 'A', runs: 'customer' },
    b: { id: 'b', kind: 'tool', label: 'B', on: 'a', product: 'function-compute' } }, edges: {}, groups: {} };
  const catalog = loadCatalog(), estimate = estimateWorkflow(workflow, models, catalog);
  const model = buildWorkflowPanelModel({ workflow, models, catalog, estimate, t: makeT('en') });
  assert.equal(model.rows[0].runtime, 'Customer system'); assert.equal(model.rows[1].runtime, 'Not specified');
  assert.equal(model.rows[1].host, 'A'); assert.equal(model.estimate, estimate);
  assert.notEqual(usd(0.000001), '$0.00');
});
