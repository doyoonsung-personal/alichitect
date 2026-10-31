// Camera maths for the canvas, pure. A viewport is React Flow's: screen = world * zoom + (x, y). Core's Camera is the
// other way round (world coordinates at the canvas's top-left), so this file converts between the two and holds the
// small amount of logic around them: zoom limits, steps, and the minimal pan that brings a card into view.
import { GEOMETRY } from '@ali/core/layout.ts';
import type { Camera, Rect } from '@ali/core/layout.ts';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Size {
  w: number;
  h: number;
}

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = GEOMETRY.maxZoom;
/** Below this zoom card titles render under GEOMETRY.titleFloorPx: the zoom tool shows the value as a warning. */
export const ZOOM_FLOOR = GEOMETRY.titleFloorPx / GEOMETRY.titlePx;

export const clampZoom = (z: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export function viewportOf(c: Pick<Camera, 'x' | 'y' | 'zoom'>): Viewport {
  return { x: -c.x * c.zoom, y: -c.y * c.zoom, zoom: c.zoom };
}

export function cameraOf(v: Viewport): Pick<Camera, 'x' | 'y' | 'zoom'> {
  return { x: -v.x / v.zoom, y: -v.y / v.zoom, zoom: v.zoom };
}

/** The prev argument fitCamera wants, built from a live viewport. */
export function stickyCamera(v: Viewport): Camera {
  return { ...cameraOf(v), pan: null, subtitles: true };
}

/** One zoom step: 1.2x in or out, clamped, and snapping to the readable floor when a step would cross it. */
export function zoomStep(zoom: number, dir: 1 | -1): number {
  const next = dir > 0 ? zoom * 1.2 : zoom / 1.2;
  if (dir > 0 && zoom < ZOOM_FLOOR - 1e-6 && next > ZOOM_FLOOR) return ZOOM_FLOOR;
  if (dir < 0 && zoom > ZOOM_FLOOR + 1e-6 && next < ZOOM_FLOOR) return ZOOM_FLOOR;
  return clampZoom(next);
}

/** Changes the zoom and keeps the world point under `anchor` (screen px) where it is. */
export function zoomAbout(v: Viewport, zoom: number, anchor: { x: number; y: number }): Viewport {
  const z = clampZoom(zoom);
  const wx = (anchor.x - v.x) / v.zoom;
  const wy = (anchor.y - v.y) / v.zoom;
  return { x: anchor.x - wx * z, y: anchor.y - wy * z, zoom: z };
}

export const belowFloor = (zoom: number): boolean => zoom < ZOOM_FLOOR - 1e-6;

export const zoomPercent = (zoom: number): string => `${Math.round(zoom * 100)}%`;

/** Screen rectangle of a world rectangle. */
export function toScreen(v: Viewport, r: Rect): Rect {
  return { x: r.x * v.zoom + v.x, y: r.y * v.zoom + v.y, w: r.w * v.zoom, h: r.h * v.zoom };
}

/**
 * The viewport that shows `rect` (world) fully inside the canvas, moved as little as possible, or null when it is
 * already visible. `occludedBottom` is the part of the canvas the open products panel covers; `pad` keeps the rectangle
 * off the edges. A rectangle larger than the visible area is aligned to the top-left.
 */
export function revealViewport(v: Viewport, size: Size, rect: Rect, pad = 24, occludedBottom = 0): Viewport | null {
  const s = toScreen(v, rect);
  const viewW = size.w;
  const viewH = Math.max(0, size.h - occludedBottom);
  let dx = 0;
  let dy = 0;
  if (s.x < pad || s.w > viewW - 2 * pad) dx = pad - s.x;
  else if (s.x + s.w > viewW - pad) dx = viewW - pad - (s.x + s.w);
  if (s.y < pad || s.h > viewH - 2 * pad) dy = pad - s.y;
  else if (s.y + s.h > viewH - pad) dy = viewH - pad - (s.y + s.h);
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null;
  return { x: v.x + dx, y: v.y + dy, zoom: v.zoom };
}

/** The viewport that centres `rect` in the visible area at the current zoom. */
export function centerViewport(v: Viewport, size: Size, rect: Rect, occludedBottom = 0): Viewport {
  const viewH = Math.max(0, size.h - occludedBottom);
  return { x: size.w / 2 - (rect.x + rect.w / 2) * v.zoom, y: viewH / 2 - (rect.y + rect.h / 2) * v.zoom, zoom: v.zoom };
}

/** The union of world rectangles, or null when there are none. */
export function unionRect(rects: readonly Rect[]): Rect | null {
  if (!rects.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The box React Flow may pan within: the fitted area (arch width included) with some room around it. */
export function panExtent(fitted: Rect, room = 160): [[number, number], [number, number]] {
  return [
    [fitted.x - room, fitted.y - room],
    [fitted.x + fitted.w + room, fitted.y + fitted.h + room],
  ];
}

export const prefersReducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
