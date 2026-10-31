import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, loadFixtureFile, newStore, play } from '../test/fixtures.ts';
import { planEdges } from '../routing/plan.ts';
import { routeChannels } from '../routing/channel.ts';
import { STILL } from './motion.ts';
import type { MotionPlan } from './motion.ts';
import { drawEdges, endCards } from './edges-model.ts';

function setup() {
  const store = newStore();
  play(store, loadFixtureFile('residency'), { flushEvery: 6 });
  const s = store.getState();
  const layout = s.display.layout!;
  const planned = planEdges(s.display.graph, layout, catalog);
  const routes = routeChannels(planned).routes;
  const base = { planned: planned.edges, routes, routedVersion: 1, version: 1, layout, motion: STILL, hot: new Set<string>(), lit: new Set<string>(), building: new Set<string>(), streaming: false, drawn: new Set<string>(), measure: (s: string) => s.length * 6 };
  return { planned, layout, base };
}

describe('planned edges of the residency session', () => {
  const { planned, layout } = setup();
  it('plans a route for every drawable graph edge, with control edges kept', () => {
    assert.ok(planned.edges.length >= 15);
    assert.ok(planned.edges.some((e) => e.kind === 'control'));
    assert.ok(planned.edges.some((e) => e.path));
  });
  it('treats every card as an obstacle and every frame label too', () => {
    assert.equal(planned.obstacles.filter((o) => o.kind === 'card').length, Object.keys(layout.cards).length);
    assert.ok(planned.obstacles.some((o) => o.kind === 'label'));
  });
  it('a badge is not an endpoint: its edges go to the host card', () => {
    for (const e of planned.edges) if (!e.fromFrame) assert.ok(Object.hasOwn(layout.cards, e.from), e.from);
  });
});

describe('drawEdges', () => {
  const { base, layout } = setup();
  it('hides control edges at rest and shows them when an end is hot', () => {
    const rest = drawEdges(base);
    assert.equal(rest.filter((e) => e.kind === 'control').length, 0);
    assert.ok(rest.length > 8);
    const hot = drawEdges({ ...base, hot: new Set(['app']) });
    assert.ok(hot.filter((e) => e.kind === 'control').length > 0);
    assert.ok(hot.every((e) => e.kind !== 'control' || e.hot));
  });
  it('gives each edge a path, an arrowhead unless it only resolves, and a key that changes with the route', () => {
    for (const e of drawEdges(base)) {
      assert.match(e.d, /^M/);
      assert.equal(e.arrow === '', e.kind === 'resolve', e.id);
    }
    const moved = drawEdges({ ...base, routes: Object.fromEntries(Object.entries(base.routes).map(([k, v]) => [k, v.map((p) => ({ x: p.x + 5, y: p.y }))])) });
    const a = new Map(drawEdges(base).map((e) => [e.id, e.key]));
    for (const e of moved) assert.notEqual(a.get(e.id), e.key);
  });
  it('dims every edge that does not join two linked cards', () => {
    const lit = new Set(['alb', 'app']);
    const edges = drawEdges({ ...base, lit });
    assert.ok(edges.some((e) => e.dim));
    assert.ok(edges.some((e) => !e.dim && e.hot), 'the alb to app edge stays lit');
  });
  it('marks the edges of cards the streaming revision added as fresh, only while streaming', () => {
    const building = new Set(['app']);
    assert.ok(drawEdges({ ...base, building, streaming: true }).some((e) => e.fresh));
    assert.ok(drawEdges({ ...base, building, streaming: false }).every((e) => !e.fresh));
  });
  it('holds back the edges of touched cards until their routes land, and delays the others\' fade only for touched ends', () => {
    const motion: MotionPlan = { ...STILL, animate: true, touched: new Set(['app']), edgeDelay: 300 };
    const stale = drawEdges({ ...base, routedVersion: 1, version: 2, motion });
    const ends = (id: string) => endCards(layout, id, false);
    assert.deepEqual(ends('app'), ['app']);
    const fresh = drawEdges({ ...base, routedVersion: 2, version: 2, motion });
    assert.ok(fresh.some((e) => e.delay === 300));
    assert.ok(fresh.some((e) => e.delay === 0));
    assert.ok(stale.length < fresh.length, 'stale routes of touched cards are not drawn');
  });
  it('an edge already on the sheet swaps its route without a fade', () => {
    const first = drawEdges(base);
    assert.ok(first.every((e) => e.appear));
    const drawn = new Set(first.map((e) => e.id));
    assert.ok(drawEdges({ ...base, drawn }).every((e) => !e.appear));
    assert.ok(drawEdges({ ...base, drawn, hot: new Set(['app']) }).some((e) => e.appear && e.kind === 'control'), 'a revealed control edge fades in');
  });
  it('keeps an edge label only when it fits a segment and clears the cards', () => {
    const edges = drawEdges(base);
    const labelled = edges.filter((e) => e.label);
    assert.ok(labelled.length > 0);
    for (const e of labelled) assert.ok(e.label!.plate.w > 0);
  });
});
