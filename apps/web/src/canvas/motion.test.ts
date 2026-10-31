import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { LayoutCard, LayoutState } from '@ali/core/layout.ts';
import { loadFixtureFile, newStore, play } from '../test/fixtures.ts';
import { DRAW_MS, ENTER_MS, EXIT_MS, GHOST_MS, MOVE_MS, RETURN_MS, ROOM_MS, SLACK_MS, SNAP_MS, STAGGER_MAX, STAGGER_MS, STAMP_MS, STILL, createMotionClock, drawDash, litCards, pathOrder, planMotion, routeLength } from './motion.ts';

const card = (id: string, x: number, y: number): LayoutCard => ({ id, kind: 'node', product: 'ecs', frame: 'f', slot: 's', index: 0, x, y, w: 168, h: 60, badges: [] });
const layoutOf = (cards: LayoutCard[]): LayoutState =>
  ({ version: 2, mode: 'architecture', width: 0, height: 0, pathY: 0, cards: Object.fromEntries(cards.map((c) => [c.id, c])), frames: {}, badges: {}, slots: {}, shelves: {}, shelfKinds: {}, order: {} }) as LayoutState;

describe('planMotion', () => {
  it('does nothing when told not to animate (a restore, a resize) or without a layout', () => {
    const l = layoutOf([card('a', 0, 0)]);
    assert.equal(planMotion(l, l, false), STILL);
    assert.equal(planMotion(null, l, false), STILL);
    assert.equal(planMotion(l, null, true), STILL);
  });

  it('enters every card of the first batch of a session', () => {
    const l = layoutOf([card('users', 0, 0), card('dns', 200, 0)]);
    const p = planMotion(null, l, true);
    assert.deepEqual([...p.enter.keys()], ['users', 'dns']);
  });

  it('enters only the new cards, in request-path order, 30 ms apart, at most 6 steps', () => {
    const prev = layoutOf([card('a', 0, 0)]);
    // created right to left: the stagger still runs left to right (users, edge, ingress, compute, data)
    const next = layoutOf([card('a', 0, 0), ...Array.from({ length: 9 }, (_, i) => card('n' + i, 1800 - i * 200, 0))]);
    const p = planMotion(prev, next, true);
    assert.deepEqual([...p.enter.keys()], Array.from({ length: 9 }, (_, i) => 'n' + (8 - i)));
    assert.equal(p.enter.get('n8'), 0);
    assert.equal(p.enter.get('n7'), STAGGER_MS);
    assert.equal(p.enter.get('n0'), (STAGGER_MAX - 1) * STAGGER_MS);
    assert.equal(p.move.size, 0);
    assert.equal(p.exit.length, 0);
    assert.ok(!p.touched.has('a'), 'an unrelated card is not touched');
    assert.equal(p.edgeDelay, ENTER_MS + (STAGGER_MAX - 1) * STAGGER_MS);
    assert.equal(p.lands.get('n8'), ENTER_MS);
  });

  it('lets a moving container make room before a new card lands in it', () => {
    const prev = layoutOf([card('a', 0, 0)]);
    const next = layoutOf([card('a', 0, 84), card('b', 200, 0)]);
    const p = planMotion(prev, next, true);
    assert.equal(p.enter.get('b'), ROOM_MS);
    assert.equal(p.lands.get('b'), ROOM_MS + ENTER_MS);
  });

  it('orders a column top to bottom before the next column', () => {
    const l = layoutOf([card('c', 400, 0), card('b', 10, 90), card('a', 0, 0), card('d', 20, 180)]);
    assert.deepEqual(pathOrder(['c', 'b', 'a', 'd'], l), ['a', 'b', 'd', 'c']);
  });

  it('moves only the cards whose slot changed, and the edges wait for the move', () => {
    const prev = layoutOf([card('a', 0, 0), card('b', 0, 84), card('c', 200, 0)]);
    const next = layoutOf([card('a', 0, 0), card('b', 0, 168), card('c', 200, 0)]);
    const p = planMotion(prev, next, true);
    assert.deepEqual([...p.move], ['b']);
    assert.deepEqual([...p.touched], ['b']);
    assert.equal(p.edgeDelay, MOVE_MS);
  });

  it('keeps an exited card as a ghost id', () => {
    const prev = layoutOf([card('a', 0, 0), card('b', 0, 84)]);
    const next = layoutOf([card('a', 0, 0)]);
    const p = planMotion(prev, next, true);
    assert.deepEqual(p.exit, ['b']);
    assert.ok(p.touched.has('b'));
  });

  it('snaps a new badge after its host lands, and fades in a new frame', () => {
    const prev = layoutOf([card('alb', 0, 0)]);
    const next = layoutOf([card('alb', 0, 0), card('ecs', 200, 0)]);
    next.badges = { waf: { id: 'waf', product: 'waf', host: 'alb', as: 'badge', index: 0, x: 0, y: 0, w: 22, h: 22 }, ess: { id: 'ess', product: 'ess', host: 'ecs', as: 'badge', index: 0, x: 0, y: 0, w: 22, h: 22 } };
    next.frames = { vpc: { id: 'vpc', kind: 'vpc', x: 0, y: 0, w: 10, h: 10 } } as unknown as LayoutState['frames'];
    const p = planMotion(prev, next, true);
    assert.equal(p.badges.get('waf'), 0, 'on a card that was already there: at once');
    assert.equal(p.badges.get('ess'), ENTER_MS, 'on a card that enters: once it has landed');
    assert.deepEqual([...p.frameEnter], ['vpc']);
  });

  it('on the recorded Kubernetes swap, one card enters, one leaves and nothing else moves', () => {
    const fx = loadFixtureFile('ecommerce-k8s');
    const store = newStore();
    const t0 = play(store, fx, { flushEvery: 6, count: 1 });
    const a = store.getState().display.layout!;
    play(store, fx, { flushEvery: 6, from: 1, count: 1, t0 });
    const b = store.getState().display.layout!;
    const p = planMotion(a, b, true);
    assert.deepEqual([...p.enter.keys()], ['ack']);
    assert.deepEqual(p.exit, ['ecs-a']);
    assert.equal(p.move.size, 0);
  });
});

describe('the motion clock', () => {
  const prev = layoutOf([card('a', 0, 0)]);
  const next = layoutOf([card('a', 0, 0), card('b', 200, 0), card('c', 400, 0)]);

  it('keeps an entrance running with the same delay when the next batch lands mid-way', () => {
    const k = createMotionClock();
    k.apply(planMotion(prev, next, true), 1000);
    assert.equal(k.enter('c', 1100), STAGGER_MS);
    // the next batch moves nothing and enters nothing: c still enters, with the delay it mounted with
    k.apply(planMotion(next, next, true), 1180);
    assert.equal(k.enter('c', 1200), STAGGER_MS);
    assert.equal(k.enter('c', 1000 + STAGGER_MS + ENTER_MS + SLACK_MS + 1), null);
  });

  it('keeps a glide on until the card lands, and a second move retargets it (a fresh window, no queue)', () => {
    const k = createMotionClock();
    const moved = layoutOf([card('a', 0, 90)]);
    k.apply(planMotion(prev, moved, true), 0);
    assert.ok(k.moving('a', 200));
    k.apply(planMotion(moved, layoutOf([card('a', 0, 180)]), true), 250);
    assert.ok(k.moving('a', 500), 'the second move runs its own 300 ms from where the card is');
    assert.ok(!k.moving('a', 250 + MOVE_MS + 1));
  });

  it('keeps a ghost for the exit and the collapse, then lets it go', () => {
    const k = createMotionClock();
    k.apply(planMotion(next, prev, true), 0);
    assert.deepEqual(k.ghosts(10).sort(), ['b', 'c']);
    k.apply(STILL, 100);
    assert.deepEqual(k.ghosts(200).sort(), ['b', 'c'], 'a later batch does not cut the ghost');
    assert.deepEqual(k.ghosts(EXIT_MS + GHOST_MS + 1), []);
    assert.equal(k.nextChange(EXIT_MS + GHOST_MS + 1), null);
  });

  it('waits for the later end of an edge, then draws it once; a new route resumes the draw', () => {
    const k = createMotionClock();
    k.apply(planMotion(prev, next, true), 0);
    const wait = k.wait(['a', 'c'], 0);
    assert.equal(wait, STAGGER_MS + ENTER_MS, 'a is still, c lands last');
    const first = k.edge('a-c', 'k1', 0, wait, true, true);
    assert.deepEqual(first, { draw: true, delay: wait, fade: null });
    assert.deepEqual(k.edge('a-c', 'k1', 100, 0, true, false), first, 'the same element keeps its delay');
    const resumed = k.edge('a-c', 'k2', 400, 0, true, false);
    assert.equal(resumed.draw, true);
    assert.equal(resumed.delay, wait - 400, 'a re-routed edge picks up where the draw is');
    assert.equal(k.edge('a-c', 'k2', wait + DRAW_MS + SLACK_MS + 1, 0, true, false).draw, false);
  });

  it('never draws an edge first seen in a still layout, and fades back an edge whose card moved', () => {
    const k = createMotionClock();
    assert.deepEqual(k.edge('x', 'k', 0, 0, false, true), { draw: false, delay: 0, fade: null });
    const back = k.edge('x', 'k2', 50, 120, true, true);
    assert.deepEqual(back, { draw: false, delay: 0, fade: 120 });
    assert.equal(k.edge('x', 'k2', 60, 0, true, false).fade, 120, 'kept while it fades');
    assert.equal(k.edge('x', 'k2', 50 + 120 + RETURN_MS + SLACK_MS + 1, 0, true, false).fade, null);
  });

  it('stamps a tag once per revision and snaps a badge for its own window', () => {
    const k = createMotionClock();
    assert.equal(k.stamp('a', 2, 60, 0), 60);
    assert.equal(k.stamp('a', 2, 0, 100), 60, 'the delay it mounted with');
    assert.equal(k.stamp('a', 2, 0, 60 + STAMP_MS + SLACK_MS + 1), null);
    assert.equal(k.stamp('a', 3, 0, 1000), 0, 'the next revision stamps again');
    const p = { ...STILL, animate: true, badges: new Map([['waf', 90]]) };
    k.apply(p, 0);
    assert.equal(k.badge('waf', 10), 90);
    assert.equal(k.badge('waf', 90 + SNAP_MS + SLACK_MS + 1), null);
  });

  it('keeps a removed edge for its fade', () => {
    const k = createMotionClock();
    const until = k.leave('e', 0);
    assert.equal(until, EXIT_MS);
    assert.deepEqual(k.leaving(10), ['e']);
    assert.equal(k.nextChange(10), EXIT_MS);
    assert.deepEqual(k.leaving(EXIT_MS + 1), []);
  });
});

describe('drawing an edge', () => {
  it('measures a route at least as long as it is drawn', () => {
    assert.equal(routeLength([{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 40 }]), 71);
  });

  it('draws a solid line as one dash', () => {
    assert.deepEqual(drawDash('data', 120), { array: '120 120', from: 120 });
  });

  it('keeps an async or resolve line\'s own pattern, ending in a gap as long as the line', () => {
    const d = drawDash('async', 20);
    assert.deepEqual(d.array.split(' ').map(Number), [5, 4, 5, 4, 5, 4 + 20]);
    assert.equal(d.from, 27);
    const r = drawDash('resolve', 10).array.split(' ').map(Number);
    assert.equal(r.length % 2, 0, 'dash, gap pairs');
    assert.equal(r[0], 0.1);
  });
});

describe('litCards', () => {
  it('maps card ids, badge ids (to their host) and recommendation product ids', () => {
    const l = layoutOf([card('alb', 0, 0), card('rec:qoder-teams', 0, 100)]);
    l.badges = { waf: { id: 'waf', product: 'waf', host: 'alb', as: 'badge', index: 0, x: 0, y: 0, w: 22, h: 22 } };
    assert.deepEqual([...litCards(['alb', 'waf', 'qoder-teams', 'nope'], l)].sort(), ['alb', 'rec:qoder-teams']);
    assert.equal(litCards(['alb'], null).size, 0);
  });
});

describe('the canvas clock matches the tokens', () => {
  const rootOf = (file: string): string => {
    const css = readFileSync(new URL(file, import.meta.url), 'utf8');
    return css.slice(0, css.indexOf('@media'));
  };
  const root = rootOf('../styles/tokens.css') + rootOf('../styles/motion.css');
  const ms = (name: string): number => {
    const m = new RegExp(name + ':\\s*(\\d+)ms').exec(root);
    assert.ok(m, `${name} is a token`);
    return Number(m[1]);
  };
  it('uses the same durations as CSS', () => {
    assert.equal(ms('--d-enter'), ENTER_MS);
    assert.equal(ms('--d-move'), MOVE_MS);
    assert.equal(ms('--d-exit'), EXIT_MS);
    assert.equal(ms('--d-draw'), DRAW_MS);
    assert.equal(ms('--d-snap'), SNAP_MS);
    assert.equal(ms('--d-stamp'), STAMP_MS);
    assert.equal(ms('--stagger'), STAGGER_MS);
  });
});
