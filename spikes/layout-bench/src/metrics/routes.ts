// Route legibility beyond card hits: near-parallel segments (lines that read as one thick bundle), length run along
// frame borders, detour ratio, and route churn between frames. Card hits, overlap and crossings come from the spike's
// routeMetrics (routing/metrics.ts). Pure; routes are orthogonal polylines.
import type { LayoutFrame, Rect } from '../../../../packages/core/src/layout.ts';
import type { PlannedEdge, Pt } from '../routing/types.ts';

export const NEAR_PX = 10; // segments of two routes closer than this (and not on top of each other) read as one line
export const NEAR_MIN_RUN = 12; // ignore near-parallel runs shorter than this
export const BORDER_PX = 6; // a segment within this distance of a frame border, parallel to it, runs along the border (3 screen px at the typical 0.5 zoom)

interface Seg {
  a: Pt;
  b: Pt;
  h: boolean;
  route: string;
  from: string;
  to: string;
}

function segs(e: PlannedEdge, pts: Pt[]): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const h = Math.abs(a.y - b.y) < 0.01;
    const v = Math.abs(a.x - b.x) < 0.01;
    if ((h && v) || (!h && !v)) continue; // zero-length or diagonal
    out.push({ a, b, h, route: e.id, from: e.from, to: e.to });
  }
  return out;
}

const lenOf = (pts: Pt[]): number => pts.reduce((s, p, i) => (i ? s + Math.abs(p.x - pts[i - 1].x) + Math.abs(p.y - pts[i - 1].y) : 0), 0);

/** Shortest Manhattan distance between side midpoints of two rectangles: the length of the most direct elbow route. */
export function idealLength(src: Rect, dst: Rect): number {
  const mids = (r: Rect): Pt[] => [
    { x: r.x, y: r.y + r.h / 2 },
    { x: r.x + r.w, y: r.y + r.h / 2 },
    { x: r.x + r.w / 2, y: r.y },
    { x: r.x + r.w / 2, y: r.y + r.h },
  ];
  let best = Infinity;
  for (const p of mids(src)) for (const q of mids(dst)) best = Math.min(best, Math.abs(p.x - q.x) + Math.abs(p.y - q.y));
  return best;
}

export interface Ambiguity {
  routes: number;
  lengthPx: number;
  /** Pairs of segments from different routes, parallel, 0.5 to 10 px apart, sharing at least 12 px of extent. */
  nearPairs: number;
  nearPx: number;
  /** The same, counting only routes with no common endpoint (the bundles that suggest a wrong connection). */
  nearUnrelatedPairs: number;
  nearUnrelatedPx: number;
  /** Route length lying along a visible frame border (lane blocks have none). */
  borderPx: number;
  /** Per route: length / ideal elbow length (ideal floored at 8 px). */
  detours: number[];
}

export function ambiguity(edges: readonly PlannedEdge[], routes: Record<string, Pt[]>, frames: readonly LayoutFrame[]): Ambiguity {
  const out: Ambiguity = { routes: 0, lengthPx: 0, nearPairs: 0, nearPx: 0, nearUnrelatedPairs: 0, nearUnrelatedPx: 0, borderPx: 0, detours: [] };
  const all: Seg[] = [];
  const bordered = frames.filter((f) => f.kind !== 'lane');
  for (const e of edges) {
    const pts = routes[e.id];
    if (!pts || pts.length < 2) continue;
    out.routes++;
    const L = lenOf(pts);
    out.lengthPx += L;
    out.detours.push(L / Math.max(8, idealLength(e.src, e.dst)));
    const ss = segs(e, pts);
    all.push(...ss);
    for (const s of ss) {
      const lo = s.h ? Math.min(s.a.x, s.b.x) : Math.min(s.a.y, s.b.y);
      const hi = s.h ? Math.max(s.a.x, s.b.x) : Math.max(s.a.y, s.b.y);
      const at = s.h ? s.a.y : s.a.x;
      let along = 0;
      for (const f of bordered) {
        const lines = s.h ? [f.y, f.y + f.h] : [f.x, f.x + f.w];
        const flo = s.h ? f.x : f.y;
        const fhi = s.h ? f.x + f.w : f.y + f.h;
        for (const ln of lines) {
          if (Math.abs(at - ln) > BORDER_PX) continue;
          const o = Math.min(hi, fhi) - Math.max(lo, flo);
          if (o > 0) along += o;
        }
      }
      out.borderPx += Math.min(along, hi - lo);
    }
  }
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    for (let j = i + 1; j < all.length; j++) {
      const q = all[j];
      if (p.route === q.route || p.h !== q.h) continue;
      const gap = p.h ? Math.abs(p.a.y - q.a.y) : Math.abs(p.a.x - q.a.x);
      if (gap < 0.5 || gap >= NEAR_PX) continue;
      const plo = p.h ? Math.min(p.a.x, p.b.x) : Math.min(p.a.y, p.b.y);
      const phi = p.h ? Math.max(p.a.x, p.b.x) : Math.max(p.a.y, p.b.y);
      const qlo = q.h ? Math.min(q.a.x, q.b.x) : Math.min(q.a.y, q.b.y);
      const qhi = q.h ? Math.max(q.a.x, q.b.x) : Math.max(q.a.y, q.b.y);
      const o = Math.min(phi, qhi) - Math.max(plo, qlo);
      if (o < NEAR_MIN_RUN) continue;
      out.nearPairs++;
      out.nearPx += o;
      const shared = p.from === q.from || p.to === q.to || p.from === q.to || p.to === q.from;
      if (!shared) {
        out.nearUnrelatedPairs++;
        out.nearUnrelatedPx += o;
      }
    }
  }
  out.lengthPx = Math.round(out.lengthPx);
  out.nearPx = Math.round(out.nearPx);
  out.nearUnrelatedPx = Math.round(out.nearUnrelatedPx);
  out.borderPx = Math.round(out.borderPx);
  return out;
}

const sameRect = (a: Rect, b: Rect): boolean => Math.abs(a.x - b.x) <= 0.5 && Math.abs(a.y - b.y) <= 0.5 && Math.abs(a.w - b.w) <= 0.5 && Math.abs(a.h - b.h) <= 0.5;

function samePolyline(a: Pt[], b: Pt[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i].x - b[i].x) > 0.5 || Math.abs(a[i].y - b[i].y) > 0.5) return false;
  return true;
}

export interface Churn {
  /** Routes present in both frames whose endpoints did not move or resize. */
  comparable: number;
  /** Of those, routes whose polyline changed anyway. */
  changed: number;
  changedPx: number;
}

/** Route churn between two consecutive frames: a route whose endpoints stayed put should not be redrawn. */
export function churn(prevEdges: readonly PlannedEdge[], prevRoutes: Record<string, Pt[]>, nextEdges: readonly PlannedEdge[], nextRoutes: Record<string, Pt[]>): Churn {
  const prev = new Map(prevEdges.map((e) => [e.id, e]));
  const out: Churn = { comparable: 0, changed: 0, changedPx: 0 };
  for (const e of nextEdges) {
    const p = prev.get(e.id);
    const a = prevRoutes[e.id];
    const b = nextRoutes[e.id];
    if (!p || !a || !b || a.length < 2 || b.length < 2) continue;
    if (!sameRect(p.src, e.src) || !sameRect(p.dst, e.dst)) continue;
    out.comparable++;
    if (!samePolyline(a, b)) {
      out.changed++;
      out.changedPx += lenOf(b);
    }
  }
  out.changedPx = Math.round(out.changedPx);
  return out;
}
