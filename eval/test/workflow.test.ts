// Offline workflow harness coverage: semantic assertions, records, fixtures and judge routing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadCatalog, loadModels } from '../../packages/core/src/catalog-node.ts';
import { buildSystemPrompt, createMemory } from '../../packages/core/src/prompt.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '../../packages/core/src/workflow.ts';
import { checkWorkflow, validateWorkflowOp } from '../../packages/core/src/workflow-validate.ts';
import type { WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowOp } from '../../packages/core/src/types.ts';
import type { RunTurnResult } from '../../packages/core/src/llm.ts';
import { checkCases, EVAL_DIR, evaluateTurn, loadBase, loadCases, productNamePattern } from '../lib.ts';
import type { EvalCase, TurnView } from '../lib.ts';
import type { WorkflowExpect } from '../workflow.ts';
import { workflowAssertions } from '../workflow.ts';
import { readJsonl, rescore, runUnit } from '../run.ts';
import type { UnitContext } from '../run.ts';
import type { RunRecord, RunMeta, TurnRecord } from '../records.ts';
import { judgePrompt, judgeRun, parseJudge, WORKFLOW_JUDGE_SYSTEM } from '../judge.ts';
import { renderSummaryMd, summarize } from '../summarize.ts';

const catalog = loadCatalog();
const models = loadModels();
const graph = createMemory().graph;
const names = productNamePattern(catalog);
const stats = { ops: 7, warningsBefore: [], warningsAfter: [], badLines: 0, doneSeen: true,
  finishReason: 'stop', escapes: 0, attempts: [], totalMs: 25 };
const n = (id: string, kind: WorkflowNode['kind'], extra: Partial<WorkflowNode> = {}): WorkflowNode => ({ id, kind, label: id, ...extra });
const edge = (from: string, to: string, extra: Partial<WorkflowEdge> = {}): WorkflowEdge => ({ id: `${from}-${to}`, from, to, ...extra });
function wf(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowGraph {
  return { nodes: Object.fromEntries(nodes.map((n) => [n.id, n])), edges: Object.fromEntries(edges.map((e) => [e.id, e])), groups: {} };
}
function approved(): WorkflowGraph {
  return wf([n('in', 'trigger'), n('draft', 'ai', { task: 'generate', ai: 'qwen3.7-plus', product: 'model-studio', runs: 'fc' }),
    n('approve', 'human', { task: 'approve', subject: 'draft' }), n('send', 'act', { effect: 'send' }), n('end', 'end')],
  [edge('in', 'draft'), edge('draft', 'approve'), edge('approve', 'send', { outcome: 'approve' }),
    edge('approve', 'end', { outcome: 'reject' }), edge('send', 'end')]);
}
function view(workflow = approved()): TurnView {
  return { mode: 'workflow', ask: 'Design it', ops: [], says: ['Here is the proposed workflow.'], reqs: [], gaps: [], rawProducts: [],
    graph, before: graph, workflowBefore: emptyWorkflow(), workflow, requirements: [], stats, userTexts: [] };
}
const score = (g: WorkflowGraph, e: WorkflowExpect = {}) => workflowAssertions(view(g), e, catalog, models);
const failures = (g: WorkflowGraph, e: WorkflowExpect = {}) => score(g, e).filter((a) => !a.pass);
const c: EvalCase = { id: 'wf-test', mode: 'workflow', category: 'pattern', lang: 'en', title: 'Test', reference: 'Approve email',
  turns: [{ ask: 'Design it', expect: { workflow: { kinds: ['human'], effects: ['send'] } } }] };
function record(g = approved()): RunRecord {
  const t = { ...view(g), index: 0, content: '', changes: '', assertions: [], pass: false } as unknown as TurnRecord;
  return { mode: 'workflow', id: `${c.id}#1`, case: c.id, category: 'pattern', lang: 'en', run: 1,
    model: 'fake', startedAt: '', wallMs: 0, pass: false, turns: [t], costUsd: 0 };
}

test('required kinds, tasks, tiers, service and runtime fields pass and fail independently', () => {
  assert.deepEqual(failures(approved(), { kinds: ['human'], tasks: ['generate'], tiers: { generate: ['mid'] },
    products: [['model-studio']], runtimes: [['fc']], effects: ['send'] }), []);
  for (const e of [{ kinds: ['agent'] }, { tasks: ['extract'] }, { tiers: { generate: ['small'] } },
    { tiers: { extract: ['mid'] } }, { products: [['fc']] }, { runtimes: [['model-studio']] }, { effects: ['pay'] }] as WorkflowExpect[]) {
    assert.ok(failures(approved(), e).length, JSON.stringify(e));
  }
  const g = approved(); g.nodes.other = n('other', 'ai', { task: 'generate', ai: 'qwen3.8-flash' });
  assert.ok(failures(g, { tiers: { generate: ['mid'] } }).some((a) => a.name.includes('tier')));
});

test('model ids imply Model Studio service use but never a runtime or another service', () => {
  const g = approved(); delete g.nodes.draft.product;
  assert.deepEqual(failures(g, { products: [['model-studio']] }), []);
  assert.deepEqual(failures(g, { products: [['chatapp', 'model-studio']] }), []);
  assert.ok(failures(g, { products: [['chatapp']] }).length);
  assert.ok(failures(g, { runtimes: [['model-studio']] }).length);
  assert.ok(failures(g, { forbiddenProducts: ['model-studio'] }).length);
  delete g.nodes.draft.ai;
  assert.ok(failures(g, { products: [['model-studio']] }).some((a) => a.name === 'workflow products model-studio'));
});

test('voice tasks accept model audio modalities without requiring separate ASR and speech steps', () => {
  for (const [ai, transcribe, speak] of [
    ['qwen-audio-3.1-realtime-flash', true, true], ['qwen3.8-omni-flash', true, false],
    ['qwen-audio-3.1-asr-flash', true, false], ['qwen-audio-3.1-tts-plus', false, true],
    ['qwen3.7-plus', false, false], ['unknown', false, false],
  ] as const) {
    const g = approved(); g.nodes.draft.ai = ai;
    for (const [task, expected] of [['transcribe', transcribe], ['speak', speak]] as const) {
      assert.equal(score(g, { tasks: [task] }).find((a) => a.name === `workflow task ${task}`)?.pass, expected, `${ai}: ${task}`);
    }
  }
});

test('task alternatives accept combined review or verification but still require a matching capability', () => {
  const g = approved();
  for (const task of ['check', 'review'] as const) {
    g.nodes.draft.task = task;
    assert.deepEqual(failures(g, { tasksAny: [['check', 'review']] }), []);
  }
  assert.ok(failures(g, { tasksAny: [['extract', 'check']] }).length);
  assert.ok(failures(g, { tasksAny: [['check', 'review'], ['extract']] }).length);
});

test('rule wording accepts natural gate and safety explanations without removing the mention requirement', () => {
  const cases = loadCases(path.join(EVAL_DIR, 'cases-workflow'));
  for (const id of ['wf-rule-agentbay', 'wf-rule-agentrun-lowcode', 'wf-rule-knowledge-base']) {
    const item = cases.find((c) => c.id === id)!;
    for (const phrase of ['unavailable', 'closed to new customers', 'not offered']) {
      const v = view(); v.says = [`The low-code builder is ${phrase}.`];
      assert.ok(evaluateTurn(v, item.turns[0], 'en', names, catalog).filter((a) => a.type === 'mention').every((a) => a.pass));
    }
    const v = view(); v.says = ['Use the low-code builder.'];
    assert.ok(evaluateTurn(v, item.turns[0], 'en', names, catalog).some((a) => a.type === 'mention' && !a.pass));
  }
  const item = cases.find((c) => c.id === 'wf-rule-trifecta')!;
  const v = view(); v.says = ['Web research, private retrieval, guarded drafting, human approval before emailing third party.'];
  assert.ok(evaluateTurn(v, item.turns[0], 'en', names, catalog).filter((a) => a.type === 'mention').every((a) => a.pass));
  v.says = ['Web research and private retrieval.'];
  assert.ok(evaluateTurn(v, item.turns[0], 'en', names, catalog).some((a) => a.type === 'mention' && !a.pass));
});

test('approval rejects bypasses, wrong outcomes, producers after a gate and ungated attached tools', () => {
  assert.deepEqual(failures(approved()), []);
  const variants = [approved(), approved(), approved(), approved()];
  variants[0].edges.bypass = edge('in', 'send');
  variants[1].edges['approve-send'].outcome = 'reject';
  variants[2].nodes.rewrite = n('rewrite', 'ai', { ai: 'qwen3.7-plus' });
  variants[2].edges['approve-send'].to = 'rewrite';
  variants[2].edges.rewrite = edge('rewrite', 'send');
  variants[3].nodes.agent = n('agent', 'agent', { ai: 'qwen3.7-plus', turns: 3 });
  variants[3].nodes.tool = n('tool', 'tool', { on: 'agent', effect: 'send' });
  variants[3].edges.agent = edge('in', 'agent');
  for (const g of variants) assert.ok(failures(g).some((a) => a.name.includes('every path')));
  variants[3].nodes.tool.approval = 'required';
  assert.ok(!failures(variants[3]).some((a) => a.name.includes('every path')));
});

test('approval checks never trust stale stored warning arrays or mere human presence', () => {
  const g = approved(); delete g.edges['approve-send']; g.edges.bypass = edge('draft', 'send');
  const v = view(g); v.workflowSettings = { approvalOff: ['send'] };
  assert.ok(workflowAssertions(v, {}, catalog, models).some((a) => !a.pass && a.name.includes('every path')));
});

test('loops require numeric bounds and exhausted exits; implicit cycles and unbounded agents fail', () => {
  const g = approved(); g.edges.retry = edge('draft', 'in', { kind: 'loop', max: 2 });
  assert.ok(failures(g).some((a) => a.name.includes('bounds and exits')));
  g.edges.exhausted = edge('draft', 'end', { outcome: 'exhausted' });
  assert.deepEqual(failures(g), []);
  delete g.edges.retry.max;
  assert.ok(failures(g).length);
  g.edges.retry.kind = 'next';
  assert.ok(failures(g).some((a) => a.name.includes('bounds and exits')));
  const a = approved(); a.nodes.draft.kind = 'agent';
  assert.ok(failures(a).some((a) => a.name.includes('numeric')));
  a.nodes.draft.turns = 3;
  assert.deepEqual(failures(a), []);
});

test('forbidden and internationally unavailable products are checked in service and runtime fields', () => {
  for (const p of ['agentbay', 'model-studio-apps', ...catalog.entries.filter((e) => e.status === 'legacy'
    || e.availability === 'china-only').slice(0, 2).map((e) => e.id)]) {
    for (const field of ['product', 'runs'] as const) {
      const g = approved(); g.nodes.draft[field] = p;
      assert.ok(failures(g).some((a) => a.name.includes('internationally')), p);
    }
  }
  assert.ok(failures(approved(), { forbiddenProducts: ['fc'] }).length);
  assert.deepEqual(failures(approved(), { forbiddenProducts: ['agentbay'] }), []);
});

test('no errors recomputes core findings and includes post-repair pipeline errors', () => {
  const g = approved(); delete g.nodes.draft.ai;
  assert.ok(failures(g).some((a) => a.name.includes('no errors')));
  const v = view(); v.stats = { ...stats, warningsAfter: [{ code: 'wf-no-trigger', severity: 'error', ids: [], msg: 'Bad', repaired: false }] };
  assert.ok(workflowAssertions(v, {}, catalog, models).some((a) => !a.pass && a.name.includes('no errors')));
  assert.ok(workflowAssertions({ ...view(), workflow: undefined }, {}, catalog, models).some((a) => !a.pass));
});

test('live reply and internal reversible actions need no approval, while email send does', () => {
  const g = wf([n('in', 'trigger'), n('answer', 'act', { effect: 'reply' }), n('end', 'end')],
    [edge('in', 'answer'), edge('answer', 'end')]);
  assert.deepEqual(failures(g), []);
  assert.ok(failures(g, { noWarnings: ['wf-reply-guard'] }).length);
  for (const effect of ['write', 'notify', 'read'] as const) {
    g.nodes.answer.effect = effect;
    assert.deepEqual(failures(g, { forbiddenKinds: ['human'] }), []);
  }
  g.nodes.answer.effect = 'send';
  assert.ok(failures(g).some((a) => a.name.includes('every path')));
  assert.ok(failures(approved(), { forbiddenTasks: ['approve'] }).length);
});

test('workflow text participates in forbidden-text and invented-price assertions', () => {
  const v = view(); v.ops = [{ t: 'step', id: 'x', kind: 'end', label: 'Forbidden service costs $999 monthly' }];
  const result = evaluateTurn(v, { ask: 'x', expect: { notMention: ['Forbidden'] } }, 'en', names, catalog);
  assert.ok(result.some((a) => a.type === 'noPrices' && !a.pass));
  assert.ok(result.some((a) => a.type === 'notMention' && !a.pass));
});

test('rescore a stored workflow record preserves before/after and fails a newly introduced bypass', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'workflow-rescore-'));
  const r = record(); writeFileSync(path.join(dir, 'runs.jsonl'), JSON.stringify(r) + '\n');
  rescore(dir, [c], catalog);
  const [scored] = readJsonl<RunRecord>(path.join(dir, 'runs.jsonl'));
  assert.equal(scored.pass, true);
  assert.deepEqual(scored.turns[0].workflowBefore, r.turns[0].workflowBefore);
  assert.deepEqual(scored.turns[0].workflow, r.turns[0].workflow);
  r.turns[0].workflow!.edges.bypass = edge('in', 'send');
  writeFileSync(path.join(dir, 'runs.orig.jsonl'), JSON.stringify(r) + '\n');
  rescore(dir, [c], catalog);
  assert.equal(readJsonl<RunRecord>(path.join(dir, 'runs.jsonl'))[0].pass, false);
  delete r.mode; delete r.turns[0].mode;
  const cloudCase = { ...c, mode: 'cloud' as const, turns: [{ ask: 'Design it' }] };
  writeFileSync(path.join(dir, 'runs.orig.jsonl'), JSON.stringify(r) + '\n');
  rescore(dir, [cloudCase], catalog);
  const [legacy] = readJsonl<RunRecord>(path.join(dir, 'runs.jsonl'));
  assert.equal(legacy.pass, true);
  assert.ok(!legacy.turns[0].assertions.some((a) => a.type === 'workflow'));
});

test('runner sends workflow mode and prompt and records both sides across two turns without a network', async () => {
  let calls = 0;
  const ctx = { catalog, system: buildSystemPrompt(catalog), names, model: 'fake', fallback: 'fake',
    signal: new AbortController().signal, runTurnImpl: async (memory, ask, _catalog, opts) => {
      assert.equal(opts.mode, 'workflow'); assert.match(opts.system!, /workflow/);
      if (calls++) assert.deepEqual(memory.workflow, approved());
      return { memory: { ...memory, workflow: approved() }, ops: [], says: ['Here is the proposed workflow.'],
        reqs: [], gaps: [], rawProducts: [], changes: '', content: '', stats } as unknown as RunTurnResult;
    } } as UnitContext;
  const r = await runUnit({ ...c, turns: [c.turns[0], c.turns[0]] }, 1, ctx);
  assert.equal(calls, 2); assert.equal(r.pass, true); assert.equal(r.mode, 'workflow');
  assert.deepEqual(r.turns[0].workflowBefore, emptyWorkflow());
  assert.deepEqual(r.turns[1].workflowBefore, r.turns[0].workflow);
});

test('workflow bases retain settings and estimate beside an empty cloud diagram', () => {
  const name = `workflow-test-${process.pid}`;
  const file = path.join(EVAL_DIR, 'bases', `${name}.json`);
  try {
    writeFileSync(file, JSON.stringify({ description: 'test', workflow: approved(),
      workflowSettings: { region: 'ap-southeast-1', approvalOn: ['write'] }, estimate: { runsPerMonth: 100 } }));
    const { memory } = loadBase(name, catalog);
    assert.deepEqual(memory.workflow, approved());
    assert.deepEqual(memory.workflowSettings?.approvalOn, ['write']);
    assert.deepEqual(memory.estimate, { runsPerMonth: 100 });
    assert.equal(Object.keys(memory.graph.nodes).length, 0);
  } finally { unlinkSync(file); }
});

test('all 32 canonical fixtures validate and satisfy their conservative one-turn expectations', () => {
  const cases = loadCases(path.join(EVAL_DIR, 'cases-workflow'));
  assert.equal(cases.length, 43); assert.deepEqual(checkCases(cases, catalog), []);
  const fixtureDir = path.join(EVAL_DIR, '../packages/core/test/fixtures/workflows');
  const files = readdirSync(fixtureDir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 32);
  for (const file of files) {
    const f = JSON.parse(readFileSync(path.join(fixtureDir, file), 'utf8'));
    let g = emptyWorkflow(); const ctx = createWorkflowCtx();
    for (const raw of f.ops) {
      const valid = validateWorkflowOp(raw, catalog, models);
      assert.ok(valid.op, `${file}: invalid op`);
      assert.equal(valid.warnings.some((w) => w.severity === 'error'), false, file);
      g = applyWorkflowOp(g, valid.op as WorkflowOp, ctx).workflow;
    }
    assert.equal(checkWorkflow(g, catalog, models, f.settings).some((w) => w.severity === 'error'), false, file);
    const item = cases.find((c) => c.id === `wf-${f.id}`)!;
    assert.equal(item.turns[0].ask, f.ask);
    assert.deepEqual(failures(g, item.turns[0].expect!.workflow), [], file);
  }
});

test('case validation rejects workflow typos, unknown tasks, tiers, products and malformed groups', () => {
  for (const workflow of [{ kind: ['trigger'] }, { tiers: { classify: ['huge'] } }, { tasks: ['draft'] },
    { products: [[]] }, { products: [['unknown']] }, { runtimes: ['fc'] }, { approvals: 'yes' }, { noWarnings: ['typo'] },
    { tasksAny: [] }, { tasksAny: [[]] }, { tasksAny: ['check'] }, { tasksAny: [['draft']] }, null]) {
    const bad = { ...c, turns: [{ ask: 'x', expect: { workflow } }] } as unknown as EvalCase;
    assert.ok(checkCases([bad], catalog).length, JSON.stringify(workflow));
  }
  assert.ok(checkCases([{ ...c, mode: undefined }], catalog).length);
});

const judgeJson = JSON.stringify({ patternChoice: 5, humanApproval: 4, modelTierFit: 3, productCorrectness: 5,
  clarity: 4, signoff: 'yes', reasons: ['Good'], defects: [] });

test('workflow judge uses all graphs, settings, catalog and model facts without assertion answers', async () => {
  const r = record(); r.turns[0].workflowSettings = { approvalOn: ['write'] };
  const prompt = judgePrompt(c, r, null, catalog);
  assert.match(prompt, /MODEL FACTS/); assert.match(prompt, /qwen3.7-plus/); assert.match(prompt, /approvalOn/);
  assert.match(prompt, /"before"/); assert.match(prompt, /"after"/); assert.doesNotMatch(prompt, /assertions/);
  const judged = await judgeRun(c, r, null, catalog, { apiKey: 'fake', model: 'fake', fetchImpl: async (_url, init) => {
    const body = JSON.parse(init!.body as string);
    assert.equal(body.messages[0].content, WORKFLOW_JUDGE_SYSTEM);
    return new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: judgeJson }, finish_reason: 'stop' }] })
      + '\n\ndata: [DONE]\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
  } });
  assert.equal(judged.scores?.workflow?.humanApproval, 4);
  assert.ok(parseJudge('{"patternChoice":4}', 'workflow').error);
});

test('summary counts workflow diagrams, separates modes and reports the five workflow judge dimensions', () => {
  const r = record(); r.pass = true; r.turns[0].pass = true;
  const meta = { model: 'fake', args: {}, runsPerCase: 1, systemPromptSha256: 'test', startedAt: '' } as RunMeta;
  const s = summarize([r], [{ case: c.id, run: 1, model: 'fake', costUsd: 0, ms: 0,
    scores: parseJudge(judgeJson, 'workflow').scores }], meta, [c]);
  assert.equal(s.byMode.workflow.runs, 1);
  assert.equal(s.workflowJudge?.means?.humanApproval, 4);
  assert.match(renderSummaryMd(s), /humanApproval/);
});

test('the cloud system prompt remains pinned', () => {
  assert.equal(createHash('sha256').update(buildSystemPrompt(catalog)).digest('hex'),
    '998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313');
});
