// The adaptive layout variant: determinism, non-overlap, stability, fixed wrap, stack memory, title wrapping, speed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../../../../../packages/core/src/catalog-node.ts';
import type { LayoutState } from '../../../../../packages/core/src/layout.ts';
import { emptyGraph } from '../../../../../packages/core/src/reducer.ts';
import type { Graph } from '../../../../../packages/core/src/types.ts';
import { buildTrace } from '../../../src/trace.ts';
import type { SessionSpec } from '../../../src/inputs.ts';
import { parseContent } from '../../../src/inputs.ts';
import { layoutGraph, wrapTitle, titleComplete } from '../../adaptive.ts';
import { chooseWrap } from '../layout.ts';
import { stackUnits } from '../stack.ts';
import type { StackMemory, StackItem } from '../stack.ts';

const catalog = loadCatalog();
const CONTENT = [
  '{"t":"say","text":"A small web app."}',
  '{"t":"group","id":"sg","kind":"region","label":"Singapore","parent":null}',
  '{"t":"group","id":"vpc","kind":"vpc","label":"App VPC","parent":"sg"}',
  '{"t":"node","id":"users","product":"users","label":"Users","group":null}',
  '{"t":"node","id":"alb","product":"alb","label":"ALB","group":"vpc"}',
  '{"t":"node","id":"ecs","product":"ecs","label":"App servers","group":"vpc"}',
  '{"t":"edge","id":"e1","from":"users","to":"alb"}',
  '{"t":"edge","id":"e2","from":"alb","to":"ecs"}',
  'this line is not json',
  '{"t":"done","summary":"ok"}',
].join('\n');

const session = (): SessionSpec => ({ id: 'test:web#1', source: 'final', case: 'web', category: 'pattern', base: null, turns: [{ index: 0, raws: parseContent(CONTENT), validated: false, count: true, first: true }] });

const CANVAS = { w: 1040, h: 800 };

/** Lay out every frame of the op trace, threading prev through so the sticky memory accumulates. */
function replayFrames(): Array<{ display: Graph; state: LayoutState }> {
  const tr = buildTrace([session()], catalog, 'op');
  const frames = tr.sessions[0].frames;
  const out: Array<{ display: Graph; state: LayoutState }> = [];
  let prev: LayoutState | undefined = undefined;
  for (const f of frames) {
    const state = layoutGraph(f.display, catalog, prev, { canvas: CANVAS });
    out.push({ display: f.display, state });
    prev = state;
  }
  return out;
}

/** All cards in a layout state as an array. */
function cards(state: LayoutState): Array<{ id: string; x: number; y: number; w: number; h: number; slot: string; frame: string }> {
  return Object.values(state.cards);
}

/** Two rectangles overlap if their interiors intersect (touching edges are fine). */
function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

test('determinism: laying out the same graph twice with the same prev gives deep-equal results', () => {
  const tr = buildTrace([session()], catalog, 'op');
  const frames = tr.sessions[0].frames;
  // Find the last commit frame's display
  const lastFrame = frames[frames.length - 1];
  const g = lastFrame.display;

  // First pass: build up prev through all frames
  let prev: LayoutState | undefined = undefined;
  for (const f of frames) {
    prev = layoutGraph(f.display, catalog, prev, { canvas: CANVAS });
  }

  // Second pass: start fresh but use the final prev
  const a = layoutGraph(g, catalog, prev, { canvas: CANVAS });
  const b = layoutGraph(g, catalog, prev, { canvas: CANVAS });
  assert.deepEqual(a, b);
});

test('every card has a non-empty slot and frame, and no two cards overlap', () => {
  const runs = replayFrames();
  const finalState = runs[runs.length - 1].state;
  const cs = cards(finalState);

  assert.ok(cs.length > 0, 'should have at least one card');

  for (const c of cs) {
    assert.ok(c.slot && c.slot.length > 0, `card ${c.id} must have a non-empty slot`);
    assert.ok(c.frame && c.frame.length > 0, `card ${c.id} must have a non-empty frame`);
  }

  // Check pairwise non-overlap
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      assert.ok(!overlaps(cs[i], cs[j]), `cards ${cs[i].id} and ${cs[j].id} overlap`);
    }
  }
});

test('stability: adding a node in an empty block does not move existing cards', () => {
  const tr = buildTrace([session()], catalog, 'op');
  const frames = tr.sessions[0].frames;

  // Replay to get the state after all original frames
  let prev: LayoutState | undefined = undefined;
  for (const f of frames) {
    prev = layoutGraph(f.display, catalog, prev, { canvas: CANVAS });
  }
  const beforeState = prev!;
  const beforeCards = cards(beforeState);

  // Build a new graph that adds a node "waf" with product "waf", group null (a new block)
  const g = structuredClone(frames[frames.length - 1].display) as Graph;
  g.nodes['waf'] = { id: 'waf', product: 'waf', label: 'WAF', group: null };

  const afterState = layoutGraph(g, catalog, beforeState, { canvas: CANVAS });
  const afterCards = cards(afterState);

  // For each card that existed before, its position should be unchanged
  const beforeMap = new Map(beforeCards.map((c) => [c.id, c]));
  const afterMap = new Map(afterCards.map((c) => [c.id, c]));

  for (const [id, bc] of beforeMap) {
    const ac = afterMap.get(id);
    assert.ok(ac, `card ${id} should still exist after adding waf`);
    assert.equal(ac!.x, bc.x, `card ${id} x moved from ${bc.x} to ${ac!.x}`);
    assert.equal(ac!.y, bc.y, `card ${id} y moved from ${bc.y} to ${ac!.y}`);
  }
});

test('wrap is fixed across canvas changes when prev is passed', () => {
  const tr = buildTrace([session()], catalog, 'op');
  const frames = tr.sessions[0].frames;

  // Lay out with canvas 1040x800
  let prev: LayoutState | undefined = undefined;
  for (const f of frames) {
    prev = layoutGraph(f.display, catalog, prev, { canvas: CANVAS });
  }
  const firstWrap = (prev as any)?.adaptive?.wrap;
  assert.ok(firstWrap !== undefined, 'first layout should set adaptive.wrap');

  // Continue laying out with a different canvas, passing prev
  const BIG_CANVAS = { w: 1520, h: 940 };
  const g = frames[frames.length - 1].display;
  const next = layoutGraph(g, catalog, prev, { canvas: BIG_CANVAS });
  const fresh = layoutGraph(g, catalog, undefined, { canvas: BIG_CANVAS });
  const secondWrap = (next as any)?.adaptive?.wrap;
  assert.equal(secondWrap, firstWrap, 'wrap should stay equal when prev is passed');

  // a fresh layout (no prev) at the big canvas chooses again
  assert.equal(firstWrap, 'narrow');
  assert.equal((fresh as any).adaptive.wrap, 'stacked');
  assert.equal(chooseWrap({ w: 880, h: 720 }), 'narrow');
  assert.equal(chooseWrap({ w: 1520, h: 940 }), 'stacked');
  assert.equal(chooseWrap({ w: 1920, h: 1000 }), 'wide');
});

test('stackUnits: appending moves nothing earlier; ghosts keep space', () => {
  // Scenario 1: add a unit at the far end — earlier units don't move
  const items1: StackItem[] = [
    { id: 'a', live: 100, spare: 20 },
    { id: 'b', live: 100, spare: 20 },
  ];
  const gap = 10;
  const mem1: StackMemory = { order: {}, res: {} };
  const r1 = stackUnits('lane', items1, gap, undefined, mem1);
  assert.equal(r1.at.get('a'), 0);
  assert.equal(r1.at.get('b'), 100 + 20 + gap); // a's reservation + gap

  // Now add item 'c' at the end, passing prev=mem1
  const items2: StackItem[] = [
    { id: 'a', live: 100, spare: 20 },
    { id: 'b', live: 100, spare: 20 },
    { id: 'c', live: 100, spare: 20 },
  ];
  const mem2: StackMemory = { order: {}, res: {} };
  const r2 = stackUnits('lane', items2, gap, mem1, mem2);
  assert.equal(r2.at.get('a'), 0, 'unit a should not move');
  assert.equal(r2.at.get('b'), r1.at.get('b'), 'unit b should not move');
  assert.ok(r2.at.has('c'), 'unit c should be present');

  // Scenario 2: remove a middle unit — later unit keeps its offset due to ghost memory
  const items3: StackItem[] = [
    { id: 'a', live: 100, spare: 20 },
    { id: 'c', live: 100, spare: 20 },
  ];
  const mem3: StackMemory = { order: {}, res: {} };
  const r3 = stackUnits('lane', items3, gap, mem2, mem3);
  // b is gone but its reservation stays as a ghost; c should keep its old offset
  assert.equal(r3.at.get('a'), 0);
  assert.equal(r3.at.get('c'), r2.at.get('c'), 'unit c should keep its offset despite b being removed');
});

test('wrapTitle and titleComplete behave correctly', () => {
  const lines = wrapTitle('Cloud-native API Gateway');
  assert.ok(lines.length <= 2, `wrapTitle should produce at most 2 lines, got ${lines.length}`);
  assert.ok(titleComplete('Short'));
});

test('speed: 30-card layout under 2ms on average over 50 reps', () => {
  // Build a graph with 30 ecs nodes in vpc group
  const g = emptyGraph() as Graph;
  g.groups['sg'] = { id: 'sg', kind: 'region', label: 'Singapore', parent: null };
  g.groups['vpc'] = { id: 'vpc', kind: 'vpc', label: 'App VPC', parent: 'sg' };
  for (let i = 0; i < 30; i++) {
    g.nodes[`n${i}`] = { id: `n${i}`, product: 'ecs', label: `Server ${i}`, group: 'vpc' };
  }

  const REPS = 50;
  const start = performance.now();
  for (let r = 0; r < REPS; r++) {
    layoutGraph(g, catalog, undefined, { canvas: CANVAS });
  }
  const elapsed = performance.now() - start;
  const avgMs = elapsed / REPS;
  assert.ok(avgMs < 2, `average layout time ${avgMs.toFixed(3)}ms exceeds 2ms budget`);
});
