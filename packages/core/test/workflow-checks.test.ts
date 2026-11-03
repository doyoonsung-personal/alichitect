import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../src/catalog.ts';
import { loadCatalog, loadModels } from '../src/catalog-node.ts';
import { createModelTable } from '../src/models.ts';
import type { ModelEntry } from '../src/models.ts';
import { checkWorkflow, repairWorkflow, validateWorkflowOp } from '../src/workflow-validate.ts';
import { estimateWorkflow } from '../src/workflow-estimate.ts';
import { makeStep } from '../src/workflow.ts';
import type { CatalogEntry, Warning, WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowSettings } from '../src/types.ts';

const model: ModelEntry = {
  id: 'qwen-test', name: 'Test model', family: 'qwen', tier: 'mid',
  in: ['text'], out: ['text'], roles: ['generate'], functions: true,
  tools: ['search'], batch: true, regions: ['ap-southeast-1'], status: 'ga',
  use: 'Test fixture', verified: '2026-11-02', source: 'test',
};
const table = (patch: Partial<ModelEntry> = {}) => createModelTable({
  version: '2026-11-02', scope: 'international', models: [{ ...model, ...patch }],
  tools: [{ id: 'search', name: 'Search', verified: '2026-11-02', source: 'test' }],
});
const models = table();
const baseProduct = loadCatalog().entries[0];
const product = (id: string, patch: Partial<CatalogEntry> = {}): CatalogEntry => ({
  ...baseProduct, id, name: id, short: id, aliases: [], status: 'ga', availability: 'intl', ...patch,
});
const catalog = createCatalog([
  product('current'), product('retired', { status: 'retired', successor: 'current' }),
  product('closed', { status: 'no-new-purchases', successor: 'current' }),
  product('restricted', { availability: 'restricted' }), product('china', { availability: 'china-only' }),
], []);
const node = (id: string, kind: WorkflowNode['kind'], patch: Partial<WorkflowNode> = {}): WorkflowNode => ({ id, kind, label: id, ...patch });
const edge = (from: string, to: string, patch: Partial<WorkflowEdge> = {}): WorkflowEdge => ({ id: `${from}-${to}`, from, to, ...patch });
const graph = (nodes: WorkflowNode[], edges: WorkflowEdge[] = []): WorkflowGraph => ({
  nodes: Object.fromEntries(nodes.map(n => [n.id, structuredClone(n)])),
  edges: Object.fromEntries(edges.map(e => [e.id, structuredClone(e)])), groups: {},
});
const start = node('start', 'trigger');
const end = node('end', 'end');
const draft = node('draft', 'ai', { ai: model.id, task: 'generate' });
const approve = node('approve', 'human', { task: 'approve', subject: 'draft' });
const send = node('send', 'act', { effect: 'send' });
const agent = node('agent', 'agent', { ai: model.id, turns: 10 });
const linear = (...nodes: WorkflowNode[]): WorkflowGraph => graph(nodes, nodes.slice(1).map((n, i) => edge(nodes[i].id, n.id)));
const warnings = (wf: WorkflowGraph, settings?: WorkflowSettings) => checkWorkflow(wf, catalog, models, settings);
const ofCode = (wf: WorkflowGraph, code: Warning['code'], settings?: WorkflowSettings) => warnings(wf, settings).filter(w => w.code === code);
const approved = (): WorkflowGraph => graph([start, draft, approve, send, end], [
  edge('start', 'draft'), edge('draft', 'approve'), edge('approve', 'send', { outcome: 'approve' }),
  edge('approve', 'end', { outcome: 'reject' }), edge('send', 'end'),
]);
const freeze = (value: object): void => {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
};

// Each row asserts its own code, so unrelated diagnostics cannot mask a missing check.
const cases: Array<{ code: Warning['code']; severity: Warning['severity']; fault: () => WorkflowGraph; clean: () => WorkflowGraph }> = [
  { code: 'wf-no-trigger', severity: 'error', fault: () => graph([end]), clean: () => linear(start, end) },
  { code: 'wf-unreachable', severity: 'error', fault: () => graph([start, end]), clean: () => linear(start, end) },
  { code: 'wf-ai-missing', severity: 'error', fault: () => linear(start, node('ai', 'ai'), end), clean: () => linear(start, draft, end) },
  { code: 'wf-attach-form', severity: 'warn', fault: () => graph([start, node('bad', 'guard', { on: 'start' }), end], [edge('start', 'end')]), clean: () => graph([start, agent, node('tool', 'tool', { on: 'agent' }), end], [edge('start', 'agent'), edge('agent', 'end')]) },
  { code: 'wf-dead-end', severity: 'warn', fault: () => graph([start]), clean: () => linear(start, end) },
  { code: 'wf-cycle', severity: 'warn', fault: () => graph([start, draft, end], [edge('start', 'draft'), edge('draft', 'start'), edge('draft', 'end')]), clean: () => linear(start, draft, end) },
  { code: 'wf-loop-exit', severity: 'warn', fault: () => graph([start, draft, end], [edge('start', 'draft'), edge('draft', 'start', { kind: 'loop' }), edge('draft', 'end')]), clean: () => graph([start, draft, end], [edge('start', 'draft'), edge('draft', 'start', { kind: 'loop', max: 3 }), edge('draft', 'end', { outcome: 'exhausted' })]) },
  { code: 'wf-agent-turns', severity: 'info', fault: () => linear(start, node('agent', 'agent', { ai: model.id }), end), clean: () => linear(start, agent, end) },
  { code: 'wf-act-effect', severity: 'warn', fault: () => linear(start, node('act', 'act'), end), clean: () => linear(start, node('act', 'act', { effect: 'read' }), end) },
  { code: 'wf-approval', severity: 'warn', fault: () => linear(start, draft, send, end), clean: approved },
  { code: 'wf-mixed-out', severity: 'warn', fault: () => graph([start, draft, end], [edge('start', 'draft'), edge('start', 'end', { kind: 'branch' }), edge('draft', 'end')]), clean: () => graph([start, draft, end], [edge('start', 'draft'), edge('start', 'end'), edge('draft', 'end')]) },
  { code: 'wf-human-outcomes', severity: 'warn', fault: () => linear(start, approve, end), clean: approved },
  { code: 'wf-reply-guard', severity: 'warn', fault: () => linear(start, node('reply', 'act', { effect: 'reply' }), end), clean: () => graph([start, node('reply', 'act', { effect: 'reply' }), node('person', 'human', { task: 'takeover' }), end], [edge('start', 'reply'), edge('reply', 'end'), edge('reply', 'person', { kind: 'escalate' }), edge('person', 'end')]) },
  { code: 'wf-trifecta', severity: 'warn', fault: () => linear({ ...start, untrusted: true }, { ...draft, private: true }, send, end), clean: () => { const wf = approved(); wf.nodes.start.untrusted = true; wf.nodes.draft.private = true; return wf; } },
  { code: 'wf-decision-review', severity: 'info', fault: () => linear(start, node('decision', 'act', { effect: 'decide' }), end), clean: () => linear(start, node('decision', 'act', { effect: 'read' }), end) },
  { code: 'wf-ai-region', severity: 'warn', fault: () => linear(start, { ...draft, ai: 'qwen-elsewhere' }, end), clean: () => linear(start, draft, end) },
  { code: 'wf-ai-mismatch', severity: 'warn', fault: () => linear(start, { ...draft, task: 'speak' }, end), clean: () => linear(start, draft, end) },
  { code: 'wf-dangling-ref', severity: 'info', fault: () => linear(start, { ...draft, after: 'missing' }, end), clean: () => linear(start, { ...draft, after: 'start' }, end) },
  { code: 'wf-gated-product', severity: 'warn', fault: () => linear(start, { ...draft, product: 'retired' }, end), clean: () => linear(start, { ...draft, product: 'current' }, end) },
];
const regionModels = createModelTable({ version: 'test', scope: 'international', models: [model, { ...model, id: 'qwen-elsewhere', regions: ['elsewhere'] }], tools: [...models.tools.values()] });
for (const c of cases) test(`${c.code}: seeded fault and clean counterpart`, () => {
  const fault = checkWorkflow(c.fault(), catalog, regionModels).filter(w => w.code === c.code);
  assert.ok(fault.length > 0, c.code);
  assert.ok(fault.every(w => w.severity === c.severity && !w.repaired));
  assert.deepEqual(checkWorkflow(c.clean(), catalog, regionModels).filter(w => w.code === c.code), []);
});

test('approval before translation does not cover the translated content', () => {
  const wf = approved();
  wf.nodes.translation = node('translation', 'ai', { ai: model.id, task: 'translate' });
  wf.edges['approve-send'].to = 'translation';
  wf.edges['translation-send'] = edge('translation', 'send');
  assert.equal(ofCode(wf, 'wf-approval').length, 1);
  const fixed = approved();
  fixed.nodes.draft.task = 'translate';
  assert.deepEqual(ofCode(fixed, 'wf-approval'), []);
});
test('attached send needs explicit approval at call', () => {
  const wf = linear(start, agent, end);
  wf.nodes.tool = node('tool', 'tool', { on: 'agent', effect: 'send' });
  assert.equal(ofCode(wf, 'wf-approval').length, 1);
  wf.nodes.tool.approval = 'required';
  assert.deepEqual(ofCode(wf, 'wf-approval'), []);
});
for (const outcome of ['timeout', 'reject', 'edit', undefined] as const) test(`approve outgoing ${outcome ?? 'unspecified'} is not a gate`, () => {
  const wf = approved();
  if (outcome) wf.edges['approve-send'].outcome = outcome;
  else delete wf.edges['approve-send'].outcome;
  assert.equal(ofCode(wf, 'wf-approval').length, 1);
  assert.deepEqual(ofCode(approved(), 'wf-approval'), []);
  wf.nodes.approve.task = 'takeover';
  assert.deepEqual(ofCode(wf, 'wf-approval'), []);
});
test('every incoming path must be gated; waivers downgrade but do not hide the warning', () => {
  const wf = approved(); wf.edges.bypass = edge('draft', 'send', { id: 'bypass' });
  assert.equal(ofCode(wf, 'wf-approval').length, 1);
  assert.equal(ofCode(wf, 'wf-approval', { approvalOff: ['send'] })[0].severity, 'info');
  wf.nodes.send.approval = 'skip';
  assert.equal(ofCode(wf, 'wf-approval')[0].severity, 'info');
});
test('pass-through nodes preserve the backward walk and generated tools reset approval', () => {
  for (const middle of [node('middle', 'guard'), node('middle', 'decide'), node('middle', 'knowledge'), node('middle', 'memory'), node('middle', 'act', { effect: 'write' }), node('middle', 'act', { effect: 'read' }), node('middle', 'tool'), node('middle', 'tool', { effect: 'read' })]) {
    const wf = approved(); wf.nodes.middle = middle;
    wf.edges['approve-send'].to = 'middle'; wf.edges['middle-send'] = edge('middle', 'send');
    assert.deepEqual(ofCode(wf, 'wf-approval'), []);
    delete wf.edges['approve-send'].outcome;
    assert.equal(ofCode(wf, 'wf-approval').length, 1);
  }
  for (const task of ['generate', 'create'] as const) {
    const wf = approved(); wf.nodes.writer = node('writer', 'tool', { effect: 'write', task });
    wf.edges['approve-send'].to = 'writer'; wf.edges['writer-send'] = edge('writer', 'send');
    assert.equal(ofCode(wf, 'wf-approval').length, 1);
  }
});
test('model functions and tools distinguish false, unknown and supported', () => {
  for (const functions of [false, null, true]) {
    const found = checkWorkflow(linear(start, agent, end), catalog, table({ functions })).filter(w => w.code === 'wf-ai-mismatch');
    assert.equal(found.length, functions === true ? 0 : 1);
    if (functions !== true) assert.equal(found[0].severity, functions === null ? 'info' : 'warn');
    if (functions === null) assert.match(found[0].msg, /not established; confirm/);
  }
  for (const kind of ['agent', 'ai'] as const) for (const tools of [null, [], ['search']]) {
    const wf = linear(start, { ...agent, kind }, end);
    wf.nodes.tool = node('tool', 'tool', { on: 'agent', tool: 'search' });
    const found = checkWorkflow(wf, catalog, table({ tools })).filter(w => w.code === 'wf-ai-mismatch');
    assert.equal(found.length, tools?.includes('search') ? 0 : 1);
    if (!tools?.includes('search')) assert.equal(found[0].severity, tools === null ? 'info' : 'warn');
    if (tools === null) assert.match(found[0].msg, /not established; confirm/);
  }
});
for (const task of ['transcribe', 'see', 'speak', 'create'] as const) test(`${task} validates required modality`, () => {
  const wf = linear(start, { ...draft, task }, end);
  assert.equal(ofCode(wf, 'wf-ai-mismatch').length, 1);
  const capable = table({ in: ['text', 'audio', 'image'], out: ['text', 'audio', 'image'] });
  assert.deepEqual(checkWorkflow(wf, catalog, capable).filter(w => w.code === 'wf-ai-mismatch'), []);
});
test('AI missing includes agents and explicit unknown knowledge models, not plain knowledge', () => {
  for (const kind of ['ai', 'agent', 'knowledge'] as const) {
    assert.equal(ofCode(linear(start, node('x', kind, { ai: 'missing' }), end), 'wf-ai-missing').length, 1);
  }
  assert.deepEqual(ofCode(linear(start, node('kb', 'knowledge'), end), 'wf-ai-missing'), []);
  assert.equal(ofCode(linear(start, draft, end), 'wf-ai-region', { region: 'elsewhere' }).length, 1);
});
test('cycle detection ignores loop and edit links, including a non-closing edge', () => {
  for (const patch of [{ kind: 'loop', max: 3 }, { outcome: 'edit' }] as const) {
    const wf = graph([start, draft, approve, end], [edge('start', 'approve'), edge('approve', 'draft', patch),
      edge('draft', 'approve'), edge('draft', 'end')]);
    assert.deepEqual(ofCode(wf, 'wf-cycle'), []);
    assert.equal(repairWorkflow(wf, catalog, models).workflow, wf);
  }
  const detached = graph([start, end, node('a', 'guard'), node('b', 'guard')], [edge('start', 'end'), edge('a', 'b'), edge('b', 'a')]);
  assert.deepEqual(ofCode(detached, 'wf-cycle'), []);
});
test('live triage next and rejection branch become exclusive routes, purely and idempotently', () => {
  const liveModels = table({ id: 'qwen3.8-max' });
  const wf = graph([
    start, node('triage', 'ai', { label: 'Triage', ai: 'qwen3.8-max', task: 'classify' }),
    node('embed-query', 'knowledge', { task: 'retrieve' }), node('done-rejected', 'end'), end,
  ], [
    edge('start', 'triage'), edge('triage', 'embed-query', { kind: 'next' }),
    edge('triage', 'done-rejected', { kind: 'branch', label: 'rejected' }), edge('embed-query', 'end'),
  ]);
  assert.equal(ofCode(wf, 'wf-mixed-out').length, 1);
  const before = structuredClone(wf);
  freeze(wf);
  const r = repairWorkflow(wf, catalog, liveModels);
  assert.deepEqual(wf, before);
  assert.deepEqual(r.workflow.edges['triage-embed-query'], edge('triage', 'embed-query', { kind: 'branch', label: 'otherwise' }));
  assert.deepEqual(r.workflow.edges['triage-done-rejected'], wf.edges['triage-done-rejected']);
  assert.deepEqual(r.warnings, [{
    code: 'wf-mixed-out', ids: ['triage', 'triage-embed-query'],
    msg: "'Triage' (triage): converted next links 'triage-embed-query' to branches.", severity: 'warn', repaired: true,
  }]);
  assert.deepEqual(checkWorkflow(r.workflow, catalog, liveModels), []);
  freeze(r.workflow);
  const again = repairWorkflow(r.workflow, catalog, liveModels);
  assert.equal(again.workflow, r.workflow);
  assert.deepEqual(again.warnings, []);
});

test('mixed-out repair handles every alternative and preserves labels and outcome routes', () => {
  const alternatives: Partial<WorkflowEdge>[] = [
    { kind: 'branch' }, { kind: 'loop', max: 3 }, { kind: 'escalate' },
    ...(['approve', 'edit', 'reject', 'timeout', 'exhausted'] as const).map(outcome => ({ outcome })),
    { kind: 'next', outcome: 'approve' },
  ];
  for (const alternative of alternatives) {
    const wf = graph([{ ...start, kind: 'human', task: 'approve' }, end], [
      edge('start', 'end', { id: 'z', kind: 'next', label: 'accepted' }),
      edge('start', 'end', { id: 'b', kind: 'next', label: '' }),
      edge('start', 'end', { id: 'a' }), edge('start', 'end', { id: 'alternative', ...alternative }),
    ]);
    const r = repairWorkflow(wf, catalog, models);
    assert.deepEqual(r.workflow.edges.z, edge('start', 'end', { id: 'z', kind: 'branch', label: 'accepted' }));
    for (const id of ['a', 'b']) {
      assert.deepEqual(r.workflow.edges[id], edge('start', 'end', { id, kind: 'branch', label: 'otherwise' }));
    }
    assert.deepEqual(r.workflow.edges.alternative, wf.edges.alternative);
    const repaired = r.warnings.filter(w => w.code === 'wf-mixed-out');
    assert.equal(repaired.length, 1);
    assert.deepEqual(repaired[0].ids, ['start', 'a', 'b', 'z']);
    assert.match(repaired[0].msg, /'a', 'b', 'z'/);
    assert.equal(repaired[0].severity, 'warn');
    assert.equal(repaired[0].repaired, true);
    assert.deepEqual(ofCode(r.workflow, 'wf-mixed-out'), []);
    const reversed = graph(Object.values(wf.nodes).reverse(), Object.values(wf.edges).reverse());
    assert.deepEqual(repairWorkflow(reversed, catalog, models), r);
    const again = repairWorkflow(r.workflow, catalog, models);
    assert.equal(again.workflow, r.workflow);
    assert.equal(again.warnings.some(w => w.repaired), false);
  }
});

test('parallel next-only routes remain unchanged', () => {
  const wf = graph([start, draft, end], [
    edge('start', 'draft', { kind: 'next' }), edge('start', 'end'), edge('draft', 'end'),
  ]);
  freeze(wf);
  const r = repairWorkflow(wf, catalog, models);
  assert.equal(r.workflow, wf);
  assert.deepEqual(r.warnings, []);
});

test('mixed-out repair precedes cycle repair and retains its fallback label', () => {
  const wf = graph([start, draft, end], [
    edge('start', 'draft'), edge('draft', 'start'), edge('draft', 'end', { kind: 'branch', label: 'done' }),
  ]);
  const r = repairWorkflow(wf, catalog, models);
  assert.deepEqual(r.warnings.filter(w => w.repaired).map(w => w.code), ['wf-mixed-out', 'wf-cycle']);
  assert.deepEqual(r.workflow.edges['draft-start'], edge('draft', 'start', { kind: 'loop', label: 'otherwise', max: 3 }));
  assert.deepEqual(ofCode(r.workflow, 'wf-mixed-out'), []);
  assert.equal(repairWorkflow(r.workflow, catalog, models).workflow, r.workflow);
});

test('attached reachability follows the host, not direct links to the attachment', () => {
  const wf = graph([start, agent, node('tool', 'tool', { on: 'agent' }), end], [edge('start', 'tool'), edge('agent', 'end')]);
  assert.ok(ofCode(wf, 'wf-unreachable').some(w => w.ids.includes('tool')));
  wf.edges['start-agent'] = edge('start', 'agent');
  assert.deepEqual(ofCode(wf, 'wf-unreachable'), []);
});
test('an unbounded cycle beyond a loop or edit route still needs repair', () => {
  for (const route of [{ kind: 'loop', max: 3 }, { outcome: 'edit' }] as const) {
    const wf = graph([start, node('a', 'guard'), node('b', 'guard'), end], [edge('start', 'a', route), edge('a', 'b'), edge('b', 'a'), edge('b', 'end')]);
    assert.equal(ofCode(wf, 'wf-cycle').length, 1);
    const r = repairWorkflow(wf, catalog, models);
    assert.equal(r.workflow.edges['b-a'].kind, 'loop');
    assert.equal(repairWorkflow(r.workflow, catalog, models).workflow, r.workflow);
  }
});
test('cycle repair is deterministic regardless of insertion order', () => {
  const wf = graph([draft, start, end], [edge('draft', 'start'), edge('draft', 'end'), edge('start', 'draft')]);
  const first = repairWorkflow(wf, catalog, models);
  const reversed = graph(Object.values(wf.nodes).reverse(), Object.values(wf.edges).reverse());
  assert.deepEqual(repairWorkflow(reversed, catalog, models).workflow, first.workflow);
  assert.deepEqual(first.workflow.edges['draft-start'], edge('draft', 'start', { kind: 'loop', max: 3 }));
});
test('loop exit requires both a bound and an exhausted route from the loop source', () => {
  const wf = graph([start, draft, end], [edge('start', 'draft'), edge('draft', 'start', { kind: 'loop', max: 3 }), edge('start', 'end', { outcome: 'exhausted' })]);
  assert.equal(ofCode(wf, 'wf-loop-exit').length, 1);
  wf.edges['draft-end'] = edge('draft', 'end', { outcome: 'exhausted' });
  assert.deepEqual(ofCode(wf, 'wf-loop-exit'), []);
  delete wf.edges['draft-start'].max;
  assert.equal(ofCode(wf, 'wf-loop-exit').length, 1);
});
test('attachment repair handles missing hosts, invalid hosts, cycles and occupied link ids', () => {
  for (const bad of [node('bad', 'tool', { on: 'absent' }), node('bad', 'knowledge', { on: 'draft' }), node('bad', 'human', { on: 'agent' })]) {
    const wf = linear(start, draft, agent, end); wf.nodes.bad = bad;
    wf.groups[`${bad.on}-bad`] = { id: `${bad.on}-bad`, over: 'items' };
    const r = repairWorkflow(wf, catalog, models);
    assert.equal(r.workflow.nodes.bad.on, undefined);
    if (bad.on !== 'absent') {
      assert.equal(r.workflow.nodes.bad.after, bad.on);
      assert.ok(r.workflow.edges[`${bad.on}-bad-2`]);
    }
    assert.deepEqual(ofCode(r.workflow, 'wf-attach-form'), []);
    assert.equal(repairWorkflow(r.workflow, catalog, models).workflow, r.workflow);
  }
  const wf = linear(start, agent, end);
  wf.nodes.agent.on = 'other'; wf.nodes.other = node('other', 'agent', { ai: model.id, turns: 10, on: 'agent' });
  assert.equal(ofCode(wf, 'wf-attach-form').length, 4);
  const r = repairWorkflow(wf, catalog, models);
  assert.deepEqual(ofCode(r.workflow, 'wf-attach-form'), []);
  assert.deepEqual(repairWorkflow(r.workflow, catalog, models).workflow, r.workflow);
});
test('dangling fields are dropped independently, including a non-producing subject', () => {
  const wf = linear(start, { ...draft, after: 'absent', repeat: 'absent', subject: 'start' }, end);
  assert.equal(ofCode(wf, 'wf-dangling-ref').length, 3);
  const r = repairWorkflow(wf, catalog, models);
  for (const key of ['after', 'repeat', 'subject']) assert.equal(key in r.workflow.nodes.draft, false);
  assert.equal(r.warnings.filter(w => w.code === 'wf-dangling-ref' && w.repaired).length, 3);
  wf.nodes.draft.after = 'start'; wf.nodes.draft.repeat = 'items'; wf.nodes.draft.subject = 'draft';
  wf.groups.items = { id: 'items', over: 'items' };
  assert.deepEqual(ofCode(wf, 'wf-dangling-ref'), []);
});
test('repaired warnings come first; repair is pure, idempotent, and leaves no fixture errors', () => {
  const wf = linear(start, node('agent', 'agent', { ai: model.id, after: 'missing' }), end);
  wf.nodes.bad = node('bad', 'guard', { on: 'agent' });
  wf.edges.back = edge('agent', 'start', { id: 'back' });
  const before = structuredClone(wf); freeze(wf);
  const r = repairWorkflow(wf, catalog, models);
  assert.deepEqual(wf, before);
  assert.equal(r.workflow.nodes.agent.turns, 10);
  const repairs = r.warnings.filter(w => w.repaired);
  assert.deepEqual(new Set(repairs.map(w => w.code)), new Set([
    'wf-attach-form', 'wf-agent-turns', 'wf-dangling-ref', 'wf-cycle', 'wf-mixed-out',
  ]));
  assert.deepEqual(r.warnings.slice(0, repairs.length), repairs);
  assert.deepEqual(r.warnings.slice(repairs.length), warnings(r.workflow));
  assert.equal(r.warnings.some(w => w.severity === 'error'), false);
  freeze(r.workflow);
  const again = repairWorkflow(r.workflow, catalog, models);
  assert.equal(again.workflow, r.workflow);
  assert.equal(again.warnings.some(w => w.repaired), false);
  assert.deepEqual(again.warnings, warnings(r.workflow));
});

test('inline image and video model tools become ai steps without mutating input or losing approval subjects', () => {
  for (const output of ['image', 'video'] as const) for (const withEffect of [false, true]) {
    const media = table({ out: [output], roles: ['create'] });
    const wf = approved();
    wf.nodes.draft = node('draft', 'tool', {
      label: 'Create media', task: 'create', ai: model.id, tool: 'search', ...(withEffect ? { effect: 'write' as const } : {}),
      after: 'start', runs: 'customer', why: 'Create the final artifact',
    });
    const before = structuredClone(wf); freeze(wf);
    const r = repairWorkflow(wf, catalog, media);
    assert.deepEqual(wf, before);
    assert.deepEqual(r.workflow.nodes.draft, makeStep({
      id: 'draft', kind: 'ai', label: 'Create media', task: 'create', after: 'start',
      runs: 'customer', ai: model.id, why: 'Create the final artifact',
    }));
    assert.deepEqual(Object.keys(r.workflow.nodes.draft), ['id', 'kind', 'label', 'task', 'after', 'runs', 'ai', 'why']);
    assert.equal(r.workflow.nodes.approve.subject, 'draft');
    assert.deepEqual(r.workflow.edges, wf.edges);
    assert.deepEqual(r.workflow.groups, wf.groups);
    assert.ok(r.warnings.some((w) => w.code === 'wf-bad-op' && w.repaired && w.severity === 'warn'
      && w.ids[0] === 'draft' && w.msg.includes(model.id)));
    assert.deepEqual(checkWorkflow(r.workflow, catalog, media), []);
    assert.equal(r.warnings.some((w) => !w.repaired), false);
    freeze(r.workflow);
    const again = repairWorkflow(r.workflow, catalog, media);
    assert.equal(again.workflow, r.workflow);
    assert.deepEqual(again.warnings, []);
  }
});

test('generation repair follows output modalities, preserves tasks and leaves attached tools and other kinds alone', () => {
  const media = table({ out: ['video', 'audio'], roles: ['create'] });
  const wf = linear(start, agent, end);
  wf.nodes.tool = node('tool', 'tool', { on: 'agent', task: 'create', ai: model.id, tool: 'search', effect: 'write' });
  assert.equal(repairWorkflow(wf, catalog, media).workflow, wf);
  for (const patch of [
    { ai: 'unknown' }, {}, { kind: 'act' as const, ai: model.id }, { kind: 'knowledge' as const, ai: model.id },
  ]) {
    const g = linear(start, node('work', 'tool', { label: 'Create media', task: 'create', ...patch }), end);
    const r = repairWorkflow(g, catalog, media);
    assert.equal(r.workflow, g);
    assert.equal(r.warnings.some((w) => w.repaired), false);
  }
  for (const output of ['text', 'audio'] as const) {
    const g = linear(start, node('work', 'tool', { task: 'create', ai: model.id }), end);
    assert.equal(repairWorkflow(g, catalog, table({ in: ['video', 'image'], out: [output] })).workflow, g);
  }
  const g = linear(start, node('work', 'tool', { task: 'generate', ai: model.id }), end);
  const r = repairWorkflow(g, catalog, media);
  assert.equal(r.workflow.nodes.work.kind, 'ai');
  assert.equal(r.workflow.nodes.work.task, 'generate');
});

test('video creation without a model warns without guessing one, including Korean and Chinese labels', () => {
  for (const label of ['Create VIDEO ad', 'Create videos', '동영상 생성', '비디오 제작', '生成视频', '製作影片']) {
    const wf = linear(start, node('create', 'tool', { task: 'create', label }), end);
    const before = structuredClone(wf); freeze(wf);
    const findings = checkWorkflow(wf, catalog, models);
    assert.deepEqual(findings.map((w) => [w.code, w.severity, w.repaired]), [['wf-ai-missing', 'warn', false]]);
    assert.match(findings[0].msg, /Choose a video-output model/);
    const r = repairWorkflow(wf, catalog, models);
    assert.equal(r.workflow, wf);
    assert.deepEqual(wf, before);
    assert.deepEqual(r.warnings, findings);
    assert.equal('ai' in r.workflow.nodes.create, false);
  }
  for (const step of [node('create', 'tool', { task: 'create', label: 'Create document' }),
    node('read', 'tool', { task: 'extract', label: 'Read video metadata' })]) {
    assert.deepEqual(checkWorkflow(linear(start, step, end), catalog, models), []);
  }
  const missing = linear(start, node('create', 'ai', { task: 'create', label: 'Create video' }), end);
  assert.deepEqual(checkWorkflow(missing, catalog, models).map((w) => [w.code, w.severity]), [['wf-ai-missing', 'error']]);
});

test('repaired HappyHorse generation is priced as one model call with no built-in tool fee', () => {
  const media = loadModels();
  const wf = linear(start, node('video', 'tool', {
    task: 'create', ai: 'happyhorse-1.1-t2v', tool: 'code_interpreter', effect: 'write',
  }), end);
  const r = repairWorkflow(wf, catalog, media);
  const estimate = estimateWorkflow(r.workflow, media, catalog, { runsPerMonth: 100 });
  assert.deepEqual(estimate.unpriced, []);
  assert.equal(estimate.lines.length, 1);
  assert.equal(estimate.lines[0].kind, 'model');
  assert.equal(estimate.lines[0].unit, 'second');
  assert.ok(Math.abs(estimate.typical.perRunUsd - 2.1) < 1e-10);
  assert.ok(Math.abs(estimate.upper.perRunUsd - 2.7) < 1e-10);
  assert.equal(estimate.typical.monthlyUsd, 210);
  assert.equal(estimate.latency.modelStepsOnLongestPath, 1);
});
test('reply protection accounts for attached untrusted inputs and an unguarded bypass', () => {
  const wf = linear(start, agent, node('guard', 'guard'), node('reply', 'act', { effect: 'reply' }), end);
  wf.nodes.tool = node('tool', 'tool', { on: 'agent', untrusted: true });
  wf.nodes.person = node('person', 'human', { task: 'takeover' });
  wf.edges.escalate = edge('reply', 'person', { id: 'escalate', kind: 'escalate' });
  assert.deepEqual(ofCode(wf, 'wf-reply-guard'), []);
  wf.edges.bypass = edge('agent', 'reply', { id: 'bypass' });
  assert.equal(ofCode(wf, 'wf-reply-guard').length, 1);
  delete wf.edges.bypass; delete wf.edges.escalate;
  assert.equal(ofCode(wf, 'wf-reply-guard').length, 1);
});
test('reply and trifecta checks include nested attachment inputs with cycle protection', () => {
  const wf: WorkflowGraph = {
    nodes: {
      t: { id: 't', kind: 'trigger', label: 't' },
      a: { id: 'a', kind: 'agent', label: 'a', ai: 'qwen3.8-max', turns: 10 },
      b: { id: 'b', kind: 'agent', label: 'b', ai: 'qwen3.8-max', turns: 10, on: 'a' },
      u: { id: 'u', kind: 'knowledge', label: 'u', on: 'b', untrusted: true },
      r: { id: 'r', kind: 'act', label: 'r', effect: 'reply' },
      h: { id: 'h', kind: 'human', label: 'h', task: 'takeover' },
      z: { id: 'z', kind: 'end', label: 'z' },
    },
    edges: {
      ta: { id: 'ta', from: 't', to: 'a' },
      ar: { id: 'ar', from: 'a', to: 'r', kind: 'branch' },
      ah: { id: 'ah', from: 'a', to: 'h', kind: 'escalate' },
      rz: { id: 'rz', from: 'r', to: 'z' },
      hz: { id: 'hz', from: 'h', to: 'z' },
    },
    groups: {},
  };
  assert.deepEqual(ofCode(wf, 'wf-reply-guard').map(w => [w.ids, w.severity]), [[['r'], 'warn']]);
  // Moving an untrusted tool beneath a sub-agent must not hide it.
  wf.nodes.u.kind = 'tool'; wf.nodes.u.on = 'a';
  assert.equal(ofCode(wf, 'wf-reply-guard').length, 1);
  wf.nodes.u.on = 'b';
  assert.equal(ofCode(wf, 'wf-reply-guard').length, 1);
  wf.nodes.guard = node('guard', 'guard');
  wf.edges.ar.to = 'guard'; wf.edges.gr = edge('guard', 'r', { id: 'gr' });
  assert.deepEqual(ofCode(wf, 'wf-reply-guard'), []);
  delete wf.nodes.guard; delete wf.edges.gr; wf.edges.ar.to = 'r';

  wf.nodes.secret = node('secret', 'knowledge', { on: 'b', private: true });
  wf.nodes.r.effect = 'send';
  assert.deepEqual(ofCode(wf, 'wf-trifecta').map(w => w.ids), [['r']]);
  delete wf.nodes.secret.private;
  assert.deepEqual(ofCode(wf, 'wf-trifecta'), []);
  wf.nodes.secret.private = true;

  // Invalid attachment cycles are checked separately, but input collection must terminate.
  wf.nodes.a.on = 'b';
  assert.ok(ofCode(wf, 'wf-attach-form').some(w => w.severity === 'error'));
  assert.equal(ofCode(wf, 'wf-trifecta').length, 0);
  wf.nodes.r.effect = 'reply';
  assert.equal(ofCode(wf, 'wf-reply-guard').length, 1);
  wf.nodes.u.untrusted = false;
  assert.equal(ofCode(wf, 'wf-reply-guard').length, 1); // The attached host's escalation link is invalid too.
});

test('trifecta includes upstream attachments and ignores waivers', () => {
  const wf = linear(start, agent, send, end);
  wf.nodes.web = node('web', 'tool', { on: 'agent', untrusted: true });
  wf.nodes.kb = node('kb', 'knowledge', { on: 'agent', private: true });
  assert.equal(ofCode(wf, 'wf-trifecta', { approvalOff: ['send'] }).length, 1);
  wf.nodes.send.approval = 'skip';
  assert.equal(ofCode(wf, 'wf-trifecta').length, 1);
  // An attached egress tool approved at call time has a person in the loop; without that approval it still fires.
  wf.nodes.send = node('send', 'tool', { on: 'agent', effect: 'publish', approval: 'required' });
  assert.deepEqual(ofCode(wf, 'wf-trifecta'), []);
  wf.nodes.send = node('send', 'tool', { on: 'agent', effect: 'publish', approval: 'skip' });
  assert.equal(ofCode(wf, 'wf-trifecta').length, 1);
  delete wf.nodes.kb.private;
  assert.deepEqual(ofCode(wf, 'wf-trifecta'), []);
});
for (const field of ['product', 'runs'] as const) for (const id of ['retired', 'closed', 'restricted', 'china']) test(`gated ${field}: ${id}`, () => {
  const found = ofCode(linear(start, { ...draft, [field]: id }, end), 'wf-gated-product');
  assert.equal(found.length, 1); assert.equal(found[0].severity, 'warn');
  if (id === 'retired' || id === 'closed') assert.match(found[0].msg, /current/);
  assert.deepEqual(ofCode(linear(start, { ...draft, [field]: 'current' }, end), 'wf-gated-product'), []);
});

test('validator preserves a step while dropping unknown references and normalizing aliases', () => {
  const r = validateWorkflowOp({ t: 'step', id: 'Review Draft', kind: 'approval', ai: 'absent', product: 'absent', runs: 'customer', tool: 'absent', turns: 99 }, catalog, models);
  assert.ok(r.op && r.op.t === 'step');
  assert.equal(r.op.kind, 'human'); assert.equal(r.op.task, 'approve');
  assert.equal(r.op.runs, 'customer'); assert.equal(r.op.turns, 50);
  assert.equal(r.op.label, r.op.id);
  assert.equal(r.op.ai, undefined); assert.equal(r.op.product, undefined); assert.equal(r.op.tool, undefined);
  assert.equal(r.warnings.filter(w => w.code === 'wf-unknown-ref').length, 3);
});
test('validator rejects cloud ops and malformed ops', () => {
  for (const t of ['rec', 'node', 'edge', 'group', 'insert', 'move', 'remove']) {
    const r = validateWorkflowOp({ t, id: 'x' }, catalog, models);
    assert.equal(r.op, undefined); assert.equal(r.warnings[0].code, 'wf-cloud-op');
  }
  for (const raw of [null, [], {}, { t: 'step', id: 'x', kind: 'nonsense' }]) {
    assert.equal(validateWorkflowOp(raw, catalog, models).warnings[0].code, 'wf-bad-op');
  }
});
test('bounded routes do not hide a separate unbounded cycle', () => {
  const g = graph([start, node('a', 'guard'), node('b', 'guard'), end], [edge('start', 'a', { kind: 'loop', max: 3 }), edge('a', 'b'), edge('b', 'start'), edge('start', 'b'), edge('start', 'end', { outcome: 'exhausted' })]);
  assert.ok(ofCode(g, 'wf-cycle').length > 0);
  const fixed = repairWorkflow(g, catalog, models);
  assert.ok(ofCode(fixed.workflow, 'wf-cycle').length === 0);
  assert.equal(repairWorkflow(fixed.workflow, catalog, models).workflow, fixed.workflow);
});
test('trifecta is quiet when approval follows the last producer', () => {
  const g = graph([node('start', 'trigger', { untrusted: true }), node('data', 'knowledge', { private: true }), draft, node('human', 'human', { task: 'approve' }), node('send', 'act', { effect: 'send' }), end], [edge('start', 'data'), edge('data', 'draft'), edge('draft', 'human'), edge('human', 'send', { outcome: 'approve' }), edge('human', 'end', { outcome: 'reject' }), edge('send', 'end')]);
  assert.ok(ofCode(g, 'wf-trifecta').length === 0);
  g.edges['human-send'].outcome = 'timeout'; assert.ok(ofCode(g, 'wf-trifecta').length > 0);
});
test('attachment reachability follows the host even when an inline edge points to the attachment', () => {
  const g = graph([start, draft, node('tool', 'tool', { on: 'draft' }), end], [edge('start', 'tool'), edge('tool', 'end')]);
  assert.ok(checkWorkflow(g, catalog, models).some((w) => w.code === 'wf-unreachable' && w.ids.includes('tool')));
});
