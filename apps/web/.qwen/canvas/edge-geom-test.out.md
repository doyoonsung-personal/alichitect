// edge-geom.test.ts
```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { roundedPath, arrowPath, segmentsOf, placeEdgeLabel } from './edge-geom.ts';

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

describe('roundedPath', () => {
  it('returns the empty string for an empty or one-point list', () => {
    assert.equal(roundedPath([]), '');
    assert.equal(roundedPath([{ x: 0, y: 0 }]), '');
  });

  it('produces M..L.. with no Q for a straight two-point route', () => {
    const d = roundedPath([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    assert.match(d, /^M[\d.-]+,[\d.-]+ L[\d.-]+,[\d.-]+$/);
    assert.ok(!d.includes('Q'), 'should contain no Q command');
  });

  it('contains exactly one Q and starts at the first point and ends at the last for an L-shaped three-point route', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }];
    const d = roundedPath(pts);
    const qCount = (d.match(/Q/g) || []).length;
    assert.equal(qCount, 1, 'should contain exactly one Q');
    assert.ok(d.startsWith('M0,0'), 'should start at the first point');
    assert.ok(d.endsWith('L20,20'), 'should end at the last point');
  });

  it('shrinks the corner radius on a short segment so control points are no more than 2 px from the corner', () => {
    // The middle segment is only 4 px long, so r <= 4/2 = 2
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 20 }];
    const d = roundedPath(pts);
    const nums = d.match(/-?\d+\.?\d*/g)!.map(Number);
    const cx = 14;
    const cy = 0;
    // Walk through commands: M(2) then groups of L(2) or Q(4)
    let i = 0;
    while (i < nums.length) {
      if (i === 0) {
        // M x,y
        i += 2;
        continue;
      }
      // Check if this could be a Q by looking ahead: L has 2 nums, Q has 4
      // We just check every pair/triple against the corner
      // Actually, let's extract all coordinate pairs and check distance to corner
      i += 1; // skip to next coordinate set after initial parse
    }
    // Simpler approach: parse out all numbers and check each consecutive pair
    const coords: Pt[] = [];
    for (let j = 0; j < nums.length - 1; j += 2) {
      coords.push({ x: nums[j], y: nums[j + 1] });
    }
    for (const p of coords) {
      const dist = Math.hypot(p.x - cx, p.y - cy);
      assert.ok(dist <= 2.001, `control point (${p.x},${p.y}) is ${dist.toFixed(2)} px from corner, expected <= 2`);
    }
  });
});

describe('arrowPath', () => {
  it('ends at the last point (its middle L is the last point)', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 20, y: 0 }];
    const d = arrowPath(pts);
    // Format: M...,... L<lastX>,<lastY> L...,...
    const parts = d.split(' ');
    assert.equal(parts[1], 'L20,0', 'middle L should be the last point');
  });

  it('has two arms that are 7 px long by default for a horizontal final segment', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 20, y: 0 }];
    const d = arrowPath(pts);
    const nums = d.match(/-?\d+\.?\d*/g)!.map(Number);
    const tip = { x: nums[2], y: nums[3] }; // after M x,y L x,y → indices 2,3
    const arm1 = { x: nums[0], y: nums[1] };
    const arm2 = { x: nums[4], y: nums[5] };
    const len1 = Math.hypot(tip.x - arm1.x, tip.y - arm1.y);
    const len2 = Math.hypot(tip.x - arm2.x, tip.y - arm2.y);
    assert.ok(Math.abs(len1 - 7) < 0.01, `arm1 length should be ~7, got ${len1}`);
    assert.ok(Math.abs(len2 - 7) < 0.01, `arm2 length should be ~7, got ${len2}`);
  });

  it('has two arms that are 7 px long by default for a vertical final segment', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 0, y: 20 }];
    const d = arrowPath(pts);
    const nums = d.match(/-?\d+\.?\d*/g)!.map(Number);
    const tip = { x: nums[2], y: nums[3] };
    const arm1 = { x: nums[0], y: nums[1] };
    const arm2 = { x: nums[4], y: nums[5] };
    const len1 = Math.hypot(tip.x - arm1.x, tip.y - arm1.y);
    const len2 = Math.hypot(tip.x - arm2.x, tip.y - arm2.y);
    assert.ok(Math.abs(len1 - 7) < 0.01, `arm1 length should be ~7, got ${len1}`);
    assert.ok(Math.abs(len2 - 7) < 0.01, `arm2 length should be ~7, got ${len2}`);
  });
});

describe('segmentsOf', () => {
  it('drops zero-length segments', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }];
    const segs = segmentsOf(pts);
    assert.equal(segs.length, 1);
    assert.equal(segs[0].len, 10);
  });

  it('flags horizontal segments correctly', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }];
    const segs = segmentsOf(pts);
    assert.equal(segs.length, 2);
    assert.equal(segs[0].horizontal, true);
    assert.equal(segs[1].horizontal, false);
  });
});

describe('placeEdgeLabel', () => {
  it('centres on the longest horizontal segment', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }];
    const result = placeEdgeLabel(pts, 40, []);
    assert.ok(result);
    // Longest horizontal segment is (0,0)→(100,0), midpoint x=50, y=0
    assert.equal(result.textX, 50 - 40 / 2);
    assert.equal(result.textY, 0);
    assert.equal(result.plate.x, 50 - 40 / 2 - 2);
    assert.equal(result.plate.y, 0 - 16 / 2);
    assert.equal(result.plate.w, 40 + 4);
    assert.equal(result.plate.h, 16);
  });

  it('returns null when the longest segment is shorter than textW + 16', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 30, y: 0 }];
    // textW=20, need >= 36, but segment is 30
    const result = placeEdgeLabel(pts, 20, []);
    assert.equal(result, null);
  });

  it('places beside a vertical segment with plate starting 6 px minus 2 right of the line (x = line + 4)', () => {
    // Only a vertical segment long enough
    const pts: Pt[] = [{ x: 10, y: 0 }, { x: 10, y: 100 }];
    const result = placeEdgeLabel(pts, 30, []);
    assert.ok(result);
    assert.equal(result.plate.x, 10 + 6 - 2); // = 14
    assert.equal(result.textX, 10 + 6); // = 16
    assert.equal(result.textY, 50); // midpoint y
  });

  it('skips a candidate that hits an obstacle and tries the next longest segment', () => {
    const pts: Pt[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },   // longest horizontal, mid=(50,0)
      { x: 100, y: 80 },  // second longest vertical, mid=(100,40)
      { x: 200, y: 80 },  // third horizontal, mid=(150,80)
    ];
    // Obstacle covering the first segment's label area
    const obstacle: Rect = { x: 20, y: -20, w: 60, h: 40 };
    const result = placeEdgeLabel(pts, 30, [obstacle]);
    assert.ok(result);
    // Should skip the first segment and land on the vertical (len=80 > 32)
    // Vertical segment at x=100, plate.x = 100 + 6 - 2 = 104
    assert.equal(result.plate.x, 104);
    assert.equal(result.textX, 106);
    assert.equal(result.textY, 40);
  });

  it('returns null when all candidates hit obstacles', () => {
    const pts: Pt[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const obstacle: Rect = { x: -100, y: -100, w: 300, h: 200 };
    const result = placeEdgeLabel(pts, 30, [obstacle]);
    assert.equal(result, null);
  });
});
```