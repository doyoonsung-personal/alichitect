// One interface for both edge routers (libavoid-js in a worker, and our own channel router), so the canvas can swap them.
import type { EdgeKind } from '@ali/core/types.ts';
import type { Rect } from '@ali/core/layout.ts';

export interface Pt {
  x: number;
  y: number;
}

/** Something routes must not cross: a card (with its badges) or a frame label. */
export interface Obstacle extends Rect {
  id: string;
  kind: 'card' | 'label';
}

/** One drawn route. It may stand for several graph edges (duplicates, or a container-level aggregate). */
export interface PlannedEdge {
  id: string;
  /** Graph edge ids this route draws. */
  edges: string[];
  /** Endpoint card ids, or lane-block frame ids for container-level edges. */
  from: string;
  to: string;
  fromFrame: boolean;
  toFrame: boolean;
  src: Rect;
  dst: Rect;
  kind: EdgeKind;
  /** On the north-south request path: drawn in the accent colour with a quiet flow. */
  path: boolean;
  label?: string;
  /** Container-level edge: the bracket bar beside the lane block that the route ends on (or starts from). */
  bar?: { x: number; y0: number; y1: number; frame: string };
}

export interface RouteRequest {
  edges: PlannedEdge[];
  obstacles: Obstacle[];
}

export interface Route {
  id: string;
  points: Pt[];
}

export interface RouteResult {
  router: RouterName;
  routes: Record<string, Pt[]>;
  /** Wall time of the routing call itself (inside the worker for libavoid). */
  ms: number;
  /** libavoid only: time spent in processTransaction (the solve), excluding shape and connector bookkeeping. */
  solveMs?: number;
  /** Main thread only: post-to-reply time including worker messaging and structured clone. */
  roundTripMs?: number;
  /** Edges the router could not route around obstacles (drawn as a direct elbow). */
  failed: string[];
}

export type RouterName = 'libavoid' | 'channel';

export interface EdgeRouter {
  readonly name: RouterName;
  route(req: RouteRequest): Promise<RouteResult>;
  dispose?(): void;
}
