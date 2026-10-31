// Phase 1 deterministic repairs (validate.repairGraph), tested on real failing outputs from the Phase 0 eval runs
// (test/fixtures/phase0-turns.json, extracted from eval/results) and on small graphs for the edge cases.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Graph, Warning } from '../src/types.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { createLineParser } from '../src/ndjson.ts';
import { applyOp, createCtx, emptyGraph, endTurn } from '../src/reducer.ts';
import { checkGraph, repairGraph, validateOp } from '../src/validate.ts';
import type { RepairOptions } from '../src/validate.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAT = loadCatalog();

interface Phase0Turn {
  ref: string;
  case: string;
  ask: string;
  content: string;
  says: string[];
  requirements: string[];
  start: Graph;
}
const TURNS: Phase0Turn[] = JSON.parse(readFileSync(path.join(HERE, 'fixtures/phase0-turns.json'), 'utf8')).turns;

function turn(run: string, index: number): Phase0Turn {
  const t = TURNS.find((x) => x.ref.endsWith(` ${run} T${index}`));
  if (!t) throw new Error(`fixture turn ${run} T${index} missing`);
  return t;
}

/** The turn's main stream applied to its start graph, as llm.streamTurn builds it. */
function rawOf(t: Phase0Turn): Graph {
  let g = t.start;
  const ctx = createCtx();
  let done = false;
  const p = createLineParser({
    onOp(raw) {
      const v = validateOp(raw, CAT, ctx);
      if (!v.op) return;
      if (v.op.t === 'done') done = true;
      g = applyOp(g, v.op, ctx).graph;
    },
  });
  p.push(t.content + '\n');
  p.end();
  if (!done) endTurn(g, ctx);
  return g;
}

function repaired(run: string, index: number, opts?: RepairOptions) {
  const raw = rawOf(turn(run, index));
  return { raw, ...repairGraph(raw, CAT, opts) };
}

const fixed = (ws: Warning[], code: string): Warning[] => ws.filter((w) => w.repaired && w.code === code);
const left = (ws: Warning[], code: string): Warning[] => ws.filter((w) => !w.repaired && w.code === code && w.severity !== 'info');
const edgeBetween = (g: Graph, from: string, to: string) => Object.values(g.edges).find((e) => e.from === from && e.to === to);
const W = (ops: unknown[]): Graph => {
  const ctx = createCtx();
  let g = emptyGraph();
  for (const raw of ops) {
    const v = validateOp(raw, CAT, ctx);
    if (v.op) g = applyOp(g, v.op, ctx).graph;
  }
  endTurn(g, ctx);
  return g;
};
const node = (id: string, product: string, group: string | null = null, extra: Record<string, unknown> = {}) => ({ t: 'node', id, product, label: id, group, ...extra });
const edge = (id: string, from: string, to: string, extra: Record<string, unknown> = {}) => ({ t: 'edge', id, from, to, ...extra });
const group = (id: string, kind: string, parent: string | null = null, label = id) => ({ t: 'group', id, kind, label, parent });

describe('repair (a): attachTo on a product that cannot attach becomes an edge', () => {
  test('need-06-cs-chatbot#1 (final): Dify on ACK attached to the ACK node -> edge ack -> dify', () => {
    const r = repaired('need-06-cs-chatbot#1', 0);
    assert.equal(r.raw.nodes.dify.attachTo, 'ack', 'the model attached dify-on-ack to its cluster');
    assert.equal(r.graph.nodes.dify.attachTo, undefined);
    assert.ok(edgeBetween(r.graph, 'ack', 'dify'), 'the host runs it: ack -> dify (same rank, host first)');
    assert.equal(fixed(r.warnings, 'attach-invalid').length, 1);
    assert.equal(left(r.warnings, 'orphan-node').length, 0, 'Phase 0 left dify as an orphan');
  });

  test('need-10-build-agents#1 (baseline): AI Guardrails attached to the AI gateway -> edge gateway -> guardrails', () => {
    const r = repaired('need-10-build-agents#1', 0);
    const gr = Object.values(r.graph.nodes).find((n) => n.product === 'ai-guardrails');
    const gw = Object.values(r.graph.nodes).find((n) => n.product === 'ai-gateway');
    assert.ok(gr && gw);
    assert.equal(gr.attachTo, undefined);
    assert.ok(edgeBetween(r.graph, gw.id, gr.id), 'rank 45 middleware before the unranked security lane');
    assert.equal(fixed(r.warnings, 'attach-invalid').length, 1);
  });

  test('need-07-analysts#2 (final): Smart Q attached to Quick BI -> edge quickbi -> smartq', () => {
    const r = repaired('need-07-analysts#2', 0);
    assert.equal(r.graph.nodes.smartq.attachTo, undefined);
    assert.ok(edgeBetween(r.graph, 'quickbi', 'smartq'), 'analytics lane before the saas lane');
    assert.equal(fixed(r.warnings, 'attach-invalid')[0].ids.join(','), 'smartq,quickbi');
  });

  test('no second edge when the two nodes are already connected; orientation follows the request path', () => {
    const g = W([group('r', 'region'), group('v', 'vpc', 'r'), node('app', 'ecs', 'v'), node('kms', 'kms', 'r', { attachTo: 'app' }), edge('e1', 'app', 'kms')]);
    const r = repairGraph(g, CAT);
    assert.equal(Object.keys(r.graph.edges).length, 1);
    assert.match(fixed(r.warnings, 'attach-invalid')[0].msg, /already connects/);
    const g2 = W([group('r', 'region'), group('v', 'vpc', 'r'), node('db', 'rds', 'v'), node('app', 'ecs', 'v', { attachTo: 'db' })]);
    assert.ok(edgeBetween(repairGraph(g2, CAT).graph, 'app', 'db'), 'compute (40) before the database (60), whichever was the host');
  });
});

describe('repair (b): an attachment with an invalid or missing host is re-hosted or removed', () => {
  test('edit-03-swap-k8s#1 (baseline): Auto Scaling left on ACK after the swap is removed', () => {
    const r = repaired('edit-03-swap-k8s#1', 0);
    assert.equal(r.raw.nodes.scaling.attachTo, 'app');
    assert.equal(r.raw.nodes.app.product, 'ack');
    assert.equal(r.graph.nodes.scaling, undefined);
    assert.ok(r.tombstones.some((t) => t.id === 'scaling'));
    const w = fixed(r.warnings, 'attach-host-missing');
    assert.equal(w.length, 1);
    assert.match(w[0].msg, /removed/);
    assert.equal(left(r.warnings, 'orphan-node').length, 0);
  });

  test('mt-01-avoid-k8s#2 T2 (baseline): two Auto Scaling nodes on SAE services are removed', () => {
    const r = repaired('mt-01-avoid-k8s#2', 2);
    assert.deepEqual(['scaling-core', 'scaling-user'].map((id) => r.raw.nodes[id].attachTo), ['svc-core', 'svc-user']);
    assert.deepEqual(['scaling-core', 'scaling-user'].map((id) => r.graph.nodes[id]), [undefined, undefined]);
    assert.equal(left(r.warnings, 'orphan-node').filter((w) => w.ids[0].startsWith('scaling')).length, 0);
  });

  test('mt-01-avoid-k8s#1 T3 (baseline): an Auto Scaling orphan carried over in memory (host gone) is removed', () => {
    const t = turn('mt-01-avoid-k8s#1', 3);
    assert.ok(t.start.nodes.scaling && !t.start.nodes.scaling.attachTo, 'Phase 0 committed it drawn on its own');
    const r = repairGraph(rawOf(t), CAT);
    assert.equal(r.graph.nodes.scaling, undefined);
    assert.match(fixed(r.warnings, 'attach-host-missing')[0].msg, /attachment with no host/);
  });

  test('re-hosted when exactly one valid host exists; kept on its own when there are several; removed when there is none; badges are kept', () => {
    const one = W([group('r', 'region'), group('v', 'vpc', 'r'), node('web', 'ecs', 'v'), node('svc', 'sae', 'v'), node('asg', 'ess', 'v', { attachTo: 'svc' })]);
    assert.equal(repairGraph(one, CAT).graph.nodes.asg.attachTo, 'web');
    const two = W([group('r', 'region'), group('v', 'vpc', 'r'), node('web', 'ecs', 'v'), node('api', 'ecs', 'v'), node('svc', 'sae', 'v'), node('asg', 'ess', 'v', { attachTo: 'svc' })]);
    const r2 = repairGraph(two, CAT);
    assert.ok(r2.graph.nodes.asg, 'two possible hosts and none chosen: Auto Scaling is kept, not silently deleted');
    assert.equal(r2.graph.nodes.asg.attachTo, undefined);
    const w2 = fixed(r2.warnings, 'attach-host-missing');
    assert.equal(w2.length, 1);
    assert.match(w2[0].msg, /drawn on its own/);
    assert.doesNotMatch(w2[0].msg, /no valid host|removed/, 'a host exists, so the message must not say there is none');
    const gone = W([group('r', 'region'), group('v', 'vpc', 'r'), node('svc', 'sae', 'v'), node('asg', 'ess', 'v', { attachTo: 'svc' })]);
    const rg = repairGraph(gone, CAT);
    assert.equal(rg.graph.nodes.asg, undefined, 'no host at all: removed');
    assert.match(fixed(rg.warnings, 'attach-host-missing')[0].msg, /no valid host in the diagram, so it was removed/);
    const orphan = W([group('r', 'region'), group('v', 'vpc', 'r'), node('web', 'ecs', 'v'), node('asg', 'ess', 'v')]);
    assert.equal(repairGraph(orphan, CAT).graph.nodes.asg.attachTo, 'web', 'an edge-less attachment finds its only host');
    const waf = W([group('r', 'region'), group('v', 'vpc', 'r'), node('app', 'ecs', 'v'), node('waf', 'waf', 'v', { attachTo: 'ghost' })]);
    const rw = repairGraph(waf, CAT);
    assert.ok(rw.graph.nodes.waf, 'WAF is a badge, not an attachment: drawn on its own rather than removed');
    assert.equal(rw.graph.nodes.waf.attachTo, undefined);
  });
});

describe('repair (c): VPC resources without a VPC group get one', () => {
  test('pat-04-rag#1 (final): Milvus in a region-only diagram gets a VPC inside the region group', () => {
    const r = repaired('pat-04-rag#1', 0);
    assert.equal(Object.values(r.raw.groups).filter((g) => g.kind === 'vpc').length, 0);
    assert.deepEqual(r.graph.groups.vpc, { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'sg' });
    assert.equal(r.graph.nodes.vector.group, 'vpc');
    const w = fixed(r.warnings, 'missing-group');
    assert.equal(w.length, 1);
    assert.ok(w[0].ids.includes('vpc') && w[0].ids.includes('vector'));
    assert.equal(checkGraph(r.graph, CAT).filter((x) => x.code === 'missing-group').length, 0);
  });

  test('pat-10-security-baseline#2 (final): no groups at all -> a region group (default or pinned region) and a VPC', () => {
    const r = repaired('pat-10-security-baseline#2', 0);
    assert.deepEqual(r.graph.groups.region, { id: 'region', kind: 'region', label: 'Singapore (ap-southeast-1)', parent: null });
    assert.equal(r.graph.groups.vpc.parent, 'region');
    assert.equal(r.graph.nodes.fw.group, 'vpc');
    const tokyo = repaired('pat-10-security-baseline#2', 0, { constraints: [{ text: 'Stay in Tokyo', regions: ['ap-northeast-1'] }] });
    assert.equal(tokyo.graph.groups.region.label, 'Tokyo (ap-northeast-1)');
  });

  test('mt-04-budget#3 T0 (baseline): RDS drawn in the region group moves into a new VPC there', () => {
    const r = repaired('mt-04-budget#3', 0);
    assert.equal(r.graph.groups[r.graph.nodes.db.group as string].kind, 'vpc');
    assert.equal(r.graph.groups[r.graph.nodes.db.group as string].parent, 'sg');
  });

  test('with several region groups, the pinned region wins, else the one holding the resources', () => {
    const g = W([group('sg', 'region', null, 'Singapore (ap-southeast-1)'), group('kl', 'region', null, 'Kuala Lumpur (ap-southeast-3)'), node('db', 'rds', 'kl'), node('oss', 'oss', 'sg')]);
    assert.equal(repairGraph(g, CAT).graph.groups.vpc.parent, 'kl');
    const flat = W([group('sg', 'region', null, 'Singapore (ap-southeast-1)'), group('kl', 'region', null, 'Kuala Lumpur (ap-southeast-3)'), node('db', 'rds')]);
    assert.equal(repairGraph(flat, CAT, { constraints: [{ text: 'KL only', regions: ['ap-southeast-3'] }] }).graph.groups.vpc.parent, 'kl');
    assert.equal(repairGraph(flat, CAT).graph.groups.vpc.parent, 'sg', 'no pinned region and no hint: the first region group');
  });
});

describe('repair (d): the Edge column follows the request path', () => {
  test('pat-12-ecommerce-security#1 (baseline): users -> anti-DDoS -> ESA -> ALB becomes users -> ESA -> anti-DDoS -> ALB; edge ids kept', () => {
    const r = repaired('pat-12-ecommerce-security#1', 0);
    const ids = Object.keys(r.raw.edges).sort();
    assert.deepEqual(Object.keys(r.graph.edges).sort(), ids, 'no edge added or removed: the canvas animates by id');
    const at = (id: string) => [r.graph.edges[id].from, r.graph.edges[id].to];
    assert.deepEqual(at('e-users-ddos'), ['users', 'esa']);
    assert.deepEqual(at('e-ddos-esa'), ['esa', 'ddos']);
    assert.deepEqual(at('e-esa-alb'), ['ddos', 'alb']);
    assert.deepEqual(at('e-esa-media'), ['esa', 'media'], "ESA keeps its own OSS origin");
    assert.equal(left(r.warnings, 'path-order').length, 0);
    assert.equal(fixed(r.warnings, 'path-order').length, 1);
  });

  test('ho-ddos-game-login#1 (held-out baseline): the same inversion in front of an NLB', () => {
    const r = repaired('ho-ddos-game-login#1', 0);
    const at = (id: string) => [r.graph.edges[id].from, r.graph.edges[id].to];
    assert.deepEqual([at('e-players-antiddos'), at('e-antiddos-esa'), at('e-esa-nlb')], [['players', 'esa'], ['esa', 'antiddos'], ['antiddos', 'nlb']]);
  });

  test('a fully reversed three-hop chain is sorted; inversions outside the Edge column are left for the model', () => {
    const g = W([
      node('users', 'users'),
      node('waf', 'waf'),
      node('ddos', 'anti-ddos-proxy'),
      node('esa', 'esa'),
      node('alb', 'alb'),
      edge('e1', 'users', 'waf'),
      edge('e2', 'waf', 'ddos'),
      edge('e3', 'ddos', 'esa'),
      edge('e4', 'esa', 'alb'),
    ]);
    const r = repairGraph(g, CAT, { keepInline: ['waf'] });
    const chain = ['e1', 'e2', 'e3', 'e4'].map((id) => `${r.graph.edges[id].from}>${r.graph.edges[id].to}`);
    assert.deepEqual(chain.sort(), ['ddos>waf', 'esa>ddos', 'users>esa', 'waf>alb'].sort());
    const back = W([group('r', 'region'), group('v', 'vpc', 'r'), node('alb', 'alb', 'v'), node('app', 'ecs', 'v'), edge('x', 'app', 'alb')]);
    const rb = repairGraph(back, CAT);
    assert.deepEqual([rb.graph.edges.x.from, rb.graph.edges.x.to], ['app', 'alb']);
    assert.equal(left(rb.warnings, 'path-order').length, 1);
  });
});

describe('repair (e): orphans with exactly one possible partner are connected', () => {
  test('ho-budget-ha#1 T2 (held-out baseline): an edge-less DNS gets a resolve edge from the only client', () => {
    const r = repaired('ho-budget-ha#1', 2);
    const e = edgeBetween(r.graph, 'users', 'dns');
    assert.ok(e);
    assert.equal(e.kind, 'resolve');
    assert.equal(left(r.warnings, 'orphan-node').length, 0);
  });

  test('mt-04-budget#3 T2 (baseline): an edge-less database and search engine next to the only compute node', () => {
    const r = repaired('mt-04-budget#3', 2);
    assert.ok(edgeBetween(r.graph, 'app', 'db') && edgeBetween(r.graph, 'app', 'search'));
    assert.equal(fixed(r.warnings, 'orphan-node').length, 2);
  });

  test('ko-mt-01-avoid-k8s#3 T0 (baseline): ambiguous orphans (13 SAE services to choose from) are left for the model', () => {
    const r = repaired('ko-mt-01-avoid-k8s#3', 0);
    assert.deepEqual(left(r.warnings, 'orphan-node').map((w) => w.ids[0]).sort(), ['nacos', 'svc-analytics', 'svc-promo']);
    assert.equal(fixed(r.warnings, 'orphan-node').length, 0);
  });
});

describe('repairs on every fixture turn', () => {
  test('never mutate the input and are idempotent', () => {
    for (const t of TURNS) {
      const raw = rawOf(t);
      const snap = JSON.stringify(raw);
      const r = repairGraph(raw, CAT);
      assert.equal(JSON.stringify(raw), snap, t.ref);
      const again = repairGraph(r.graph, CAT);
      assert.equal(again.warnings.filter((w) => w.repaired).length, 0, `${t.ref}: ${again.warnings.filter((w) => w.repaired).map((w) => w.msg).join(' | ')}`);
      assert.deepEqual(again.graph, r.graph, t.ref);
    }
  });
});

describe('idempotence: a VPC the repair creates also takes the zone and subnet groups that were outside every VPC (review: 1007 of 4000 random graphs)', () => {
  test('repairing the output again changes nothing, and the zone group sits in the VPC the first pass created', () => {
    // VPC resources, a zone group at the root and a subnet group at the root, and no VPC group at all
    const g = W([group('r', 'region'), group('za', 'zone'), group('sn', 'subnet'), node('app', 'ecs', 'za'), node('db', 'rds', 'sn')]);
    const r1 = repairGraph(g, CAT);
    const vpc = Object.values(r1.graph.groups).find((x) => x.kind === 'vpc');
    assert.ok(vpc, 'repair (c) created a VPC');
    assert.equal(r1.graph.groups.za.parent, vpc.id, 'the zone group moved into it in the same pass');
    assert.equal(r1.graph.groups.sn.parent, vpc.id);
    const r2 = repairGraph(r1.graph, CAT);
    assert.deepEqual(r2.graph, r1.graph);
    assert.equal(r2.warnings.filter((w) => w.repaired).length, 0, r2.warnings.filter((w) => w.repaired).map((w) => w.msg).join(' | '));
  });
});
