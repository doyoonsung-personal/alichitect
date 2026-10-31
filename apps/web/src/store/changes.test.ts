import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ApplyResult, Graph, Op } from '@ali/core/types.ts';
import { applyOp, createCtx, emptyGraph } from '@ali/core/reducer.ts';
import { catalog } from '../test/fixtures.ts';
import { applyChange, connectionDetail, countChanges, reconcileChanges } from './changes.ts';
import { lifecycleNote } from './lifecycle.ts';
import { cursorMode, nextCursorChange } from '../stream/cursor.ts';
import type { ChangeLine } from './types.ts';

/** Applies ops one by one, folding each into the change list, like the reducer does. */
function run(ops: Op[], start: Graph = emptyGraph()): { lines: ChangeLine[]; graph: Graph } {
  const ctx = createCtx();
  let graph = start;
  let lines: ChangeLine[] = [];
  for (const op of ops) {
    const res: ApplyResult = applyOp(graph, op, ctx);
    lines = applyChange(lines, op, graph, res, catalog, 'main');
    graph = res.graph;
  }
  return { lines, graph };
}

const grp = (id: string, kind: 'external' | 'region' | 'vpc', parent: string | null = null): Op => ({ t: 'group', id, kind, label: id, parent });

test('a planned product becomes an added line in place when its card lands, and keeps its position', () => {
  const { lines } = run([
    { t: 'plan', products: ['alb', 'ecs', 'rds'] },
    grp('sg', 'region'),
    grp('vpc', 'vpc', 'sg'),
    { t: 'node', id: 'ecs-1', product: 'ecs', label: 'Portal servers', group: 'vpc', zones: ['a', 'b'] },
  ]);
  assert.deepEqual(lines.map((l) => [l.kind, l.name]), [['planned', 'ALB'], ['added', 'ECS'], ['planned', 'RDS']]);
  const added = lines[1];
  assert.equal(added.label, 'Portal servers');
  assert.deepEqual(added.zones, ['A', 'B']);
  assert.deepEqual(added.cards, ['ecs-1']);
});

test('names come from the catalog, and a label equal to the name is not repeated', () => {
  const { lines } = run([grp('sg', 'region'), { t: 'node', id: 'a', product: 'alb', label: 'ALB', group: 'sg' }, { t: 'node', id: 'b', product: 'alb', label: 'Load balancer for the portal', group: 'sg' }]);
  assert.equal(lines[0].name, catalog.byId.get('alb')!.short);
  assert.equal(lines[0].label, undefined);
  assert.equal(lines[1].label, 'Load balancer for the portal');
});

test('a badge is an attachment line with its host', () => {
  const { lines } = run([
    grp('sg', 'region'),
    grp('vpc', 'vpc', 'sg'),
    { t: 'node', id: 'alb', product: 'alb', label: 'ALB', group: 'vpc' },
    { t: 'node', id: 'waf', product: 'waf', label: 'WAF', group: 'vpc', attachTo: 'alb' },
  ]);
  const waf = lines.find((l) => l.cards.includes('waf'))!;
  assert.equal(waf.kind, 'attached');
  assert.equal(waf.host, catalog.byId.get('alb')!.short);
});

test('a remove and an add in the same lane in one revision is one replacement', () => {
  const base = run([
    grp('sg', 'region'),
    grp('vpc', 'vpc', 'sg'),
    { t: 'node', id: 'ecs-1', product: 'ecs', label: 'Portal servers', group: 'vpc' },
  ]).graph;
  const { lines } = run([{ t: 'remove', id: 'ecs-1' }, { t: 'node', id: 'ack-1', product: 'ack', label: 'Portal on Kubernetes', group: 'vpc' }], base);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].kind, 'replaced');
  assert.equal(lines[0].fromName, 'ECS');
  assert.equal(lines[0].name, 'ACK');
  assert.deepEqual(lines[0].cards, ['ack-1']);
  assert.deepEqual(lines[0].ghosts, ['ecs-1']);
  // the other order pairs too
  const swapped = run([{ t: 'node', id: 'ack-1', product: 'ack', label: 'Portal on Kubernetes', group: 'vpc' }, { t: 'remove', id: 'ecs-1' }], base);
  assert.deepEqual(swapped.lines.map((l) => l.kind), ['replaced']);
  assert.equal(countChanges(lines).added, 1);
  assert.equal(countChanges(lines).removed, 1);
});

test('a card drawn and removed in the same revision leaves no line', () => {
  const { lines } = run([grp('sg', 'region'), { t: 'node', id: 'x', product: 'oss', label: 'Images', group: 'sg' }, { t: 'remove', id: 'x' }]);
  assert.deepEqual(lines, []);
});

test('an existing card removed is a removed line with its ghost; its edges are not a separate line', () => {
  const base = run([
    grp('sg', 'region'),
    { t: 'node', id: 'a', product: 'oss', label: 'Images', group: 'sg' },
    { t: 'node', id: 'b', product: 'sls', label: 'Logs', group: 'sg' },
    { t: 'edge', id: 'e-a-b', from: 'a', to: 'b' },
  ]).graph;
  const { lines } = run([{ t: 'remove', id: 'a' }], base);
  assert.deepEqual(lines.map((l) => l.kind), ['removed']);
  assert.deepEqual(lines[0].ghosts, ['a']);
});

test('connections aggregate into one line per revision, with their ends', () => {
  const base = run([
    grp('sg', 'region'),
    { t: 'node', id: 'a', product: 'oss', label: 'Images', group: 'sg' },
    { t: 'node', id: 'b', product: 'sls', label: 'Logs', group: 'sg' },
    { t: 'node', id: 'c', product: 'kms', label: 'Keys', group: 'sg' },
  ]).graph;
  const { lines } = run([{ t: 'edge', id: 'e1', from: 'a', to: 'b' }, { t: 'edge', id: 'e2', from: 'b', to: 'c' }], base);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].kind, 'connections');
  assert.equal(lines[0].count, 2);
  assert.equal(connectionDetail(lines[0]), 'Images to Logs to Keys');
  assert.equal(connectionDetail({ ...lines[0], pairs: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h']] }), '', 'more than three ends: no detail');
});

test('a recommendation is a recommended line; a gap is a gap line', () => {
  const { lines } = run([
    { t: 'plan', products: ['qoder-teams'] },
    { t: 'rec', product: 'qoder-teams', fit: 'primary', why: 'Team seats.' },
    { t: 'gap', need: 'On-prem agents', note: 'No entry fits.' },
  ]);
  assert.deepEqual(lines.map((l) => l.kind), ['recommended', 'gap']);
  assert.equal(lines[0].fit, 'primary');
  assert.deepEqual(lines[0].cards, ['rec:qoder-teams']);
});

test('reconcile: a card the repair merged away drops its line, a hop that became a badge becomes an attachment, a repair-made card gets a line', () => {
  const before = emptyGraph();
  const streamed: ChangeLine[] = [
    { key: 'added:gone', kind: 'added', phase: 'main', product: 'ecs', name: 'ECS', cards: ['gone'], ghosts: [] },
    { key: 'added:waf', kind: 'added', phase: 'main', product: 'waf', name: 'WAF', cards: ['waf'], ghosts: [] },
    { key: 'planned:oss', kind: 'planned', phase: 'main', product: 'oss', name: 'OSS', cards: [], ghosts: [] },
  ];
  const committed: Graph = {
    groups: {},
    recs: [],
    edges: {},
    nodes: {
      alb: { id: 'alb', product: 'alb', label: 'ALB', group: null },
      waf: { id: 'waf', product: 'waf', label: 'WAF', group: null, attachTo: 'alb' },
      extra: { id: 'extra', product: 'sls', label: 'Logs', group: null },
    },
  };
  const out = reconcileChanges(streamed, before, committed, catalog);
  assert.ok(!out.some((l) => l.cards.includes('gone')));
  assert.ok(!out.some((l) => l.kind === 'planned'));
  const waf = out.find((l) => l.cards.includes('waf'))!;
  assert.equal(waf.kind, 'attached');
  assert.equal(waf.host, 'ALB');
  assert.ok(out.some((l) => l.cards.includes('extra') && l.kind === 'added'));
  assert.ok(out.some((l) => l.cards.includes('alb') && l.kind === 'added'), 'a card no streamed op explained still gets a line');
});

test('lifecycle notes: real renames and retirements, not spelling variants', () => {
  const rename = lifecycleNote({ code: 'alias-resolved', ids: ['n'], msg: "'Tongyi Lingma' resolved to 'qoder'", severity: 'info', repaired: true }, catalog);
  assert.equal(rename?.kind, 'renamed');
  assert.equal(rename?.old, 'Tongyi Lingma');
  assert.equal(rename?.new, catalog.byId.get('qoder')!.short);
  assert.equal(lifecycleNote({ code: 'alias-resolved', ids: ['n'], msg: "'Alibaba Cloud ECS' resolved to 'ecs'", severity: 'info', repaired: true }, catalog), null);
  const china = lifecycleNote({ code: 'china-only', ids: [], msg: "'icp-filing' is sold only on the China site (Needed only for servers in the Chinese mainland.)", severity: 'warn', repaired: false }, catalog);
  assert.equal(china?.kind, 'chinaOnly');
  assert.equal(china?.product, catalog.byId.get('icp-filing')!.short);
  const retired = lifecycleNote({ code: 'retired-product', ids: ['n'], msg: "'dcdn' is retired: Moved. Using esa (Edge Security Acceleration).", severity: 'warn', repaired: true }, catalog);
  assert.equal(retired?.kind, 'retired');
  assert.equal(retired?.new, catalog.byId.get('esa')!.short);
  assert.equal(lifecycleNote({ code: 'retired-product', ids: ['n'], msg: "'x' is legacy; prefer 'y'", severity: 'warn', repaired: false }, catalog), null);
});

test('the Cursor is solid for 600 ms after text, blinks when silent, and is hidden when idle', () => {
  assert.equal(cursorMode(false, 1000, 1100), 'hidden');
  assert.equal(cursorMode(true, null, 5), 'blink');
  assert.equal(cursorMode(true, 1000, 1599), 'solid');
  assert.equal(cursorMode(true, 1000, 1600), 'blink');
  assert.equal(nextCursorChange(true, 1000, 1200), 400);
  assert.equal(nextCursorChange(true, 1000, 1600), null);
  assert.equal(nextCursorChange(true, null, 0), null);
  assert.equal(nextCursorChange(false, 1000, 1100), null);
});
