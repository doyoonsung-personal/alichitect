// Drafted by Qwen (qwen3.8-max) from a written spec; reviewed and corrected by Claude.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { PlannedEdge, Pt } from '../src/routing/types.ts';
import type { LayoutFrame, Rect } from '../../../packages/core/src/layout.ts';
import { idealLength, ambiguity, churn } from '../src/metrics/routes.ts';

const edge = (id: string, from: string, to: string, src: Rect, dst: Rect): PlannedEdge => ({
  id, edges: [id], from, to, fromFrame: false, toFrame: false, src, dst, kind: 'data', path: false,
});

const frame = (id: string, kind: string, x: number, y: number, w: number, h: number): LayoutFrame => ({
  id, kind: kind as LayoutFrame['kind'], label: '', parent: null, depth: 0, implicit: false, empty: false, x, y, w, h,
});

describe('idealLength', () => {
  test('two cards side by side on one row', () => {
    // src right-mid (10,5) to dst left-mid (20,5): |10-20|+|5-5| = 10
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    assert.equal(idealLength(src, dst), 10);
  });

  test('stacked cards bottom-mid to top-mid', () => {
    // src bottom-mid (5,10) to dst top-mid (5,20): |5-5|+|10-20| = 10
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 0, y: 20, w: 10, h: 10 };
    assert.equal(idealLength(src, dst), 10);
  });

  test('diagonal offset cards Manhattan between best side midpoints', () => {
    // src right-mid (10,5) to dst left-mid (20,15): |10-20|+|5-15| = 20
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 10, w: 10, h: 10 };
    assert.equal(idealLength(src, dst), 20);
  });
});

describe('ambiguity', () => {
  test('single straight route has detour 1 and no near pairs', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    const pts: Pt[] = [{ x: 10, y: 5 }, { x: 20, y: 5 }];
    // ideal=10, length=10, detour=10/max(8,10)=1
    const res = ambiguity([e], { r1: pts }, []);
    assert.equal(res.routes, 1);
    assert.equal(res.nearPairs, 0);
    assert.equal(res.detours.length, 1);
    assert.ok(Math.abs(res.detours[0] - 1) < 1e-9);
  });

  test('two horizontal routes 7px apart sharing 100px extent with distinct endpoints', () => {
    const src1: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst1: Rect = { x: 110, y: 0, w: 10, h: 10 };
    const src2: Rect = { x: 0, y: 7, w: 10, h: 10 };
    const dst2: Rect = { x: 110, y: 7, w: 10, h: 10 };
    const e1 = edge('r1', 'A', 'B', src1, dst1);
    const e2 = edge('r2', 'C', 'D', src2, dst2);
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 10, y: 5 }, { x: 110, y: 5 }],
      r2: [{ x: 10, y: 12 }, { x: 110, y: 12 }],
    };
    // gap=7 (<10, >=0.5), overlap=min(110,110)-max(10,10)=100, distinct endpoints so unrelated too
    const res = ambiguity([e1, e2], routes, []);
    assert.equal(res.nearPairs, 1);
    assert.equal(res.nearPx, 100);
    assert.equal(res.nearUnrelatedPairs, 1);
    assert.equal(res.nearUnrelatedPx, 100);
  });

  test('two routes sharing an endpoint count as near pair but not unrelated', () => {
    const src1: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst1: Rect = { x: 110, y: 0, w: 10, h: 10 };
    const src2: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst2: Rect = { x: 110, y: 7, w: 10, h: 10 };
    const e1 = edge('r1', 'A', 'B', src1, dst1);
    const e2 = edge('r2', 'A', 'C', src2, dst2);
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 10, y: 5 }, { x: 110, y: 5 }],
      r2: [{ x: 10, y: 12 }, { x: 110, y: 12 }],
    };
    // shared `from`='A' → not unrelated
    const res = ambiguity([e1, e2], routes, []);
    assert.equal(res.nearPairs, 1);
    assert.equal(res.nearUnrelatedPairs, 0);
  });

  test('routes exactly on top of each other are not near pairs', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 110, y: 0, w: 10, h: 10 };
    const e1 = edge('r1', 'A', 'B', src, dst);
    const e2 = edge('r2', 'C', 'D', src, dst);
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 10, y: 5 }, { x: 110, y: 5 }],
      r2: [{ x: 10, y: 5 }, { x: 110, y: 5 }],
    };
    // gap=0 < 0.5 → filtered out
    const res = ambiguity([e1, e2], routes, []);
    assert.equal(res.nearPairs, 0);
  });

  test('routes 10px apart are not near pairs (threshold is strict)', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 110, y: 0, w: 10, h: 10 };
    const e1 = edge('r1', 'A', 'B', src, dst);
    const e2 = edge('r2', 'C', 'D', src, dst);
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 10, y: 5 }, { x: 110, y: 5 }],
      r2: [{ x: 10, y: 15 }, { x: 110, y: 15 }],
    };
    // gap=10, condition is gap >= NEAR_PX(10) → continue
    const res = ambiguity([e1, e2], routes, []);
    assert.equal(res.nearPairs, 0);
  });

  test('overlap shorter than NEAR_MIN_RUN (12) is ignored', () => {
    const src1: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst1: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const src2: Rect = { x: 0, y: 7, w: 10, h: 10 };
    const dst2: Rect = { x: 20, y: 7, w: 10, h: 10 };
    const e1 = edge('r1', 'A', 'B', src1, dst1);
    const e2 = edge('r2', 'C', 'D', src2, dst2);
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 10, y: 5 }, { x: 20, y: 5 }],   // extent 10
      r2: [{ x: 10, y: 12 }, { x: 20, y: 12 }], // extent 10, overlap=10 < 12
    };
    const res = ambiguity([e1, e2], routes, []);
    assert.equal(res.nearPairs, 0);
  });

  test('horizontal segment 4px inside top border of vpc frame counts borderPx', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 60, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    // segment at y=4, frame top at y=0 → gap=4 <= BORDER_PX(6)
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 10, y: 4 }, { x: 60, y: 4 }],
    };
    const f = frame('f1', 'vpc', 0, 0, 100, 100);
    // overlap: min(60,100)-max(10,0)=50, capped at seg length 50
    const res = ambiguity([e], routes, [f]);
    assert.equal(res.borderPx, 50);
  });

  test('same segment along a lane frame counts 0 borderPx', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 60, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 10, y: 4 }, { x: 60, y: 4 }],
    };
    const f = frame('f1', 'lane', 0, 0, 100, 100);
    // lane frames are filtered out of bordered
    const res = ambiguity([e], routes, [f]);
    assert.equal(res.borderPx, 0);
  });

  test('detour floor: ideal length floored at 8px', () => {
    // Overlapping rects so idealLength=0, floored to 8
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 0, y: 0 }, { x: 16, y: 0 }], // length=16
    };
    // detour = 16 / max(8, 0) = 16/8 = 2
    const res = ambiguity([e], routes, []);
    assert.equal(res.detours.length, 1);
    assert.ok(Math.abs(res.detours[0] - 2) < 1e-9);
  });

  test('lengthPx is rounded', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    const routes: Record<string, Pt[]> = {
      r1: [{ x: 10, y: 5 }, { x: 20.3, y: 5 }], // length=10.3
    };
    const res = ambiguity([e], routes, []);
    assert.equal(res.lengthPx, 10); // Math.round(10.3)
  });
});

describe('churn', () => {
  test('unchanged endpoints and identical polyline is comparable but not changed', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    const pts: Pt[] = [{ x: 10, y: 5 }, { x: 20, y: 5 }];
    const res = churn([e], { r1: pts }, [e], { r1: pts });
    assert.equal(res.comparable, 1);
    assert.equal(res.changed, 0);
    assert.equal(res.changedPx, 0);
  });

  test('unchanged endpoints but different polyline is changed with changedPx equal to new length', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    const prevPts: Pt[] = [{ x: 10, y: 5 }, { x: 20, y: 5 }];
    const nextPts: Pt[] = [{ x: 10, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 15 }, { x: 20, y: 15 }];
    // new length: |15-10|+|5-5| + |15-15|+|15-5| + |20-15|+|15-15| = 5+10+5 = 20
    const res = churn([e], { r1: prevPts }, [e], { r1: nextPts });
    assert.equal(res.comparable, 1);
    assert.equal(res.changed, 1);
    assert.equal(res.changedPx, 20);
  });

  test('src rect moved by more than 0.5px is not comparable', () => {
    const srcPrev: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const srcNext: Rect = { x: 1, y: 0, w: 10, h: 10 }; // x moved by 1 > 0.5
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const ePrev = edge('r1', 'A', 'B', srcPrev, dst);
    const eNext = edge('r1', 'A', 'B', srcNext, dst);
    const pts: Pt[] = [{ x: 10, y: 5 }, { x: 20, y: 5 }];
    const res = churn([ePrev], { r1: pts }, [eNext], { r1: pts });
    assert.equal(res.comparable, 0);
    assert.equal(res.changed, 0);
  });

  test('route missing in previous frame is ignored', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const eNext = edge('r2', 'C', 'D', src, dst);
    const pts: Pt[] = [{ x: 10, y: 5 }, { x: 20, y: 5 }];
    // prevEdges is empty, so r2 is not found
    const res = churn([], {}, [eNext], { r2: pts });
    assert.equal(res.comparable, 0);
    assert.equal(res.changed, 0);
  });

  test('dst rect moved by more than 0.5px is not comparable', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dstPrev: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const dstNext: Rect = { x: 20, y: 1, w: 10, h: 10 };
    const ePrev = edge('r1', 'A', 'B', src, dstPrev);
    const eNext = edge('r1', 'A', 'B', src, dstNext);
    const pts: Pt[] = [{ x: 10, y: 5 }, { x: 20, y: 5 }];
    const res = churn([ePrev], { r1: pts }, [eNext], { r1: pts });
    assert.equal(res.comparable, 0);
  });

  test('polyline within 0.5 tolerance is considered same', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    const prevPts: Pt[] = [{ x: 10, y: 5 }, { x: 20, y: 5 }];
    const nextPts: Pt[] = [{ x: 10.4, y: 5.4 }, { x: 20.4, y: 5.4 }];
    const res = churn([e], { r1: prevPts }, [e], { r1: nextPts });
    assert.equal(res.comparable, 1);
    assert.equal(res.changed, 0);
  });

  test('changedPx is rounded', () => {
    const src: Rect = { x: 0, y: 0, w: 10, h: 10 };
    const dst: Rect = { x: 20, y: 0, w: 10, h: 10 };
    const e = edge('r1', 'A', 'B', src, dst);
    const prevPts: Pt[] = [{ x: 10, y: 5 }, { x: 20, y: 5 }];
    const nextPts: Pt[] = [{ x: 10, y: 5 }, { x: 20.7, y: 5 }]; // 0.7 px off (beyond the 0.5 tolerance); length 10.7
    const res = churn([e], { r1: prevPts }, [e], { r1: nextPts });
    assert.equal(res.comparable, 1);
    assert.equal(res.changed, 1);
    assert.equal(res.changedPx, 11); // Math.round(10.7)
  });
});
