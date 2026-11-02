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
test('25 columns get an overview and overlapping readable details covering every card', () => {
  const cards = Array.from({ length: 25 }, (_, k) => ({ x: k * 350, y: 20, w: 260, h: 220 }));
  const pages = planWorkflowDiagramPages({ bounds: { x: 0, y: 0, w: 8800, h: 1600 }, cards, minTitlePx: 12 });
  assert.ok(pages[0].overview);
  assert.ok(pages.length > 10);
  for (const p of pages.slice(1)) assert.ok(p.scale * 12 >= 11);
  for (const c of cards) assert.ok(pages.slice(1).some(({ bounds: b }) =>
    c.x >= b.x && c.y >= b.y && c.x + c.w <= b.x + b.w && c.y + c.h <= b.y + b.h));
});
