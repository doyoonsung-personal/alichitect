// Layout direction "stacked" (Stacked shelves), behind the bench's variant interface. Run it with
//   node spikes/layout-bench/bench.ts --layout spikes/layout-bench/variants/stacked.ts
// The layout itself is pure and lives in stacked/layout.ts; the card text rule in stacked/text.ts. This adapter adds
// the bench's metrics and measures subtitles with the bench's Inter advance table.
import { readFileSync } from 'node:fs';
import type { LayoutCard, LayoutState } from '../../../packages/core/src/layout.ts';
import type { Catalog, Graph } from '../../../packages/core/src/types.ts';
import { textWidth } from '../src/text.ts';
import type { AdvanceTable } from '../src/text.ts';
import { STACKED, layoutStacked } from './stacked/layout.ts';
import { stackedCardText } from './stacked/text.ts';
import type { CardText } from './stacked/text.ts';

/** Type sizes (px at zoom 1) and card size the canvas draws; the bench multiplies them by the fit zoom. */
export const METRICS = { titlePx: 14, subtitlePx: 12, frameLabelPx: 12, cardW: STACKED.cardW, cardH: STACKED.cardH };

const TEXT_W = METRICS.cardW - 60;
const table = JSON.parse(readFileSync(new URL('../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;

export function layoutGraph(graph: Graph, catalog: Catalog, prev: LayoutState | undefined, opts: { canvas: { w: number; h: number } }): LayoutState {
  return layoutStacked(graph, catalog, prev, { canvas: opts.canvas });
}

export function cardText(card: LayoutCard, display: Graph, catalog: Catalog): CardText {
  return stackedCardText(card, display, catalog, (s) => textWidth(table, 'subtitle', s, METRICS.subtitlePx) <= TEXT_W + 0.01);
}
