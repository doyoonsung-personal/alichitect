import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planTablePages, planWorkflowDiagramPages } from './workflow-pagination.ts';
test('ordinary rows stay together and enormous rows split without losing lines', () => {
  const rows = [[['short']], [Array.from({ length: 140 }, (_, k) => `line-${k}`), ['service']]];
  const pages = planTablePages({ rows, firstHeight: 100, pageHeight: 200, headerHeight: 30, lineHeight: 14 });
  assert.ok(pages.length > 5);
  assert.deepEqual(pages.flatMap((p) => p.rows.flatMap((r) => r.cells[0])), rows.flatMap((r) => r[0]));
  assert.ok(pages.slice(2).every((p) => p.rows[0].continued));
  for (const [k, p] of pages.entries()) assert.ok(p.rows.reduce((n, r) => n + r.height, 30) <= (k ? 200 : 100));
});
test('25 columns get fewer, card-bearing readable details covering every card', () => {
  const cards = Array.from({ length: 25 }, (_, k) => ({ x: k * 350, y: 20, w: 260, h: 220 }));
  const pages = planWorkflowDiagramPages({ bounds: { x: 0, y: 0, w: 8800, h: 1600 }, cards, minTitlePx: 12 });
  assert.ok(pages[0].overview);
  assert.ok(pages.length <= 10);
  const windows = pages.slice(1).flatMap((p) => p.windows ?? [p.bounds]);
  for (const b of windows) assert.ok(cards.some((c) =>
    c.x >= b.x && c.y >= b.y && c.x + c.w <= b.x + b.w && c.y + c.h <= b.y + b.h));
  for (const p of pages.slice(1)) assert.ok(p.scale * 12 >= 11);
  for (const c of cards) assert.ok(windows.some((b) =>
    c.x >= b.x && c.y >= b.y && c.x + c.w <= b.x + b.w && c.y + c.h <= b.y + b.h));
});

test('a diagram fitting a landscape sheet at the title floor needs no detail tiles', () => {
  for (const bounds of [{ x: 0, y: 0, w: 800, h: 400 }, { x: 0, y: 0, w: 1300, h: 700 }]) {
    const pages = planWorkflowDiagramPages({ bounds, cards: [bounds], minTitlePx: 14 });
    assert.equal(pages.length, 1);
    assert.equal(pages[0].overview, false);
    assert.ok(pages[0].scale * 14 >= 11);
  }
});

test('sparse lower rows and trailing edge space never produce empty tiles', () => {
  const cards = [{ x: 0, y: 0, w: 200, h: 100 }, { x: 2000, y: 1600, w: 200, h: 150 }];
  const pages = planWorkflowDiagramPages({ bounds: { x: -14, y: -14, w: 4000, h: 4000 }, cards, minTitlePx: 14 });
  assert.equal(pages.length, 2);
  for (const b of pages.slice(1).flatMap((p) => p.windows ?? [p.bounds])) assert.ok(cards.some((c) =>
    c.x >= b.x && c.y >= b.y && c.x + c.w <= b.x + b.w && c.y + c.h <= b.y + b.h));
});

test('complete return routes use spare sheet space without increasing page count', () => {
  const cards = [0, 350, 2000].map(x => ({ x, y: 20, w: 260, h: 220 }));
  const input = { bounds: { x: -14, y: -14, w: 4000, h: 1600 }, cards, minTitlePx: 14 };
  const before = planWorkflowDiagramPages(input);
  const route = { from: cards[0], to: cards[1], bounds: { x: 130, y: 240, w: 350, h: 160 } };
  const after = planWorkflowDiagramPages({ ...input, routes: [route] });
  assert.equal(after.length, before.length);
  assert.ok(after.slice(1).flatMap(p => p.windows ?? [p.bounds])
    .some(b => b.y <= route.bounds.y && b.y + b.h >= route.bounds.y + route.bounds.h));
  const tooTall = planWorkflowDiagramPages({ ...input, routes: [{ ...route, bounds: { ...route.bounds, h: 2000 } }] });
  assert.deepEqual(tooTall, before, 'oversized loops use continuation references instead of adding sheets');
});
