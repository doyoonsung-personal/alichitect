import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LayoutCard, LayoutState } from '@ali/core/layout.ts';
import { loadFixtureFile, newStore, play } from '../test/fixtures.ts';
import { ENTER_MS, MOVE_MS, STAGGER_MAX, STAGGER_MS, STILL, litCards, planMotion } from './motion.ts';

const card = (id: string, x: number, y: number): LayoutCard => ({ id, kind: 'node', product: 'ecs', frame: 'f', slot: 's', index: 0, x, y, w: 168, h: 60, badges: [] });
const layoutOf = (cards: LayoutCard[]): LayoutState =>
  ({ version: 2, mode: 'architecture', width: 0, height: 0, pathY: 0, cards: Object.fromEntries(cards.map((c) => [c.id, c])), frames: {}, badges: {}, slots: {}, shelves: {}, shelfKinds: {}, order: {} }) as LayoutState;

describe('planMotion', () => {
  it('does nothing without a previous layout or when told not to animate', () => {
    const l = layoutOf([card('a', 0, 0)]);
    assert.equal(planMotion(null, l, true), STILL);
    assert.equal(planMotion(l, l, false), STILL);
    assert.equal(planMotion(l, null, true), STILL);
  });

  it('enters only the new cards, 30 ms apart, at most 6 steps', () => {
    const prev = layoutOf([card('a', 0, 0)]);
    const next = layoutOf([card('a', 0, 0), ...Array.from({ length: 9 }, (_, i) => card('n' + i, 200, i * 84))]);
    const p = planMotion(prev, next, true);
    assert.deepEqual([...p.enter.keys()], Array.from({ length: 9 }, (_, i) => 'n' + i));
    assert.equal(p.enter.get('n0'), 0);
    assert.equal(p.enter.get('n1'), STAGGER_MS);
    assert.equal(p.enter.get('n8'), (STAGGER_MAX - 1) * STAGGER_MS);
    assert.equal(p.move.size, 0);
    assert.equal(p.exit.length, 0);
    assert.ok(!p.touched.has('a'), 'an unrelated card is not touched');
    assert.equal(p.edgeDelay, ENTER_MS + (STAGGER_MAX - 1) * STAGGER_MS);
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

describe('litCards', () => {
  it('maps card ids, badge ids (to their host) and recommendation product ids', () => {
    const l = layoutOf([card('alb', 0, 0), card('rec:qoder-teams', 0, 100)]);
    l.badges = { waf: { id: 'waf', product: 'waf', host: 'alb', as: 'badge', index: 0, x: 0, y: 0, w: 22, h: 22 } };
    assert.deepEqual([...litCards(['alb', 'waf', 'qoder-teams', 'nope'], l)].sort(), ['alb', 'rec:qoder-teams']);
    assert.equal(litCards(['alb'], null).size, 0);
  });
});
