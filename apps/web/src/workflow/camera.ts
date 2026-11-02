// Translation, follow and overview calculations independent of the browser.
import type { WorkflowGraph } from '@ali/core/types.ts';
import type { Rect } from '@ali/core/layout.ts';
import { GEOMETRY } from '@ali/core/layout.ts';
import { workflowViewport, WORKFLOW_GEOMETRY } from '@ali/core/workflow-layout.ts';
import type { WorkflowLayout } from './layout-adapter.ts';
export interface Viewport { x: number; y: number; zoom: number }
export function workflowInitialViewport(layout: WorkflowLayout, size: { width: number; height: number }): Viewport {
  const { zoom, panX, panY } = workflowViewport(layout, size);
  return { x: (panX ? 24 : (size.width - layout.width * zoom) / 2) - layout.bounds.x * zoom,
    y: (panY ? 24 : (size.height - layout.height * zoom) / 2) - layout.bounds.y * zoom, zoom };
}
export function workflowFollowViewport(current: Viewport, newestColumn: Rect, visible: Rect): Viewport {
  const reveal = (pan: number, start: number, length: number, edge: number, space: number): number => {
    const first = start * current.zoom + pan, last = first + length * current.zoom;
    if (first < edge + 24 || length * current.zoom > space - 48) return edge + 24 - start * current.zoom;
    return pan - Math.max(0, last - edge - space + 24);
  };
  return { ...current, x: reveal(current.x, newestColumn.x, newestColumn.w, visible.x, visible.w),
    y: reveal(current.y, newestColumn.y, newestColumn.h, visible.y, visible.h) };
}
export function overviewViewport(view: Viewport, size: { width: number; height: number }): Rect {
  return { x: -view.x / view.zoom, y: -view.y / view.zoom, w: size.width / view.zoom, h: size.height / view.zoom };
}
export function overviewColumns(layout: WorkflowLayout): number[] {
  return [...new Set(Object.values(layout.workflow.cells).map((c) => c.column))].sort((a, b) => a - b);
}
export function minimumWorkflowZoom(titles: readonly number[]): number {
  return WORKFLOW_GEOMETRY.titleFloorPx / (titles.length ? Math.min(...titles) : GEOMETRY.titlePx);
}

/** Object order breaks ties within a display batch; changed existing steps outrank unchanged steps. */
export function newestWorkflowStep(previous: WorkflowGraph,
  next: WorkflowGraph, last: string | null): string | null {
  const changed = Object.values(next.nodes).filter((n) => JSON.stringify(n) !== JSON.stringify(previous.nodes[n.id]));
  return changed.at(-1)?.id ?? (last && next.nodes[last] ? last : Object.keys(next.nodes).at(-1) ?? null);
}
export function zoomWorkflowViewport(current: Viewport, zoom: number, visible: Rect): Viewport {
  const x = visible.x + visible.w / 2, y = visible.y + visible.h / 2;
  return { x: x - (x - current.x) / current.zoom * zoom, y: y - (y - current.y) / current.zoom * zoom, zoom };
}
