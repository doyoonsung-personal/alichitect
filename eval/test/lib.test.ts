import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Graph, Warning } from '../../packages/core/src/types.ts';
import type { TurnView, EvalTurn, AssertionResult } from '../lib.ts';
import { evaluateTurn, editStats, langShare, inventedAmounts, percentile, countBy, checkCases, productNamePattern } from '../lib.ts';
import { summarize } from '../summarize.ts';
import type { RunRecord, RunMeta } from '../records.ts';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';

const catalog = loadCatalog();
const names = productNamePattern(catalog);
const firstProductId = catalog.entries[0]?.id ?? 'aws-lambda';

function graph(
  nodes: Array<{ id: string; product: string; label: string; group: string; zones?: string[]; attachTo?: string; why?: string }>,
  edges: Array<{ id: string; from: string; to: string }>,
  recs: Array<{ product: string; fit: string; why: string }> = [],
  groups: Array<{ id: string; kind: string; label: string; parent?: string }> = []
): Graph {
  const g: Graph = { nodes: {} as any, edges: {} as any, recs: recs as any, groups: {} as any };
  for (const n of nodes) (g.nodes as any)[n.id] = n;
  for (const e of edges) (g.edges as any)[e.id] = e;
  for (const gr of groups) (g.groups as any)[gr.id] = gr;
  return g;
}

function view(overrides: Partial<TurnView> = {}): TurnView {
  const empty = graph([], []);
  return {
    ask: 'test',
    ops: [],
    says: ['This is a test sentence.'],
    reqs: [],
    gaps: [],
    rawProducts: [],
    graph: empty,
    before: empty,
    requirements: [],
    userTexts: [],
    stats: {
      error: undefined,
      ops: 3,
      warningsBefore: [],
      warningsAfter: [],
      badLines: 0,
      doneSeen: true,
      finishReason: 'stop',
      escapes: 0,
    },
    ...overrides,
  } as TurnView;
}

function find(results: AssertionResult[], type: string): AssertionResult | undefined {
  return results.find((r) => r.type === type);
}

function turn(expect?: EvalTurn['expect'], retain?: EvalTurn['retain']): EvalTurn {
  return { ask: 'test', expect, retain };
}

describe('1. include', () => {
  test('passes when each group has one product among final nodes or recs', () => {
    const g = graph([{ id: 'n1', product: firstProductId, label: 'L', group: 'g1' }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ include: [[firstProductId]] }), 'en', names);
    assert.equal(find(res, 'include')!.pass, true);
  });

  test('fails when a group has none', () => {
    const v = view();
    const res = evaluateTurn(v, turn({ include: [['nonexistent-product']] }), 'en', names);
    assert.equal(find(res, 'include')!.pass, false);
  });
});

describe('2. exclude, excludeRaw, primaryRec, noNodes, noRecs', () => {
  test('exclude passes when product not in graph', () => {
    const v = view();
    const res = evaluateTurn(v, turn({ exclude: [firstProductId] }), 'en', names);
    assert.equal(find(res, 'exclude')!.pass, true);
  });

  test('exclude fails when product is present', () => {
    const g = graph([{ id: 'n1', product: firstProductId, label: 'L', group: 'g1' }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ exclude: [firstProductId] }), 'en', names);
    assert.equal(find(res, 'exclude')!.pass, false);
  });

  test('excludeRaw compares normalized strings', () => {
    const v = view({ rawProducts: ['My Product_Name'] });
    const res = evaluateTurn(v, turn({ excludeRaw: ['my-product-name'] }), 'en', names);
    assert.equal(find(res, 'exclude')!.pass, false);
  });

  test('excludeRaw passes when not present', () => {
    const v = view({ rawProducts: ['other-thing'] });
    const res = evaluateTurn(v, turn({ excludeRaw: ['my-product-name'] }), 'en', names);
    assert.equal(find(res, 'exclude')!.pass, true);
  });

  test('primaryRec passes when a primary rec matches', () => {
    const g = graph([], [], [{ product: firstProductId, fit: 'primary', why: 'w' }]);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ primaryRec: [firstProductId] }), 'en', names);
    assert.equal(find(res, 'primaryRec')!.pass, true);
  });

  test('primaryRec fails when no primary rec matches', () => {
    const g = graph([], [], [{ product: firstProductId, fit: 'complement', why: 'w' }]);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ primaryRec: [firstProductId] }), 'en', names);
    assert.equal(find(res, 'primaryRec')!.pass, false);
  });

  test('noNodes passes with empty graph', () => {
    const v = view();
    const res = evaluateTurn(v, turn({ noNodes: true }), 'en', names);
    assert.equal(find(res, 'size')!.pass, true);
  });

  test('noNodes fails when nodes exist', () => {
    const g = graph([{ id: 'n1', product: 'p', label: 'L', group: 'g' }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ noNodes: true }), 'en', names);
    assert.equal(find(res, 'size')!.pass, false);
  });

  test('noRecs passes with no recs', () => {
    const v = view();
    const res = evaluateTurn(v, turn({ noRecs: true }), 'en', names);
    assert.equal(find(res, 'size')!.pass, true);
  });

  test('noRecs fails when recs exist', () => {
    const g = graph([], [], [{ product: 'p', fit: 'primary', why: 'w' }]);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ noRecs: true }), 'en', names);
    assert.equal(find(res, 'size')!.pass, false);
  });
});

describe('3. req and retention', () => {
  test('req passes when keyword found in pinned requirements', () => {
    const v = view({ requirements: ['Must use Lambda'] });
    const res = evaluateTurn(v, turn({ req: [['lambda']] }), 'en', names);
    assert.equal(find(res, 'req')!.pass, true);
  });

  test('req fails when keyword not found', () => {
    const v = view({ requirements: ['Must use EC2'] });
    const res = evaluateTurn(v, turn({ req: [['lambda']] }), 'en', names);
    assert.equal(find(res, 'req')!.pass, false);
  });

  test('retention produces assertions of type retention', () => {
    const g = graph([{ id: 'n1', product: firstProductId, label: 'L', group: 'g' }], []);
    const v = view({ graph: g, requirements: ['keep lambda'] });
    const t = turn(undefined, { exclude: [firstProductId], include: [[firstProductId]], req: [['lambda']], regions: { min: 0 } });
    const res = evaluateTurn(v, t, 'en', names);
    const retentions = res.filter((r) => r.type === 'retention');
    assert.ok(retentions.length >= 4);
  });
});

describe('4. regions', () => {
  test('only passes when region group is in the list', () => {
    const g = graph([], [], [], [{ id: 'g1', kind: 'region', label: 'us-east-1' }]);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ regions: { only: ['us-east-1'] } }), 'en', names);
    assert.equal(find(res, 'region')!.pass, true);
  });

  test('only fails when region group is outside the list', () => {
    const g = graph([], [], [], [{ id: 'g1', kind: 'region', label: 'eu-west-1' }]);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ regions: { only: ['us-east-1'] } }), 'en', names);
    assert.equal(find(res, 'region')!.pass, false);
  });

  test('only fails when there is no region group', () => {
    const v = view();
    const res = evaluateTurn(v, turn({ regions: { only: ['us-east-1'] } }), 'en', names);
    assert.equal(find(res, 'region')!.pass, false);
  });

  test('not passes when forbidden region absent', () => {
    const g = graph([], [], [], [{ id: 'g1', kind: 'region', label: 'us-east-1' }]);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ regions: { not: ['eu-west-1'] } }), 'en', names);
    const notRes = res.find((r) => r.name.startsWith('regions not'));
    assert.equal(notRes!.pass, true);
  });

  test('min passes when enough region groups', () => {
    const g = graph([], [], [], [{ id: 'g1', kind: 'region', label: 'us-east-1' }]);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ regions: { min: 1 } }), 'en', names);
    assert.equal(find(res, 'region')!.pass, true);
  });

  test('min fails when too few region groups', () => {
    const v = view();
    const res = evaluateTurn(v, turn({ regions: { min: 1 } }), 'en', names);
    assert.equal(find(res, 'region')!.pass, false);
  });
});

describe('5. attach and zones', () => {
  test('attach passes when badge node attached to allowed host', () => {
    const g = graph([
      { id: 'h1', product: 'host-prod', label: 'H', group: 'g' },
      { id: 'b1', product: 'badge-prod', label: 'B', group: 'g', attachTo: 'h1' },
    ], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ attach: [{ product: 'badge-prod', hosts: ['host-prod'] }] }), 'en', names);
    assert.equal(find(res, 'attach')!.pass, true);
  });

  test('attach fails when attachTo is missing', () => {
    const g = graph([{ id: 'b1', product: 'badge-prod', label: 'B', group: 'g' }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ attach: [{ product: 'badge-prod', hosts: ['host-prod'] }] }), 'en', names);
    assert.equal(find(res, 'attach')!.pass, false);
  });

  test('attach fails when host product is wrong', () => {
    const g = graph([
      { id: 'h1', product: 'wrong-host', label: 'H', group: 'g' },
      { id: 'b1', product: 'badge-prod', label: 'B', group: 'g', attachTo: 'h1' },
    ], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ attach: [{ product: 'badge-prod', hosts: ['host-prod'] }] }), 'en', names);
    assert.equal(find(res, 'attach')!.pass, false);
  });

  test('zones passes when a node has two or more zones', () => {
    const g = graph([{ id: 'n1', product: 'prod-a', label: 'N', group: 'g', zones: ['z1', 'z2'] }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ zones: [['prod-a']] }), 'en', names);
    assert.equal(find(res, 'zones')!.pass, true);
  });

  test('zones fails when no node has two zones', () => {
    const g = graph([{ id: 'n1', product: 'prod-a', label: 'N', group: 'g', zones: ['z1'] }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ zones: [['prod-a']] }), 'en', names);
    assert.equal(find(res, 'zones')!.pass, false);
  });
});

describe('6. edit minimality', () => {
  test('editStats computes correct counts', () => {
    const before = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }], [{ id: 'e1', from: 'n1', to: 'n1' }]);
    const after = graph(
      [{ id: 'n1', product: 'a', label: 'B', group: 'g' }, { id: 'n2', product: 'b', label: 'C', group: 'g' }],
      [{ id: 'e2', from: 'n1', to: 'n2' }]
    );
    const s = editStats(before, after);
    assert.equal(s.nodeAdds, 1);
    assert.equal(s.nodeRemoves, 0);
    assert.equal(s.nodeUpdates, 1);
    assert.equal(s.edgeAdds, 1);
    assert.equal(s.edgeRemoves, 1);
  });

  test('edit maxNodeAdds passes when within limit', () => {
    const before = graph([], []);
    const after = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }], []);
    const v = view({ before, graph: after });
    const res = evaluateTurn(v, turn({ edit: { maxNodeAdds: 1 } }), 'en', names);
    assert.equal(find(res, 'editMinimal')!.pass, true);
  });

  test('edit maxNodeAdds fails when exceeded', () => {
    const before = graph([], []);
    const after = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }, { id: 'n2', product: 'b', label: 'B', group: 'g' }], []);
    const v = view({ before, graph: after });
    const res = evaluateTurn(v, turn({ edit: { maxNodeAdds: 1 } }), 'en', names);
    assert.equal(find(res, 'editMinimal')!.pass, false);
  });

  test('edit noGrowth passes when nodes did not grow', () => {
    const before = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }], []);
    const after = graph([{ id: 'n1', product: 'a', label: 'B', group: 'g' }], []);
    const v = view({ before, graph: after });
    const res = evaluateTurn(v, turn({ edit: { noGrowth: true } }), 'en', names);
    assert.equal(find(res, 'editMinimal')!.pass, true);
  });

  test('edit noGrowth fails when nodes grew', () => {
    const before = graph([], []);
    const after = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }], []);
    const v = view({ before, graph: after });
    const res = evaluateTurn(v, turn({ edit: { noGrowth: true } }), 'en', names);
    assert.equal(find(res, 'editMinimal')!.pass, false);
  });

  test('edit minChanged passes when enough changes', () => {
    const before = graph([], []);
    const after = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }], []);
    const v = view({ before, graph: after });
    const res = evaluateTurn(v, turn({ edit: { minChanged: 1 } }), 'en', names);
    assert.equal(find(res, 'editMinimal')!.pass, true);
  });

  test('edit minChanged fails when too few changes', () => {
    const before = graph([], []);
    const after = graph([], []);
    const v = view({ before, graph: after });
    const res = evaluateTurn(v, turn({ edit: { minChanged: 1 } }), 'en', names);
    assert.equal(find(res, 'editMinimal')!.pass, false);
  });
});

describe('7. restored, noWarn, question, mention, notMention, notInLabels', () => {
  test('restored passes when ids exist', () => {
    const g = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ restored: ['n1'] }), 'en', names);
    assert.equal(find(res, 'restore')!.pass, true);
  });

  test('restored fails when ids are missing', () => {
    const v = view();
    const res = evaluateTurn(v, turn({ restored: ['missing-id'] }), 'en', names);
    assert.equal(find(res, 'restore')!.pass, false);
  });

  test('noWarn passes when code not in warningsBefore', () => {
    const v = view();
    const res = evaluateTurn(v, turn({ noWarn: ['bad-json' as any] }), 'en', names);
    assert.equal(find(res, 'noWarn')!.pass, true);
  });

  test('noWarn fails when code is in warningsBefore', () => {
    const w: Warning = { code: 'bad-json' as any, ids: [], msg: 'oops', severity: 'warn', repaired: false };
    const v = view({ stats: { ...view().stats, warningsBefore: [w] } });
    const res = evaluateTurn(v, turn({ noWarn: ['bad-json' as any] }), 'en', names);
    assert.equal(find(res, 'noWarn')!.pass, false);
  });

  test('question passes when say contains ?', () => {
    const v = view({ says: ['Do you want this?'] });
    const res = evaluateTurn(v, turn({ question: true }), 'en', names);
    assert.equal(find(res, 'question')!.pass, true);
  });

  test('question fails when no say contains ?', () => {
    const v = view({ says: ['Here is your diagram.'] });
    const res = evaluateTurn(v, turn({ question: true }), 'en', names);
    assert.equal(find(res, 'question')!.pass, false);
  });

  test('mention passes when text is in narration', () => {
    const v = view({ says: ['I added Lambda for you.'] });
    const res = evaluateTurn(v, turn({ mention: [['Lambda']] }), 'en', names);
    assert.equal(find(res, 'mention')!.pass, true);
  });

  test('mention fails when text not in narration', () => {
    const v = view({ says: ['Done.'] });
    const res = evaluateTurn(v, turn({ mention: [['Lambda']] }), 'en', names);
    assert.equal(find(res, 'mention')!.pass, false);
  });

  test('notMention passes when text not in model texts', () => {
    const v = view({ says: ['Hello world.'] });
    const res = evaluateTurn(v, turn({ notMention: ['forbidden'] }), 'en', names);
    assert.equal(find(res, 'notMention')!.pass, true);
  });

  test('notMention fails when text is in model texts', () => {
    const v = view({ says: ['forbidden word here'] });
    const res = evaluateTurn(v, turn({ notMention: ['forbidden'] }), 'en', names);
    assert.equal(find(res, 'notMention')!.pass, false);
  });

  test('notInLabels passes when word boundary prevents match', () => {
    const g = graph([{ id: 'n1', product: 'a', label: 'Lambdas', group: 'g' }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ notInLabels: ['Lambda'] }), 'en', names);
    assert.equal(find(res, 'notMention')!.pass, true);
  });

  test('notInLabels fails when word is in label', () => {
    const g = graph([{ id: 'n1', product: 'a', label: 'AWS Lambda', group: 'g' }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn({ notInLabels: ['AWS'] }), 'en', names);
    const notLabel = res.find((r) => r.name.includes('labels never name'));
    assert.equal(notLabel!.pass, false);
  });
});

describe('8. defaults on every turn', () => {
  test('noErrors passes by default', () => {
    const v = view();
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'noErrors')!.pass, true);
  });

  test('noErrors fails when error-severity warning in warningsAfter', () => {
    const w: Warning = { code: 'bad-op' as any, ids: [], msg: 'err', severity: 'error', repaired: false };
    const v = view({ stats: { ...view().stats, warningsAfter: [w] } });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'noErrors')!.pass, false);
  });

  test('pathOrder passes when no path-order warning', () => {
    const g = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }, { id: 'n2', product: 'b', label: 'B', group: 'g' }], []);
    const v = view({ graph: g });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'pathOrder')!.pass, true);
  });

  test('pathOrder fails when non-info path-order warning present', () => {
    const g = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }, { id: 'n2', product: 'b', label: 'B', group: 'g' }], []);
    const w: Warning = { code: 'path-order' as any, ids: [], msg: 'bad order', severity: 'warn', repaired: false };
    const v = view({ graph: g, stats: { ...view().stats, warningsAfter: [w] } });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'pathOrder')!.pass, false);
  });

  test('pathOrder passes when info path-order warning present', () => {
    const g = graph([{ id: 'n1', product: 'a', label: 'A', group: 'g' }, { id: 'n2', product: 'b', label: 'B', group: 'g' }], []);
    const w: Warning = { code: 'path-order' as any, ids: [], msg: 'info order', severity: 'info', repaired: false };
    const v = view({ graph: g, stats: { ...view().stats, warningsAfter: [w] } });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'pathOrder')!.pass, true);
  });

  test('format passes with good stats', () => {
    const v = view();
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'format')!.pass, true);
  });

  test('format fails when badLines > 0', () => {
    const v = view({ stats: { ...view().stats, badLines: 2 } });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'format')!.pass, false);
  });

  test('format fails when doneSeen is false', () => {
    const v = view({ stats: { ...view().stats, doneSeen: false } });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'format')!.pass, false);
  });

  test('escapes passes when 0', () => {
    const v = view();
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'escapes')!.pass, true);
  });

  test('escapes fails when > 0', () => {
    const v = view({ stats: { ...view().stats, escapes: 3 } });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'escapes')!.pass, false);
  });

  test('noPrices fails when invented price in say', () => {
    const v = view({ says: ['It costs $40 per month.'] });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'noPrices')!.pass, false);
  });

  test('noPrices passes when price is in user text', () => {
    const v = view({ says: ['Budget is $200.'], userTexts: ['I have 200 dollars'] });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'noPrices')!.pass, true);
  });

  test('sayLang passes for English say with en', () => {
    const v = view({ says: ['This is an English sentence.'] });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'sayLang')!.pass, true);
  });

  test('sayLang fails for English say with ko', () => {
    const v = view({ says: ['This is an English sentence.'] });
    const res = evaluateTurn(v, turn(), 'ko', names);
    assert.equal(find(res, 'sayLang')!.pass, false);
  });

  test('sayLang passes for Korean say with ko', () => {
    const v = view({ says: ['이것은 한국어 문장입니다.'] });
    const res = evaluateTurn(v, turn(), 'ko', names);
    assert.equal(find(res, 'sayLang')!.pass, true);
  });

  test('sayLang ignores product names like Qoder Teams', () => {
    const v = view({ says: ['Qoder Teams is ready for you.'] });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(find(res, 'sayLang')!.pass, true);
  });
});

describe('8b. attachValid', () => {
  const warn = (severity: 'warn' | 'info' | 'error'): Warning => ({ code: 'attach-host-missing', ids: ['scaling', 'svc'], msg: "'scaling' attaches to 'svc': 'svc' (sae) is not an attach host for ess", severity, repaired: false });
  test('fails on an attach-host-missing warning from the model output, passes on none or on an info-level cascade', () => {
    const base = view();
    assert.equal(find(evaluateTurn(view({ stats: { ...base.stats, warningsBefore: [warn('warn')] } }), turn(), 'en', names), 'attachValid')!.pass, false);
    assert.equal(find(evaluateTurn(view({ stats: { ...base.stats, warningsBefore: [warn('error')] } }), turn(), 'en', names), 'attachValid')!.pass, false);
    assert.equal(find(evaluateTurn(view({ stats: { ...base.stats, warningsBefore: [warn('info')] } }), turn(), 'en', names), 'attachValid')!.pass, true);
    assert.equal(find(evaluateTurn(base, turn(), 'en', names), 'attachValid')!.pass, true);
  });
  test('can be switched off per turn', () => {
    const v = view({ stats: { ...view().stats, warningsBefore: [warn('warn')] } });
    assert.equal(find(evaluateTurn(v, turn({ attachValid: false }), 'en', names), 'attachValid'), undefined);
  });
});

describe('9. api error returns single assertion', () => {
  test('returns single api assertion that fails', () => {
    const v = view({ stats: { ...view().stats, error: { code: 'rate_limit', message: 'too fast' } as any, ops: 0 } });
    const res = evaluateTurn(v, turn(), 'en', names);
    assert.equal(res.length, 1);
    assert.equal(res[0].type, 'api');
    assert.equal(res[0].pass, false);
  });
});

describe('10. langShare, inventedAmounts, percentile, countBy', () => {
  test('langShare computes share correctly', () => {
    const result = langShare('hello world', 'en', names);
    assert.ok(result.share >= 0.9);
    assert.ok(result.letters > 0);
  });

  test('inventedAmounts finds amounts not in user text', () => {
    const inv = inventedAmounts(['Price is $50'], ['I have 100']);
    assert.deepEqual(inv, ['$50']);
  });

  test('inventedAmounts ignores amounts in user text', () => {
    const inv = inventedAmounts(['Price is $100'], ['budget 100']);
    assert.deepEqual(inv, []);
  });

  test('percentile p50 and p95 of [1,2,3,4,5,100]', () => {
    const xs = [1, 2, 3, 4, 5, 100];
    // linear interpolation between closest ranks, rounded: p50 = 3.5 -> 4, p95 = 5 + 0.75 * 95 = 76.25 -> 76
    assert.equal(percentile(xs, 0.5), 4);
    assert.equal(percentile(xs, 0.95), 76);
    assert.equal(percentile([], 0.5), null);
  });

  test('countBy groups items', () => {
    const result = countBy(['a', 'b', 'a', 'c', 'b', 'a'], (x) => x);
    assert.equal(result['a'], 3);
    assert.equal(result['b'], 2);
    assert.equal(result['c'], 1);
  });
});

describe('11. checkCases', () => {
  const baseCase = {
    id: 'test-case',
    category: 'pattern' as const,
    title: 'Test',
    reference: 'ref',
    turns: [{ ask: 'do something' }],
  };

  test('unknown expect key produces problem with case id', () => {
    const c = { ...baseCase, turns: [{ ask: 'x', expect: { bogusKey: true } as any }] };
    const probs = checkCases([c], catalog);
    assert.ok(probs.some((p) => p.includes('test-case')));
  });

  test('product id not in catalog produces problem', () => {
    const c = { ...baseCase, turns: [{ ask: 'x', expect: { exclude: ['fake-product-xyz'] } }] };
    const probs = checkCases([c], catalog);
    assert.ok(probs.some((p) => p.includes('test-case')));
  });

  test('missing base file name produces problem', () => {
    const c = { ...baseCase, base: 'nonexistent-base-file-xyz' };
    const probs = checkCases([c], catalog);
    assert.ok(probs.some((p) => p.includes('test-case') && p.includes('missing base')));
  });

  test('retain on first turn produces problem', () => {
    const c = { ...baseCase, turns: [{ ask: 'x', retain: { exclude: [] } }] };
    const probs = checkCases([c], catalog);
    assert.ok(probs.some((p) => p.includes('test-case') && p.includes('retain')));
  });

  test('valid case produces no problems', () => {
    const probs = checkCases([baseCase], catalog);
    assert.equal(probs.length, 0);
  });
});

describe('12. summarize', () => {
  function makeRunRecord(caseId: string, runNum: number, pass: boolean): RunRecord {
    return {
      id: `${caseId}#${runNum}`,
      case: caseId,
      category: 'pattern',
      lang: 'en',
      run: runNum,
      model: 'm',
      startedAt: '2024-01-01T00:00:00Z',
      wallMs: 100,
      pass,
      turns: [{
        index: 0,
        ask: 'q',
        content: '',
        ops: [],
        says: [],
        reqs: [],
        gaps: [],
        rawProducts: [],
        changes: '',
        graph: graph([], []),
        requirements: [],
        stats: {
          ops: 1,
          warningsBefore: [],
          warningsAfter: [],
          badLines: 0,
          doneSeen: true,
          finishReason: 'stop',
          escapes: 0,
          attempts: [{ model: 'm' }],
        } as any,
        assertions: [{ type: 't', name: 'n', pass }],
        pass,
      }],
      costUsd: 0.01,
    } as RunRecord;
  }

  const meta: RunMeta = {
    startedAt: '2024-01-01',
    args: {},
    model: 'm',
    fallbackModel: 'f',
    runsPerCase: 3,
    concurrency: 1,
    cases: 1,
    units: 3,
    catalogVersion: 'v1',
    catalogEntries: 1,
    systemPromptChars: 100,
    systemPromptSha256: 'abc',
    node: '24',
  };

  test('one case three runs gives correct totals', () => {
    const runs = [makeRunRecord('c1', 1, true), makeRunRecord('c1', 2, true), makeRunRecord('c1', 3, false)];
    const cases = [{ id: 'c1', category: 'pattern' as const, title: 'T', reference: 'R', turns: [{ ask: 'q' }] }];
    const s = summarize(runs, [], meta, cases);
    assert.equal(s.totals.casePassRate, Math.round((2 / 3) * 1000) / 1000);
    assert.equal(s.totals.passAtN, 1);
    assert.equal(s.totals.majority, 1);
    assert.equal(s.totals.allRuns, 0);
  });

  test('two cases where one has majority false', () => {
    const runs = [
      makeRunRecord('c1', 1, true), makeRunRecord('c1', 2, true), makeRunRecord('c1', 3, false),
      makeRunRecord('c2', 1, true), makeRunRecord('c2', 2, false), makeRunRecord('c2', 3, false),
    ];
    const cases = [
      { id: 'c1', category: 'pattern' as const, title: 'T1', reference: 'R', turns: [{ ask: 'q' }] },
      { id: 'c2', category: 'pattern' as const, title: 'T2', reference: 'R', turns: [{ ask: 'q' }] },
    ];
    const s = summarize(runs, [], meta, cases);
    const c2 = s.cases.find((c) => c.id === 'c2')!;
    assert.equal(c2.majority, false);
  });
});
