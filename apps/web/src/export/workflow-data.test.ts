import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../test/fixtures.ts';
import { createInitialState } from '../store/reducer.ts';
import { buildProposal } from './model.ts';
import { workflowPdfData, committedExportSnapshot } from './workflow-data.ts';
import { workflowFixture } from './workflow-fixtures.ts';
test('adapter retains the exact p7a data and hidden attachment mapping without calculating anything', () => {
  const state = createInitialState({ lang: 'en', id: 'wf', now: 0 });
  state.session.memory.workflow = workflowFixture();
  const model = buildProposal({ session: state.session, graph: state.session.memory.graph,
    layout: null, catalog, lang: 'en', now: new Date(0) });
  const data = workflowPdfData(model)!;
  assert.equal(data, model.workflow);
  assert.ok(data.mapping.some((r) => r.id === 'tool-3' && r.on === 'step-3'));
  assert.ok(data.openQuestions.length >= 3);
  assert.ok(data.cost.unpriced.length);
  const { workflow: omitted, ...cloud } = model;
  assert.ok(omitted);
  assert.equal(workflowPdfData(cloud), null);
});

test('export snapshot uses committed workflow and settings, isolated before asynchronous export work', () => {
  const state = createInitialState({ lang: 'en', id: 'snapshot', now: 0 });
  state.session.memory.workflow = workflowFixture(10);
  state.session.memory.workflowSettings = { approvalOff: ['send'] };
  state.workflowDisplay.graph = workflowFixture(25);
  const snapshot = committedExportSnapshot(state, catalog);
  assert.equal(Object.keys(snapshot.workflow!.nodes).length, 14);
  assert.equal(snapshot.workflow, snapshot.session.memory.workflow);
  state.session.memory.workflowSettings.approvalOff = [];
  assert.deepEqual(snapshot.session.memory.workflowSettings?.approvalOff, ['send']);
  assert.equal(snapshot.layout, state.display.layout);
});
