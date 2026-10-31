// One SVG layer that draws every route (spec 7.21). It sits between the frames and the cards as a single React Flow
// node, so the router's world coordinates are drawn as they are and the z-order is plain. Hidden control edges are not
// in the DOM; the canvas passes them in only while an end is hovered, focused or linked.
import { memo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { EdgeKind } from '@ali/core/types.ts';
import type { Rect } from '@ali/core/layout.ts';

export interface EdgeLabelDraw {
  plate: Rect;
  x: number;
  y: number;
  text: string;
}

export interface EdgeDraw {
  /** Graph or planned edge id. */
  id: string;
  /** Changes with the route, so a new route mounts again and fades in. */
  key: string;
  d: string;
  arrow: string;
  kind: EdgeKind;
  path: boolean;
  /** Part of the revision being drawn: ink-2 until commit. */
  fresh: boolean;
  /** An end is hovered, focused or linked. */
  hot: boolean;
  /** Something else is linked: this edge dims. */
  dim: boolean;
  /** Fades in: it was not on the sheet a moment ago. A route that only changed shape swaps without a fade. */
  appear: boolean;
  /** Wait this long before fading in or drawing (the cards it joins are still landing); negative to resume a draw. */
  delay: number;
  /** Draws itself from source to target: the dash array and the offset it starts from (motion.ts drawDash). */
  draw: { array: string; from: number } | null;
  /** The edge left the graph: it fades out where it was. */
  leave?: boolean;
  label: EdgeLabelDraw | null;
}

function EdgeImpl({ e }: { e: EdgeDraw }): ReactElement {
  const style = (e.draw ? { '--dash': e.draw.array, '--dash-from': e.draw.from, '--edge-delay': `${e.delay}ms` } : { animationDelay: e.delay && e.appear ? `${e.delay}ms` : undefined }) as CSSProperties;
  return (
    <g className="cv-edge" data-id={e.id} data-kind={e.kind} data-path={e.path || undefined} data-fresh={e.fresh || undefined} data-hot={e.hot || undefined} data-dim={e.dim || undefined} data-appear={e.appear || undefined} data-draw={e.draw ? true : undefined} data-leave={e.leave || undefined} style={style}>
      <path className="cv-edge__line" d={e.d} />
      {e.kind !== 'resolve' ? <path className="cv-edge__arrow" d={e.arrow} /> : null}
      {e.label ? (
        <g className="cv-edge__label">
          <rect x={e.label.plate.x} y={e.label.plate.y} width={e.label.plate.w} height={e.label.plate.h} />
          <text x={e.label.x} y={e.label.y}>
            {e.label.text}
          </text>
        </g>
      ) : null}
    </g>
  );
}
const Edge = memo(EdgeImpl);

export function EdgeLayer({ edges, dimming }: { edges: EdgeDraw[]; dimming: boolean }): ReactElement {
  return (
    <svg className="cv-edges" data-dimming={dimming || undefined} width="1" height="1" aria-hidden="true" focusable="false">
      {edges.map((e) => (
        <Edge key={e.key} e={e} />
      ))}
    </svg>
  );
}
