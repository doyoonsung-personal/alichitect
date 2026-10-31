// Routed edge: draws the router's orthogonal polyline with rounded corners, a small open arrowhead, and a quiet
// flow on request-path edges. React Flow supplies the wrapper; the geometry comes from data.points.
import { memo } from 'react';
import type { CSSProperties, JSX } from 'react';
import type { Edge, EdgeProps } from '@xyflow/react';
import type { EdgeKind } from '../../../../packages/core/src/types.ts';
import type { Pt } from '../routing/types.ts';

export interface RoutedData extends Record<string, unknown> {
  points: Pt[];
  kind: EdgeKind;
  path: boolean;
  /** 'draw' replays the draw-on animation (route changed), 'stale' hides it while cards move. */
  state: 'steady' | 'draw' | 'stale';
  rev: number;
  hot: 'hot' | 'dim' | null;
  bar?: { x: number; y0: number; y1: number };
  count: number; // graph edges this route draws
}
export type RoutedEdgeType = Edge<RoutedData, 'routed'>;

const R = 8; // corner radius

/** Orthogonal polyline to an SVG path with rounded corners (radius clamped to half of each adjacent segment). */
export function roundedPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y);
    const l2 = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(R, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += ` L${b.x},${b.y}`;
      continue;
    }
    const p1 = { x: b.x - ((b.x - a.x) / l1) * r, y: b.y - ((b.y - a.y) / l1) * r };
    const p2 = { x: b.x + ((c.x - b.x) / l2) * r, y: b.y + ((c.y - b.y) / l2) * r };
    d += ` L${p1.x},${p1.y} Q${b.x},${b.y} ${p2.x},${p2.y}`;
  }
  const z = pts[pts.length - 1];
  return d + ` L${z.x},${z.y}`;
}

export const pathLength = (pts: Pt[]): number => pts.reduce((s, p, i) => (i ? s + Math.abs(p.x - pts[i - 1].x) + Math.abs(p.y - pts[i - 1].y) : 0), 0);

function arrow(pts: Pt[]): string {
  const b = pts[pts.length - 1];
  const a = pts[pts.length - 2];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const s = 5.5;
  // open chevron, tip 1px short of the card edge so it reads against the card border
  const tx = b.x - ux;
  const ty = b.y - uy;
  return `M${tx - ux * s - uy * s * 0.8},${ty - uy * s + ux * s * 0.8} L${tx},${ty} L${tx - ux * s + uy * s * 0.8},${ty - uy * s - ux * s * 0.8}`;
}

function RoutedEdgeImpl({ data }: EdgeProps<RoutedEdgeType>): JSX.Element | null {
  if (!data || data.points.length < 2) return null;
  const d = roundedPath(data.points);
  const len = Math.ceil(pathLength(data.points));
  const style = { '--len': `${len}` } as CSSProperties;
  return (
    <g className="edge" data-kind={data.kind} data-path={data.path ? 'true' : undefined} data-state={data.state} data-hot={data.hot ?? undefined} style={style}>
      {/* keyed by route revision: a new route remounts the group, which replays the draw-on animation */}
      <g key={data.rev}>
        <path className="edge-line" d={d} />
        {data.path && <path className="edge-flow" d={d} />}
        <path className="edge-arrow" d={arrow(data.points)} />
        {data.bar && <path className="edge-bar" d={`M${data.bar.x},${data.bar.y0} L${data.bar.x},${data.bar.y1}`} />}
      </g>
    </g>
  );
}
export const RoutedEdge = memo(RoutedEdgeImpl);
