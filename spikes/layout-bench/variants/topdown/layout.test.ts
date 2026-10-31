// Invariants of the topdown layout. Run with: node --test (inside spikes/layout-bench).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { loadCatalog } from '../../../../packages/core/src/catalog-node.ts';
import type { Graph, GraphGroup, GraphNode } from '../../../../packages/core/src/types.ts';
import { layoutTopdown } from './layout.ts';
import { topdownCardText } from './text.ts';
import { wrapTitle } from './wrap.ts';
import { readFileSync } from 'node:fs';
import type { AdvanceTable } from '../../src/text.ts';

const catalog = loadCatalog();
const CANVAS = { w: 1040, h: 800 };
const graph = (groups: GraphGroup[], nodes: GraphNode[]): Graph => ({
  groups: Object.fromEntries(groups.map((x) => [x.id, x])),
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  edges: {},
  recs: [],
});
const groups: GraphGroup[] = [
  { id: 'ext', kind: 'external', label: 'Users', parent: null },
  { id: 'region', kind: 'region', label: 'Singapore', parent: null },
  { id: 'vpc', kind: 'vpc', label: 'VPC', parent: 'region' },
];
const nodes: GraphNode[] = [
  { id: 'users', product: 'users', label: 'Users', group: 'ext' },
  { id: 'alb', product: 'alb', label: 'ALB', group: 'vpc' },
  { id: 'ecs', product: 'ecs', label: 'App servers', group: 'vpc' },
  { id: 'rds', product: 'rds', label: 'RDS', group: 'vpc' },
  { id: 'oss', product: 'oss', label: 'OSS', group: 'region' },
];

test('the request path runs top to bottom: users above ingress above compute above data', () => {
  const l = layoutTopdown(graph(groups, nodes), catalog, undefined, CANVAS);
  const y = (id: string): number => l.cards[id].y;
  assert.ok(y('users') < y('alb'));
  assert.ok(y('alb') < y('ecs'));
  assert.ok(y('ecs') < y('rds'));
});

test('is deterministic and pure', () => {
  const g = graph(groups, nodes);
  assert.deepEqual(layoutTopdown(g, catalog, undefined, CANVAS), layoutTopdown(g, catalog, undefined, CANVAS));
});

test('adding a card to an existing tier moves no card of another block', () => {
  const a = layoutTopdown(graph(groups, nodes), catalog, undefined, CANVAS);
  const more: GraphNode[] = [...nodes, { id: 'tair', product: 'tair', label: 'Tair', group: 'vpc' }];
  const b = layoutTopdown(graph(groups, more), catalog, a, CANVAS);
  for (const id of ['users', 'alb', 'ecs', 'oss']) assert.deepEqual([b.cards[id].x, b.cards[id].y], [a.cards[id].x, a.cards[id].y], id);
});

test('a card in a later tier does not move the earlier tiers (request-path order of arrival)', () => {
  const a = layoutTopdown(graph(groups, nodes.slice(0, 2)), catalog, undefined, CANVAS);
  const b = layoutTopdown(graph(groups, nodes.slice(0, 3)), catalog, a, CANVAS);
  for (const id of ['users', 'alb']) assert.deepEqual([b.cards[id].x, b.cards[id].y], [a.cards[id].x, a.cards[id].y], id);
});

test('the card subtitle is never the lane name; a title that is the short name gets the official full name or nothing', () => {
  const g = graph(groups, nodes);
  const l = layoutTopdown(g, catalog, undefined, CANVAS);
  for (const c of Object.values(l.cards)) {
    const t = topdownCardText(c, g, catalog);
    assert.ok(!c.slot.toLowerCase().includes(t.subtitle.toLowerCase()) || t.subtitle === '');
    assert.ok(t.title.length > 0);
  }
});

test('a title that does not fit one line wraps to two instead of being cut', () => {
  const table = JSON.parse(readFileSync(new URL('../../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
  const r = wrapTitle(table, 'Session and Location Cache', 15, 144);
  assert.equal(r.cut, false);
  assert.equal(r.lines.length, 2);
  assert.equal(wrapTitle(table, 'ALB', 15, 144).lines.length, 1);
});

test('a 30-card state lays out in under 2 ms', () => {
  const many: GraphNode[] = [{ id: 'users', product: 'users', label: 'Users', group: 'ext' }];
  for (let i = 0; i < 29; i++) many.push({ id: `s${i}`, product: i % 3 === 0 ? 'rds' : 'ecs', label: `Service ${i}`, group: 'vpc' });
  const g = graph(groups, many);
  layoutTopdown(g, catalog, undefined, CANVAS);
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) layoutTopdown(g, catalog, undefined, CANVAS);
  assert.ok((performance.now() - t0) / 20 < 2);
});
