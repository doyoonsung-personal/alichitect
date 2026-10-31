// nav.ts
```ts
export interface NavItem { id: string; x: number; y: number; w: number; h: number; frame: string }
export type NavDir = 'left' | 'right' | 'up' | 'down';

export function readingOrder(items: readonly NavItem[], origin: (frame: string) => { x: number; y: number }): string[] {
  const frames = [...new Set(items.map(i => i.frame))].sort((a, b) => {
    const oa = origin(a), ob = origin(b);
    return oa.x !== ob.x ? oa.x - ob.x : oa.y - ob.y;
  });
  const result: string[] = [];
  for (const f of frames) {
    const fi = items.filter(i => i.frame === f).sort((a, b) => a.y !== b.y ? a.y - b.y : a.x !== b.x ? a.x - b.x : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const rows: NavItem[][] = [];
    for (const item of fi) {
      let placed = false;
      for (const row of rows) {
        if (Math.abs(item.y - row[0].y) < 12) { row.push(item); placed = true; break; }
      }
      if (!placed) rows.push([item]);
    }
    for (const row of rows) {
      row.sort((a, b) => a.x !== b.x ? a.x - b.x : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      for (const item of row) result.push(item.id);
    }
  }
  return result;
}

export function nearest(items: readonly NavItem[], from: string, dir: NavDir): string | null {
  const f = items.find(i => i.id === from)!;
  const fcx = f.x + f.w / 2, fcy = f.y + f.h / 2;
  let best: string | null = null, bestScore = Infinity;
  for (const c of items) {
    if (c.id === from) continue;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    let valid = false, primary = 0, perp = 0;
    if (dir === 'right' && cx > fcx + 1) { valid = true; primary = cx - fcx; perp = Math.abs(cy - fcy); }
    else if (dir === 'left' && cx < fcx - 1) { valid = true; primary = fcx - cx; perp = Math.abs(cy - fcy); }
    else if (dir === 'down' && cy > fcy + 1) { valid = true; primary = cy - fcy; perp = Math.abs(cx - fcx); }
    else if (dir === 'up' && cy < fcy - 1) { valid = true; primary = fcy - cy; perp = Math.abs(cx - fcx); }
    if (!valid) continue;
    const score = primary + 2 * perp;
    if (score < bestScore || (score === bestScore && best !== null && c.id < best)) { bestScore = score; best = c.id; }
  }
  return best;
}

export function rovingStop(ids: readonly string[], current: string | null): string | null {
  if (current !== null && ids.includes(current)) return current;
  return ids.length > 0 ? ids[0] : null;
}
```

// nav.test.ts
```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readingOrder, nearest, rovingStop } from './nav.ts';
import type { NavItem } from './nav.ts';

describe('readingOrder', () => {
  it('orders across two frames and multiple rows', () => {
    const items: NavItem[] = [
      { id: 'b', x: 50, y: 0, w: 10, h: 10, frame: 'f1' },
      { id: 'a', x: 0, y: 0, w: 10, h: 10, frame: 'f1' },
      { id: 'c', x: 0, y: 30, w: 10, h: 10, frame: 'f1' },
      { id: 'd', x: 0, y: 0, w: 10, h: 10, frame: 'f2' },
    ];
    const origin = (f: string) => f === 'f1' ? { x: 0, y: 0 } : { x: 200, y: 0 };
    assert.deepEqual(readingOrder(items, origin), ['a', 'b', 'c', 'd']);
  });

  it('groups cards within 12 px y-difference into one row', () => {
    const items: NavItem[] = [
      { id: 'a', x: 0, y: 0, w: 10, h: 10, frame: 'f' },
      { id: 'b', x: 20, y: 11, w: 10, h: 10, frame: 'f' },
      { id: 'c', x: 40, y: 12, w: 10, h: 10, frame: 'f' },
    ];
    const origin = () => ({ x: 0, y: 0 });
    assert.deepEqual(readingOrder(items, origin), ['a', 'b', 'c']);
  });
});

describe('nearest', () => {
  const base: NavItem[] = [
    { id: 'center', x: 100, y: 100, w: 20, h: 20, frame: 'f' },
    { id: 'right',  x: 200, y: 100, w: 20, h: 20, frame: 'f' },
    { id: 'left',   x: 0,   y: 100, w: 20, h: 20, frame: 'f' },
    { id: 'down',   x: 100, y: 200, w: 20, h: 20, frame: 'f' },
    { id: 'up',     x: 100, y: 0,   w: 20, h: 20, frame: 'f' },
  ];

  it('finds the card to the right', () => {
    assert.equal(nearest(base, 'center', 'right'), 'right');
  });

  it('finds the card to the left', () => {
    assert.equal(nearest(base, 'center', 'left'), 'left');
  });

  it('finds the card below', () => {
    assert.equal(nearest(base, 'center', 'down'), 'down');
  });

  it('finds the card above', () => {
    assert.equal(nearest(base, 'center', 'up'), 'up');
  });

  it('returns null when no candidate lies in the given direction', () => {
    const items: NavItem[] = [
      { id: 'only', x: 0, y: 0, w: 10, h: 10, frame: 'f' },
      { id: 'left-of', x: -50, y: 0, w: 10, h: 10, frame: 'f' },
    ];
    assert.equal(nearest(items, 'left-of', 'left'), null);
  });

  it('picks aligned card over a diagonally nearer one due to perpendicular weighting', () => {
    const items: NavItem[] = [
      { id: 'from', x: 0, y: 0, w: 10, h: 10, frame: 'f' },
      { id: 'diag', x: 15, y: 15, w: 10, h: 10, frame: 'f' },
      { id: 'straight', x: 30, y: 0, w: 10, h: 10, frame: 'f' },
    ];
    // diag: primary=20, perp=20 → score=60
    // straight: primary=30, perp=0 → score=30
    assert.equal(nearest(items, 'from', 'right'), 'straight');
  });

  it('breaks ties by choosing the lexicographically smaller id', () => {
    const items: NavItem[] = [
      { id: 'from', x: 0, y: 0, w: 10, h: 10, frame: 'f' },
      { id: 'beta', x: 20, y: 0, w: 10, h: 10, frame: 'f' },
      { id: 'alpha', x: 20, y: 0, w: 10, h: 10, frame: 'f' },
    ];
    assert.equal(nearest(items, 'from', 'right'), 'alpha');
  });
});

describe('rovingStop', () => {
  it('returns current when it is still present in ids', () => {
    assert.equal(rovingStop(['a', 'b', 'c'], 'b'), 'b');
  });

  it('returns first id when current is not in ids', () => {
    assert.equal(rovingStop(['a', 'b'], 'z'), 'a');
  });

  it('returns first id when current is null', () => {
    assert.equal(rovingStop(['a', 'b'], null), 'a');
  });

  it('returns null when ids is empty', () => {
    assert.equal(rovingStop([], 'a'), null);
  });
});
```