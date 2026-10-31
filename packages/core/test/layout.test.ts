// Layout v2 gates and unit tests.
//
// Gates (Phase 1): two compact fixtures of real conversations are replayed op by op through validateOp, applyOp, the
// core display rule and repairGraph, exactly as the bench's trace does, and laid out frame by frame with the previous
// layout as `prev`:
//   - test/fixtures/replay/sessions.json: the Phase 0 final and baseline eval runs (extract-fixture.ts in
//     spikes/layout-bench/out/core-v2/);
//   - test/fixtures/replay/sessions-phase1.json: the Phase 1 full and held-out runs with the current prompt
//     (extract-fixture-p1.ts, same folder). Added after the review found that the Phase 0 sessions held no second VPC
//     in a region that already had a shelf, so the layout had been tuned without that case.
//   - Stability: follow-up turns make 0 unrelated moves; first turns stay at or under the measured count. The strict
//     measure (bystanderMoves) also counts a moved card the op did not name even when it changed slot or sits in a block
//     where something entered; the only bystanders allowed are on the frame that switches a solution map to an architecture.
//   - Legibility: with the canvas camera (fitCamera), titles render at 12 px or more at 1040x800 for every state with
//     up to 24 cards, and at 11 px or more at 880x720 for every state with up to 20 cards.
//   - Speed: a layout call takes under 2 ms for the largest fixture state (30 cards).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyOp, createCtx, emptyGraph, endTurn } from '../src/reducer.ts';
import { TEXT_LIMITS, repairGraph, validateOp } from '../src/validate.ts';
import { cardIds, displayGraph, touchedBy } from '../src/display.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { ARCH_X0, GEOMETRY, bystanderMoves, cardBounds, cardText, fitCamera, fitTitle, layoutDiff, layoutGraph, solutionLane, unrelatedMoves } from '../src/layout.ts';
import type { CanvasSize, LayoutState, MeasureText, Rect } from '../src/layout.ts';
import type { Catalog, CatalogEntry, Graph, GraphNode, Op } from '../src/types.ts';

const catalog = loadCatalog();
const G = GEOMETRY;
const ROW = G.cardH + G.gapY;

/** First-turn unrelated moves on the fixture, measured when the gate was set (2026-10-31). Lower it, never raise it. */
const FIRST_TURN_UNRELATED_MAX = 0;
/**
 * Strict bystander budgets on both fixtures (302 sessions, 6495 one-op batches), measured 2026-10-31 after the review. The
 * solution-map to architecture switch re-flows the whole diagram once (users and rec cards move 200 to 820 px): 3 switches
 * moved 10 cards the op did not name. Anywhere else the budget is 0. A same-slot sibling that shifts more than two rows
 * (a block re-columned on the shelf) happened 7 times. Lower these, never raise them.
 */
const SWITCH_BYSTANDERS_MAX = 10;
const FAR_SIBLING_MAX = 7;

// ---------- the replay fixture ----------

interface FixtureSession {
  id: string;
  case: string;
  base: string | null;
  turns: Array<{ raws: unknown[] }>;
}
interface Fixture {
  bases: Record<string, Graph>;
  sessions: FixtureSession[];
}
function loadFixture(file: string, tag: string): Fixture {
  const f = JSON.parse(readFileSync(new URL('./fixtures/replay/' + file, import.meta.url), 'utf8')) as Fixture;
  return { bases: Object.fromEntries(Object.entries(f.bases).map(([k, v]) => [tag + ':' + k, v])), sessions: f.sessions.map((x) => ({ ...x, base: x.base ? tag + ':' + x.base : null })) };
}
const PHASE0 = loadFixture('sessions.json', 'p0');
const PHASE1 = loadFixture('sessions-phase1.json', 'p1');
const FIXTURE: Fixture = { bases: { ...PHASE0.bases, ...PHASE1.bases }, sessions: [...PHASE0.sessions, ...PHASE1.sessions] };

interface Frame {
  kind: 'base' | 'mid' | 'commit';
  turn: number;
  first: boolean;
  display: Graph;
  /** The op that made a 'mid' frame. */
  op?: Op;
}

/** The bench's replay (spikes/layout-bench/src/trace.ts, one op per batch, repaired carry) on core modules only. */
function replay(s: FixtureSession): Frame[] {
  const frames: Frame[] = [];
  const ctx = createCtx();
  const base = s.base ? FIXTURE.bases[s.base] : null;
  let committed: Graph = base ?? emptyGraph();
  let shown: Graph | null = null;
  if (base) {
    frames.push({ kind: 'base', turn: -1, first: false, display: committed });
    shown = committed;
  }
  s.turns.forEach((turn, ti) => {
    let working = committed;
    const shownAtTurnStart = new Set(shown ? cardIds(shown) : []);
    const touched = new Set<string>();
    const first = ti === 0 && !base;
    for (const raw of turn.raws) {
      const op = validateOp(raw, catalog, ctx).op;
      if (!op) continue;
      if (op.t === 'node' || op.t === 'insert' || op.t === 'move') touched.add(op.id);
      else if (op.t === 'rec') touched.add(op.product);
      const res = applyOp(working, op, ctx);
      const changed = res.graph !== working;
      working = res.graph;
      if (!changed) continue;
      const drawn = shown ? new Set(cardIds(shown)) : undefined;
      const d = displayGraph(working, catalog, { turnOpen: true, drawn, shownAtTurnStart, touched });
      frames.push({ kind: 'mid', turn: ti, first, display: d.graph, op });
      shown = d.graph;
    }
    working = endTurn(working, ctx).graph;
    committed = repairGraph(working, catalog).graph;
    frames.push({ kind: 'commit', turn: ti, first, display: committed });
    shown = committed;
  });
  return frames;
}

interface Replayed {
  id: string;
  frames: Frame[];
  layouts: LayoutState[];
}

let cache: Replayed[] | null = null;
function replayed(): Replayed[] {
  if (cache) return cache;
  cache = FIXTURE.sessions.map((s) => {
    const frames = replay(s);
    const layouts: LayoutState[] = [];
    let prev: LayoutState | undefined;
    for (const f of frames) {
      prev = layoutGraph(f.display, catalog, prev);
      layouts.push(prev);
    }
    return { id: s.id, frames, layouts };
  });
  return cache;
}

const turnEnds = (): Array<{ id: string; turn: number; layout: LayoutState }> =>
  replayed().flatMap((r) => r.frames.map((f, i) => ({ f, l: r.layouts[i] })).filter((x) => x.f.kind === 'commit').map((x) => ({ id: r.id, turn: x.f.turn, layout: x.l })));

// ---------- geometry invariants ----------

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const inside = (a: Rect, b: Rect): boolean => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;

function assertGeometry(l: LayoutState, where: string): void {
  const cards = Object.values(l.cards);
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    for (let j = i + 1; j < cards.length; j++) assert.ok(!overlaps(c, cards[j]), `${where}: cards ${c.id} and ${cards[j].id} overlap`);
    assert.equal(c.w, G.cardW);
    assert.equal(c.h, G.cardH);
    assert.ok(!c.boundary && !c.span, `${where}: v2 never sets boundary or span (${c.id})`);
    const f = l.frames[c.frame];
    assert.ok(f, `${where}: frame ${c.frame} of ${c.id}`);
    assert.ok(inside(c, f), `${where}: card ${c.id} inside frame ${c.frame}`);
    // inside a VPC or a zone, badges and attachment pills stay inside the frame too
    if (f.kind === 'vpc' || f.kind === 'zone') assert.ok(inside(cardBounds(l, c.id)!, f), `${where}: ${c.id} with its badges inside ${f.kind} ${f.id}`);
  }
  for (const f of Object.values(l.frames)) {
    if (f.parent) assert.ok(inside(f, l.frames[f.parent]), `${where}: frame ${f.id} inside ${f.parent}`);
    if (f.kind === 'zone') assert.equal(l.frames[f.parent!].kind, 'vpc', `${where}: zone ${f.id} sits in a VPC`);
  }
  const roots = Object.values(l.frames).filter((f) => !f.parent);
  for (let i = 0; i < roots.length; i++) for (let j = i + 1; j < roots.length; j++) assert.ok(!overlaps(roots[i], roots[j]), `${where}: root frames ${roots[i].id} and ${roots[j].id} overlap`);
  for (const b of Object.values(l.badges)) assert.ok(l.cards[b.host]?.badges.includes(b.id), `${where}: badge ${b.id} listed on host ${b.host}`);
  const bb = l.bounds!;
  for (const r of [...Object.values(l.frames), ...cards, ...Object.values(l.badges)]) assert.ok(inside(r, bb), `${where}: inside bounds`);
  assert.equal(l.width, Math.round(bb.w));
  assert.equal(l.height, Math.round(bb.h));
}

// ---------- gates ----------

test('gate: replayed conversations make 0 unrelated moves in follow-ups, and first turns stay within budget', (t) => {
  const t0 = performance.now();
  const all = replayed();
  let batches = 0;
  let moved = 0;
  let firstUnrelated = 0;
  const followUnrelated: string[] = [];
  const firstList: string[] = [];
  for (const r of all) {
    for (let i = 1; i < r.frames.length; i++) {
      const f = r.frames[i];
      if (f.kind === 'base') continue;
      const prev = r.layouts[i - 1];
      const next = r.layouts[i];
      const d = layoutDiff(prev, next);
      const un = unrelatedMoves(prev, next, d.moved);
      batches++;
      moved += d.moved.length;
      if (f.first) {
        firstUnrelated += un.length;
        if (un.length) firstList.push(`${r.id} T${f.turn + 1}: ${un.join(', ')}`);
      } else followUnrelated.push(...un.map((id) => `${r.id} T${f.turn + 1}: ${id} ${d.displacement[id]}px`));
    }
  }
  t.diagnostic(`${all.length} sessions, ${batches} one-op batches, ${moved} moved cards; unrelated: first turns ${firstUnrelated}, follow-ups ${followUnrelated.length}; replay and layout ${Math.round(performance.now() - t0)} ms`);
  assert.deepEqual(followUnrelated, []);
  assert.ok(firstUnrelated <= FIRST_TURN_UNRELATED_MAX, `first-turn unrelated moves ${firstUnrelated} > ${FIRST_TURN_UNRELATED_MAX}: ${firstList.join(' | ')}`);
});

test('gate: strict bystanders — a moved card the op did not name is a bystander even when it changed slot (review: unrelatedMoves hid mode-switch jumps)', (t) => {
  const rows: string[] = [];
  const stat = { foreignSwitch: 0, foreignOther: 0, farSwitch: 0, farOther: 0, switches: 0, batches: 0 };
  for (const r of replayed()) {
    for (let i = 1; i < r.frames.length; i++) {
      const f = r.frames[i];
      if (f.kind === 'base') continue;
      const prev = r.layouts[i - 1];
      const next = r.layouts[i];
      const d = layoutDiff(prev, next);
      const subjects = f.op ? touchedBy(f.op).map((id) => (f.op!.t === 'rec' ? 'rec:' + id : id)) : [];
      const b = bystanderMoves(prev, next, d.moved, subjects);
      const sw = prev.mode !== next.mode;
      stat.batches++;
      if (sw) stat.switches++;
      stat[sw ? 'foreignSwitch' : 'foreignOther'] += b.foreign.length;
      stat[sw ? 'farSwitch' : 'farOther'] += b.farSibling.length;
      if (!sw && (b.foreign.length || b.farSibling.length)) rows.push(r.id + ' T' + (f.turn + 1) + ' ' + f.kind + ' ' + (f.op ? f.op.t : '') + ' foreign [' + b.foreign.join(',') + '] far [' + b.farSibling.map((id) => id + ' ' + d.displacement[id] + 'px').join(',') + ']');
    }
  }
  t.diagnostic(JSON.stringify(stat) + (rows.length ? ' | ' + rows.slice(0, 6).join(' | ') : ''));
  assert.equal(stat.foreignOther, 0, 'a card the op did not name moved, outside a mode switch: ' + rows.join(' | '));
  assert.ok(stat.foreignSwitch <= SWITCH_BYSTANDERS_MAX, 'mode-switch bystanders ' + stat.foreignSwitch + ' > ' + SWITCH_BYSTANDERS_MAX);
  assert.ok(stat.farOther <= FAR_SIBLING_MAX, 'same-slot siblings shifted by more than two rows: ' + stat.farOther + ' > ' + FAR_SIBLING_MAX + ': ' + rows.join(' | '));
});

test('gate: every replayed turn-end state is well formed (no overlaps; cards, zone frames and pills inside their frames)', () => {
  for (const s of turnEnds()) assertGeometry(s.layout, `${s.id} T${s.turn + 1}`);
});

test('gate: legibility with the canvas camera at 1040x800 (<= 24 cards: 12 px), 880x720 and 920x620 (<= 20 cards: 11 px; 920x620 is the real pane in a 1280x720 window)', (t) => {
  const check = (canvas: CanvasSize, maxCards: number, floor: number): void => {
    const misses: string[] = [];
    let states = 0;
    let pans = 0;
    let fitAllMiss = 0;
    let minPx = Infinity;
    for (const s of turnEnds()) {
      const n = Object.keys(s.layout.cards).length;
      if (n === 0 || n > maxCards) continue;
      states++;
      const cam = fitCamera(s.layout, canvas);
      const px = G.titlePx * cam.zoom;
      minPx = Math.min(minPx, px);
      if (cam.pan) pans++;
      const b = s.layout.bounds!;
      const fitAll = Math.min((canvas.w - 2 * G.fitPad) / b.w, (canvas.h - 2 * G.fitPad) / b.h, G.maxZoom);
      if (G.titlePx * fitAll < floor) fitAllMiss++;
      if (px < floor - 1e-9) misses.push(`${s.id} T${s.turn + 1} ${px.toFixed(2)}px`);
    }
    t.diagnostic(`${canvas.w}x${canvas.h}: ${states} states with 1-${maxCards} cards; min title ${minPx.toFixed(2)} px; ${pans} pan vertically; a fit-all view would put ${fitAllMiss} under ${floor} px`);
    assert.deepEqual(misses, []);
  };
  check({ w: 1040, h: 800 }, 24, 12);
  check({ w: 880, h: 720 }, 20, 11);
  check({ w: 920, h: 620 }, 20, 11);
});

test('gate: a layout call takes under 2 ms for the largest fixture state', (t) => {
  const largest = turnEnds().reduce((a, b) => (Object.keys(b.layout.cards).length > Object.keys(a.layout.cards).length ? b : a));
  const r = replayed().find((x) => x.id === largest.id)!;
  const g = r.frames.find((f) => f.kind === 'commit' && f.turn === largest.turn)!.display;
  const n = Object.keys(largest.layout.cards).length;
  assert.ok(n >= 25, `largest fixture state has ${n} cards`);
  const time = (withPrev: boolean): { p50: number; p95: number } => {
    const ms: number[] = [];
    let prev: LayoutState | undefined = withPrev ? largest.layout : undefined;
    for (let i = 0; i < 300; i++) {
      const t0 = performance.now();
      const l = layoutGraph(g, catalog, prev);
      ms.push(performance.now() - t0);
      if (withPrev) prev = l;
    }
    ms.sort((a, b) => a - b);
    return { p50: ms[150], p95: ms[285] };
  };
  // Wall-clock timing: other test files run in parallel under `npm test`, so a loaded machine can push one sample
  // over the bound. Take the best of 3 attempts; a real slowdown fails all of them.
  let fresh = time(false);
  let sticky = time(true);
  for (let attempt = 1; attempt < 3 && !(fresh.p95 < 2 && sticky.p95 < 2); attempt++) {
    const f = time(false);
    const k = time(true);
    if (f.p95 < fresh.p95) fresh = f;
    if (k.p95 < sticky.p95) sticky = k;
  }
  t.diagnostic(`${largest.id} T${largest.turn + 1}: ${n} cards; fresh p50 ${fresh.p50.toFixed(3)} p95 ${fresh.p95.toFixed(3)} ms; with prev p50 ${sticky.p50.toFixed(3)} p95 ${sticky.p95.toFixed(3)} ms`);
  assert.ok(fresh.p95 < 2 && sticky.p95 < 2);
});

// ---------- unit tests ----------

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

const VPC_OPS = (): Op[] => [op({ t: 'group', id: 'r', kind: 'region', label: 'Region' }), op({ t: 'group', id: 'v', kind: 'vpc', label: 'VPC', parent: 'r' })];

test('deterministic: same graph, catalog and prev give identical states, at any canvas size', () => {
  const s = replayed().find((r) => r.id.startsWith('final:pat-02-k8s'))!;
  const g = s.frames[s.frames.length - 1].display;
  assert.deepEqual(layoutGraph(g, catalog), layoutGraph(g, catalog));
  const prev = s.layouts[s.layouts.length - 2];
  assert.deepEqual(layoutGraph(g, catalog, prev), layoutGraph(g, catalog, prev, { canvas: { w: 880, h: 720 } }));
  const shuffled: Graph = { ...g, nodes: Object.fromEntries(Object.entries(g.nodes).reverse()) };
  const a = layoutGraph(g, catalog);
  const b = layoutGraph(shuffled, catalog);
  for (const id of Object.keys(a.cards)) assert.equal(a.cards[id].slot, b.cards[id].slot, `slot of ${id}`);
});

test('anchors: the request path is y = 0, the region starts at x = 0 and the width is GEOMETRY.archW with Clients', () => {
  const g = build([
    ...VPC_OPS(),
    op({ t: 'node', id: 'users', product: 'users', label: 'Shoppers', group: null }),
    op({ t: 'node', id: 'esa', product: 'esa', label: 'ESA', group: null }),
    op({ t: 'node', id: 'alb', product: 'alb', label: 'Web LB', group: 'v' }),
    op({ t: 'node', id: 'app', product: 'ecs', label: 'App', group: 'v' }),
    op({ t: 'node', id: 'db', product: 'polardb', label: 'Orders DB', group: 'v' }),
    op({ t: 'node', id: 'oss', product: 'oss', label: 'Images', group: 'r' }),
  ]);
  const l = layoutGraph(repairGraph(g, catalog).graph, catalog);
  for (const id of ['users', 'esa', 'alb', 'app', 'db']) assert.equal(l.cards[id].y, 0, `${id} on the path row`);
  assert.equal(l.frames.r.x, 0);
  assert.equal(l.bounds!.x, ARCH_X0);
  assert.equal(l.width, G.archW);
  assert.equal(l.version, 2);
  assert.ok(l.cards.alb.x < l.cards.app.x && l.cards.app.x < l.cards.db.x, 'ingress | compute | data');
  assert.equal(l.frames[l.cards.oss.frame].kind, 'lane');
  assert.ok(l.cards.oss.y > l.frames.v.y + l.frames.v.h, 'the shelf sits below the VPC');
});

test('sticky slots: a tier grows upwards, so a new card moves only its own tier; removal compacts the slot', () => {
  const base = build([...VPC_OPS(), op({ t: 'node', id: 'db', product: 'polardb', label: 'Orders DB', group: 'v' }), op({ t: 'node', id: 'mq', product: 'rocketmq', label: 'Events', group: 'v' }), op({ t: 'node', id: 'oss', product: 'oss', label: 'Files', group: 'r' })]);
  const l1 = layoutGraph(base, catalog);
  assert.deepEqual(l1.slots['v#data'], ['db', 'mq']);
  // cache sorts before database: it takes row 0, db and mq move up one row; the shelf below does not move
  const g2 = build([op({ t: 'node', id: 'cache', product: 'tair', label: 'Cache', group: 'v' })], base);
  const l2 = layoutGraph(g2, catalog, l1);
  assert.deepEqual(l2.slots['v#data'], ['cache', 'db', 'mq']);
  assert.equal(l1.cards.db.y - l2.cards.db.y, ROW);
  assert.equal(l2.cards.oss.y, l1.cards.oss.y);
  // a manual re-order survives
  const l2b = layoutGraph(g2, catalog, { ...l2, slots: { ...l2.slots, 'v#data': ['db', 'cache', 'mq'] } });
  assert.deepEqual(l2b.slots['v#data'], ['db', 'cache', 'mq']);
  // removal compacts the slot; nothing else moves
  const g3 = build([op({ t: 'remove', id: 'db' })], g2);
  const l3 = layoutGraph(g3, catalog, l2);
  assert.deepEqual(l3.slots['v#data'], ['cache', 'mq']);
  assert.equal(l3.cards.mq.y, l2.cards.db.y);
  assert.equal(l3.cards.oss.y, l2.cards.oss.y);
});

test('a DR VPC that arrives after the shelf stands keeps still while its own tier grows and while the shelf grows a block (review: 308 and 100 px jumps)', () => {
  const lay = (g: Graph, prev?: LayoutState): LayoutState => layoutGraph(repairGraph(g, catalog).graph, catalog, prev);
  const g0 = build([...VPC_OPS(), op({ t: 'node', id: 'alb', product: 'alb', label: 'LB', group: 'v' }), op({ t: 'node', id: 'app', product: 'ecs', label: 'App', group: 'v' }), op({ t: 'node', id: 'db', product: 'rds', label: 'DB', group: 'v' }), op({ t: 'node', id: 'oss', product: 'oss', label: 'Files', group: 'r' }), op({ t: 'node', id: 'sls', product: 'sls', label: 'Logs', group: 'r' }), op({ t: 'node', id: 'kms', product: 'kms', label: 'Keys', group: 'r' })]);
  const l0 = lay(g0);
  // the DR VPC arrives with a first card per tier: nothing already drawn moves
  const g1 = build([op({ t: 'group', id: 'v2', kind: 'vpc', label: 'DR VPC', parent: 'r' }), op({ t: 'node', id: 'alb2', product: 'alb', label: 'DR LB', group: 'v2' }), op({ t: 'node', id: 'app2', product: 'ecs', label: 'DR App', group: 'v2' }), op({ t: 'node', id: 'cache2', product: 'tair', label: 'DR Cache', group: 'v2' })], g0);
  const l1 = lay(g1, l0);
  for (const id of ['alb', 'app', 'db', 'oss', 'sls', 'kms']) assert.equal(l1.cards[id].y, l0.cards[id].y, `${id} stays when the DR VPC arrives`);
  // the DR VPC's data tier gets a second card: the tier grows upwards into the spare room; the shelf stays
  const g2 = build([op({ t: 'node', id: 'db2', product: 'rds', label: 'DR DB', group: 'v2' })], g1);
  const l2 = lay(g2, l1);
  for (const id of ['alb', 'app', 'db', 'oss', 'sls', 'kms', 'alb2', 'app2']) assert.equal(l2.cards[id].y, l1.cards[id].y, `${id} stays when the DR data tier grows`);
  // the shelf grows a block (a transit router lands in the network lane): the DR VPC below it moves 0 px
  const g3 = build([op({ t: 'node', id: 'tr', product: 'transit-router', label: 'Transit', group: 'r' })], g2);
  const l3 = lay(g3, l2);
  const d = layoutDiff(l2, l3);
  assert.deepEqual(d.moved, [], `moved ${d.moved.map((m) => `${m} ${d.displacement[m]}px`).join(', ')}`);
  assert.deepEqual(unrelatedMoves(l2, l3, d.moved), []);
  assert.ok(l3.cards.alb2.y > l3.cards.tr.y, 'the DR VPC stays below the shelf');
});

test('vpc-edge cards sit inside the VPC in the ingress column, above the load balancers', () => {
  const g = build([...VPC_OPS(), op({ t: 'node', id: 'alb', product: 'alb', label: 'LB', group: 'v' }), op({ t: 'node', id: 'nat', product: 'nat', label: 'NAT', group: 'v' }), op({ t: 'node', id: 'app', product: 'ecs', label: 'App', group: 'v' })]);
  const l = layoutGraph(repairGraph(g, catalog).graph, catalog);
  assert.equal(l.cards.nat.frame, 'v');
  assert.equal(l.cards.nat.x, l.cards.alb.x);
  assert.equal(l.cards.nat.y, l.cards.alb.y - ROW);
  assert.ok(!l.cards.nat.boundary);
  assertGeometry(l, 'nat');
});

test('zones: a multi-zone card carries its zones; a zone with cards of its own gets a frame inside the VPC', () => {
  const g = build([
    ...VPC_OPS(),
    op({ t: 'group', id: 'za', kind: 'zone', label: 'Zone A', parent: 'v' }),
    op({ t: 'group', id: 'zb', kind: 'zone', label: 'Zone B', parent: 'v' }),
    op({ t: 'node', id: 'alb', product: 'alb', label: 'Web LB', group: 'v' }),
    op({ t: 'node', id: 'app', product: 'ecs', label: 'App', group: 'v', zones: ['a', 'b'] }),
    op({ t: 'node', id: 'asg', product: 'ess', label: 'Auto Scaling', attachTo: 'app' }),
    // different products: repair merges one-per-zone replicas of the same product into one multi-zone card
    op({ t: 'node', id: 'job-a', product: 'eci', label: 'Batch A', group: 'za' }),
    op({ t: 'node', id: 'job-b', product: 'rds', label: 'Reporting DB', group: 'zb' }),
    op({ t: 'node', id: 'waf', product: 'waf', label: 'WAF', attachTo: 'alb' }),
  ]);
  const l = layoutGraph(repairGraph(g, catalog).graph, catalog);
  assert.deepEqual(l.cards.app.zones, ['a', 'b']);
  assert.equal(l.cards.app.frame, 'v');
  assert.equal(l.cards.app.y, 0);
  assert.equal(l.cards['job-a'].frame, 'za');
  assert.equal(l.cards['job-b'].frame, 'zb');
  assert.ok(l.frames.za.y < l.frames.zb.y && l.frames.zb.y + l.frames.zb.h < l.cards.app.y, 'Zone A on top, both above the multi-zone row');
  assert.equal(l.badges.waf.host, 'alb');
  assert.equal(l.badges.asg.as, 'attachment');
  assertGeometry(l, 'zones');
  // a zone frame grows with its own cards and never pushes the multi-zone row or another tier
  const g2 = build([op({ t: 'node', id: 'job-a2', product: 'tair', label: 'Cache A', group: 'za' })], repairGraph(g, catalog).graph);
  const l2 = layoutGraph(repairGraph(g2, catalog).graph, catalog, l);
  assert.equal(l2.cards.app.y, l.cards.app.y);
  assert.equal(l2.cards.alb.y, l.cards.alb.y);
  assertGeometry(l2, 'zones+1');
});

test('no implicit VPC: the layout draws only VPC groups the graph has; repair (c) creates the missing one', () => {
  const g = build([op({ t: 'node', id: 'app', product: 'ecs', label: 'App', group: null }), op({ t: 'node', id: 'oss', product: 'oss', label: 'Files', group: null })]);
  const raw = layoutGraph(g, catalog);
  assert.ok(!Object.values(raw.frames).some((f) => f.kind === 'vpc'), 'no VPC frame without a VPC group');
  assert.equal(raw.frames[raw.cards.app.frame].kind, 'lane');
  const repaired = repairGraph(g, catalog).graph;
  const l = layoutGraph(repaired, catalog);
  const vpc = Object.values(repaired.groups).find((x) => x.kind === 'vpc')!;
  assert.equal(l.cards.app.frame, vpc.id);
  assert.equal(l.frames[vpc.id].implicit, false);
});

test('solution map: Team, SaaS, Model service and Cloud resources as rows, top to bottom, three cards a row', () => {
  const g = build([
    op({ t: 'node', id: 'team-dev', product: 'users', label: 'Engineering team', group: null }),
    op({ t: 'rec', product: 'qoder', fit: 'primary', why: 'Coding agent for the team.' }),
    op({ t: 'rec', product: 'qwenwork', fit: 'complement', why: 'Workplace agent.' }),
    op({ t: 'rec', product: 'model-studio', fit: 'complement', why: 'Model APIs for custom agents.' }),
    op({ t: 'edge', id: 'e1', from: 'team-dev', to: 'qoder' }),
  ]);
  const l = layoutGraph(g, catalog);
  assert.equal(l.mode, 'solution');
  const fr = ['~sol:team', '~sol:saas', '~sol:model', '~sol:cloud'].map((id) => l.frames[id]);
  assert.deepEqual(fr.map((f) => f.label), ['Team', 'SaaS', 'Model service', 'Cloud resources']);
  for (let i = 1; i < fr.length; i++) assert.ok(fr[i].y >= fr[i - 1].y + fr[i - 1].h, 'rows top to bottom');
  assert.equal(l.cards['rec:qoder'].frame, '~sol:saas');
  assert.equal(l.cards['rec:qoder'].fit, 'primary');
  assert.deepEqual(l.slots['~sol:saas#stack'], ['rec:qoder', 'rec:qwenwork']);
  assert.equal(l.cards['rec:qwenwork'].y, l.cards['rec:qoder'].y, 'side by side in one row');
  assert.equal(l.frames['~sol:cloud'].empty, true);
  assert.equal(solutionLane(catalog.byId.get('qwenwork')), 'saas');
  assertGeometry(l, 'solution');
});

test('bands keep spare rows: the Account band grows by two rows without moving the band below it', () => {
  const gov = ['ram', 'actiontrail', 'security-center', 'cloudsso', 'resource-management'].filter((p) => catalog.byId.get(p)?.scope === 'account');
  assert.ok(gov.length >= 5, `account-scope products: ${gov.join(', ')}`);
  let g = build([op({ t: 'node', id: 'u', product: 'users', label: 'Users', group: null }), op({ t: 'node', id: 'a0', product: gov[0], label: 'Gov 0', group: null }), op({ t: 'rec', product: 'qoder', fit: 'primary', why: 'x' }), ...VPC_OPS(), op({ t: 'node', id: 'app', product: 'ecs', label: 'App', group: 'v' })]);
  let l = layoutGraph(g, catalog);
  const recY = l.cards['rec:qoder'].y;
  for (let i = 1; i < 5; i++) {
    g = build([op({ t: 'node', id: `a${i}`, product: gov[i], label: `Gov ${i}`, group: null })], g);
    l = layoutGraph(g, catalog, l);
    assert.equal(l.cards['rec:qoder'].y, recY, `Recommended stays put with ${i + 1} account cards`);
    assertGeometry(l, `account ${i + 1}`);
  }
});

test('tidy: keeps slot orders but drops the reserved room and the holes a removal leaves', () => {
  const s = replayed().find((r) => r.id.startsWith('final:mt-06'))!;
  const last = s.layouts[s.layouts.length - 1];
  const g = s.frames[s.frames.length - 1].display;
  const tidy = layoutGraph(g, catalog, last, { tidy: true });
  for (const [slot, ids] of Object.entries(last.slots)) assert.deepEqual(tidy.slots[slot], ids, `slot ${slot} keeps its order`);
  assert.ok(tidy.height <= last.height, `tidy ${tidy.height} <= sticky ${last.height}`);
  assertGeometry(tidy, 'tidy');
});

test('a Phase 0 state (version 1) as prev is ignored, not misread', () => {
  const s = replayed()[0];
  const g = s.frames[s.frames.length - 1].display;
  const fresh = layoutGraph(g, catalog);
  const v1 = { ...fresh, version: 1 as const, sticky: undefined, slots: {} };
  assert.deepEqual(layoutGraph(g, catalog, v1).cards, fresh.cards);
});

test('GEOMETRY: archW is the width of the Clients and Edge columns plus a three-column region', () => {
  const frameW = G.cardW + 2 * G.padX;
  assert.equal(G.archW, 2 * (frameW + G.rootGap) + 2 * G.regionPadX + 2 * G.vpcPadX + 3 * G.cardW + 2 * G.gapX);
  assert.equal(ARCH_X0, -2 * (frameW + G.rootGap));
  assert.equal(G.textW, G.cardW - 60);
  // two title lines and a subtitle fit the card
  assert.ok(G.titleLines * Math.round(G.titlePx * G.titleLineHeight) + Math.round(G.subtitlePx * G.subtitleLineHeight) + 1 <= G.cardH - 6);
});

// ---------- text and camera (first drafted by qwen3.8-max from a written spec, then reviewed and corrected) ----------

const fakeEntries = [
  { id: 'ecs', name: 'Elastic Compute Service', short: 'ECS', aliases: [], kind: 'service', category: '', icon: 'compute', scope: 'vpc', lane: 'compute', status: 'ga', availability: 'intl', purpose: '', verified: '2026-10-31' },
  { id: 'alb', name: 'Application Load Balancer', short: 'ALB', aliases: [], kind: 'service', category: '', icon: 'loadbalancer', scope: 'vpc', lane: 'ingress', status: 'ga', availability: 'intl', purpose: '', verified: '2026-10-31' },
  { id: 'anti-ddos-proxy', name: 'Anti-DDoS Proxy (Anti-DDoS Pro and Premium)', short: 'Anti-DDoS Proxy', aliases: [], kind: 'service', category: '', icon: 'shield', scope: 'edge', lane: 'edge', status: 'ga', availability: 'intl', purpose: '', verified: '2026-10-31' },
  { id: 'qoder', name: 'Qoder', short: 'Qoder', aliases: [], kind: 'offering', category: '', icon: 'ai', scope: 'saas', lane: 'saas', status: 'ga', availability: 'intl', purpose: '', verified: '2026-10-31', purchase: 'saas-seat' },
] satisfies CatalogEntry[];
const fakeCatalog = { version: 't', entries: fakeEntries, byId: new Map<string, CatalogEntry>(fakeEntries.map((e) => [e.id, e])), resolve: (id: string) => ({ entry: fakeEntries.find((e) => e.id === id) }), promptRows: () => '' } satisfies Catalog;

/** Every character 0.55 em wide. */
const measure: MeasureText = (text, px) => [...text].length * px * 0.55;

function state(x: number, y: number, w: number, h: number, mode: 'architecture' | 'solution' = 'architecture'): LayoutState {
  return { version: 2, mode, width: w, height: h, pathY: 0, cards: {}, frames: {}, badges: {}, slots: {}, shelves: {}, shelfKinds: {}, order: {}, bounds: { x, y, w, h } };
}

test('fitTitle: a short title takes one line at titlePx', () => {
  const r = fitTitle('ECS', measure);
  assert.equal(r.lines.length, 1);
  assert.equal(r.px, G.titlePx);
});

test('fitTitle: a longer title wraps at a word break into two lines at titlePx', () => {
  const text = 'Order Service Cluster'; // 14 characters a line at 14 px
  const r = fitTitle(text, measure);
  assert.deepEqual(r, { lines: ['Order Service', 'Cluster'], px: G.titlePx });
});

test('fitTitle: a title too long for two lines shrinks in titleStep steps without breaking a word', () => {
  const text = 'Customer Order Processing Service';
  const r = fitTitle(text, measure);
  assert.ok(r.px < G.titlePx && r.px >= G.titleMinPx, `px ${r.px}`);
  assert.equal((G.titlePx - r.px) % G.titleStep, 0);
  assert.equal(r.lines.length, 2);
  for (const ln of r.lines) assert.ok(measure(ln, r.px) <= G.textW + 0.01, 'line fits');
  assert.equal(r.lines.join(' '), text);
  assert.ok(fitTitle(text, measure, G.textW).px === r.px);
});

test('fitTitle: no title up to the validator label limit ever gets an ellipsis, Latin or CJK', () => {
  const words = ['Payment', 'Gateway', 'Ride', 'Service', 'Analytics', 'Warehouse', 'Cache', 'Notification'];
  for (let n = 1; n <= TEXT_LIMITS.label; n++) {
    const latin = Array.from({ length: n }, (_, i) => words[i % words.length]).join(' ').slice(0, n);
    const oneWord = 'x'.repeat(n);
    const cjk = '数据仓库实时分析服务平台监控告警中心'.repeat(3).slice(0, n);
    for (const text of [latin, oneWord, cjk]) {
      const r = fitTitle(text, measure);
      assert.ok(r.lines.length <= G.titleLines + 1, `${text}: ${r.lines.length} lines`);
      for (const ln of r.lines) {
        assert.ok(!ln.endsWith('…'), `${text}: no ellipsis`);
        assert.ok(measure(ln, r.px) <= G.textW + 0.01, `${text}: line fits`);
      }
      assert.equal(r.lines.join('').replace(/\s/g, ''), text.replace(/\s/g, ''), `${text}: no text dropped`);
    }
  }
  // only a text longer than three lines at titleMinPx hold (beyond the label limit) ends with an ellipsis
  const huge = fitTitle('word '.repeat(40), measure);
  assert.equal(huge.lines.length, G.titleLines + 1);
  assert.ok(huge.lines[huge.lines.length - 1].endsWith('…'));
});

const textGraph: Graph = {
  groups: {},
  nodes: {
    app: { id: 'app', product: 'ecs', label: 'App Servers', group: null },
    lb: { id: 'lb', product: 'alb', label: 'alb', group: null },
    ddos: { id: 'ddos', product: 'anti-ddos-proxy', label: 'Anti-DDoS  Proxy', group: null },
  } satisfies Record<string, GraphNode>,
  edges: {},
  recs: [{ product: 'qoder', fit: 'primary', why: 'x' }],
};

test('cardText: the subtitle is the short name, else the full name when it fits, never the lane', () => {
  const lanes = ['Compute', 'Load balancing', 'Edge network', 'SaaS'];
  const app = cardText({ id: 'app', kind: 'node', product: 'ecs' }, textGraph, fakeCatalog);
  assert.deepEqual(app, { title: 'App Servers', subtitle: 'ECS' });
  const lb = cardText({ id: 'lb', kind: 'node', product: 'alb' }, textGraph, fakeCatalog, () => true);
  assert.deepEqual(lb, { title: 'alb', subtitle: 'Application Load Balancer' });
  assert.equal(cardText({ id: 'lb', kind: 'node', product: 'alb' }, textGraph, fakeCatalog, () => false).subtitle, '');
  // the full name does not fit and the bare name repeats the title: no subtitle
  const ddos = cardText({ id: 'ddos', kind: 'node', product: 'anti-ddos-proxy' }, textGraph, fakeCatalog, (s) => !s.includes('('));
  assert.equal(ddos.subtitle, '');
  const rec = cardText({ id: 'rec:qoder', kind: 'rec', product: 'qoder' }, textGraph, fakeCatalog);
  assert.deepEqual(rec, { title: 'Qoder', subtitle: 'Per-seat SaaS' });
  for (const r of [app, lb, ddos, rec]) assert.ok(!lanes.includes(r.subtitle));
});

test('fitCamera: an ordinary diagram fits the architecture width; a tall one keeps the title floor and pans', () => {
  const c = { w: 1040, h: 800 };
  const small = state(ARCH_X0, -100, G.archW, 300);
  const cam = fitCamera(small, c);
  assert.ok(Math.abs(cam.zoom - (c.w - 2 * G.fitPad) / G.archW) < 1e-9);
  assert.equal(cam.pan, null);
  const b = small.bounds!;
  assert.ok(cam.x <= b.x && cam.x + c.w / cam.zoom >= b.x + b.w && cam.y <= b.y && cam.y + c.h / cam.zoom >= b.y + b.h, 'everything in view');
  assert.equal(cam.subtitles, G.subtitlePx * cam.zoom >= G.subtitleFloorPx);
  // a region-only diagram (no Clients yet) is fitted as if the left columns were there: no zoom when they arrive
  const regionOnly = state(0, -100, 624, 300);
  assert.equal(fitCamera(regionOnly, c).zoom, cam.zoom);
  const tall = state(ARCH_X0, -200, G.archW, 3000);
  const t = fitCamera(tall, c);
  assert.ok(t.zoom * G.titlePx >= G.titleFloorPx - 1e-9);
  assert.ok(t.pan && t.pan.y0 < t.pan.y1);
  assert.equal(t.y, t.pan!.y0, 'starts at the top');
  // 880x720: titles at 11 px or more; subtitles hidden below their floor
  const n = fitCamera(small, { w: 880, h: 720 });
  assert.ok(n.zoom * G.titlePx >= 11);
  assert.equal(n.subtitles, G.subtitlePx * n.zoom >= G.subtitleFloorPx);
  // the solution map is narrow: zoom capped at maxZoom
  assert.equal(fitCamera(state(0, 0, 588, 470, 'solution'), c).zoom, G.maxZoom);
});

test('fitCamera: sticky — the zoom holds within the hysteresis and the view moves only as far as it must', () => {
  const c = { w: 1040, h: 800 };
  const a = state(ARCH_X0, -100, G.archW, 600);
  const cam1 = fitCamera(a, c);
  assert.deepEqual(fitCamera(a, c, cam1), cam1);
  assert.deepEqual(fitCamera(a, c), fitCamera(a, c));
  const taller = state(ARCH_X0, -100, G.archW, 600 * 1.04);
  assert.equal(fitCamera(taller, c, cam1).zoom, cam1.zoom);
  // content grows 50 px upwards and still fits: the camera moves at most 50 px, and content that did not move stays
  const grown = state(ARCH_X0, -150, G.archW, 650);
  const cam3 = fitCamera(grown, c, cam1);
  assert.ok(Math.abs(cam3.y - cam1.y) <= 50 + 1e-9);
  assert.equal(cam3.x, cam1.x);
});
