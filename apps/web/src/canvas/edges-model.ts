// From the planned edges and their routes to what the edge layer draws (pure): which edges show, which are hot, fresh or
// dimmed, where a label goes. The canvas calls it on every render pass that changes one of its inputs.
import type { LayoutState, Rect } from '@ali/core/layout.ts';
import { cardBounds } from '@ali/core/layout.ts';
import type { PlannedEdge, Pt } from '../routing/types.ts';
import { labelBox } from '../routing/plan.ts';
import { arrowPath, placeEdgeLabel, roundedPath } from './edge-geom.ts';
import type { EdgeDraw } from './edges.tsx';
import type { EdgeTiming, MotionPlan } from './motion.ts';
import { drawDash, routeLength } from './motion.ts';

export interface EdgeInputs {
  planned: readonly PlannedEdge[];
  routes: Readonly<Record<string, Pt[]>>;
  /** The layout version the routes were computed for, and the current one. */
  routedVersion: number;
  version: number;
  layout: LayoutState;
  motion: MotionPlan;
  /** Card ids the pointer or keyboard is on. */
  hot: ReadonlySet<string>;
  /** Card ids linked from the record or the panel (empty when nothing is linked). */
  lit: ReadonlySet<string>;
  /** Card ids that carry the BuildMark (the streaming revision added them). */
  building: ReadonlySet<string>;
  streaming: boolean;
  /** Ids of the edges drawn in the previous pass: they do not fade in again when their route changes. */
  drawn: ReadonlySet<string>;
  /** Width of a label's text at 12 px. */
  measure(text: string): number;
  /**
   * The canvas's motion clock: when a non-control edge draws itself (after its later end lands). Without it (the PDF,
   * the tests) edges fade in after `motion.edgeDelay` when an end was touched, as before.
   */
  timing?(id: string, key: string, ends: readonly string[], returning: boolean): EdgeTiming;
}

/** The cards an edge end stands for: a card, or every card of a lane block for a container-level edge. */
export function endCards(layout: LayoutState, id: string, isFrame: boolean): string[] {
  if (!isFrame) return [id];
  return Object.values(layout.cards).filter((c) => c.frame === id).map((c) => c.id);
}

function key(id: string, pts: readonly Pt[]): string {
  let h = 0;
  for (const p of pts) h = (h * 31 + Math.round(p.x * 2) * 7 + Math.round(p.y * 2)) | 0;
  return `${id}|${pts.length}|${h}`;
}

export function drawEdges(i: EdgeInputs): EdgeDraw[] {
  const out: EdgeDraw[] = [];
  const dimming = i.lit.size > 0;
  const obstacles: Rect[] = Object.keys(i.layout.cards).map((id) => cardBounds(i.layout, id)).filter((r): r is Rect => !!r);
  // the frames' own labels are in the way too (a vertical label beside a route must not land on "Security")
  for (const f of Object.values(i.layout.frames)) {
    const b = labelBox(f);
    if (b && b.w > 0) obstacles.push(b);
  }
  for (const e of i.planned) {
    const pts = i.routes[e.id];
    if (!pts || pts.length < 2) continue;
    const from = endCards(i.layout, e.from, e.fromFrame);
    const to = endCards(i.layout, e.to, e.toFrame);
    if (!from.length || !to.length) continue;
    // a route computed before this layout does not hold for a card that moved, entered or left in it
    if (i.routedVersion < i.version && (from.some((id) => i.motion.touched.has(id)) || to.some((id) => i.motion.touched.has(id)))) continue;
    const touchesHot = from.some((id) => i.hot.has(id)) || to.some((id) => i.hot.has(id));
    const bothLit = from.some((id) => i.lit.has(id)) && to.some((id) => i.lit.has(id));
    const touchesLit = from.some((id) => i.lit.has(id)) || to.some((id) => i.lit.has(id));
    // control edges (keys, logs, backup, NAT) stay hidden until an end is hovered, focused or linked
    if (e.kind === 'control' && !touchesHot && !(touchesLit && dimming)) continue;
    const fresh = i.streaming && (from.some((id) => i.building.has(id)) || to.some((id) => i.building.has(id)));
    const waits = from.some((id) => i.motion.touched.has(id)) || to.some((id) => i.motion.touched.has(id));
    let label: EdgeDraw['label'] = null;
    if (e.label && e.kind !== 'control') {
      const w = i.measure(e.label);
      const p = placeEdgeLabel(pts, w, obstacles);
      if (p) label = { plate: p.plate, x: p.textX, y: p.textY, text: e.label };
    }
    const k = key(e.id, pts) + (e.kind === 'control' ? '|c' : '');
    const t = i.timing && e.kind !== 'control' ? i.timing(e.id, k, [...from, ...to], !i.drawn.has(e.id)) : null;
    out.push({
      id: e.id,
      key: k,
      d: roundedPath(pts),
      arrow: e.kind === 'resolve' ? '' : arrowPath(pts),
      kind: e.kind,
      path: e.path,
      fresh,
      hot: touchesHot || (dimming && bothLit),
      dim: dimming && !bothLit,
      appear: t ? t.fade !== null : !i.drawn.has(e.id),
      delay: t ? (t.draw ? t.delay : (t.fade ?? 0)) : waits ? i.motion.edgeDelay : 0,
      draw: t?.draw ? drawDash(e.kind, routeLength(pts)) : null,
      label,
    });
  }
  return out;
}
