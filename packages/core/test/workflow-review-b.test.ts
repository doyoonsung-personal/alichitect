import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, loadModels } from '../src/catalog-node.ts';
import { validateWorkflowOp, checkWorkflow, repairWorkflow } from '../src/workflow-validate.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '../src/workflow.ts';
import type { WorkflowGraph, WorkflowNode, WorkflowEdge } from '../src/types.ts';
const catalog = loadCatalog(), models = loadModels();
const n = (id: string, kind: WorkflowNode['kind'], extra = {}): WorkflowNode => ({ id, kind, label: id, ...extra });
const e = (from: string, to: string, extra = {}): WorkflowEdge => ({ id: `${from}-${to}`, from, to, ...extra });
const graph = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowGraph => ({
  nodes: Object.fromEntries(nodes.map(n => [n.id, n])), edges: Object.fromEntries(edges.map(e => [e.id, e])), groups: {},
});
for (const kind of ['ai', 'agent', 'guard', 'knowledge', 'decide', 'human', 'trigger', 'end'] as const) {
  test(`#2 C6 C14: ${kind} cannot carry pay`, () => {
    const pay = n('pay', kind, { ai: 'qwen3.8-flash', effect: 'pay' });
    const wf = graph([n('start', 'trigger'), pay, n('end', 'end')], [e('start', 'pay'), e('pay', 'end')]);
    assert.ok(checkWorkflow(wf, catalog, models).some(w => w.code === 'wf-approval'));
    const v = validateWorkflowOp({ t: 'step', ...pay }, catalog, models);
    assert.equal((v.op as WorkflowNode).effect, undefined);
    assert.ok(v.warnings.length);
    const r = repairWorkflow(wf, catalog, models);
    assert.equal(r.workflow.nodes.pay.effect, undefined);
    assert.ok(r.warnings.some(w => w.repaired));
  });
}
test('C6: memory write under approvalOn and memory delete need approval', () => {
  for (const effect of ['write', 'delete']) {
    const wf = graph([n('start', 'trigger'), n('draft', 'ai', { ai: 'qwen3.8-max', task: 'generate' }),
      n('x', 'memory', { effect }), n('end', 'end')], [e('start', 'draft'), e('draft', 'x'), e('x', 'end')]);
    assert.ok(checkWorkflow(wf, catalog, models, { approvalOn: ['write'] }).some(w => w.code === 'wf-approval'));
  }
});
for (const reverse of [false, true]) test(`#3 C5 C15: attached links rejected, late on=${reverse}`, () => {
  const nodes = [n('start', 'trigger'), n('agent', 'agent', { ai: 'qwen3.7-plus', turns: 3 }),
    n('lookup', 'tool', { effect: 'read', on: 'agent' }), n('send', 'act', { effect: 'send' }), n('end', 'end')];
  const edges = [e('start', 'agent'), e('agent', 'end'), e('lookup', 'send'), e('send', 'end'), e('agent', 'lookup')];
  const wf = graph(nodes, edges);
  const warnings = checkWorkflow(wf, catalog, models);
  assert.ok(warnings.some(w => w.code === 'wf-attach-form' && w.severity === 'error'));
  assert.ok(warnings.some(w => w.code === 'wf-unreachable' && w.ids.includes('send')));
  const r = repairWorkflow(wf, catalog, models);
  assert.equal(r.workflow.edges['lookup-send'], undefined);
  assert.equal(r.workflow.edges['agent-lookup'], undefined);
  assert.deepEqual(repairWorkflow(r.workflow, catalog, models).workflow, r.workflow);
  const ctx = {};
  if (!reverse) for (const node of nodes) validateWorkflowOp({ t: 'step', ...node }, catalog, models, ctx);
  const link = validateWorkflowOp({ t: 'link', ...edges[2] }, catalog, models, ctx);
  if (!reverse) assert.equal(link.op, undefined);
  let streamed = emptyWorkflow();
  const apply = createWorkflowCtx();
  const ops = reverse ? [...edges.map(x => ({ t: 'link', ...x })), ...nodes.map(x => ({ t: 'step', ...x }))]
    : [...nodes.map(x => ({ t: 'step', ...x })), ...edges.map(x => ({ t: 'link', ...x }))];
  for (const op of ops) streamed = applyWorkflowOp(streamed, op as any, apply).workflow;
  assert.equal(repairWorkflow(streamed, catalog, models).workflow.edges['lookup-send'], undefined);
});
test('C17: automated translation edit cycle is not human revision', () => {
  const wf = graph([n('in', 'trigger'), n('tr', 'ai', { task: 'translate', ai: 'qwen3.8-flash' }),
    n('qa', 'ai', { task: 'check', ai: 'qwen3.8-flash' }), n('end', 'end')],
  [e('in', 'tr'), e('tr', 'qa'), e('qa', 'tr', { outcome: 'edit', label: 'fix issues' }),
    e('qa', 'end', { kind: 'branch', label: 'passes' })]);
  assert.ok(checkWorkflow(wf, catalog, models).some(w => w.code === 'wf-cycle'));
  const r = repairWorkflow(wf, catalog, models);
  assert.equal(r.workflow.edges['qa-tr'].outcome, undefined);
  assert.equal(r.workflow.edges['qa-tr'].max, 3);
  assert.ok(r.warnings.some(w => w.code === 'wf-loop-exit'));
  const ctx = {};
  validateWorkflowOp({ t: 'step', ...wf.nodes.qa }, catalog, models, ctx);
  assert.equal((validateWorkflowOp({ t: 'link', ...wf.edges['qa-tr'] }, catalog, models, ctx).op as WorkflowEdge).outcome, undefined);
});
test('#4: attachment repair cannot add a sixty-first edge', () => {
  const wf = graph([n('start', 'trigger'), n('end', 'end'), n('review', 'human', { on: 'start' })],
    Array.from({ length: 60 }, (_, i) => e('start', 'end', { id: `link-${i}` })));
  const r = repairWorkflow(wf, catalog, models);
  assert.equal(Object.keys(r.workflow.edges).length, 60);
  assert.ok(r.warnings.some(w => w.msg.includes('limit')));
});

test('C14 exact: booking agent pays before human approval', () => {
  const wf = graph([n('in', 'trigger'), n('booker', 'agent',
    { task: 'plan', ai: 'qwen3.8-max', turns: 8, effect: 'pay' }),
    n('review', 'human', { task: 'approve', subject: 'booker' }), n('end', 'end'), n('end-2', 'end')],
  [e('in', 'booker'), e('booker', 'review'), e('review', 'end', { outcome: 'approve' }),
    e('review', 'end-2', { outcome: 'reject' })]);
  assert.ok(checkWorkflow(wf, catalog, models).some(w => w.code === 'wf-approval'));
  assert.equal(repairWorkflow(wf, catalog, models).workflow.nodes.booker.effect, undefined);
});
test('C14 exact: support draft sends before human approval', () => {
  const wf = graph([n('in', 'trigger'), n('cls', 'ai', { task: 'classify', ai: 'qwen-flash' }),
    n('draft', 'ai', { task: 'generate', ai: 'qwen3.7-plus', effect: 'send' }),
    n('ok', 'human', { task: 'approve' }), n('end', 'end')],
  [e('in', 'cls'), e('cls', 'draft'), e('draft', 'ok'), e('ok', 'end', { outcome: 'approve' }),
    e('ok', 'end', { id: 'reject', outcome: 'reject' })]);
  assert.ok(checkWorkflow(wf, catalog, models).some(w => w.code === 'wf-approval'));
  assert.equal(repairWorkflow(wf, catalog, models).workflow.nodes.draft.effect, undefined);
});
test('C15 exact: booking control route cannot leave attached search', () => {
  const wf = graph([n('in', 'trigger'), n('planner', 'agent', { task: 'plan', ai: 'qwen3.8-max', turns: 8 }),
    n('search', 'tool', { on: 'planner', tool: 'web_search', effect: 'read' }),
    n('review', 'human', { task: 'approve', subject: 'planner' }), n('book', 'act', { effect: 'pay', runs: 'customer' }),
    n('end', 'end'), n('end-2', 'end')], [e('in', 'planner'), e('planner', 'review'),
    e('review', 'end', { outcome: 'approve' }), e('review', 'end-2', { outcome: 'reject' }),
    e('search', 'book'), e('book', 'end')]);
  assert.ok(checkWorkflow(wf, catalog, models).some(w => w.code === 'wf-unreachable' && w.ids.includes('book')));
});
