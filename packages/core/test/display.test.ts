// Display rules (src/display.ts): what the canvas draws mid-turn, and the guarantee that the closing display is the commit.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Graph, Op } from '../src/types.ts';
import { loadCatalog } from '../src/catalog-node.ts';
import { applyOp, createCtx, emptyGraph } from '../src/reducer.ts';
import type { ApplyCtx } from '../src/reducer.ts';
import { repairGraph, validateOp } from '../src/validate.ts';
import { cardIds, displayGraph, holdBack, isCard, touchedBy } from '../src/display.ts';
import type { DisplayState } from '../src/display.ts';

const CAT = loadCatalog();

function apply(g: Graph, ctx: ApplyCtx, ops: unknown[], touched?: Set<string>): Graph {
  for (const raw of ops) {
    const v = validateOp(raw, CAT, ctx);
    if (!v.op) continue;
    if (touched) for (const id of touchedBy(v.op)) touched.add(id);
    g = applyOp(g, v.op, ctx).graph;
  }
  return g;
}
const node = (id: string, product: string, group: string | null = null, extra: Record<string, unknown> = {}) => ({ t: 'node', id, product, label: id, group, ...extra });
const edge = (id: string, from: string, to: string) => ({ t: 'edge', id, from, to });
const group = (id: string, kind: string, parent: string | null = null, label = id) => ({ t: 'group', id, kind, label, parent });

/** A committed base: two per-zone web replicas behind an ALB with WAF, merged by repair into one multi-zone node. */
function base(): { raw: Graph; committed: Graph } {
  const raw = apply(emptyGraph(), createCtx(), [
    group('sg', 'region', null, 'Singapore (ap-southeast-1)'),
    group('v', 'vpc', 'sg'),
    group('za', 'zone', 'v', 'Zone A'),
    group('zb', 'zone', 'v', 'Zone B'),
    node('users', 'users'),
    node('alb', 'alb', 'v'),
    node('waf', 'waf', 'v', { attachTo: 'alb' }),
    { ...node('web-a', 'ecs', 'za'), label: 'Web (Zone A)' },
    { ...node('web-b', 'ecs', 'zb'), label: 'Web (Zone B)' },
    edge('e0', 'users', 'alb'),
    edge('e1', 'alb', 'web-a'),
    edge('e2', 'alb', 'web-b'),
  ]);
  return { raw, committed: repairGraph(raw, CAT).graph };
}

describe('holdBack', () => {
  test('a replica uncovered by a removal and a badge orphaned by its host do not flash in mid-turn; they appear at turn end', () => {
    // A working raw graph that still holds both per-zone replicas (as the spike's B3 follow-up did); the display at
    // turn start is its repair, where web-b is merged into web-a. The model then removes web-a and the ALB.
    const { raw: start, committed } = base();
    assert.deepEqual(cardIds(committed).sort(), ['alb', 'users', 'web-a']);
    const touched = new Set<string>();
    const raw = apply(start, createCtx(), [{ t: 'remove', id: 'web-a' }, { t: 'remove', id: 'alb' }], touched);
    assert.deepEqual([...touched], [], 'removals name no subject that becomes a card');
    const shown = new Set(cardIds(committed));
    const state: DisplayState = { turnOpen: true, drawn: shown, shownAtTurnStart: shown, touched };
    const mid = displayGraph(raw, CAT, state);
    assert.ok(mid.repair.graph.nodes.waf && !mid.repair.graph.nodes.waf.attachTo, 'the WAF lost its host and would be a card');
    assert.deepEqual(mid.held.sort(), ['waf', 'web-b']);
    assert.equal(mid.graph.nodes['web-b'], undefined);
    const end = displayGraph(raw, CAT, { ...state, turnOpen: false });
    assert.deepEqual(end.held, []);
    assert.deepEqual(end.graph, end.repair.graph, 'the closing display is exactly the graph that is committed');
    // A replica the turn itself re-emits is its subject and shows at once.
    const t2 = new Set<string>();
    const raw2 = apply(start, createCtx(), [{ t: 'remove', id: 'web-a' }, node('web-b', 'ecs', 'v')], t2);
    assert.deepEqual(displayGraph(raw2, CAT, { ...state, touched: t2 }).held, []);
  });

  test('a card the turn names appears at once; edges to held cards are held too; nothing is held before the first draw', () => {
    const g = apply(emptyGraph(), createCtx(), [group('sg', 'region'), group('v', 'vpc', 'sg'), node('a', 'ecs', 'v'), node('b', 'rds', 'v'), edge('e', 'a', 'b')]);
    const held = holdBack(g, { turnOpen: true, drawn: new Set(['a']), shownAtTurnStart: new Set(['a']), touched: new Set() });
    assert.deepEqual(held.held, ['b']);
    assert.deepEqual(Object.keys(held.graph.edges), []);
    assert.deepEqual(holdBack(g, { turnOpen: true, drawn: new Set(['a']), shownAtTurnStart: new Set(['a']), touched: new Set(['b']) }).held, []);
    assert.deepEqual(holdBack(g, { turnOpen: true, drawn: new Set(['a', 'b']), shownAtTurnStart: new Set(), touched: new Set() }).held, [], 'already drawn');
    assert.deepEqual(holdBack(g, { turnOpen: true, shownAtTurnStart: new Set(), touched: new Set() }).held, [], 'nothing drawn yet');
    assert.equal(holdBack(g, { turnOpen: false, drawn: new Set(), shownAtTurnStart: new Set(), touched: new Set() }).graph, g);
  });
});

describe('keepInline and helpers', () => {
  test('a WAF the user keeps in the path stays a hop; otherwise it becomes a badge on the ALB', () => {
    const raw = apply(emptyGraph(), createCtx(), [
      group('sg', 'region'),
      group('v', 'vpc', 'sg'),
      group('edge', 'edge'),
      node('users', 'users'),
      node('waf', 'waf', 'edge'),
      node('alb', 'alb', 'v'),
      edge('e1', 'users', 'waf'),
      edge('e2', 'waf', 'alb'),
    ]);
    const state: DisplayState = { turnOpen: false, shownAtTurnStart: new Set(), touched: new Set() };
    assert.equal(displayGraph(raw, CAT, state).graph.nodes.waf.attachTo, 'alb');
    const kept = displayGraph(raw, CAT, state, { keepInline: ['waf'] });
    assert.equal(kept.graph.nodes.waf.attachTo, undefined);
    assert.deepEqual(Object.keys(kept.graph.edges).sort(), ['e1', 'e2']);
    assert.deepEqual(kept.graph, repairGraph(raw, CAT, { keepInline: ['waf'] }).graph, 'commit with the same options');
  });

  test('touchedBy names only the op subject; isCard excludes badges on existing hosts', () => {
    const ops: Op[] = [
      { t: 'node', id: 'a', product: 'ecs', label: 'A' },
      { t: 'insert', id: 'b', product: 'waf', label: 'B', on: 'e' },
      { t: 'move', id: 'c', to: null },
      { t: 'rec', product: 'qoder', fit: 'primary', why: 'x' },
      { t: 'remove', id: 'd' },
      { t: 'edge', id: 'e', from: 'a', to: 'b' },
      { t: 'say', text: 'hi' },
    ];
    assert.deepEqual(ops.map(touchedBy), [['a'], ['b'], ['c'], ['qoder'], [], [], []]);
    const { committed } = base();
    assert.equal(isCard(committed, committed.nodes.waf), false);
    assert.equal(isCard(committed, committed.nodes.alb), true);
  });
});
