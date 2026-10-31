// Template variant: the core layout unchanged, behind the variant interface. Running the bench with
//   --layout spikes/layout-bench/variants/example-core.ts
// must reproduce --layout core exactly, which checks the variant path. Copy this file to start a layout direction:
// keep the exports, replace the body, and set METRICS to the type sizes and card size your canvas will draw.
import { layoutGraph as coreLayout } from '../../../packages/core/src/layout.ts';
import type { LayoutState } from '../../../packages/core/src/layout.ts';
import type { Catalog, Graph } from '../../../packages/core/src/types.ts';

/** Type sizes (px at zoom 1) and card size the canvas draws; the bench multiplies them by the fit zoom. */
export const METRICS = { titlePx: 12.5, subtitlePx: 11, frameLabelPx: 11, cardW: 188, cardH: 52 };

/** Same contract as core layoutGraph, plus the canvas size the diagram will be fitted into. */
export function layoutGraph(graph: Graph, catalog: Catalog, prev: LayoutState | undefined, _opts: { canvas: { w: number; h: number } }): LayoutState {
  return coreLayout(graph, catalog, prev);
}
