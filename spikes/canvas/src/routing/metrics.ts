// Route quality metrics, identical for both routers: edge-node intersections, crossings, overlaps, bends, length.
import type { Obstacle, PlannedEdge, Pt } from './types.ts';

export interface RouteMetrics {
  edges: number;
  /** (route, card) pairs where the route passes through a card that is not one of its endpoints. */
  edgeNodeIntersections: number;
  /** Routes that pass through at least one non-endpoint card. */
  edgesThroughNodes: number;
  /** Routes that pass over a frame label. */
  labelHits: number;
  /** Proper crossings between segments of different routes (shared trunks of one fan-out or fan-in are not crossings). */
  crossings: number;
  /** Length where routes of different bundles run on top of each other (ambiguous lines), in px. */
  overlapPx: number;
  bends: number;
  lengthPx: number;
  /** Routes that are not purely orthogonal. */
  nonOrthogonal: number;
}

interface Seg {
  a: Pt;
  b: Pt;
  h: boolean;
  route: string;
  from: string;
  to: string;
}

const EPS = 0.75;

function segsOf(points: Pt[], e: PlannedEdge): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01) continue;
    out.push({ a, b, h: Math.abs(a.y - b.y) < 0.01, route: e.id, from: e.from, to: e.to });
  }
  return out;
}

/** Does segment a-b pass through the interior of rect r (shrunk by EPS)? */
function hitsRect(a: Pt, b: Pt, r: { x: number; y: number; w: number; h: number }): boolean {
  const x0 = r.x + EPS;
  const y0 = r.y + EPS;
  const x1 = r.x + r.w - EPS;
  const y1 = r.y + r.h - EPS;
  if (x1 <= x0 || y1 <= y0) return false;
  // Liang-Barsky clip
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - x0, x1 - a.x, a.y - y0, y1 - a.y];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  return t1 - t0 > 1e-6;
}

export function routeMetrics(edges: PlannedEdge[], routes: Record<string, Pt[]>, obstacles: Obstacle[]): RouteMetrics {
  const m: RouteMetrics = { edges: 0, edgeNodeIntersections: 0, edgesThroughNodes: 0, labelHits: 0, crossings: 0, overlapPx: 0, bends: 0, lengthPx: 0, nonOrthogonal: 0 };
  const all: Seg[] = [];
  const cardObs = obstacles.filter((o) => o.kind === 'card');
  const labelObs = obstacles.filter((o) => o.kind === 'label');
  for (const e of edges) {
    const pts = routes[e.id];
    if (!pts || pts.length < 2) continue;
    m.edges++;
    const segs = segsOf(pts, e);
    all.push(...segs);
    let through = false;
    for (const o of cardObs) {
      if (o.id === e.from || o.id === e.to) continue;
      if (segs.some((s) => hitsRect(s.a, s.b, o))) {
        m.edgeNodeIntersections++;
        through = true;
      }
    }
    if (through) m.edgesThroughNodes++;
    if (labelObs.some((o) => segs.some((s) => hitsRect(s.a, s.b, o)))) m.labelHits++;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      m.lengthPx += Math.abs(s.a.x - s.b.x) + Math.abs(s.a.y - s.b.y);
      if (!(Math.abs(s.a.x - s.b.x) < 0.01 || Math.abs(s.a.y - s.b.y) < 0.01)) m.nonOrthogonal++;
      if (i > 0 && segs[i - 1].h !== s.h) m.bends++;
    }
  }
  // crossings and overlaps between routes
  const sharesEnd = (p: Seg, q: Seg): boolean => p.from === q.from || p.to === q.to;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const p = all[i];
      const q = all[j];
      if (p.route === q.route) continue;
      if (p.h !== q.h) {
        const H = p.h ? p : q;
        const V = p.h ? q : p;
        const hx0 = Math.min(H.a.x, H.b.x);
        const hx1 = Math.max(H.a.x, H.b.x);
        const vy0 = Math.min(V.a.y, V.b.y);
        const vy1 = Math.max(V.a.y, V.b.y);
        const x = V.a.x;
        const y = H.a.y;
        if (x > hx0 + EPS && x < hx1 - EPS && y > vy0 + EPS && y < vy1 - EPS) {
          // a fan-out or fan-in drawn as one trunk crosses itself only where it branches; that is a junction, not a crossing
          if (!sharesEnd(p, q)) m.crossings++;
        }
      } else if (p.h && Math.abs(p.a.y - q.a.y) < 0.5) {
        const o = Math.min(Math.max(p.a.x, p.b.x), Math.max(q.a.x, q.b.x)) - Math.max(Math.min(p.a.x, p.b.x), Math.min(q.a.x, q.b.x));
        if (o > 1 && !sharesEnd(p, q)) m.overlapPx += o;
      } else if (!p.h && Math.abs(p.a.x - q.a.x) < 0.5) {
        const o = Math.min(Math.max(p.a.y, p.b.y), Math.max(q.a.y, q.b.y)) - Math.max(Math.min(p.a.y, p.b.y), Math.min(q.a.y, q.b.y));
        if (o > 1 && !sharesEnd(p, q)) m.overlapPx += o;
      }
    }
  }
  m.overlapPx = Math.round(m.overlapPx);
  m.lengthPx = Math.round(m.lengthPx);
  return m;
}
