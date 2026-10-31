// Lane-grid layout tests: replays the recorded model streams through parse -> validate -> apply -> repair -> layout,
// in 200 ms batches as the canvas does, and measures how far cards move between consecutive states.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLineParser } from '../src/ndjson.ts';
import { applyOp, cloneCtx, createCtx, emptyGraph, endTurn } from '../src/reducer.ts';
import type { ApplyCtx } from '../src/reducer.ts';
import { repairGraph, validateOp } from '../src/validate.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { GEOMETRY, cardBounds, layoutDiff, layoutGraph, solutionLane, unrelatedMoves } from '../src/layout.ts';
import type { LayoutState, Rect } from '../src/layout.ts';
import type { Graph, Op } from '../src/types.ts';

const catalog = loadCatalog();
const STREAMS = JSON.parse(readFileSync(new URL('../../../research/probes/streams.json', import.meta.url), 'utf8')) as {
  streams: Array<{ label: string; lineTimes: Array<[number, string]> }>;
};
const ID_MAP = JSON.parse(readFileSync(new URL('./fixtures/probe-id-map.json', import.meta.url), 'utf8')) as Record<string, string>;
const BATCH_MS = 200;

const mapProbe = (raw: unknown): unknown => {
  if (!raw || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...o };
  if (typeof o.product === 'string' && Object.hasOwn(ID_MAP, o.product)) out.product = ID_MAP[o.product];
  if (Array.isArray(o.products)) out.products = o.products.map((p) => (typeof p === 'string' && Object.hasOwn(ID_MAP, p) ? ID_MAP[p] : p));
  return out;
};

interface Session {
  graph: Graph;
  ctx: ApplyCtx;
  layout?: LayoutState;
}

interface BatchStat {
  ops: number;
  moved: string[];
  /** Moved cards whose block gained, lost or re-slotted no card in this batch (the stability target is 0). */
  unrelated: string[];
  entered: string[];
  exited: string[];
  ms: number;
}

function replay(label: string, from?: Session, lines?: Array<[number, string]>): { session: Session; batches: BatchStat[]; layouts: LayoutState[] } {
  const stream = lines ?? STREAMS.streams.find((s) => s.label === label)?.lineTimes;
  assert.ok(stream, `stream ${label}`);
  const s: Session = from ? { graph: from.graph, ctx: cloneCtx(from.ctx), layout: from.layout } : { graph: emptyGraph(), ctx: createCtx() };
  const batches: BatchStat[] = [];
  const layouts: LayoutState[] = [];
  let pending: Op[] = [];
  const flush = (): void => {
    if (!pending.length) return;
    let changed = false;
    for (const op of pending) {
      const r = applyOp(s.graph, op, s.ctx);
      if (r.graph !== s.graph) changed = true;
      s.graph = r.graph;
    }
    const n = pending.length;
    pending = [];
    if (!changed) return;
    const t0 = performance.now();
    const next = layoutGraph(repairGraph(s.graph, catalog).graph, catalog, s.layout);
    const ms = performance.now() - t0;
    const d = layoutDiff(s.layout, next);
    batches.push({ ops: n, moved: d.moved, unrelated: s.layout ? unrelatedMoves(s.layout, next, d.moved) : [], entered: d.entered, exited: d.exited, ms });
    layouts.push(next);
    s.layout = next;
  };
  let batchStart = -Infinity;
  let now = 0;
  const parser = createLineParser({
    onOp(raw) {
      if (now - batchStart > BATCH_MS) {
        flush();
        batchStart = now;
      }
      const v = validateOp(mapProbe(raw), catalog, s.ctx);
      if (v.op) pending.push(v.op);
    },
  });
  for (const [ms, line] of stream) {
    now = ms;
    parser.push(line + '\n');
  }
  parser.end();
  flush();
  const end = endTurn(s.graph, s.ctx);
  s.graph = end.graph;
  return { session: s, batches, layouts };
}

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const inside = (a: Rect, b: Rect): boolean => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;

function assertGeometry(l: LayoutState, where: string): void {
  const cards = Object.values(l.cards);
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) assert.ok(!overlaps(cards[i], cards[j]), `${where}: cards ${cards[i].id} and ${cards[j].id} overlap`);
    const c = cards[i];
    assert.equal(c.w, GEOMETRY.cardW);
    assert.equal(c.h, GEOMETRY.cardH);
    const f = l.frames[c.frame];
    assert.ok(f, `${where}: frame ${c.frame} of ${c.id}`);
    if (c.boundary) assert.ok(c.x >= f.x && c.x + c.w <= f.x + f.w && c.y < f.y && c.y + c.h > f.y, `${where}: boundary card ${c.id} straddles the VPC top edge`);
    else assert.ok(inside(c, f), `${where}: card ${c.id} inside frame ${c.frame}`);
  }
  for (const f of Object.values(l.frames)) {
    if (f.parent) assert.ok(inside(f, l.frames[f.parent]), `${where}: frame ${f.id} inside ${f.parent}`);
  }
  const roots = Object.values(l.frames).filter((f) => !f.parent);
  for (let i = 0; i < roots.length; i++) for (let j = i + 1; j < roots.length; j++) assert.ok(!overlaps(roots[i], roots[j]), `${where}: root frames ${roots[i].id} and ${roots[j].id} overlap`);
  for (const b of Object.values(l.badges)) assert.ok(l.cards[b.host]?.badges.includes(b.id), `${where}: badge ${b.id} listed on host ${b.host}`);
}

let F: ReturnType<typeof replay>;

test('F initial diagram: every batch lays out without overlaps; only same-block siblings move', (t) => {
  F = replay('F_max_nothink');
  const last = F.layouts[F.layouts.length - 1];
  F.layouts.forEach((l, i) => assertGeometry(l, `F batch ${i}`));
  assert.equal(last.mode, 'architecture');
  // the repaired F graph: ecs-a spans zones a and b once; WAF is a badge on ESA, Auto Scaling an attachment on ECS
  assert.deepEqual(last.cards['ecs-a'].zones, ['a', 'b']);
  assert.ok(last.cards['ecs-a'].span && last.cards['ecs-a'].span.x1 - last.cards['ecs-a'].span.x0 > 2 * GEOMETRY.cardW);
  assert.equal(last.badges.waf?.host, 'esa');
  assert.equal(last.badges.asg?.as, 'attachment');
  assert.ok(!last.cards.waf && !last.cards.asg);
  assert.equal(last.cards.nat.boundary, true);
  for (const id of ['oss', 'model-studio', 'sls', 'arms', 'cloudmonitor']) assert.equal(last.frames[last.cards[id].frame].kind, 'lane', `${id} sits in a regional lane block`);
  assert.equal(last.frames[last.cards['security-center'].frame].kind, 'account');
  const unrelated = F.batches.reduce((s, b) => s + b.unrelated.length, 0);
  const moved = F.batches.reduce((s, b) => s + b.moved.length, 0);
  t.diagnostic(`F: ${F.batches.length} batches, ${moved} card moves in total (all within the mover's own block), ${unrelated} unrelated; final ${Object.keys(last.cards).length} cards, ${last.width}x${last.height}px`);
  assert.equal(unrelated, 0);
});

for (const label of ['B2_followup_waf_nothink', 'B3_k8s', 'B4_dw', 'B5_drop_ai']) {
  test(`${label}: follow-up edit moves no unrelated card`, (t) => {
    const r = replay(label, F.session);
    r.layouts.forEach((l, i) => assertGeometry(l, `${label} batch ${i}`));
    const moved = r.batches.flatMap((b) => b.moved);
    const unrelated = r.batches.flatMap((b) => b.unrelated);
    t.diagnostic(`${label}: ${r.batches.length} batches; moved ${moved.length} (${[...new Set(moved)].join(', ') || 'none'}); unrelated ${unrelated.length}; entered ${r.batches.flatMap((b) => b.entered).join(', ') || 'none'}; exited ${r.batches.flatMap((b) => b.exited).join(', ') || 'none'}`);
    assert.deepEqual(unrelated, []);
    if (label === 'B4_dw' || label === 'B5_drop_ai' || label === 'B2_followup_waf_nothink') assert.deepEqual(moved, []);
    const last = r.layouts[r.layouts.length - 1] ?? F.session.layout!;
    if (label === 'B4_dw') for (const id of ['maxcompute', 'dataworks', 'quick-bi']) assert.ok(last.cards[id], `${id} placed`);
    if (label === 'B5_drop_ai') assert.ok(!last.cards['model-studio']);
    if (label === 'B3_k8s') {
      assert.ok(last.cards.ack && !last.cards['ecs-a'] && !last.cards['ack-a'] && !last.cards['ack-b']);
      assert.deepEqual(last.cards.ack.zones, ['a', 'b']);
    }
  });
}

test('other recorded diagrams (E, G, H) lay out without overlaps and with zero unrelated moves', (t) => {
  for (const label of ['E_flash_default', 'G_max_budget1k', 'H_flash_nothink']) {
    const r = replay(label);
    r.layouts.forEach((l, i) => assertGeometry(l, `${label} batch ${i}`));
    const unrelated = r.batches.flatMap((b) => b.unrelated);
    const last = r.layouts[r.layouts.length - 1];
    t.diagnostic(`${label}: ${r.batches.length} batches, ${r.batches.reduce((s, b) => s + b.moved.length, 0)} moves, ${unrelated.length} unrelated, ${Object.keys(last.cards).length} cards, ${last.width}x${last.height}px`);
    assert.deepEqual(unrelated, []);
  }
});

test('deterministic: same graph, catalog and prev give identical states; a fresh layout matches itself', () => {
  const g = repairGraph(F.session.graph, catalog).graph;
  assert.deepEqual(layoutGraph(g, catalog), layoutGraph(g, catalog));
  assert.deepEqual(layoutGraph(g, catalog, F.session.layout), layoutGraph(g, catalog, F.session.layout));
  // insertion order of the input records does not matter for a fresh layout
  const shuffled: Graph = { ...g, nodes: Object.fromEntries(Object.entries(g.nodes).reverse()) };
  const a = layoutGraph(g, catalog);
  const b = layoutGraph(shuffled, catalog);
  for (const id of Object.keys(a.cards)) {
    if (a.cards[id].slot.endsWith('#span')) continue;
    assert.equal(a.cards[id].slot, b.cards[id].slot, `slot of ${id}`);
  }
});

const op = (o: Record<string, unknown>): Op => {
  const v = validateOp(o, catalog);
  assert.ok(v.op, JSON.stringify(o));
  return v.op;
};

function build(ops: Op[], start: Graph = emptyGraph()): Graph {
  let g = start;
  const ctx = createCtx();
  for (const o of ops) g = applyOp(g, o, ctx).graph;
  return endTurn(g, ctx).graph;
}

test('sticky slots: a new card goes to its catalog rank, later siblings shift, removal compacts', () => {
  const base = build([
    op({ t: 'group', id: 'r', kind: 'region', label: 'Region' }),
    op({ t: 'group', id: 'v', kind: 'vpc', label: 'VPC', parent: 'r' }),
    op({ t: 'node', id: 'db', product: 'polardb', label: 'Orders DB', group: 'v' }),
    op({ t: 'node', id: 'mq', product: 'rocketmq', label: 'Events', group: 'v' }),
  ]);
  const l1 = layoutGraph(base, catalog);
  assert.deepEqual(l1.slots['v#data'], ['db', 'mq']);
  // cache sorts before database: inserted on top, db and mq shift one row, nothing else moves
  const g2 = build([op({ t: 'node', id: 'cache', product: 'tair', label: 'Cache', group: 'v' })], base);
  const l2 = layoutGraph(g2, catalog, l1);
  assert.deepEqual(l2.slots['v#data'], ['cache', 'db', 'mq']);
  assert.equal(l2.cards.db.y - l1.cards.db.y, GEOMETRY.cardH + GEOMETRY.gapY);
  // a manual re-order survives: prev order is kept even when catalog rank would differ
  const l2b = layoutGraph(g2, catalog, { ...l2, slots: { ...l2.slots, 'v#data': ['db', 'cache', 'mq'] } });
  assert.deepEqual(l2b.slots['v#data'], ['db', 'cache', 'mq']);
  // removal compacts the slot
  const g3 = build([op({ t: 'remove', id: 'db' })], g2);
  const l3 = layoutGraph(g3, catalog, l2);
  assert.deepEqual(l3.slots['v#data'], ['cache', 'mq']);
  assert.equal(l3.cards.mq.y, l2.cards.db.y);
  assert.equal(l3.cards.cache.y, l2.cards.cache.y);
});

test('attachTo renders as a badge on the host; a zones[] node renders once across its zones', () => {
  const g = build([
    op({ t: 'group', id: 'r', kind: 'region', label: 'Region' }),
    op({ t: 'group', id: 'v', kind: 'vpc', label: 'VPC', parent: 'r' }),
    op({ t: 'group', id: 'za', kind: 'zone', label: 'Zone A', parent: 'v' }),
    op({ t: 'group', id: 'zb', kind: 'zone', label: 'Zone B', parent: 'v' }),
    op({ t: 'node', id: 'alb', product: 'alb', label: 'Web LB', group: 'v' }),
    op({ t: 'node', id: 'app', product: 'ecs', label: 'App', group: 'v', zones: ['a', 'b'] }),
    op({ t: 'node', id: 'waf', product: 'waf', label: 'WAF', attachTo: 'alb' }),
  ]);
  const l = layoutGraph(repairGraph(g, catalog).graph, catalog);
  assert.equal(l.badges.waf.host, 'alb');
  assert.equal(l.badges.waf.as, 'badge');
  assert.deepEqual(l.cards.alb.badges, ['waf']);
  assert.ok(!l.cards.waf);
  const app = l.cards.app;
  assert.deepEqual(app.zones, ['a', 'b']);
  assert.equal(app.span!.x0, l.frames.za.x);
  assert.equal(app.span!.x1, l.frames.zb.x + l.frames.zb.w);
  const b = cardBounds(l, 'alb')!;
  assert.ok(b.y < l.cards.alb.y, 'badge extends the host bounds');
});

test('solution map: recs-only answers use the Team | SaaS | Model service | Cloud resources lanes', () => {
  const g = build([
    op({ t: 'node', id: 'team-dev', product: 'users', label: 'Engineering team', group: null }),
    op({ t: 'rec', product: 'qoder', fit: 'primary', why: 'Coding agent for the team.' }),
    op({ t: 'rec', product: 'qwenwork', fit: 'complement', why: 'Workplace agent.' }),
    op({ t: 'rec', product: 'model-studio', fit: 'complement', why: 'Model APIs for custom agents.' }),
    op({ t: 'edge', id: 'e1', from: 'team-dev', to: 'qoder' }),
  ]);
  const l = layoutGraph(g, catalog);
  assert.equal(l.mode, 'solution');
  assert.deepEqual(Object.values(l.frames).map((f) => f.label), ['Team', 'SaaS', 'Model service', 'Cloud resources']);
  assert.equal(l.cards['rec:qoder'].frame, '~sol:saas');
  assert.equal(l.cards['rec:qoder'].fit, 'primary');
  assert.equal(l.cards['rec:model-studio'].frame, '~sol:model');
  assert.equal(l.cards['team-dev'].frame, '~sol:team');
  assert.equal(l.frames['~sol:cloud'].empty, true);
  assert.equal(solutionLane(catalog.byId.get('qwenwork')), 'saas');
  // primary first inside a lane
  assert.deepEqual(l.slots['~sol:saas#stack'], ['rec:qoder', 'rec:qwenwork']);
});

test('layout is fast enough to run on every 200 ms batch', (t) => {
  const g = repairGraph(F.session.graph, catalog).graph;
  const N = 300;
  let prev: LayoutState | undefined;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) prev = layoutGraph(g, catalog, prev);
  const ms = (performance.now() - t0) / N;
  t.diagnostic(`layoutGraph on the repaired F graph (${Object.keys(g.nodes).length} nodes): ${ms.toFixed(3)} ms per call`);
  assert.ok(ms < 5);
});
