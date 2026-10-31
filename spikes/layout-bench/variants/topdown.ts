// Layout direction "topdown" (Top-down tiers), behind the bench's variant interface. Run it with
//   node spikes/layout-bench/bench.ts --layout spikes/layout-bench/variants/topdown.ts
// The layout itself is pure and lives in topdown/layout.ts; the card text rule in topdown/text.ts and the two-line
// title rule in topdown/wrap.ts. This adapter adds the bench's metrics and measures subtitles with the bench's Inter
// advance table (the app would measure in the DOM).
import { readFileSync } from 'node:fs';
import type { LayoutCard, LayoutState } from '../../../packages/core/src/layout.ts';
import type { Catalog, Graph } from '../../../packages/core/src/types.ts';
import { textWidth } from '../src/text.ts';
import type { AdvanceTable } from '../src/text.ts';
import { TOPDOWN, layoutTopdown } from './topdown/layout.ts';
import type { TopdownState } from './topdown/layout.ts';
import { topdownCardText } from './topdown/text.ts';
import type { CardText } from './topdown/text.ts';

/** Type sizes (px at zoom 1) and card size the canvas draws; the bench multiplies them by the fit zoom. */
export const METRICS = { titlePx: 15, subtitlePx: 12, frameLabelPx: 12, cardW: TOPDOWN.cardW, cardH: TOPDOWN.cardH };

const TEXT_W = METRICS.cardW - 60;
let table: AdvanceTable | null = null;
const fitsSubtitle = (s: string): boolean => {
  table ??= JSON.parse(readFileSync(new URL('../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
  return textWidth(table, 'subtitle', s, METRICS.subtitlePx) <= TEXT_W + 0.01;
};

export function layoutGraph(graph: Graph, catalog: Catalog, prev: LayoutState | undefined, opts: { canvas: { w: number; h: number } }): TopdownState {
  return layoutTopdown(graph, catalog, prev, opts?.canvas ?? { w: 1040, h: 800 });
}

export function cardText(card: LayoutCard, display: Graph, catalog: Catalog): CardText {
  return topdownCardText(card, display, catalog, fitsSubtitle);
}
