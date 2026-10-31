// Phase 1 additions to the harness: residency, pinned constraints, noAttach, linked, placement, rescued cut-offs, judge
// selection of constraint cases, and the failover, cut-off, constraint and repair sections of the summary.
// First drafted by qwen3.8-max from a written spec, then read and checked here.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Graph, Op } from '../../packages/core/src/types.ts';
import { evaluateTurn, isConstraintCase, productNamePattern, residencyNarration } from '../lib.ts';
import type { AssertionResult, EvalCase, EvalTurn, TurnView } from '../lib.ts';
import { cutoffCause, perceivedFirstByte, summarize } from '../summarize.ts';
import { pickJudgeRuns } from '../run.ts';
import type { JudgeRecord, RunMeta, RunRecord, TurnRecord } from '../records.ts';
import { loadCatalog } from '../../packages/core/src/catalog-node.ts';
const catalog = loadCatalog();
const names = productNamePattern(catalog);

function g(parts: {
  groups?: Array<{ id: string; kind: string; label: string; parent: string | null }>;
  nodes?: Array<{ id: string; product: string; label: string; group: string; attachTo?: string }>;
  edges?: Array<{ id: string; from: string; to: string }>;
}): Graph {
  const groups: Record<string, any> = {};
  for (const x of parts.groups ?? []) groups[x.id] = { id: x.id, kind: x.kind, label: x.label, parent: x.parent };
  const nodes: Record<string, any> = {};
  for (const n of parts.nodes ?? []) {
    const node: any = { id: n.id, product: n.product, label: n.label, group: n.group };
    if (n.attachTo) node.attachTo = n.attachTo;
    nodes[n.id] = node;
  }
  const edges: Record<string, any> = {};
  for (const e of parts.edges ?? []) edges[e.id] = { id: e.id, from: e.from, to: e.to };
  return { groups, nodes, edges, recs: [] };
}

const baseStats = { ops: 0, warningsBefore: [], warningsAfter: [], badLines: 0, doneSeen: true, finishReason: 'stop' as const, escapes: 0 };
const emptyGraph = g({});

function view(over: Partial<TurnView>): TurnView {
  return {
    ask: 'x',
    ops: [],
    says: ['Done.'],
    reqs: [],
    gaps: [],
    rawProducts: [],
    graph: emptyGraph,
    before: emptyGraph,
    requirements: [],
    constraints: [],
    userTexts: [],
    stats: { ...baseStats },
    ...over,
  } as TurnView;
}

function pick(res: AssertionResult[], type: string): AssertionResult[] {
  return res.filter((r) => r.type === type);
}

function turn(expect: any, retain?: any): EvalTurn {
  const t: EvalTurn = { ask: 'x', expect };
  if (retain !== undefined) t.retain = retain;
  return t;
}

const sg = g({
  groups: [
    { id: 'r', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null },
    { id: 'v', kind: 'vpc', label: 'VPC', parent: 'r' },
  ],
  nodes: [
    { id: 'db', product: 'rds', label: 'DB', group: 'v' },
    { id: 'app', product: 'ecs', label: 'App', group: 'v' },
  ],
  edges: [{ id: 'e1', from: 'app', to: 'db' }],
});

function tr(stats: object, extra: Record<string, unknown> = {}): TurnRecord {
  return {
    index: 0,
    ask: 'q',
    content: '',
    ops: [],
    says: [],
    reqs: [],
    gaps: [],
    rawProducts: [],
    changes: '',
    graph: emptyGraph,
    requirements: [],
    stats: {
      warningsBefore: [],
      warningsAfter: [],
      badLines: 0,
      escapes: 0,
      ops: 1,
      doneSeen: true,
      finishReason: 'stop',
      attempts: [{ model: 'm', warm: true, ops: 1, costUsd: 0, totalMs: 1000, hedged: false }],
      firstByteMs: 500,
      ...stats,
    },
    assertions: [],
    pass: true,
    ...extra,
  } as unknown as TurnRecord;
}

function rr(caseId: string, run: number, turns: TurnRecord[]): RunRecord {
  return { id: `${caseId}#${run}`, case: caseId, category: 'pattern', lang: 'en', run, model: 'm', startedAt: '', wallMs: 0, pass: true, turns, costUsd: 0 } as unknown as RunRecord;
}

const metaBase: RunMeta = {
  startedAt: '',
  args: {},
  model: 'm',
  fallbackModel: 'f',
  runsPerCase: 1,
  concurrency: 1,
  cases: 1,
  units: 1,
  catalogVersion: 'v',
  catalogEntries: 1,
  systemPromptChars: 1,
  systemPromptSha256: 'x',
  node: '24',
};

describe('residency', () => {
  test('passes on sg with Singapore say', () => {
    const v = view({ graph: sg, says: ['Everything stays in Singapore.'] });
    const res = evaluateTurn(v, turn({ residency: ['ap-southeast-1'] }), 'en', names, catalog);
    const r = pick(res, 'residency');
    assert.equal(r.length, 1);
    assert.equal(r[0].pass, true);
  });

  test('fails when graph also has Kuala Lumpur region', () => {
    const gr = g({
      groups: [
        { id: 'r', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null },
        { id: 'v', kind: 'vpc', label: 'VPC', parent: 'r' },
        { id: 'kl', kind: 'region', label: 'Kuala Lumpur (ap-southeast-3)', parent: null },
      ],
      nodes: [
        { id: 'db', product: 'rds', label: 'DB', group: 'v' },
        { id: 'app', product: 'ecs', label: 'App', group: 'v' },
        { id: 'dr', product: 'rds', label: 'DR DB', group: 'kl' },
      ],
      edges: [{ id: 'e1', from: 'app', to: 'db' }],
    });
    const v = view({ graph: gr, says: ['Everything stays in Singapore.'] });
    const res = evaluateTurn(v, turn({ residency: ['ap-southeast-1'] }), 'en', names, catalog);
    const r = pick(res, 'residency');
    assert.equal(r[0].pass, false);
    assert.ok(r[0].detail!.includes('Kuala Lumpur'));
  });

  test('fails on a say line with a data verb', () => {
    const v = view({
      graph: sg,
      ops: [
        { t: 'say', text: 'I will add OSS cross-region replication to Kuala Lumpur.' } as unknown as Op,
        { t: 'done', summary: 'ok' } as unknown as Op,
      ],
      says: [],
      stats: { ...baseStats, ops: 2 },
    });
    const res = evaluateTurn(v, turn({ residency: ['ap-southeast-1'] }), 'en', names, catalog);
    const r = pick(res, 'residency');
    assert.equal(r[0].pass, false);
  });

  test('passes on a negated mention', () => {
    const v = view({
      graph: sg,
      ops: [
        { t: 'say', text: 'Backups stay in Singapore instead of Kuala Lumpur.' } as unknown as Op,
        { t: 'done', summary: 'ok' } as unknown as Op,
      ],
      says: [],
      stats: { ...baseStats, ops: 2 },
    });
    const res = evaluateTurn(v, turn({ residency: ['ap-southeast-1'] }), 'en', names, catalog);
    const r = pick(res, 'residency');
    assert.equal(r[0].pass, true);
    assert.ok(r[0].detail!.includes('warn (not failed)'));
  });

  test('corrected narration passes with constraint-region repair finding', () => {
    const ops = [
      { t: 'say', text: 'Replicating the database to Kuala Lumpur for DR.' } as unknown as Op,
      { t: 'done', summary: 'a' } as unknown as Op,
      { t: 'say', text: 'Correction: all copies stay in Singapore.' } as unknown as Op,
      { t: 'done', summary: 'b' } as unknown as Op,
    ];
    const repair = { kind: 'repair' as const, model: 'm', findings: [{ code: 'constraint-region' as const, ids: [] as string[], msg: 'm', severity: 'error' as const, repaired: false }], ops: [] as Op[], content: '', usage: null, costUsd: 0, firstOpMs: null, totalMs: 0, doneSeen: true };
    const v = view({ graph: sg, ops, says: [], stats: { ...baseStats, ops: 2, repair } });
    const res = evaluateTurn(v, turn({ residency: ['ap-southeast-1'] }), 'en', names, catalog);
    const r = pick(res, 'residency');
    assert.equal(r[0].pass, true);
    assert.ok(r[0].detail!.includes('corrected by the repair turn'));
  });

  test('same ops with orphan-node repair finding still fails', () => {
    const ops = [
      { t: 'say', text: 'Replicating the database to Kuala Lumpur for DR.' } as unknown as Op,
      { t: 'done', summary: 'a' } as unknown as Op,
      { t: 'say', text: 'Correction: all copies stay in Singapore.' } as unknown as Op,
      { t: 'done', summary: 'b' } as unknown as Op,
    ];
    const repair = { kind: 'repair' as const, model: 'm', findings: [{ code: 'orphan-node' as const, ids: [] as string[], msg: 'm', severity: 'warn' as const, repaired: false }], ops: [] as Op[], content: '', usage: null, costUsd: 0, firstOpMs: null, totalMs: 0, doneSeen: true };
    const v = view({ graph: sg, ops, says: [], stats: { ...baseStats, ops: 2, repair } });
    const res = evaluateTurn(v, turn({ residency: ['ap-southeast-1'] }), 'en', names, catalog);
    const r = pick(res, 'residency');
    assert.equal(r[0].pass, false);
  });

  test('residencyNarration returns texts and corrected for corrected case', () => {
    const ops = [
      { t: 'say', text: 'Replicating the database to Kuala Lumpur for DR.' } as unknown as Op,
      { t: 'done', summary: 'a' } as unknown as Op,
      { t: 'say', text: 'Correction: all copies stay in Singapore.' } as unknown as Op,
      { t: 'done', summary: 'b' } as unknown as Op,
    ];
    const repair = { kind: 'repair' as const, model: 'm', findings: [{ code: 'constraint-region' as const, ids: [] as string[], msg: 'm', severity: 'error' as const, repaired: false }], ops: [] as Op[], content: '', usage: null, costUsd: 0, firstOpMs: null, totalMs: 0, doneSeen: true };
    const v = { ops, stats: { ...baseStats, ops: 2, repair } };
    const result = residencyNarration(v);
    assert.deepEqual(result.texts, ['Correction: all copies stay in Singapore.', 'b']);
    assert.deepEqual(result.corrected, ['Replicating the database to Kuala Lumpur for DR.', 'a']);
  });

  test('a users node labelled with a foreign country is not a residency finding', () => {
    const withUsers = g({
      groups: [
        { id: 'net', kind: 'external', label: 'Internet', parent: null },
        { id: 'r', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null },
        { id: 'v', kind: 'vpc', label: 'VPC', parent: 'r' },
      ],
      nodes: [
        { id: 'users', product: 'users', label: 'Australian customers', group: 'net' },
        { id: 'app', product: 'ecs', label: 'App', group: 'v' },
      ],
    });
    const ok = evaluateTurn(view({ graph: withUsers }), turn({ residency: ['ap-southeast-1'] }), 'en', names, catalog);
    assert.equal(pick(ok, 'residency')[0].pass, true);
    // the same label on a workload node still fails
    const onApp = g({ groups: withUsers.groups ? Object.values(withUsers.groups) as never : [], nodes: [{ id: 'app', product: 'ecs', label: 'Australia app', group: 'v' }] });
    const bad = evaluateTurn(view({ graph: onApp }), turn({ residency: ['ap-southeast-1'] }), 'en', names, catalog);
    assert.equal(pick(bad, 'residency')[0].pass, false);
  });

  test('retain residency yields one result; both expect and retain yields one', () => {
    const v = view({ graph: sg, says: ['Everything stays in Singapore.'] });
    const res1 = evaluateTurn(v, turn({}, { residency: ['ap-southeast-1'] }), 'en', names, catalog);
    assert.equal(pick(res1, 'residency').length, 1);

    const res2 = evaluateTurn(v, turn({ residency: ['ap-southeast-1'] }, { residency: ['ap-southeast-1'] }), 'en', names, catalog);
    assert.equal(pick(res2, 'residency').length, 1);
  });
});

describe('pins', () => {
  test('passes with matching constraint regions', () => {
    const v = view({ graph: sg, constraints: [{ text: 'Data stays in Singapore', regions: ['ap-southeast-1'] }] });
    const res = evaluateTurn(v, turn({ pins: { regions: ['ap-southeast-1'] } }), 'en', names, catalog);
    const r = pick(res, 'pins');
    assert.equal(r.length, 1);
    assert.equal(r[0].pass, true);
  });

  test('fails with no constraints', () => {
    const v = view({ graph: sg, constraints: [] });
    const res = evaluateTurn(v, turn({ pins: { regions: ['ap-southeast-1'] } }), 'en', names, catalog);
    const r = pick(res, 'pins');
    assert.equal(r[0].pass, false);
    assert.ok(r[0].detail!.includes('no machine-checkable constraint pinned'));
  });

  test('fails when allowed regions are not a subset of expected', () => {
    const v = view({ graph: sg, constraints: [{ text: 'x', regions: ['ap-southeast-1', 'ap-southeast-3'] }] });
    const res = evaluateTurn(v, turn({ pins: { regions: ['ap-southeast-1'] } }), 'en', names, catalog);
    const r = pick(res, 'pins');
    assert.equal(r[0].pass, false);
  });

  test('avoid pins: first passes, second fails', () => {
    const v = view({ graph: sg, constraints: [{ text: 'Avoid Kubernetes', avoid: ['ack', 'acs'] }] });
    const res = evaluateTurn(v, turn({ pins: { avoid: [['ack'], ['asm']] } }), 'en', names, catalog);
    const r = pick(res, 'pins');
    assert.equal(r.length, 2);
    assert.equal(r[0].pass, true);
    assert.equal(r[1].pass, false);
  });
});

describe('noAttach, linked, placement', () => {
  test('noAttach passes without attachTo, fails with it, fails without node', () => {
    const gNoAttach = g({
      groups: [{ id: 'v', kind: 'vpc', label: 'VPC', parent: null }],
      nodes: [
        { id: 'k', product: 'ack', label: 'K', group: 'v' },
        { id: 'd', product: 'dify-on-ack', label: 'D', group: 'v' },
      ],
    });
    const v1 = view({ graph: gNoAttach });
    const r1 = evaluateTurn(v1, turn({ noAttach: ['dify-on-ack'] }), 'en', names, catalog);
    const nr1 = pick(r1, 'attach');
    assert.equal(nr1[0].pass, true);

    const gAttached = g({
      groups: [{ id: 'v', kind: 'vpc', label: 'VPC', parent: null }],
      nodes: [
        { id: 'k', product: 'ack', label: 'K', group: 'v' },
        { id: 'd', product: 'dify-on-ack', label: 'D', group: 'v', attachTo: 'k' },
      ],
    });
    const v2 = view({ graph: gAttached });
    const r2 = evaluateTurn(v2, turn({ noAttach: ['dify-on-ack'] }), 'en', names, catalog);
    assert.equal(pick(r2, 'attach')[0].pass, false);

    const gNone = g({
      groups: [{ id: 'v', kind: 'vpc', label: 'VPC', parent: null }],
      nodes: [{ id: 'k', product: 'ack', label: 'K', group: 'v' }],
    });
    const v3 = view({ graph: gNone });
    const r3 = evaluateTurn(v3, turn({ noAttach: ['dify-on-ack'] }), 'en', names, catalog);
    const nr3 = pick(r3, 'attach');
    assert.equal(nr3[0].pass, false);
    assert.ok(nr3[0].detail!.includes('no dify-on-ack node'));
  });

  test('linked undirected passes either direction; directed only one way', () => {
    const gLinked = g({
      groups: [{ id: 'v', kind: 'vpc', label: 'VPC', parent: null }],
      nodes: [
        { id: 'k', product: 'ack', label: 'K', group: 'v' },
        { id: 'd', product: 'dify-on-ack', label: 'D', group: 'v' },
      ],
      edges: [{ id: 'e1', from: 'd', to: 'k' }],
    });
    const v1 = view({ graph: gLinked });
    const r1 = evaluateTurn(v1, turn({ linked: [{ from: ['ack'], to: ['dify-on-ack'] }] }), 'en', names, catalog);
    assert.equal(pick(r1, 'linked')[0].pass, true);

    const gRev = g({
      groups: [{ id: 'v', kind: 'vpc', label: 'VPC', parent: null }],
      nodes: [
        { id: 'k', product: 'ack', label: 'K', group: 'v' },
        { id: 'd', product: 'dify-on-ack', label: 'D', group: 'v' },
      ],
      edges: [{ id: 'e1', from: 'k', to: 'd' }],
    });
    const v2 = view({ graph: gRev });
    const r2 = evaluateTurn(v2, turn({ linked: [{ from: ['ack'], to: ['dify-on-ack'] }] }), 'en', names, catalog);
    assert.equal(pick(r2, 'linked')[0].pass, true);

    const r3 = evaluateTurn(v2, turn({ linked: [{ from: ['ack'], to: ['dify-on-ack'], directed: true }] }), 'en', names, catalog);
    assert.equal(pick(r3, 'linked')[0].pass, true);

    const r4 = evaluateTurn(v1, turn({ linked: [{ from: ['ack'], to: ['dify-on-ack'], directed: true }] }), 'en', names, catalog);
    assert.equal(pick(r4, 'linked')[0].pass, false);
  });

  test('directed linked esa -> anti-ddos-proxy fails with reversed edge', () => {
    const gEdge = g({
      groups: [{ id: 'v', kind: 'vpc', label: 'VPC', parent: null }],
      nodes: [
        { id: 'esa', product: 'esa', label: 'ESA', group: 'v' },
        { id: 'ddos', product: 'anti-ddos-proxy', label: 'DDoS', group: 'v' },
      ],
      edges: [{ id: 'e1', from: 'ddos', to: 'esa' }],
    });
    const v = view({ graph: gEdge });
    const res = evaluateTurn(v, turn({ linked: [{ from: ['esa'], to: ['anti-ddos-proxy'], directed: true }] }), 'en', names, catalog);
    assert.equal(pick(res, 'linked')[0].pass, false);
  });

  test('placement passes on sg, fails when vpc node in region group, oss in region ok', () => {
    const v1 = view({ graph: sg });
    const r1 = evaluateTurn(v1, turn({ placement: true }), 'en', names, catalog);
    assert.equal(pick(r1, 'placement')[0].pass, true);

    const gBad = g({
      groups: [
        { id: 'r', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null },
        { id: 'v', kind: 'vpc', label: 'VPC', parent: 'r' },
      ],
      nodes: [
        { id: 'db', product: 'rds', label: 'DB', group: 'r' },
        { id: 'app', product: 'ecs', label: 'App', group: 'v' },
      ],
      edges: [{ id: 'e1', from: 'app', to: 'db' }],
    });
    const v2 = view({ graph: gBad });
    const r2 = evaluateTurn(v2, turn({ placement: true }), 'en', names, catalog);
    const p2 = pick(r2, 'placement');
    assert.equal(p2[0].pass, false);
    assert.ok(p2[0].detail!.includes('db (rds)'));

    const gOss = g({
      groups: [
        { id: 'r', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null },
        { id: 'v', kind: 'vpc', label: 'VPC', parent: 'r' },
      ],
      nodes: [
        { id: 'db', product: 'rds', label: 'DB', group: 'v' },
        { id: 'app', product: 'ecs', label: 'App', group: 'v' },
        { id: 'oss', product: 'oss', label: 'Bucket', group: 'r' },
      ],
      edges: [{ id: 'e1', from: 'app', to: 'db' }],
    });
    const v3 = view({ graph: gOss });
    const r3 = evaluateTurn(v3, turn({ placement: true }), 'en', names, catalog);
    assert.equal(pick(r3, 'placement')[0].pass, true);
  });
});

describe('attachValid and the attach-invalid repair', () => {
  const before: never[] = [];
  const wb = (id: string) => ({ code: 'attach-host-missing', ids: [id], msg: `'${id}' attaches to 'k'`, severity: 'warn', repaired: false });
  test('an invalid attachment the repair turned into an edge passes, with a note', () => {
    const fix = { code: 'attach-invalid', ids: ['d', 'k'], msg: 'edge', severity: 'warn', repaired: true };
    const v = view({ stats: { ...baseStats, warningsBefore: [wb('d')], fixes: [fix] } as never });
    const r = pick(evaluateTurn(v, turn({}), 'en', names, catalog), 'attachValid')[0];
    assert.equal(r.pass, true);
    assert.match(r.detail ?? '', /repaired into an edge/);
  });
  test('an invalid attachment without that repair (Auto Scaling removed) still fails', () => {
    const v = view({ stats: { ...baseStats, warningsBefore: [wb('scale')], fixes: before } as never });
    assert.equal(pick(evaluateTurn(v, turn({}), 'en', names, catalog), 'attachValid')[0].pass, false);
  });
});

describe('format and rescue', () => {
  test('rescued format passes', () => {
    const v = view({ stats: { ...baseStats, doneSeen: false, truncated: true, finalDone: true } });
    const res = evaluateTurn(v, turn({}), 'en', names, catalog);
    const r = pick(res, 'format');
    assert.equal(r[0].pass, true);
    assert.ok(r[0].detail!.includes('rescued by the continuation turn'));
  });

  test('truncated not rescued format fails', () => {
    const v = view({ stats: { ...baseStats, doneSeen: false, truncated: true, finalDone: false } });
    const res = evaluateTurn(v, turn({}), 'en', names, catalog);
    const r = pick(res, 'format');
    assert.equal(r[0].pass, false);
  });
});

describe('case and judge selection', () => {
  test('isConstraintCase detects retain, residency, but not plain include', () => {
    const c1 = { id: 'a', category: 'multiturn' as const, title: 'A', reference: 'r', turns: [{ ask: 'q' }, { ask: 'q', retain: { exclude: ['ack'] } }] } as EvalCase;
    assert.equal(isConstraintCase(c1), true);

    const c2 = { id: 'b', category: 'pattern' as const, title: 'B', reference: 'r', turns: [{ ask: 'q', expect: { residency: ['ap-southeast-1'] } }] } as EvalCase;
    assert.equal(isConstraintCase(c2), true);

    const c3 = { id: 'c', category: 'pattern' as const, title: 'C', reference: 'r', turns: [{ ask: 'q', expect: { include: [['ecs']] } }] } as EvalCase;
    assert.equal(isConstraintCase(c3), false);
  });

  test('pickJudgeRuns returns correct runs and skips short ones', () => {
    const cases = [
      { id: 'a', category: 'pattern' as const, title: 'A', reference: 'r', turns: [{ ask: 'q' }] } as EvalCase,
      { id: 'b', category: 'pattern' as const, title: 'B', reference: 'r', turns: [{ ask: 'q' }] } as EvalCase,
    ];
    const runs = [
      rr('a', 1, [tr({})]),
      rr('a', 2, [tr({})]),
      rr('a', 3, [tr({})]),
      rr('b', 1, [tr({})]),
      rr('b', 2, [tr({})]),
    ];
    const everyRun = new Set(['a']);
    const picked = pickJudgeRuns(cases, runs, everyRun);
    assert.deepEqual(picked.map((p) => p.rec.id), ['a#1', 'a#2', 'a#3', 'b#1']);
  });

  test('pickJudgeRuns skips run whose turns array is shorter than case turns', () => {
    const cases = [{ id: 'a', category: 'pattern' as const, title: 'A', reference: 'r', turns: [{ ask: 'q' }, { ask: 'q' }] } as EvalCase];
    const runs = [rr('a', 1, [tr({})])];
    const picked = pickJudgeRuns(cases, runs, new Set());
    assert.equal(picked.length, 0);
  });
});

describe('summary additions', () => {
  test('perceivedFirstByte sums earlier attempts plus firstByteMs', () => {
    const t = tr({
      attempts: [
        { model: 'm', totalMs: 8000, error: { code: 'first-byte-timeout' } },
        { model: 'f', totalMs: 9000 },
      ],
      firstByteMs: 1500,
    });
    assert.equal(perceivedFirstByte(t), 9500);
  });

  test('perceivedFirstByte returns null when firstByteMs is null', () => {
    const t = tr({ firstByteMs: null });
    assert.equal(perceivedFirstByte(t), null);
  });

  test('cutoffCause returns error code, token-limit, or model-stop', () => {
    const t1 = tr({ error: { code: 'idle-timeout' } });
    assert.equal(cutoffCause(t1), 'idle-timeout');

    const t2 = tr({ finishReason: 'length' });
    assert.equal(cutoffCause(t2), 'token-limit');

    const t3 = tr({ finishReason: 'stop' });
    assert.equal(cutoffCause(t3), 'model-stop (stop)');
  });

  test('summarize failover stats', () => {
    const t1 = tr({
      attempts: [
        { model: 'm', totalMs: 8000, error: { code: 'first-byte-timeout' } },
        { model: 'f', totalMs: 9000 },
      ],
      firstByteMs: 1500,
    });
    const t2 = tr({});
    const runs = [rr('a', 1, [t1, t2])];
    const cases = [{ id: 'a', category: 'pattern' as const, title: 'A', reference: 'r', turns: [{ ask: 'q' }, { ask: 'q' }] } as EvalCase];
    const s = summarize(runs, [], metaBase, cases);
    assert.equal(s.failover.turns, 1);
    assert.equal(s.failover.byReason['first-byte-timeout'], 1);
    assert.equal(s.failover.stalledAttemptMs.p50, 8000);
    assert.equal(s.latency.perceivedFirstByteMs.max, 9500);
  });

  test('summarize cutoff stats', () => {
    const t1 = tr({ truncated: true, finalDone: true, doneSeen: false, error: { code: 'idle-timeout' } });
    t1.pass = true;
    const t2 = tr({ truncated: true, finalDone: false, finishReason: 'stop' });
    t2.pass = false;
    const runs = [rr('a', 1, [t1, t2])];
    const cases = [{ id: 'a', category: 'pattern' as const, title: 'A', reference: 'r', turns: [{ ask: 'q' }, { ask: 'q' }] } as EvalCase];
    const s = summarize(runs, [], metaBase, cases);
    assert.equal(s.cutoff.truncated, 2);
    assert.equal(s.cutoff.rescued, 1);
    assert.equal(s.cutoff.notRescued, 1);
    assert.equal(s.cutoff.rescuedPassing, 1);
    assert.equal(s.cutoff.byCause['idle-timeout'], 1);
  });

  test('summarize constraints and repairs', () => {
    const t = tr({
      fixes: [
        { code: 'attach-invalid', ids: [], msg: '', severity: 'warn', repaired: true },
        { code: 'attach-invalid', ids: [], msg: '', severity: 'warn', repaired: true },
      ],
      repair: { kind: 'repair', model: 'm', findings: [{ code: 'constraint-region', ids: [], msg: 'x', severity: 'error', repaired: false }] },
      warningsBefore: [{ code: 'constraint-region', ids: [], msg: 'x', severity: 'error', repaired: false }],
    });
    t.assertions = [
      { type: 'residency', name: 'residency ap-southeast-1', pass: false, detail: 'region group' },
      { type: 'pins', name: 'pinned avoid ack', pass: true },
    ];
    const runs = [rr('a', 1, [t])];
    const cases = [{ id: 'a', category: 'pattern' as const, title: 'A', reference: 'r', turns: [{ ask: 'q' }] } as EvalCase];
    const s = summarize(runs, [], metaBase, cases);
    assert.equal(s.constraints.residency.checks, 1);
    assert.equal(s.constraints.residency.passed, 0);
    assert.equal(s.constraints.pins.passed, 1);
    assert.deepEqual(s.repairs.fixesByCode['attach-invalid'], { total: 2, turns: 1 });
    assert.equal(s.repairs.followUps.turns, 1);
    assert.equal(s.repairs.followUps.byFindingCode['constraint-region'], 1);
    assert.deepEqual(s.constraints.product.findingsBefore['constraint-region'], { total: 1, turns: 1, error: 1 });
  });

  test('summarize judge stats', () => {
    const runs = [rr('a', 1, [tr({})]), rr('a', 2, [tr({})])];
    runs[0].pass = true;
    runs[1].pass = true;
    const judges = [
      { case: 'a', run: 2, model: 'j', costUsd: 0, ms: 0, scores: { completeness: 4, accuracy: 4, rationality: 4, readability: 4, signoff: false, reasons: [], defects: ['d'] } } as unknown as JudgeRecord,
      { case: 'a', run: 1, model: 'j', costUsd: 0, ms: 0, scores: { completeness: 4, accuracy: 4, rationality: 4, readability: 4, signoff: true, reasons: [], defects: [] } } as unknown as JudgeRecord,
    ];
    const m = { ...metaBase, judgeAllRunsOf: ['a'] };
    const cases = [{ id: 'a', category: 'multiturn' as const, title: 'A', reference: 'r', turns: [{ ask: 'q' }] } as EvalCase];
    const s = summarize(runs, judges, m, cases);
    assert.equal(s.judge.judged, 1);
    assert.equal(s.judge.runsJudged, 2);
    assert.equal(s.cases[0].judge!.run, 1);
    assert.equal(s.judge.constraintRuns!.runs, 2);
    assert.equal(s.judge.constraintRuns!.signoff, 0.5);
    assert.equal(s.judge.constraintRuns!.noSignoff[0].run, 2);
  });
});
