// Drafted by Qwen (qwen3.8-max) from a written spec; reviewed by Claude.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { placePopover, overlaps } from './popover-pos.ts';
import type { Box } from './popover-pos.ts';

describe('placePopover', () => {
  const bounds: Box = { x: 0, y: 0, w: 800, h: 600 };
  const anchor: Box = { x: 300, y: 200, w: 100, h: 100 };
  const pop = { w: 120, h: 80 };

  it('places on the right side when it fits', () => {
    const p = placePopover(anchor, pop, bounds);
    assert.equal(p.side, 'right');
    assert.equal(p.x, 410); // 300 + 100 + 10
    assert.equal(p.y, 210); // 200 + 50 - 40
  });

  it('falls back to left when near the right edge', () => {
    const nearRight: Box = { x: 700, y: 200, w: 80, h: 100 };
    const p = placePopover(nearRight, pop, bounds);
    assert.equal(p.side, 'left');
    assert.equal(p.x, 570); // 700 - 120 - 10
  });

  it('clamps y near the top boundary', () => {
    const topAnchor: Box = { x: 300, y: 5, w: 100, h: 40 };
    const p = placePopover(topAnchor, pop, bounds);
    assert.equal(p.side, 'right');
    assert.equal(p.y, 8); // clamped to bounds.y + margin
  });

  it('clamps y near the bottom boundary', () => {
    const botAnchor: Box = { x: 300, y: 550, w: 100, h: 40 };
    const p = placePopover(botAnchor, pop, bounds);
    assert.equal(p.side, 'right');
    assert.equal(p.y, 512); // 600 - 8 - 80
  });

  it('places below when canvas is narrow but tall enough', () => {
    const narrowBounds: Box = { x: 0, y: 0, w: 200, h: 600 };
    const narrowAnchor: Box = { x: 50, y: 100, w: 100, h: 100 };
    const p = placePopover(narrowAnchor, pop, narrowBounds);
    assert.equal(p.side, 'below');
    assert.equal(p.y, 210); // 100 + 100 + 10
  });

  it('places above when canvas is narrow and anchor is at the bottom', () => {
    const narrowBounds: Box = { x: 0, y: 0, w: 200, h: 600 };
    const narrowAnchor: Box = { x: 50, y: 500, w: 100, h: 80 };
    const p = placePopover(narrowAnchor, pop, narrowBounds);
    assert.equal(p.side, 'above');
    assert.equal(p.y, 410); // 500 - 80 - 10
  });

  it('never overlaps the anchor when a side fits', () => {
    const p = placePopover(anchor, pop, bounds);
    const popBox: Box = { x: p.x, y: p.y, w: pop.w, h: pop.h };
    assert.equal(overlaps(popBox, anchor), false);
  });

  it('uses fallback with most free room when nothing fits', () => {
    const smallBounds: Box = { x: 0, y: 0, w: 200, h: 200 };
    const bigPop = { w: 300, h: 300 };
    const centered: Box = { x: 50, y: 50, w: 100, h: 100 };
    const p = placePopover(centered, bigPop, smallBounds);
    // Space right=50, left=50, below=50, above=50 → first max wins → right
    assert.equal(p.side, 'right');
    // Clamped to bounds because pop is bigger than bounds
    assert.equal(p.x, 8); // 0 + margin
    assert.equal(p.y, 8);
  });

  it('respects custom gap and margin', () => {
    const p = placePopover(anchor, pop, bounds, 20, 16);
    assert.equal(p.side, 'right');
    assert.equal(p.x, 420); // 300 + 100 + 20
    assert.equal(p.y, 210); // center-aligned, still within margin 16
  });

  it('fallback aligns to margin when popover exceeds bounds', () => {
    const tinyBounds: Box = { x: 10, y: 10, w: 50, h: 50 };
    const hugePop = { w: 200, h: 200 };
    const a: Box = { x: 20, y: 20, w: 30, h: 30 };
    const p = placePopover(a, hugePop, tinyBounds, 10, 8);
    assert.equal(p.x, 18); // tinyBounds.x + margin = 10 + 8
    assert.equal(p.y, 18); // tinyBounds.y + margin
  });
});
