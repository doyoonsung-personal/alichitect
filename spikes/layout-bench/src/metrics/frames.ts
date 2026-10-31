// Frame fill: how much of each frame's area is covered by cards. Zone frames are the reviewer's concern (tall, empty
// zones); the other kinds are reported for context. Cards do not overlap, so summing intersections is exact.
import type { LayoutState, Rect } from '../../../../packages/core/src/layout.ts';

export interface FillTotals {
  frames: number;
  area: number;
  cardArea: number;
}

export function intersectArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Card coverage per frame kind; also the per-frame empty shares of zone frames. */
export function frameFill(l: LayoutState): { byKind: Record<string, FillTotals>; zoneEmpty: number[] } {
  const byKind: Record<string, FillTotals> = {};
  const zoneEmpty: number[] = [];
  const cards = Object.values(l.cards);
  for (const f of Object.values(l.frames)) {
    const area = f.w * f.h;
    if (area <= 0) continue;
    let covered = 0;
    for (const c of cards) covered += intersectArea(f, c);
    const t = (byKind[f.kind] ??= { frames: 0, area: 0, cardArea: 0 });
    t.frames++;
    t.area += area;
    t.cardArea += covered;
    if (f.kind === 'zone') zoneEmpty.push(1 - Math.min(1, covered / area));
  }
  return { byKind, zoneEmpty };
}

export function mergeFill(into: Record<string, FillTotals>, add: Record<string, FillTotals>): void {
  for (const [k, v] of Object.entries(add)) {
    const t = (into[k] ??= { frames: 0, area: 0, cardArea: 0 });
    t.frames += v.frames;
    t.area += v.area;
    t.cardArea += v.cardArea;
  }
}
