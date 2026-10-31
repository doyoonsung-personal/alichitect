// Move classification on hand-built layout pairs: unrelated (bystander), same-block (a sibling entered), re-slotted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LayoutCard, LayoutState } from '../../../packages/core/src/layout.ts';
import { aggregateStability, classifyMoves } from '../src/metrics/stability.ts';
import type { StabilityRecord } from '../src/metrics/stability.ts';

const card = (id: string, slot: string, x: number, y: number): LayoutCard => ({ id, kind: 'node', product: 'ecs', frame: slot.split('#')[0], slot, index: 0, x, y, w: 188, h: 52, badges: [] });

const state = (cards: LayoutCard[]): LayoutState => ({
  version: 1,
  mode: 'architecture',
  width: 1000,
  height: 600,
  pathY: 0,
  cards: Object.fromEntries(cards.map((c) => [c.id, c])),
  frames: {},
  badges: {},
  slots: {},
  shelves: {},
  shelfKinds: {},
  order: {},
});

test('a card that moves while nothing changed in its block is unrelated', () => {
  const prev = state([card('a', 'vpc#data', 0, 0), card('c', 'vpc#ingress', 300, 0)]);
  const next = state([card('a', 'vpc#data', 0, 58), card('c', 'vpc#ingress', 300, 0), card('d', 'edge#stack', 600, 0)]);
  const m = classifyMoves(prev, next);
  assert.deepEqual(m.moved, [{ id: 'a', px: 58, cls: 'unrelated' }]);
  assert.equal(m.entered, 1);
  assert.equal(m.exited, 0);
});

test('a sibling pushed down by a card entering its block is a same-block move', () => {
  const prev = state([card('a', 'vpc#data', 0, 0), card('b', 'vpc#data', 0, 76)]);
  const next = state([card('n', 'vpc#data', 0, 0), card('a', 'vpc#data', 0, 76), card('b', 'vpc#data', 0, 152)]);
  const m = classifyMoves(prev, next);
  assert.deepEqual(
    m.moved.map((x) => [x.id, x.cls, x.px]),
    [
      ['a', 'same-block', 76],
      ['b', 'same-block', 76],
    ],
  );
});

test('a card that changed slot is re-slotted, and its old and new blocks count as touched', () => {
  const prev = state([card('a', 'vpc#data', 0, 0), card('b', 'vpc#data', 0, 76), card('z', 'reg~ai#stack', 600, 0)]);
  const next = state([card('a', 'reg~ai#stack', 600, 0), card('b', 'vpc#data', 0, 0), card('z', 'reg~ai#stack', 600, 76)]);
  const m = classifyMoves(prev, next);
  const cls = Object.fromEntries(m.moved.map((x) => [x.id, x.cls]));
  assert.deepEqual(cls, { a: 'reslotted', b: 'same-block', z: 'same-block' });
});

test('sub-pixel jitter is not a move (layoutDiff threshold 0.5 px)', () => {
  const prev = state([card('a', 'vpc#data', 0, 0)]);
  const next = state([card('a', 'vpc#data', 0.3, 0.3)]);
  assert.equal(classifyMoves(prev, next).moved.length, 0);
});

test('multi-zone and per-zone slots of one VPC share a block', () => {
  const zone = (id: string, x: number, y: number): LayoutCard => ({ ...card(id, 'za#zone', x, y), frame: 'za' });
  const prev = state([zone('a', 0, 76)]);
  const next = state([card('m', 'vpc#span', 0, 0), zone('a', 0, 152)]);
  // blockOf: '#span' -> 'vpc#zones'; '#zone' -> parent frame of 'za' + '#zones'. Without frames the parent is the
  // frame id itself ('za#zones'), so the zone card is a bystander here; with the frame registered it is same-block.
  assert.equal(classifyMoves(prev, next).moved[0].cls, 'unrelated');
  const withFrame = (s: LayoutState): LayoutState => ({ ...s, frames: { za: { id: 'za', kind: 'zone', label: 'Zone A', parent: 'vpc', depth: 2, implicit: false, empty: false, x: 0, y: 0, w: 208, h: 300 } } });
  assert.equal(classifyMoves(withFrame(prev), withFrame(next)).moved[0].cls, 'same-block');
});

test('aggregateStability splits first turns from follow-ups and lists the worst batch first', () => {
  const rec = (session: string, first: boolean, moves: Array<[string, number, 'unrelated' | 'same-block']>): StabilityRecord => ({
    session,
    case: session.split('#')[0],
    turn: first ? 0 : 1,
    kind: 'mid',
    first,
    label: 'node:x',
    moves: { moved: moves.map(([id, px, cls]) => ({ id, px, cls })), entered: 1, exited: 0 },
  });
  const r = aggregateStability([rec('c1#1', true, [['a', 58, 'unrelated']]), rec('c2#1', false, [['b', 712, 'unrelated'], ['c', 76, 'same-block']]), rec('c2#1', false, [])]);
  assert.equal(r.all.batches, 3);
  assert.equal(r.all.moved, 3);
  assert.equal(r.all.unrelated, 2);
  assert.equal(r.all.sameBlock, 1);
  assert.deepEqual(r.all.casesWithUnrelated, ['c1', 'c2']);
  assert.equal(r.firstTurns.unrelated, 1);
  assert.equal(r.followUps.unrelated, 1);
  assert.equal(r.followUps.batches, 2);
  assert.equal(r.all.maxUnrelatedPx, 712);
  assert.deepEqual(r.all.unrelatedHistogram, { '<25': 0, '25-50': 0, '50-100': 1, '100-300': 0, '300-500': 0, '500+': 1 });
  assert.equal(r.worst[0].session, 'c2#1');
  assert.equal(r.worst[0].maxPx, 712);
});
