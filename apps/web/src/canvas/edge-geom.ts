// Edge geometry, pure: the rounded orthogonal path, the open chevron arrowhead (7 px) and the label plate (spec 7.21).
import type { Rect } from '@ali/core/layout.ts';
import type { Pt } from '../routing/types.ts';

const RADIUS = 6;
export const ARROW = 7;
export const LABEL_H = 16;
const PLATE_PAD = 2;

/** Orthogonal polyline to an SVG path with rounded corners (the radius shrinks to half of a short segment). */
export function roundedPath(pts: readonly Pt[], radius = RADIUS): string {
  if (pts.length < 2) return '';
  let d = `M${r1(pts[0].x)},${r1(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y);
    const l2 = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += ` L${r1(b.x)},${r1(b.y)}`;
      continue;
    }
    const p1 = { x: b.x - ((b.x - a.x) / l1) * r, y: b.y - ((b.y - a.y) / l1) * r };
    const p2 = { x: b.x + ((c.x - b.x) / l2) * r, y: b.y + ((c.y - b.y) / l2) * r };
    d += ` L${r1(p1.x)},${r1(p1.y)} Q${r1(b.x)},${r1(b.y)} ${r1(p2.x)},${r1(p2.y)}`;
  }
  const z = pts[pts.length - 1];
  return d + ` L${r1(z.x)},${r1(z.y)}`;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** The open chevron at the end of a route: two 7 px arms meeting at the tip. */
export function arrowPath(pts: readonly Pt[], size = ARROW): string {
  if (pts.length < 2) return '';
  const b = pts[pts.length - 1];
  const a = pts[pts.length - 2];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  // each arm is `size` long, 32 degrees off the line
  const s = size * 0.85;
  const w = size * 0.53;
  return `M${r1(b.x - ux * s - uy * w)},${r1(b.y - uy * s + ux * w)} L${r1(b.x)},${r1(b.y)} L${r1(b.x - ux * s + uy * w)},${r1(b.y - uy * s - ux * w)}`;
}

export interface Segment {
  a: Pt;
  b: Pt;
  len: number;
  horizontal: boolean;
}

export function segmentsOf(pts: readonly Pt[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (len < 0.5) continue;
    out.push({ a, b, len, horizontal: Math.abs(b.y - a.y) < Math.abs(b.x - a.x) });
  }
  return out;
}

export interface LabelPlacement {
  /** The plate: a white rectangle behind the text. */
  plate: Rect;
  /** Text origin: left x and baseline-centre y. */
  textX: number;
  textY: number;
}

const hits = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Where an edge label goes: centred on the longest horizontal segment, or beside the longest vertical segment (its
 * left edge 6 px right of the line) when nothing is in the way; omitted (null) when the segment is shorter than the
 * label plus 16 px, or the label would land on a card. Tries segments from the longest down.
 */
export function placeEdgeLabel(pts: readonly Pt[], textW: number, obstacles: readonly Rect[]): LabelPlacement | null {
  const segs = segmentsOf(pts).sort((p, q) => q.len - p.len);
  for (const s of segs) {
    const mx = (s.a.x + s.b.x) / 2;
    const my = (s.a.y + s.b.y) / 2;
    if (s.horizontal) {
      if (s.len < textW + 16) continue;
      const plate = { x: mx - textW / 2 - PLATE_PAD, y: my - LABEL_H / 2, w: textW + 2 * PLATE_PAD, h: LABEL_H };
      if (obstacles.some((o) => hits(plate, o))) continue;
      return { plate, textX: mx - textW / 2, textY: my };
    }
    if (s.len < LABEL_H + 16) continue;
    const plate = { x: s.a.x + 6 - PLATE_PAD, y: my - LABEL_H / 2, w: textW + 2 * PLATE_PAD, h: LABEL_H };
    if (obstacles.some((o) => hits(plate, o))) continue;
    return { plate, textX: s.a.x + 6, textY: my };
  }
  return null;
}
