// libavoid-js router: orthogonal routing around cards, with incremental updates between calls (shapes are moved,
// added and removed; connectors whose endpoints did not change are kept, so libavoid reroutes only what it must).
// The same code runs in the browser worker (avoid.worker.ts) and in Node (scripts/route-bench.ts).
import type { Obstacle, PlannedEdge, Pt, RouteRequest, RouteResult } from './types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any -- the embind API has no useful types */
type Avoid = any;

const UP = 1;
const DOWN = 2;
const LEFT = 4;
const RIGHT = 8;
// One pin class per card on all four sides; the router picks the side. (Separate OUT/IN pin classes with
// direction costs were tried: libavoid then failed to route 13 of 17 connectors on scenario a.)
const PIN = 1;

export interface AvoidOptions {
  shapeBuffer?: number; // clearance kept around cards (the lane grid leaves 24 px between stacked cards)
  nudging?: number; // spacing of parallel segments
  segmentPenalty?: number; // cost per extra segment (fewer bends)
  crossingPenalty?: number;
  sideCost?: number; // extra cost of attaching on a card's top or bottom side (the request path reads left to right)
  sharedPathPenalty?: number; // libavoid fixedSharedPathPenalty: discourages running along another route's fixed end segment
  bundle?: boolean; // let routes with a common endpoint share segments (fan-out trunks) instead of nudging them apart.
  // Off by default: on, chains such as ESA -> WAF -> ALB also share a channel in both directions (ambiguous).
  unify?: boolean; // libavoid performUnifyingNudgingPreprocessingStep
}

interface ShapeRec {
  ref: any;
  key: string;
}

interface ConnRec {
  ref: any;
  key: string;
}

export interface AvoidState {
  A: Avoid;
  router: any;
  shapes: Map<string, ShapeRec>;
  conns: Map<string, ConnRec>;
  opts: Required<AvoidOptions>;
  /**
   * JS handles of objects libavoid owns (pins, and shapes or connectors after deleteShape/deleteConnector). This
   * embind build destroys the C++ object when a handle is garbage collected, so a dropped pin handle silently
   * removes the pin ("can't connect to shape ... no pins with class id"), and a dropped handle of a shape the
   * router already freed would free it twice. Holding every such handle for the router's lifetime avoids both.
   */
  keep: any[];
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function createAvoidState(A: Avoid, opts: AvoidOptions = {}): AvoidState {
  const o: Required<AvoidOptions> = { shapeBuffer: 8, nudging: 7, segmentPenalty: 40, crossingPenalty: 160, sideCost: 30, sharedPathPenalty: 0, bundle: false, unify: true, ...opts };
  const router = new A.Router(A.RouterFlag.OrthogonalRouting.value);
  router.setRoutingParameter(A.RoutingParameter.shapeBufferDistance, o.shapeBuffer);
  router.setRoutingParameter(A.RoutingParameter.idealNudgingDistance, o.nudging);
  router.setRoutingParameter(A.RoutingParameter.segmentPenalty, o.segmentPenalty);
  router.setRoutingParameter(A.RoutingParameter.crossingPenalty, o.crossingPenalty);
  if (o.sharedPathPenalty) router.setRoutingParameter(A.RoutingParameter.fixedSharedPathPenalty, o.sharedPathPenalty);
  router.setRoutingOption(A.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes, true);
  // fan-outs from one card share a trunk until they branch (a bus), instead of running as parallel lines
  router.setRoutingOption(A.RoutingOption.nudgeSharedPathsWithCommonEndPoint, !o.bundle);
  router.setRoutingOption(A.RoutingOption.performUnifyingNudgingPreprocessingStep, o.unify);
  return { A, router, shapes: new Map(), conns: new Map(), opts: o, keep: [] };
}

export function disposeAvoidState(s: AvoidState): void {
  try {
    s.router.delete();
  } catch {
    /* already gone */
  }
  s.shapes.clear();
  s.conns.clear();
  // the router freed everything it owned; the handles stay referenced by s.keep until s itself is dropped
}

const rectKey = (r: { x: number; y: number; w: number; h: number }): string => `${r.x.toFixed(1)},${r.y.toFixed(1)},${r.w.toFixed(1)},${r.h.toFixed(1)}`;

function makeRect(A: Avoid, r: { x: number; y: number; w: number; h: number }): any {
  const c = new A.Point(r.x + r.w / 2, r.y + r.h / 2);
  const rect = new A.Rectangle(c, r.w, r.h);
  c.delete?.();
  return rect;
}

function addPins(s: AvoidState, ref: any, sides: number): void {
  const A = s.A;
  // proportional offsets: left, right, top, bottom side centres
  // libavoid pins are exclusive by default (one connector each): a card with ten edges would leave six connectors
  // unattached, drawn as straight diagonals through other cards. Shared pins let fan-outs leave from one point.
  for (const [dir, x, y, cost] of [[LEFT, 0, 0.5, 0], [RIGHT, 1, 0.5, 0], [UP, 0.5, 0, s.opts.sideCost], [DOWN, 0.5, 1, s.opts.sideCost]] as const) {
    if (!(sides & dir)) continue;
    const pin = new A.ShapeConnectionPin(ref, PIN, x, y, true, 0, dir);
    pin.setExclusive(false);
    if (cost) pin.setConnectionCost(cost);
    s.keep.push(pin);
  }
}

/** Ensures a shape exists with the given rectangle; `pins` decides which sides accept connectors (0: obstacle only). */
function ensureShape(s: AvoidState, id: string, r: { x: number; y: number; w: number; h: number }, pins: number, seen: Set<string>): any {
  seen.add(id);
  const key = rectKey(r) + '|' + pins;
  const cur = s.shapes.get(id);
  if (cur && cur.key === key) return cur.ref;
  if (cur && cur.key.split('|')[1] === String(pins)) {
    const poly = makeRect(s.A, r);
    s.router.moveShape_poly(cur.ref, poly, false);
    poly.delete?.();
    cur.key = key;
    return cur.ref;
  }
  if (cur) {
    dropConnectorsOf(s, id);
    s.router.deleteShape(cur.ref);
  }
  const poly = makeRect(s.A, r);
  const ref = new s.A.ShapeRef(s.router, poly);
  poly.delete?.();
  s.keep.push(ref);
  if (pins) addPins(s, ref, pins);
  s.shapes.set(id, { ref, key });
  return ref;
}

function dropConnectorsOf(s: AvoidState, shapeId: string): void {
  for (const [id, c] of s.conns) {
    if (c.key.includes(`|${shapeId}|`)) {
      s.router.deleteConnector(c.ref);
      s.conns.delete(id);
    }
  }
}

/** A bar endpoint (container-level edge) is a thin shape beside the lane block with one pin on its outer side. */
function barRect(e: PlannedEdge): { x: number; y: number; w: number; h: number } {
  const b = e.bar!;
  return { x: b.x - 1.5, y: b.y0, w: 3, h: Math.max(4, b.y1 - b.y0) };
}

export function routeWithAvoid(s: AvoidState, req: RouteRequest): RouteResult {
  const t0 = now();
  const A = s.A;
  const seen = new Set<string>();
  const failed: string[] = [];
  const obstacleIds = new Set(req.obstacles.map((o) => o.id));
  // cards accept connectors on all four sides; frame labels are plain obstacles
  for (const o of req.obstacles) ensureShape(s, o.id, o, o.kind === 'card' ? LEFT | RIGHT | UP | DOWN : 0, seen);
  const endShape = (e: PlannedEdge, which: 'src' | 'dst'): string | null => {
    const isBar = which === 'src' ? e.fromFrame : e.toFrame;
    if (isBar && e.bar) {
      const other = which === 'src' ? e.dst : e.src;
      const left = other.x + other.w / 2 < e.bar.x;
      const id = `bar:${e.id}`;
      ensureShape(s, id, barRect(e), left ? LEFT : RIGHT, seen);
      return id;
    }
    const id = which === 'src' ? e.from : e.to;
    return obstacleIds.has(id) ? id : null;
  };
  const want = new Set<string>();
  for (const e of req.edges) {
    const a = endShape(e, 'src');
    const b = endShape(e, 'dst');
    if (!a || !b) {
      failed.push(e.id);
      continue;
    }
    want.add(e.id);
    const key = `|${a}|${b}|${s.shapes.get(a)!.key}|${s.shapes.get(b)!.key}`;
    const cur = s.conns.get(e.id);
    if (cur && cur.key === key) continue;
    if (cur) s.router.deleteConnector(cur.ref);
    const src = new A.ConnEnd(s.shapes.get(a)!.ref, PIN);
    const dst = new A.ConnEnd(s.shapes.get(b)!.ref, PIN);
    const ref = new A.ConnRef(s.router, src, dst);
    src.delete?.();
    dst.delete?.();
    s.keep.push(ref);
    ref.setHateCrossings?.(true);
    s.conns.set(e.id, { ref, key });
  }
  // connectors and shapes that are gone
  for (const [id, c] of s.conns) {
    if (!want.has(id)) {
      s.router.deleteConnector(c.ref);
      s.conns.delete(id);
    }
  }
  for (const [id, sh] of s.shapes) {
    if (!seen.has(id)) {
      dropConnectorsOf(s, id);
      s.router.deleteShape(sh.ref);
      s.shapes.delete(id);
    }
  }
  const tr = now();
  s.router.processTransaction();
  const routeMs = now() - tr;
  const routes: Record<string, Pt[]> = {};
  for (const e of req.edges) {
    const c = s.conns.get(e.id);
    if (!c) continue;
    const r = c.ref.displayRoute();
    const pts: Pt[] = [];
    for (let i = 0; i < r.size(); i++) {
      const p = r.at(i);
      pts.push({ x: p.x, y: p.y });
    }
    if (pts.length < 2) failed.push(e.id);
    routes[e.id] = simplify(pts);
  }
  return { router: 'libavoid', routes, ms: now() - t0, failed, solveMs: routeMs };
}

/** Drops repeated and collinear interior points. */
function simplify(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const b = out[out.length - 1];
      if ((Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - p.x) < 0.01) || (Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - p.y) < 0.01)) {
        out[out.length - 1] = p;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

export type { Obstacle };
