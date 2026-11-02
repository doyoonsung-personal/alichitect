// Translation, follow and overview calculations independent of the browser.
import type { Rect } from '@ali/core/layout.ts';
import { workflowViewport } from '@ali/core/workflow-layout.ts';
import type { WorkflowLayout } from './layout-adapter.ts';
export interface Viewport { x: number; y: number; zoom: number }
export function workflowInitialViewport(layout: WorkflowLayout, size: { width: number; height: number }): Viewport {
  const { zoom, panX, panY } = workflowViewport(layout, size);
  return { x: panX ? 24 : (size.width - layout.width * zoom) / 2,
    y: panY ? 24 : (size.height - layout.height * zoom) / 2, zoom };
}
export function workflowFollowViewport(current: Viewport, newestColumn: Rect, visible: Rect): Viewport {
  const right = (newestColumn.x + newestColumn.w) * current.zoom + current.x;
  const bottom = (newestColumn.y + newestColumn.h) * current.zoom + current.y;
  return { ...current, x: current.x - Math.max(0, right - visible.x - visible.w + 24),
    y: current.y - Math.max(0, bottom - visible.y - visible.h + 24) };
}
export function overviewViewport(view: Viewport, size: { width: number; height: number }): Rect {
  return { x: -view.x / view.zoom, y: -view.y / view.zoom, w: size.width / view.zoom, h: size.height / view.zoom };
}
export function overviewColumns(layout: WorkflowLayout): number[] {
  return [...new Set(Object.values(layout.workflow.cells).map((c) => c.column))].sort((a, b) => a - b);
}
export function minimumWorkflowZoom(titles: readonly number[]): number {
  return 11 / Math.min(14, ...titles);
}
