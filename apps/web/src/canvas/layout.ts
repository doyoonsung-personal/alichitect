// The single place the app calls core's layoutGraph (layout v2: anchored coordinates that can be negative, a bounding
// box in `layout.bounds`, and `fitCamera` for the fit). The store calls layoutFor; the canvas builder fits the view with
// fitCamera(layout, canvasSize, prevCamera) from here, whenever `display.refit` says to.
import { layoutGraph as coreLayoutGraph, fitCamera, DEFAULT_CANVAS } from '@ali/core/layout.ts';
import type { Camera, CanvasSize, LayoutState } from '@ali/core/layout.ts';
import type { Catalog, Graph } from '@ali/core/types.ts';

export type { Camera, CanvasSize, LayoutState };
export { fitCamera, DEFAULT_CANVAS };

/** True when the graph has anything to draw: a card, or a recommendation for the solution map. */
export function hasContent(g: Graph): boolean {
  return Object.keys(g.nodes).length > 0 || g.recs.length > 0;
}

/**
 * Lays out `graph` (use the display graph), keeping every placed card where `prev` had it. Returns null for an empty
 * graph, so the canvas shows its reading or empty state instead of an empty frame. The canvas size is passed along when
 * it is known (the layout itself does not depend on it today).
 */
export function layoutFor(graph: Graph, catalog: Catalog, prev: LayoutState | null | undefined, canvas: CanvasSize): LayoutState | null {
  if (!hasContent(graph)) return null;
  const known = canvas.w > 0 && canvas.h > 0;
  return coreLayoutGraph(graph, catalog, prev ?? undefined, known ? { canvas } : {});
}
