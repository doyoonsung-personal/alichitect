import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as estimateApi from '../src/workflow-estimate.ts';
import { estimateWorkflow } from '../src/workflow-estimate.ts';
import { ESTIMATE_LIMITS } from '../src/workflow-estimate-limits.ts';
import { loadCatalog, loadModels } from '../src/catalog-node.ts';
import { createModelTable } from '../src/models.ts';
import type { ModelEntry, PriceTier } from '../src/models.ts';
import { applyWorkflowOp, createWorkflowCtx, emptyWorkflow } from '../src/workflow.ts';
import { buildSystemPrompt } from '../src/prompt.ts';
import { checkWorkflow } from '../src/workflow-validate.ts';
import type { WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowOp, WorkflowTask } from '../src/types.ts';

const catalog = loadCatalog();
const models = loadModels();
const close = (a: number, b: number): void => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const node = (id: string, extra: Partial<WorkflowNode> = {}): WorkflowNode => ({ id, kind: 'ai', label: id, ai: 'test', ...extra });
const edge = (from: string, to: string, extra: Partial<WorkflowEdge> = {}): WorkflowEdge => ({ id: `${from}-${to}`, from, to, ...extra });
const graph = (nodes: WorkflowNode[], edges?: WorkflowEdge[]): WorkflowGraph => ({
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  edges: Object.fromEntries((edges ?? nodes.slice(1).map((n, i) => edge(nodes[i].id, n.id))).map((e) => [e.id, e])), groups: {},
});
const table = (tiers: PriceTier[] = [{ in: 1, out: 2 }], extra: Partial<ModelEntry> = {}) => createModelTable({
  version: 'test', scope: 'international', tools: [...models.tools.values()],
  models: [{ ...models.models[0], id: 'test', price: { unit: 'mtok', tiers }, ...extra }],
});
const fixtureDir = new URL('./fixtures/workflows/', import.meta.url);
function fixture(file: string): WorkflowGraph {
  const f = JSON.parse(readFileSync(new URL(file, fixtureDir), 'utf8')) as { ops: WorkflowOp[] };
  let wf = emptyWorkflow();
  const ctx = createWorkflowCtx();
  for (const op of f.ops) wf = applyWorkflowOp(wf, op, ctx).workflow;
  return wf;
}

test('Wan video output costs 15 seconds times $0.10 = $1.50 per run, with a 30-second 1080P upper', () => {
  const wf = graph([node('video', { task: 'create', ai: 'wan3.0-video' })]);
  const e = estimateWorkflow(wf, models, catalog, { runsPerMonth: 100 });
  close(e.typical.perRunUsd, 1.50); close(e.upper.perRunUsd, 6);
  close(e.typical.monthlyUsd, 150); close(e.upper.monthlyUsd, 600);
  assert.deepEqual(e.unpriced, []); assert.equal(e.lines[0].unit, 'second');
  assert.match(e.lines[0].source, /NOTES Video models: wan3.0-video/);
  assert.ok(e.assumptions.some((a) => /one output clip.*15 s at 720P.*30 s at 1080P/.test(a.text)));
  assert.ok(e.assumptions.some((a) => /no promotional, free-quota or batch deductions/.test(a.text)));
  assert.ok(!e.assumptions.some((a) => /thinking|input tokens|output tokens/.test(a.text)));
  assert.match(e.coverage, /video output seconds with native audio/);
  assert.doesNotMatch(e.coverage, /voice\/image\/video usage/);
});

test('all video model rates and upper duration caps are used without discounting quotas', () => {
  for (const [ai, typical, upper] of [
    ['wan3.0-video-prime', 2.1, 8.4], ['happyhorse-1.1-t2v', 2.1, 2.7],
    ['happyhorse-1.1-i2v', 2.1, 2.7], ['happyhorse-1.1-r2v', 2.1, 2.7],
    ['wan2.7-t2v', 1.5, 2.25], ['wan2.7-i2v', 1.5, 2.25],
  ] as const) {
    const e = estimateWorkflow(graph([node('a', { ai, task: 'create' })]), models, catalog);
    close(e.typical.perRunUsd, typical); close(e.upper.perRunUsd, upper); assert.deepEqual(e.unpriced, []);
  }
});

test('per-step clip settings select resolution and bound duration without mutating inputs', () => {
  const wf = graph([node('a', { ai: 'wan3.0-video', task: 'create' })]);
  const settings = { steps: { a: { clipSeconds: 10, resolution: 480 as const, offline: true, thinking: true } } };
  const before = structuredClone({ wf, settings, models: models.models });
  const e = estimateWorkflow(wf, models, catalog, settings);
  close(e.typical.perRunUsd, 0.5); close(e.upper.perRunUsd, 6);
  assert.deepEqual({ wf, settings, models: models.models }, before);
  assert.equal(ESTIMATE_LIMITS.clipSeconds, 30);
  assert.deepEqual(ESTIMATE_LIMITS.resolutions, [480, 720, 1080]);
  for (const [seconds, expected] of [[1e9, 3], [NaN, 1.5], [Infinity, 1.5], [-1, 1.5], [0, 0.1], [2.1, 0.3]]) {
    const result = estimateWorkflow(wf, models, catalog, { steps: { a: { clipSeconds: seconds } } });
    close(result.typical.perRunUsd, expected); assert.ok(Number.isFinite(result.upper.monthlyUsd));
  }
  const hh = graph([node('a', { ai: 'happyhorse-1.1-t2v', task: 'create' })]);
  close(estimateWorkflow(hh, models, catalog, { steps: { a: { clipSeconds: 1, resolution: 1080 } } }).typical.perRunUsd, 0.54);
  close(estimateWorkflow(hh, models, catalog, { steps: { a: { clipSeconds: 30 } } }).typical.perRunUsd, 2.1);
});

test('unsupported video resolution is unpriced, and image creation remains explicitly unpriced', () => {
  const e = estimateWorkflow(graph([node('a', { ai: 'wan2.7-t2v', task: 'create' })]), models, catalog,
    { steps: { a: { resolution: 480 } } });
  assert.deepEqual(e.lines, []); assert.match(e.unpriced[0].why, /No confirmed video rate for 480P/);
  const image = estimateWorkflow(graph([node('a', { ai: 'qwen-image-2.0', task: 'create' })]), models, catalog);
  assert.deepEqual(image.lines, []); assert.match(image.unpriced[0].why, /Image, voice/);
});

test('video clips follow branch shares, repeat items and retries like other priced steps', () => {
  const wf = graph([
    node('start', { kind: 'trigger', ai: undefined }), node('ad', { ai: 'wan3.0-video', task: 'create', repeat: 'products' }),
    node('quality', { kind: 'decide', ai: undefined }),
    node('end', { kind: 'end', ai: undefined }),
  ], [edge('start', 'ad', { kind: 'branch' }), edge('start', 'end', { kind: 'branch' }), edge('ad', 'quality'),
    edge('quality', 'end', { outcome: 'exhausted' }), { id: 'retry', from: 'quality', to: 'ad', kind: 'loop', max: 1 }]);
  wf.groups.products = { id: 'products', over: 'each product' };
  const e = estimateWorkflow(wf, models, catalog, {
    shares: { 'start-ad': 0.25, 'start-end': 0.75 }, items: { products: { typical: 2, upper: 3 } },
    loops: { retry: { typical: 1, upper: 1 } },
  });
  close(e.typical.perRunUsd, 0.25 * 2 * 2 * 1.5); close(e.upper.perRunUsd, 3 * 2 * 6);
});

for (const [task, input, output] of [
  ['classify', 700, 40], ['extract', 1000, 150], ['retrieve', 50, 0], ['rerank', 8050, 0],
  ['generate', 2800, 250], ['summarise', 3000, 200], ['plan', 2000, 400],
] as const) test(`default tokens: ${task}`, () => {
  const e = estimateWorkflow(graph([node('a', { task })]), table(), catalog);
  close(e.typical.perRunUsd, (input + output * 2) / 1e6);
  assert.ok(e.assumptions.some((a) => a.key === 'a:input' && a.text.includes(String(input))));
  assert.ok(e.assumptions.some((a) => a.key === 'a:output' && a.text.includes(String(output))));
  assert.equal(e.runsPerMonth, 10_000);
  close(e.typical.monthlyUsd, e.typical.perRunUsd * 10_000);
});

test('thinking uses thinkingOut and triples only default output; step overrides and monthly zero are respected', () => {
  const wf = graph([node('a', { task: 'classify' })]);
  const prices = table([{ in: 1, out: 2, thinkingOut: 5 }]);
  close(estimateWorkflow(wf, prices, catalog, { steps: { a: { thinking: true } } }).upper.perRunUsd, (700 + 40 * 3 * 5) / 1e6);
  const e = estimateWorkflow(wf, prices, catalog, { runsPerMonth: 0, steps: { a: { inTokens: 9, outTokens: 7, thinking: true } } });
  close(e.upper.perRunUsd, (9 + 7 * 5) / 1e6);
  assert.equal(e.upper.monthlyUsd, 0);
  assert.ok(!e.assumptions.some((a) => a.key === 'a:input' || a.key === 'a:output' || a.key === 'a:thinking-output'));
  close(estimateWorkflow(wf, table(), catalog, { steps: { a: { thinking: true } } }).upper.perRunUsd, (700 + 120 * 2) / 1e6);
});

test('tiers are selected by each request input, inclusive upTo, without inventing a final tier', () => {
  const wf = graph([node('a')]);
  const prices = table([{ in: 3, out: 4 }, { upTo: 1000, in: 1, out: 2 }]);
  for (const input of [1000, 1001]) {
    const e = estimateWorkflow(wf, prices, catalog, { steps: { a: { inTokens: input, outTokens: 1 } } });
    close(e.upper.perRunUsd, (input * (input === 1000 ? 1 : 3) + (input === 1000 ? 2 : 4)) / 1e6);
  }
  const e = estimateWorkflow(wf, table([{ upTo: 10, in: 1, out: 2 }]), catalog);
  assert.equal(e.lines.length, 0);
  assert.equal(e.unpriced[0].id, 'a:model');
});

test('missing model, missing price and missing output rate are unpriced, never a zero model line', () => {
  const wf = graph([node('a')]);
  for (const prices of [models, table([], { price: undefined }), table([{ in: 1 }])]) {
    const e = estimateWorkflow(wf, prices, catalog);
    assert.equal(e.lines.length, 0);
    assert.equal(e.unpriced[0].id, 'a:model');
  }
  const e = estimateWorkflow(graph([node('a', { task: 'retrieve' })]), table([{ in: 1 }]), catalog);
  close(e.upper.perRunUsd, 50 / 1e6);
});

test('agent history formula: N=10, one tool; result sizes 16000 and 800', () => {
  const wf = graph([node('a', { kind: 'agent', turns: 10 }), node('tool', { kind: 'tool', ai: undefined, on: 'a', tool: 'code_interpreter' })], []);
  for (const [r, input] of [[16000, 748250], [800, 64250]]) {
    const e = estimateWorkflow(wf, table([{ in: 1, out: 0 }]), catalog, { agents: { a: { typical: 10, upper: 10, resultTokens: r } } });
    close(e.typical.perRunUsd, input / 1e6);
    close(e.upper.perRunUsd, input / 1e6);
  }
  const output = estimateWorkflow(wf, table([{ in: 0, out: 1 }]), catalog);
  close(output.typical.perRunUsd, (4 * 150 + 250) / 1e6);
  close(output.upper.perRunUsd, (9 * 150 + 250) / 1e6);
});

test('agent defaults, odd turns, per-request tiering and base/final overrides', () => {
  const wf = graph([node('a', { kind: 'agent', turns: 5 })]);
  const prices = table([{ upTo: 2500, in: 1, out: 2 }, { in: 3, out: 4 }]);
  const e = estimateWorkflow(wf, prices, catalog);
  close(e.typical.perRunUsd, (2000 + 150 * 2 + 2950 * 3 + 150 * 4 + 3900 * 3 + 250 * 4) / 1e6);
  const single = estimateWorkflow(graph([node('a', { kind: 'agent' })]), table(), catalog,
    { steps: { a: { inTokens: 17, outTokens: 13 } }, agents: { a: { typical: 1, upper: 1 } } });
  close(single.upper.perRunUsd, (17 + 26) / 1e6);
  assert.ok(single.assumptions.some((a) => a.key === 'agent:a:turns'));
});

test('web search uses N calls and searchesPerRequest; inline tools, PDFs and temporary free tools', () => {
  const wf = graph([node('a', { kind: 'agent', turns: 10 }),
    node('search', { ai: undefined, kind: 'tool', on: 'a', tool: 'web_search' })], []);
  const e = estimateWorkflow(wf, table([{ in: 0, out: 0 }]), catalog);
  close(e.typical.perRunUsd, .05);
  close(e.upper.perRunUsd, .10);
  close(estimateWorkflow(wf, table([{ in: 0, out: 0 }]), catalog,
    { agents: { a: { searchesPerRequest: 2 } } }).upper.perRunUsd, .20);
  close(estimateWorkflow(wf, table([{ in: 0, out: 0 }]), catalog,
    { agents: { a: { searchesPerRequest: 0 } } }).upper.perRunUsd, 0);
  for (const [tool, expected] of [['pdf_parse', .0165], ['web_search_image', .008], ['web_search', .01],
    ['web_extractor', 0], ['code_interpreter', 0]] as const) {
    const e = estimateWorkflow(graph([node('t', { kind: 'tool', ai: undefined, tool })]), models, catalog);
    close(e.upper.perRunUsd, expected);
    assert.equal(e.lines[0].kind, 'tool');
    if (expected === 0) assert.ok(e.assumptions.some((a) => a.text.includes('free for now')));
  }
  for (const tool of ['mcp', 'missing']) {
    const e = estimateWorkflow(graph([node('t', { kind: 'tool', ai: undefined, tool })]), models, catalog);
    assert.equal(e.unpriced[0].id, 't:tool');
  }
});

test('guardrails types and graph-counted platform fees use source-backed constants', () => {
  const wf = graph([
    node('t', { kind: 'trigger', ai: undefined, product: 'eventbridge', runs: 'cloudflow' }),
    node('g', { kind: 'guard', ai: undefined, product: 'ai-guardrails', runs: 'cloudflow' }),
    node('s', { kind: 'act', ai: undefined, product: 'direct-mail', effect: 'send' }),
    node('r', { kind: 'act', ai: undefined, product: 'chatapp', effect: 'reply' }),
    node('c', { kind: 'act', ai: undefined, product: 'chatapp', effect: 'send' }),
    node('h', { kind: 'human', ai: undefined, runs: 'cloudflow' }),
  ]);
  const e = estimateWorkflow(wf, models, catalog);
  close(e.upper.perRunUsd, .82 / 1e6 + 3 * .25 / 1e4 + 2 * 6 / 1e4 + .29 / 1e3 + 2 * .005);
  assert.ok(e.lines.every((l) => l.source.includes('verify/NOTES.md')));
  close(estimateWorkflow(wf, models, catalog, { guardTypes: { g: 4 } }).upper.perRunUsd, e.upper.perRunUsd + 12 / 1e4);
  const noFee = graph([node('a', { kind: 'act', ai: undefined, product: 'eventbridge' }),
    node('b', { kind: 'act', ai: undefined, product: 'direct-mail', effect: 'reply' })]);
  assert.equal(estimateWorkflow(noFee, models, catalog).lines.length, 0);
});

const unitModel = table([{ in: 0, out: 1e6 }]);
const costSettings = { steps: { a: { outTokens: 1 }, b: { outTokens: 2 }, c: { outTokens: 3 }, d: { outTokens: 4 } } };
test('parallel branches add; shared join counted exactly once', () => {
  const wf = graph(['a', 'b', 'c', 'd'].map((id) => node(id)), [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')]);
  const e = estimateWorkflow(wf, unitModel, catalog, costSettings);
  close(e.typical.perRunUsd, 10);
  close(e.upper.perRunUsd, 10);
  assert.deepEqual(e.oneRun, ['a', 'b', 'c', 'd']);
  assert.equal(e.latency.modelStepsOnLongestPath, 3);
});

test('exclusive branches use shares/equal split, upper selects an entire expensive path', () => {
  const wf = graph(['a', 'b', 'c', 'd'].map((id) => node(id)),
    [edge('a', 'b', { kind: 'branch' }), edge('a', 'c', { kind: 'branch' }), edge('b', 'd'), edge('c', 'd')]);
  const e = estimateWorkflow(wf, unitModel, catalog, costSettings);
  close(e.typical.perRunUsd, 7.5);
  close(e.upper.perRunUsd, 8);
  close(e.lines.find((l) => l.id === 'b:model')!.upper, 0);
  close(estimateWorkflow(wf, unitModel, catalog, { ...costSettings, shares: { 'a-b': .8 } }).typical.perRunUsd, 7.2);
  close(estimateWorkflow(wf, unitModel, catalog, { ...costSettings, shares: { 'a-b': 0, 'a-c': 0 } }).typical.perRunUsd, 7.5);
});

test('parallel forks with independent exclusive choices merge shared joins by probability', () => {
  const wf = graph(['a', 'b', 'c', 'd', 'x', 'y'].map((id) => node(id)), [edge('a', 'b'), edge('a', 'c'),
    edge('b', 'd', { kind: 'branch' }), edge('b', 'x', { kind: 'branch' }),
    edge('c', 'd', { kind: 'branch' }), edge('c', 'y', { kind: 'branch' })]);
  const e = estimateWorkflow(wf, unitModel, catalog, { steps: {
    a: { outTokens: 0 }, b: { outTokens: 0 }, c: { outTokens: 0 }, d: { outTokens: 4 }, x: { outTokens: 0 }, y: { outTokens: 0 },
  } });
  close(e.typical.perRunUsd, 3); // d runs unless both independent branches skip it: 1 - .5 * .5.
  close(e.upper.perRunUsd, 4);
});

test('repeat groups and bounded loops multiply cycle members only, with an initial pass', () => {
  const wf = graph(['a', 'b', 'c', 'd'].map((id) => node(id)),
    [edge('a', 'b'), edge('b', 'c'), edge('c', 'b', { kind: 'loop', max: 3 }), edge('c', 'd')]);
  wf.groups.g = { id: 'g', over: 'documents' };
  wf.nodes.b.repeat = 'g';
  wf.nodes.c.repeat = 'g';
  const e = estimateWorkflow(wf, unitModel, catalog, costSettings);
  close(e.typical.perRunUsd, 1 + (2 + 3) * 3 * 2 + 4);
  close(e.upper.perRunUsd, 1 + (2 + 3) * 10 * 4 + 4);
  const override = estimateWorkflow(wf, unitModel, catalog, { ...costSettings,
    items: { g: { typical: 2, upper: 4 } }, loops: { 'c-b': { typical: 0, upper: 2 } } });
  close(override.typical.perRunUsd, 15);
  close(override.upper.perRunUsd, 65);
});

test('cache uses only the static prefix and model hit price, with the 1024-token minimum', () => {
  const prices = table([{ in: 1, out: 0, cacheHit: .2, cacheRead: .001 }]);
  for (const base of [1023, 1024, 2000]) {
    const e = estimateWorkflow(graph([node('a', { kind: 'agent', turns: 1 })]), prices, catalog,
      { steps: { a: { inTokens: base, outTokens: 0 } } });
    close(e.upper.perRunUsd, base / 1e6);
    close(e.typical.perRunUsd, base * (base >= 1024 ? .6 : 1) / 1e6);
  }
  const rag = estimateWorkflow(graph([node('a', { task: 'generate' })]), prices, catalog);
  close(rag.typical.perRunUsd, 2800 / 1e6); // 800-token static prompt, not all 2,800 input tokens.
});

test('batch requires offline and batch=true; discounts never stack', () => {
  const wf = graph([node('a', { kind: 'agent', turns: 1 })]);
  for (const batch of [true, false, null]) {
    const prices = table([{ in: 1, out: 2, cacheHit: .1 }], { batch });
    const e = estimateWorkflow(wf, prices, catalog, { steps: { a: { offline: true } } });
    close(e.upper.perRunUsd, (2000 + 250 * 2) * (batch === true ? .5 : 1) / 1e6);
    close(e.typical.perRunUsd, batch === true ? .00125 : .0016);
  }
  close(estimateWorkflow(wf, table([{ in: 1, out: 2 }], { batch: true }), catalog).upper.perRunUsd, .0025);
});

test('unpriced resources and fixed monthly capacity stay outside per-run and monthly usage', () => {
  const wf = graph([
    node('a', { kind: 'agent', ai: 'missing', runs: 'agentcore' }),
    node('b', { kind: 'knowledge', ai: undefined, product: 'tablestore', runs: 'agentrun' }),
    node('c', { kind: 'tool', ai: undefined, product: 'agent-sandbox', runs: 'fc' }),
    node('d', { kind: 'human', ai: undefined }),
    node('v', { kind: 'knowledge', ai: undefined, product: 'dashvector' }),
    node('g', { kind: 'tool', ai: undefined, product: 'api-gateway' }),
  ]);
  const e = estimateWorkflow(wf, models, catalog);
  assert.equal(e.typical.perRunUsd, 0);
  assert.equal(e.upper.monthlyUsd, 0);
  close(e.fixed.find((f) => f.id === 'agentcore')!.monthlyUsd!, 438);
  assert.equal(e.fixed.find((f) => f.id === 'dashvector')!.monthlyUsd, null);
  for (const id of ['a:agentcore:compute', 'b:tablestore:storage', 'b:agentrun:compute', 'b:indexing', 'c:agent-sandbox:compute', 'c:fc:compute', 'd:human']) {
    assert.ok(e.unpriced.some((u) => u.id === id), id);
  }
  assert.deepEqual(e.latency.humanWaits, ['d']);
});

test('global keeps International prices; human waits break automated paths; modalities are unpriced', () => {
  const wf = graph([node('a'), node('b', { kind: 'human', ai: undefined }), node('c'), node('d')]);
  const international = estimateWorkflow(wf, unitModel, catalog, costSettings);
  const global = estimateWorkflow(wf, unitModel, catalog, { ...costSettings, scope: 'global' });
  assert.deepEqual(global.typical, international.typical);
  assert.equal(global.scope, 'global');
  assert.ok(global.assumptions.some((a) => a.text.includes('Global is usually lower')));
  assert.equal(global.latency.modelStepsOnLongestPath, 2);
  for (const task of ['see', 'transcribe', 'speak', 'create'] as WorkflowTask[]) {
    const e = estimateWorkflow(graph([node('a', { task, ai: 'qwen3.7-plus' })]), models, catalog);
    assert.equal(e.lines.length, 0);
    assert.ok(e.unpriced.some((u) => u.id === 'a:model'));
  }
});

test('empty, unreachable, multiple triggers, malformed settings and cycles remain deterministic', () => {
  const empty = estimateWorkflow(emptyWorkflow(), models, catalog);
  assert.equal(empty.upper.perRunUsd, 0);
  assert.deepEqual(empty.oneRun, []);
  const wf = graph([node('t', { kind: 'trigger', ai: undefined }), node('a'), node('u', { kind: 'trigger', ai: undefined }), node('b'), node('c')],
    [edge('t', 'a'), edge('u', 'b')]);
  const e = estimateWorkflow(wf, unitModel, catalog, costSettings);
  close(e.typical.perRunUsd, 1.5);
  close(e.upper.perRunUsd, 2);
  assert.ok(!e.lines.some((l) => l.id === 'c:model'));
  const cycle = graph([node('a'), node('b')], [edge('a', 'b'), edge('b', 'a')]);
  const result = estimateWorkflow(cycle, unitModel, catalog, {
    runsPerMonth: NaN, items: {}, agents: {}, steps: { a: { inTokens: -2, outTokens: Infinity } },
  });
  assert.ok(Number.isFinite(result.upper.monthlyUsd));
  assert.ok(result.assumptions.some((a) => a.key.includes(':max')));
});

test('pure, stable key order regardless of graph insertion order; cloud prompt remains pinned', () => {
  const wf = graph([node('a'), node('b')]);
  const settings = structuredClone(costSettings);
  const before = JSON.stringify({ wf, settings, models: models.models, catalog: catalog.entries });
  const e = estimateWorkflow(wf, models, catalog, settings);
  const reversed = { ...wf, nodes: Object.fromEntries(Object.entries(wf.nodes).reverse()) };
  assert.deepEqual(estimateWorkflow(reversed, models, catalog, settings), e);
  assert.equal(JSON.stringify({ wf, settings, models: models.models, catalog: catalog.entries }), before);
  assert.equal(JSON.stringify(e).includes('null'), false);
  assert.equal(createHash('sha256').update(buildSystemPrompt(catalog)).digest('hex'),
    '998fab223daba0a4407930f0f6f61e90cf100d7783ca4b13008636526d049313');
});

const files = readdirSync(fixtureDir).filter((f) => f.endsWith('.json')).sort();
test('all 32 canonical fixtures are present', () => assert.equal(files.length, 32));
for (const file of files) test(`finite canonical estimate: ${file}`, () => {
  const e = estimateWorkflow(fixture(file), models, catalog);
  for (const scenario of [e.typical, e.upper]) for (const value of Object.values(scenario)) assert.ok(Number.isFinite(value) && value >= 0);
  assert.ok(e.upper.perRunUsd + 1e-12 >= e.typical.perRunUsd);
  for (const line of e.lines) for (const value of [line.typical, line.upper]) assert.ok(Number.isFinite(value) && value >= 0);
  close(e.typical.perRunUsd, e.lines.reduce((sum, line) => sum + line.typical, 0));
  close(e.upper.perRunUsd, e.lines.reduce((sum, line) => sum + line.upper, 0));
});

test('hand calculation: WhatsApp/LINE chat fixture', () => {
  // Sequential: classify Flash (700*.15+40*.47)/1M; embed 50*.07/1M;
  // rerank 8050*.1/1M; draft Flash (2800*.15+250*.47)/1M;
  // guard 2*6/10000; plan Plus (2000*.4+400*1.6)/1M (no known static prefix).
  // Reply vs takeover is 50/50, so typical Chat App .005/2; upper .005. No cache-eligible prefix.
  const base = (700 * .15 + 40 * .47 + 50 * .07 + 8050 * .1 + 2800 * .15 + 250 * .47 + 2000 * .4 + 400 * 1.6) / 1e6 + .0012;
  const e = estimateWorkflow(fixture('whatsapp-line-chat-agent.json'), models, catalog);
  close(e.typical.perRunUsd, base + .0025);
  close(e.upper.perRunUsd, base + .005);
});

test('hand calculation: enterprise knowledge search fixture with explicit route and edit assumptions', () => {
  // Classify .0001238 + expand .00152 + embed .0000035 + rerank .000805 always run.
  // Evidence found half the time. Draft + check each use generate defaults: .00152 each, plus guard .0012.
  // Disable the unbounded edit retry via settings (0 extra passes); all later actions are customer-owned, with no usage fees.
  // Typical: base + .5*(.00152+.00152+.0012); upper: base + (.00152+.00152+.0012).
  const e = estimateWorkflow(fixture('enterprise-knowledge-search.json'), models, catalog, { loops: { l16: { typical: 0, upper: 0 } } });
  const base = .0001238 + .00152 + .0000035 + .000805;
  close(e.typical.perRunUsd, base + .5 * (.00152 + .00152 + .0012));
  close(e.upper.perRunUsd, base + .00152 + .00152 + .0012);
});

test('attached sub-agents inherit repeat/loop passes and the same repeat group is never squared', () => {
  const wf = graph([node('a', { kind: 'agent', turns: 1, repeat: 'g' }),
    node('b', { kind: 'agent', turns: 1, on: 'a', repeat: 'g' }),
    node('search', { kind: 'tool', ai: undefined, on: 'b', tool: 'web_search' }),
    node('d', { kind: 'end', ai: undefined })], [edge('a', 'd')]);
  wf.groups.g = { id: 'g', over: 'documents' };
  const e = estimateWorkflow(wf, table([{ in: 0, out: 0 }]), catalog);
  close(e.typical.perRunUsd, .03);
  close(e.upper.perRunUsd, .10);
  assert.equal(e.latency.modelStepsOnLongestPath, 2);
  assert.ok(e.assumptions.some((a) => a.key === 'b:attachment'));
});

test('edit cycles have labelled bounds; a forward edit is an ordinary route', () => {
  const wf = graph(['a', 'b', 'c'].map((id) => node(id)),
    [edge('a', 'b'), edge('b', 'a', { kind: 'branch', outcome: 'edit' }), edge('b', 'c', { kind: 'branch' })]);
  const e = estimateWorkflow(wf, unitModel, catalog, costSettings);
  close(e.typical.perRunUsd, (1 + 2) * 2 + 3);
  close(e.upper.perRunUsd, (1 + 2) * 4 + 3);
  assert.ok(e.assumptions.some((a) => a.key === 'loop:b-a:max'));
  const forward = graph(['a', 'b', 'c'].map((id) => node(id)),
    [edge('a', 'b', { outcome: 'edit' }), edge('b', 'c')]);
  close(estimateWorkflow(forward, unitModel, catalog, costSettings).upper.perRunUsd, 6);
});

test('reversed scenario overrides are normalised with an assumption, and zero items omit usage', () => {
  const wf = graph([node('a', { repeat: 'g' })]);
  wf.groups.g = { id: 'g', over: 'items' };
  const e = estimateWorkflow(wf, unitModel, catalog, { ...costSettings, items: { g: { typical: 4, upper: 2 } } });
  close(e.typical.perRunUsd, 4);
  close(e.upper.perRunUsd, 4);
  assert.ok(e.assumptions.some((a) => a.key === 'items:g:order'));
  close(estimateWorkflow(wf, unitModel, catalog,
    { ...costSettings, items: { g: { typical: 0, upper: 0 } } }).upper.perRunUsd, 0);
});

test('cache savings exclude growing history on every agent request', () => {
  const wf = graph([node('a', { kind: 'agent', turns: 3 }),
    node('t', { kind: 'tool', ai: undefined, on: 'a', tool: 'code_interpreter' })], []);
  const e = estimateWorkflow(wf, table([{ in: 1, out: 0, cacheHit: .2 }]), catalog,
    { agents: { a: { typical: 3, upper: 3 } } });
  const input = 2150 + 3100 + 4050;
  close(e.upper.perRunUsd, input / 1e6);
  close(e.typical.perRunUsd, (input - 3 * 2150 * .5 * .8) / 1e6);
});

const plain = (id: string, kind: WorkflowNode['kind']): WorkflowNode => ({ id, kind, label: id });
const message = (id: string): WorkflowNode => ({ ...plain(id, 'end'), product: 'chatapp', effect: 'send', approval: 'skip' });

// Isolate regressions that used to exhaust the heap or block the event loop.
function isolatedEstimate(wf: WorkflowGraph, settings = {}, repetitions = 1) {
  const script = `
    import { readFileSync } from 'node:fs';
import { estimateWorkflow } from './packages/core/src/workflow-estimate.ts';
    import { loadCatalog, loadModels } from './packages/core/src/catalog-node.ts';
    const { wf, settings, repetitions } = JSON.parse(readFileSync(0, 'utf8'));
    const catalog = loadCatalog(), models = loadModels();
    let estimate, worstMs = 0;
    for (let i = 0; i < repetitions; i++) {
      const start = performance.now();
      estimate = estimateWorkflow(wf, models, catalog, settings);
      worstMs = Math.max(worstMs, performance.now() - start);
    }
    console.log(JSON.stringify({ estimate, worstMs }));
  `;
  return JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=128', '--input-type=module', '-e', script], {
    cwd: new URL('../../../', import.meta.url), input: JSON.stringify({ wf, settings, repetitions }),
    timeout: 5000, maxBuffer: 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
  }).toString());
}

test('review 1: retry-only Chat App messages execute once typical and three times upper', () => {
  const wf = graph([plain('trigger', 'trigger'), plain('check', 'decide'),
    { ...message('message'), kind: 'act' }, plain('end', 'end')], [
    edge('trigger', 'check'), edge('check', 'message', { kind: 'loop', max: 3 }),
    edge('message', 'check'), edge('check', 'end', { outcome: 'exhausted' }),
  ]);
  const e = estimateWorkflow(wf, models, catalog);
  close(e.typical.perRunUsd, .005);
  close(e.upper.perRunUsd, .015);
  assert.ok(e.oneRun.includes('message'));
});

test('review 2: overlapping loops spend separate per-run budgets on the shared message', () => {
  const wf = graph([plain('a', 'trigger'), { ...message('b'), kind: 'act' }, plain('c', 'decide'), plain('end', 'end')], [
    edge('a', 'b'), edge('b', 'c', { outcome: 'exhausted' }), edge('c', 'end', { outcome: 'exhausted' }),
    edge('b', 'a', { kind: 'loop', max: 3 }), edge('c', 'b', { kind: 'loop', max: 3 }),
  ]);
  const e = estimateWorkflow(wf, models, catalog);
  close(e.typical.perRunUsd, .005 * (1 + 1 + 1));
  close(e.upper.perRunUsd, .005 * (1 + 3 + 3));
});

function parallelChoices(extraLinks = false): WorkflowGraph {
  const nodes = [plain('a', 'trigger'), plain('zz', 'end')];
  const edges: WorkflowEdge[] = [];
  for (let i = 0; i < 19; i++) {
    const suffix = String(i).padStart(2, '0');
    const b = `b${suffix}`, z = `z${suffix}`;
    nodes.push(plain(b, 'decide'), message(z));
    edges.push(edge('a', b, { kind: 'next' }), edge(b, z, { kind: 'branch' }), edge(b, 'zz', { kind: 'branch' }));
    if (extraLinks && i < 3) edges.push(edge('a', z, { kind: 'next' }));
  }
  return graph(nodes, edges);
}

test('review 3: 40 steps and 57 links factor nineteen independent decisions within 128 MiB', () => {
  const wf = parallelChoices();
  assert.equal(Object.keys(wf.nodes).length, 40);
  assert.equal(Object.keys(wf.edges).length, 57);
  assert.deepEqual(checkWorkflow(wf, catalog, models).filter(w => w.severity !== 'info'), []);
  const { estimate: e } = isolatedEstimate(wf);
  close(e.typical.perRunUsd, .0475);
  close(e.upper.perRunUsd, .095);
  assert.ok(!e.assumptions.some((a: { key: string }) => a.key === 'resources'));
});

test('40-step 60-link adversarial runtime benchmark', (t) => {
  const wf = parallelChoices(true);
  assert.equal(Object.keys(wf.edges).length, 60);
  assert.deepEqual(checkWorkflow(wf, catalog, models).filter(w => w.severity !== 'info'), []);
  const { estimate: e, worstMs } = isolatedEstimate(wf, {}, 20);
  close(e.typical.perRunUsd, .055);
  close(e.upper.perRunUsd, .095);
  t.diagnostic(`40 steps / 60 links: worst of 20 estimates ${worstMs.toFixed(3)} ms; child heap limit 128 MiB`);
});

test('review 4: finite 1e308 agent request settings terminate with a documented cap', () => {
  const wf = graph([{ ...plain('a', 'agent'), ai: 'qwen3.7-plus', turns: 1 }]);
  const { estimate: e } = isolatedEstimate(wf, { agents: { a: { typical: 1e308, upper: 1e308 } } });
  assert.ok(Number.isFinite(e.upper.monthlyUsd));
  assert.ok(e.assumptions.some((a: { key: string }) => a.key.includes(':limit')));
});

test('review 4: repeated guard with 1e308 items and detection types stays finite', () => {
  const wf = graph([{ ...plain('g', 'guard'), repeat: 'items' }]);
  wf.groups.items = { id: 'items', over: 'items' };
  const e = estimateWorkflow(wf, models, catalog, {
    items: { items: { typical: 1e308, upper: 1e308 } }, guardTypes: { g: 1e308 },
  });
  assert.ok(e.lines.every((l) => Number.isFinite(l.typical) && Number.isFinite(l.upper)));
  assert.ok(Number.isFinite(e.typical.monthlyUsd) && Number.isFinite(e.upper.monthlyUsd));
  assert.ok(e.assumptions.some((a) => a.key.includes(':limit')));
});

test('decision-diagram resource limit returns a labelled conservative subtotal', () => {
  const wf = parallelChoices(true);
  wf.nodes.zz.ai = 'qwen3.7-plus';
  const steps: Record<string, { inTokens: number; outTokens: number }> = {};
  for (let i = 0; i < 19; i++) {
    const id = `z${String(i).padStart(2, '0')}`;
    wf.nodes[id].ai = 'qwen3.7-plus';
    steps[id] = { inTokens: 0, outTokens: 2 ** i };
  }
  const { estimate: e } = isolatedEstimate(wf, { steps });
  assert.ok(e.assumptions.some((a: { key: string }) => a.key === 'resources'));
  assert.ok(Number.isFinite(e.upper.monthlyUsd));
  assert.ok(e.upper.perRunUsd >= e.typical.perRunUsd);
  assert.ok(e.lines.filter((l: { id: string }) => l.id.endsWith(':model')).every((l: { upper: number }) => l.upper > 0));
});

test('all numeric setting domains clamp with diagnostics and loop overrides respect max', () => {
  const wf = graph([node('a', { kind: 'agent', turns: 1e308 }),
    node('search', { kind: 'tool', ai: undefined, on: 'a', tool: 'web_search' }), plain('end', 'end')],
  [edge('a', 'a', { kind: 'loop', max: 3 }), edge('a', 'end', { outcome: 'exhausted' })]);
  const huge = estimateWorkflow(wf, table(), catalog, {
    runsPerMonth: 1e308, steps: { a: { inTokens: 1e308, outTokens: 1e308 } },
    agents: { a: { typical: 1e308, upper: 1e308, resultTokens: 1e308, searchesPerRequest: 1e308 } },
    loops: { 'a-a': { typical: 1e308, upper: 1e308 } },
  });
  wf.nodes.a.turns = 50;
  const capped = estimateWorkflow(wf, table(), catalog, {
    runsPerMonth: 1e9, steps: { a: { inTokens: 1e6, outTokens: 1e6 } },
    agents: { a: { typical: 50, upper: 50, resultTokens: 1e6, searchesPerRequest: 100 } },
    loops: { 'a-a': { typical: 3, upper: 3 } },
  });
  assert.deepEqual(huge.typical, capped.typical);
  assert.deepEqual(huge.upper, capped.upper);
  for (const key of ['runsPerMonth', 'a:input', 'a:output', 'a:results', 'a:searches', 'loops:a-a:upper']) {
    assert.ok(huge.assumptions.some((a) => a.key === `${key}:limit`), key);
  }
});

test('overflowing price arithmetic saturates with a diagnostic instead of Infinity', () => {
  const e = estimateWorkflow(graph([node('a')]), table([{ in: 1e308, out: 1e308 }]), catalog, { runsPerMonth: 1e308 });
  assert.ok(e.lines.every((l) => Number.isFinite(l.typical) && Number.isFinite(l.upper)));
  assert.ok(Number.isFinite(e.upper.monthlyUsd));
  assert.ok(e.assumptions.some((a) => a.key === 'arithmetic:limit'));
});

test('review fixture subtotals: insurance retry-only path and invoice overlapping retries', () => {
  close(estimateWorkflow(fixture('insurance-claims-triage.json'), models, catalog).upper.perRunUsd, .03092912);
  close(estimateWorkflow(fixture('invoice-three-way-match.json'), models, catalog).upper.perRunUsd, .01465662);
});

test('retry links need no non-loop return path to price their destinations', () => {
  const wf = graph([plain('a', 'trigger'), message('b'), plain('end', 'end')], [
    edge('a', 'b', { kind: 'loop', max: 3 }), edge('a', 'end', { outcome: 'exhausted' }),
  ]);
  const e = estimateWorkflow(wf, models, catalog);
  close(e.typical.perRunUsd, .005);
  close(e.upper.perRunUsd, .015);
});

test('independent choices with distinct prices remain factored without resource fallback', () => {
  const wf = parallelChoices();
  const steps: Record<string, { inTokens: number; outTokens: number }> = {};
  for (let i = 0; i < 19; i++) {
    const id = `z${String(i).padStart(2, '0')}`;
    wf.nodes[id].ai = 'test';
    steps[id] = { inTokens: 0, outTokens: 2 ** i };
  }
  const e = estimateWorkflow(wf, unitModel, catalog, { steps });
  close(e.typical.perRunUsd, (2 ** 19 - 1) / 2 + .0475);
  close(e.upper.perRunUsd, 2 ** 19 - 1 + .095);
  assert.ok(!e.assumptions.some((a) => a.key === 'resources'));
});

test('C10: stale twenty-request override respects agent turns reduced to five', () => {
  const wf = graph([node('a', { kind: 'agent', ai: 'qwen3.7-plus', turns: 20 })]);
  wf.nodes.a.turns = 5;
  const stale = estimateWorkflow(wf, models, catalog, { agents: { a: { upper: 20 } } });
  const capped = estimateWorkflow(wf, models, catalog, { agents: { a: { upper: 5 } } });
  close(stale.upper.perRunUsd, capped.upper.perRunUsd);
  assert.ok(stale.assumptions.some(a => a.key === 'agent:a:requests:upper:limit'));
});
test('C11: taskless agent documents its actual loop token defaults', () => {
  const e = estimateWorkflow(graph([node('a', { kind: 'agent', ai: 'qwen3.7-plus', turns: 4 })]), models, catalog);
  assert.ok(!e.assumptions.some(a => a.key === 'a:task'));
  assert.ok(e.assumptions.some(a => a.key === 'a:input' && a.text.includes('2000')));
  close(e.upper.perRunUsd, .0066);
});
for (const outTokens of [-1, NaN, Infinity, null]) test(`D7: invalid thinking output ${outTokens} retains default factor`, () => {
  const e = estimateWorkflow(graph([node('a', { task: 'classify' })]), table([{ in: 1, out: 2, thinkingOut: 5 }]), catalog,
    { steps: { a: { thinking: true, outTokens: outTokens as number } } });
  close(e.upper.perRunUsd, .0013);
});

test('C9: tutor retry is a loop driver and branch/escalate share one choice', () => {
  const wf = fixture('ai-tutor-socratic-hint.json');
  assert.equal(typeof estimateApi.workflowChoiceSets, 'function');
  const sets = estimateApi.workflowChoiceSets(wf);
  assert.deepEqual(sets.choices['retry-route'], ['l12', 'l2']);
  assert.deepEqual(sets.loops.l15, { min: 0, max: 3 });
  assert.equal(sets.shares.l15, undefined);
  assert.deepEqual(sets.shares.l12, { min: 0, max: 1 });
  const before = JSON.stringify(wf);
  assert.deepEqual(estimateApi.workflowChoiceSets(wf), sets);
  assert.equal(JSON.stringify(wf), before);
});
