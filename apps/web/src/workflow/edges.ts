import { routeChannels } from '../routing/channel.ts';
// Workflow semantics stay separate from the cloud router's geometry-only requests.
import type { WorkflowGraph, WorkflowEdge } from '@ali/core/types.ts';
import type { Rect } from '@ali/core/layout.ts';
import type { Pt, RouteRequest } from '../routing/types.ts';
import type { WorkflowScene } from './scene.ts';
import type { WorkflowRenderLayout } from './layout-adapter.ts';
export interface WorkflowRoutePlan {
  request: RouteRequest;
  semantics: Record<string, WorkflowEdge & { attached: boolean; loop: boolean }>;
  explicit: Record<string, Pt[]>;
  bounds: Rect;
  labels: Record<string, string>;
}
// Keep row constraints private so the shared canvas/PDF plan shape stays unchanged.
const labelRows = new WeakMap<WorkflowRoutePlan, {
  branchBands: Array<Pick<Rect, 'y' | 'h'>>;
  mainRowEdges: Set<string>;
}>();

// Each leg starts at a card. Stop where it first reaches the return lane:
// following it all the way to its routing waypoint can leave a tail past the bend.
function legToLane(points: Pt[], laneY: number): Pt[] {
  const entry = points.findIndex((p) => p.y >= laneY);
  if (entry < 1) return [];
  return [...points.slice(0, entry), { x: points[entry - 1].x, y: laneY }];
}

export function planWorkflowEdges(input: {
  workflow: WorkflowGraph; scene: WorkflowScene; layout: WorkflowRenderLayout;
}): WorkflowRoutePlan {
  const { workflow, scene, layout } = input;
  const request: RouteRequest = { edges: [], obstacles: [
    ...scene.cards.map((c) => ({ id: c.id, kind: 'card' as const, x: c.x, y: c.y, w: c.w, h: c.h })),
    ...scene.brackets.map((c) => ({ id: c.id, kind: 'label' as const, x: c.x, y: c.y, w: c.w, h: c.h })),
  ] };
  const semantics: WorkflowRoutePlan['semantics'] = {};
  const explicit: Record<string, Pt[]> = {};
  const bounds = { ...scene.bounds };
  let lane = 0;
  const links = [
    ...Object.values(workflow.edges).map((e) => ({ ...e, attached: false })),
    ...Object.values(workflow.nodes).filter((n) => n.on).map((n) =>
      ({ id: 'attached:' + n.id, from: n.on!, to: n.id, attached: true })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  for (const e of links) {
    const a = scene.byId.get(e.from), b = scene.byId.get(e.to);
    if (!a || !b) continue;
    const loop = layout.source.workflow.routes[e.id]?.loop ?? false;
    semantics[e.id] = { ...e, loop };
    if (loop || e.attached) {
      const x1 = a.x + a.w + 16, x2 = b.x + b.w + 16;
      const y2 = b.y + b.h / 2;
      const y = loop ? scene.bounds.y + scene.bounds.h + 36 + lane++ * 32 : y2;
      const segment = (id: string, from: string, to: string, src: Rect, dst: Rect) => {
        const result = routeChannels({ obstacles: request.obstacles, edges: [
          { id, edges: [id], from, to, src, dst, fromFrame: false, toFrame: false, kind: 'data', path: false },
        ] });
        return result.failed.length ? [] : result.routes[id] ?? [];
      };
      if (loop) {
        const from = legToLane(segment(e.id + ':a', a.id, e.id + ':way-a', a, { x: x1, y, w: 1, h: 1 }), y);
        const to = legToLane(segment(e.id + ':b', b.id, e.id + ':way-b', b, { x: x2 + 8, y, w: 1, h: 1 }), y);
        const joinFrom = from.at(-1), joinTo = to.at(-1);
        explicit[e.id] = joinFrom && joinTo && joinFrom.x !== joinTo.x
          ? [...from, ...to.reverse()]
          : segment(e.id, a.id, b.id, a, b);
      } else {
        explicit[e.id] = segment(e.id, a.id, b.id, a, b);
      }
      bounds.w = Math.max(bounds.w, x1 + 32, x2 + 40);
      bounds.h = Math.max(bounds.h, y + 24);
    } else {
      request.edges.push({ id: e.id, edges: [e.id], from: a.id, to: b.id, src: a, dst: b,
        fromFrame: false, toFrame: false, kind: 'data', path: false });
    }
  }
  const plan = { request, semantics, explicit, bounds, labels: scene.edgeLabels };
  const cells = layout.source.workflow.cells;
  labelRows.set(plan, {
    branchBands: scene.cards.filter((c) => !c.node.on && cells[c.id]?.row > 0)
      .map((c) => ({ y: c.y, h: c.h })),
    mainRowEdges: new Set(Object.values(semantics).filter((e) => !e.attached && !e.loop
      && cells[e.from]?.row === 0 && cells[e.to]?.row === 0).map((e) => e.id)),
  });
  return plan;
}
export interface WorkflowEdgeDrawing {
  id: string; points: Pt[]; path: string; label: string; labelBox: Rect;
  attached: boolean; loop: boolean; warning: boolean; edge: WorkflowEdge;
}
export function drawWorkflowEdges(input: {
  plan: WorkflowRoutePlan; routes: Record<string, Pt[]>; measure: (text: string) => number;
}): WorkflowEdgeDrawing[] {
  const occupied: Rect[] = [...input.plan.request.obstacles];
  const rows = labelRows.get(input.plan);
  const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  return Object.values(input.plan.semantics).flatMap((edge) => {
    const points = input.plan.explicit[edge.id] ?? input.routes[edge.id];
    if (!points?.length) return [];
    const label = input.plan.labels[edge.id] ?? '';
    let a = points[0], b = points[1] ?? a;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - points[i - 1].x) > Math.abs(b.x - a.x)) { a = points[i - 1]; b = points[i]; }
    }
    const w = input.measure(label) + 12;
    const labelBox = { x: (a.x + b.x - w) / 2, y: (a.y + b.y) / 2 - 24, w, h: 20 };
    if (label) {
      const branchBands = rows?.mainRowEdges.has(edge.id) ? rows.branchBands : [];
      const top = input.plan.bounds.y;
      const base = Math.max(top, labelBox.y);
      labelBox.y = base;
      let attempt = 0;
      while (labelBox.y < top || occupied.some((r) => overlaps(labelBox, r))
        || branchBands.some((r) => labelBox.y < r.y + r.h && r.y < labelBox.y + labelBox.h)) {
        attempt++;
        labelBox.y = base + (attempt % 2 ? -1 : 1) * Math.ceil(attempt / 2) * 24;
      }
      occupied.push(labelBox);
    }
    return [{ id: edge.id, points, path: points.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' '),
      label, labelBox,
      attached: edge.attached, loop: edge.loop, warning: edge.kind === 'escalate', edge }];
  });
}

export function workflowDrawingBounds(plan: WorkflowRoutePlan, drawings: readonly WorkflowEdgeDrawing[]): Rect {
  const rects = [plan.bounds, ...drawings.filter((d) => d.label).map((d) => d.labelBox),
    ...drawings.flatMap((d) => d.points.map((p) => ({ ...p, w: 0, h: 0 })))];
  const x = Math.min(...rects.map((r) => r.x)), y = Math.min(...rects.map((r) => r.y));
  return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
}

/** libavoid can return a route through a label without marking it failed. Validate before accepting it. */
export function checkedWorkflowRoutes(plan: WorkflowRoutePlan, routes: Record<string, Pt[]>, failed: readonly string[] = []): Record<string, Pt[]> {
  const clear = (id: string, points: Pt[] | undefined): boolean => {
    if (!points || points.length < 2 || failed.includes(id)) return false;
    const edge = plan.semantics[id];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (a.x !== b.x && a.y !== b.y) return false;
      for (const r of plan.request.obstacles) {
        if (r.id === edge.from || r.id === edge.to) continue;
        const hit = a.x === b.x ? a.x > r.x + .01 && a.x < r.x + r.w - .01
          && Math.max(a.y, b.y) > r.y + .01 && Math.min(a.y, b.y) < r.y + r.h - .01
          : a.y > r.y + .01 && a.y < r.y + r.h - .01
          && Math.max(a.x, b.x) > r.x + .01 && Math.min(a.x, b.x) < r.x + r.w - .01;
        if (hit) return false;
      }
    }
    return true;
  };
  const bad = plan.request.edges.filter((e) => !clear(e.id, routes[e.id]));
  const fallback = bad.length ? routeChannels({ ...plan.request, edges: bad }) : null;
  const result: Record<string, Pt[]> = {};
  for (const e of plan.request.edges) {
    if (clear(e.id, routes[e.id])) result[e.id] = routes[e.id];
    else if (!fallback?.failed.includes(e.id) && fallback?.routes[e.id]) result[e.id] = fallback.routes[e.id];
  }
  return result;
}
