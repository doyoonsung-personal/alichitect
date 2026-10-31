// Pluggable layouts. `core` is packages/core/src/layout.ts; anything else is a variant module path that exports
//   layoutGraph(graph, catalog, prev, opts): LayoutState      opts = { canvas: { w, h } }
//   METRICS = { titlePx, subtitlePx, frameLabelPx, cardW, cardH }   (optional: textW, the text column width)
// and optionally cardText(card, display, catalog) => { title, subtitle } to replace the canvas text rule.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GEOMETRY, layoutGraph as coreLayout } from '../../../packages/core/src/layout.ts';
import type { LayoutCard, LayoutState } from '../../../packages/core/src/layout.ts';
import type { Catalog, Graph } from '../../../packages/core/src/types.ts';
import type { CardText } from './text.ts';

export interface Canvas {
  w: number;
  h: number;
}

export interface LayoutOptions {
  canvas: Canvas;
}

export interface LayoutMetrics {
  titlePx: number;
  subtitlePx: number;
  frameLabelPx: number;
  cardW: number;
  cardH: number;
  /** Width of the card's text column; default cardW - 60 (10 px padding each side, 30 px glyph tile, 10 px gap). */
  textW?: number;
}

export type LayoutFn = (graph: Graph, catalog: Catalog, prev: LayoutState | undefined, opts: LayoutOptions) => LayoutState;

export interface LayoutModule {
  name: string;
  source: string;
  layoutGraph: LayoutFn;
  METRICS: LayoutMetrics;
  cardText?: (card: LayoutCard, display: Graph, catalog: Catalog) => CardText;
}

/** The Phase 0 canvas: GEOMETRY from core layout.ts, type sizes from spikes/canvas/src/canvas/canvas.css. */
export const CORE_METRICS: LayoutMetrics = { titlePx: 12.5, subtitlePx: 11, frameLabelPx: 11, cardW: GEOMETRY.cardW, cardH: GEOMETRY.cardH };

export const textWidthOf = (m: LayoutMetrics): number => m.textW ?? m.cardW - 60;

function checkMetrics(m: unknown, where: string): LayoutMetrics {
  const o = (m ?? {}) as Record<string, unknown>;
  for (const k of ['titlePx', 'subtitlePx', 'frameLabelPx', 'cardW', 'cardH']) {
    if (typeof o[k] !== 'number' || !Number.isFinite(o[k] as number) || (o[k] as number) <= 0) throw new Error(`${where}: METRICS.${k} must be a positive number`);
  }
  if (o.textW !== undefined && (typeof o.textW !== 'number' || (o.textW as number) <= 0)) throw new Error(`${where}: METRICS.textW must be a positive number`);
  return o as unknown as LayoutMetrics;
}

export async function loadLayout(spec: string): Promise<LayoutModule> {
  if (spec === 'core') {
    return { name: 'core', source: 'packages/core/src/layout.ts', layoutGraph: (g, c, prev) => coreLayout(g, c, prev), METRICS: CORE_METRICS };
  }
  const abs = path.resolve(spec);
  const mod = (await import(pathToFileURL(abs).href)) as Record<string, unknown>;
  if (typeof mod.layoutGraph !== 'function') throw new Error(`${spec}: no exported layoutGraph(graph, catalog, prev, opts)`);
  const out: LayoutModule = {
    name: path.basename(abs).replace(/\.(m?[jt]s)$/, ''),
    source: path.relative(process.cwd(), abs).split(path.sep).join('/'),
    layoutGraph: mod.layoutGraph as LayoutFn,
    METRICS: checkMetrics(mod.METRICS, spec),
  };
  if (typeof mod.cardText === 'function') out.cardText = mod.cardText as LayoutModule['cardText'];
  return out;
}

/** Shape check of one LayoutState, so a broken variant fails loudly instead of skewing the metrics. */
export function checkState(l: LayoutState, where: string): void {
  if (!l || typeof l !== 'object' || !l.cards || !l.frames || !l.badges) throw new Error(`${where}: layoutGraph must return a LayoutState (cards, frames, badges)`);
  for (const c of Object.values(l.cards)) {
    if (![c.x, c.y, c.w, c.h].every(Number.isFinite)) throw new Error(`${where}: card ${c.id} has a non-finite rectangle`);
    if (typeof c.slot !== 'string' || typeof c.frame !== 'string') throw new Error(`${where}: card ${c.id} needs slot and frame (blockOf reads them)`);
  }
}
