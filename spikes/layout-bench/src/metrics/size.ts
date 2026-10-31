// Size and legibility: bounding box, aspect ratio, the zoom a fit-to-canvas view would use, and the rendered text
// sizes that follow from it (type size times zoom). Pure.
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import type { Canvas, LayoutMetrics } from '../layouts.ts';
import { round, shareBelow, summary } from '../stats.ts';
import type { Summary } from '../stats.ts';

/** The canvas beside the chat console at three window sizes, and the fit rule (React Flow fitView-like). */
export const CANVASES: readonly Canvas[] = [
  { w: 880, h: 720 },
  { w: 1040, h: 800 },
  { w: 1520, h: 940 },
];
export const FIT_PADDING = 24;
export const MAX_ZOOM = 1.25;
export const canvasKey = (c: Canvas): string => `${c.w}x${c.h}`;

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w: number;
  h: number;
}

/** Bounding box of every frame, card and badge (variants may use negative coordinates). */
export function bboxOf(l: LayoutState): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of [...Object.values(l.frames), ...Object.values(l.cards), ...Object.values(l.badges)]) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

/** Zoom that fits a w x h diagram into the canvas with padding on every side, capped at maxZoom. */
export function fitZoom(w: number, h: number, canvas: Canvas, pad = FIT_PADDING, maxZoom = MAX_ZOOM): number {
  if (w <= 0 || h <= 0) return maxZoom;
  return Math.min((canvas.w - 2 * pad) / w, (canvas.h - 2 * pad) / h, maxZoom);
}

export interface SizeRow {
  session: string;
  turn: number;
  mode: 'architecture' | 'solution';
  cards: number;
  w: number;
  h: number;
  aspect: number;
  zoom: number;
  titlePx: number;
  subtitlePx: number;
  framePx: number;
}

export function sizeRow(session: string, turn: number, l: LayoutState, m: LayoutMetrics, canvas: Canvas): SizeRow {
  const b = bboxOf(l);
  const zoom = fitZoom(b.w, b.h, canvas);
  return {
    session,
    turn,
    mode: l.mode,
    cards: Object.keys(l.cards).length,
    w: Math.round(b.w),
    h: Math.round(b.h),
    aspect: b.h > 0 ? round(b.w / b.h, 3) : 0,
    zoom: round(zoom, 4),
    titlePx: round(m.titlePx * zoom, 2),
    subtitlePx: round(m.subtitlePx * zoom, 2),
    framePx: round(m.frameLabelPx * zoom, 2),
  };
}

export const CARD_BUCKETS: ReadonlyArray<{ key: string; lo: number; hi: number }> = [
  { key: '1-6', lo: 1, hi: 6 },
  { key: '7-12', lo: 7, hi: 12 },
  { key: '13-18', lo: 13, hi: 18 },
  { key: '19-24', lo: 19, hi: 24 },
  { key: '25+', lo: 25, hi: Infinity },
];

export interface TextShares {
  title: number;
  subtitle: number;
  frame: number;
}

export interface SizeGroup {
  states: number;
  zoom: Summary;
  titlePx: Summary;
  subtitlePx: Summary;
  framePx: Summary;
  /** Share of states whose rendered size is below 11 px and below 12 px. */
  below11: TextShares;
  below12: TextShares;
}

function group(rows: readonly SizeRow[]): SizeGroup {
  const t = rows.map((r) => r.titlePx);
  const s = rows.map((r) => r.subtitlePx);
  const f = rows.map((r) => r.framePx);
  return {
    states: rows.length,
    zoom: summary(rows.map((r) => r.zoom), 3),
    titlePx: summary(t),
    subtitlePx: summary(s),
    framePx: summary(f),
    below11: { title: round(shareBelow(t, 11), 3), subtitle: round(shareBelow(s, 11), 3), frame: round(shareBelow(f, 11), 3) },
    below12: { title: round(shareBelow(t, 12), 3), subtitle: round(shareBelow(s, 12), 3), frame: round(shareBelow(f, 12), 3) },
  };
}

export interface SizeReport {
  canvas: string;
  states: number;
  width: Summary;
  height: Summary;
  aspect: Summary;
  cards: Summary;
  all: SizeGroup;
  /** Architecture states with 8 or more cards: the reviewer's population for the 4.6:1 figure. */
  arch8: SizeGroup & { width: Summary; height: Summary; aspect: Summary };
  byCards: Record<string, SizeGroup>;
}

export function aggregateSize(canvas: Canvas, rows: readonly SizeRow[]): SizeReport {
  const withCards = rows.filter((r) => r.cards > 0);
  const arch = withCards.filter((r) => r.mode === 'architecture' && r.cards >= 8);
  const byCards: Record<string, SizeGroup> = {};
  for (const b of CARD_BUCKETS) byCards[b.key] = group(withCards.filter((r) => r.cards >= b.lo && r.cards <= b.hi));
  return {
    canvas: canvasKey(canvas),
    states: withCards.length,
    width: summary(withCards.map((r) => r.w), 0),
    height: summary(withCards.map((r) => r.h), 0),
    aspect: summary(withCards.map((r) => r.aspect), 2),
    cards: summary(withCards.map((r) => r.cards), 0),
    all: group(withCards),
    arch8: { ...group(arch), width: summary(arch.map((r) => r.w), 0), height: summary(arch.map((r) => r.h), 0), aspect: summary(arch.map((r) => r.aspect), 2) },
    byCards,
  };
}
