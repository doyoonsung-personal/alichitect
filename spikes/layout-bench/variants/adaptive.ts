// Layout direction "adaptive": the aspect-adaptive lane grid (variants/adaptive/layout.ts), behind the bench's variant
// interface. Run it with
//   node spikes/layout-bench/bench.ts --layout spikes/layout-bench/variants/adaptive.ts
import { readFileSync } from 'node:fs';
import type { LayoutCard, LayoutState } from '../../../packages/core/src/layout.ts';
import type { Catalog, Graph } from '../../../packages/core/src/types.ts';
import { textWidth } from '../src/text.ts';
import type { AdvanceTable, CardText } from '../src/text.ts';
import { AG, layoutAdaptive } from './adaptive/layout.ts';
import { entryOf } from './adaptive/model.ts';

/** Type sizes (px at zoom 1) and the full card size. Compact cards keep the width and the title size, and are 36 px tall. */
export const METRICS = { titlePx: 12.5, subtitlePx: 11, frameLabelPx: 11, cardW: AG.cardW, cardH: AG.cardH };

export function layoutGraph(graph: Graph, catalog: Catalog, prev: LayoutState | undefined, opts: { canvas: { w: number; h: number } }): LayoutState {
  return layoutAdaptive(graph, catalog, prev, opts.canvas);
}

const PURCHASE: Record<string, string> = { 'saas-seat': 'Per-seat SaaS', 'subscription-plan': 'Subscription plan', 'cloud-payg': 'Pay as you go', 'open-source': 'Open source', 'contact-sales': 'Contact sales' };

// The subtitle rule checks fit with the bench's measured Inter advances (the app would measure in the DOM).
let table: AdvanceTable | null = null;
const fitsSubtitle = (s: string): boolean => {
  table ??= JSON.parse(readFileSync(new URL('../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
  return textWidth(table, 'subtitle', s, METRICS.subtitlePx) <= METRICS.cardW - 60 + 0.01;
};
const titleFits = (s: string): boolean => {
  table ??= JSON.parse(readFileSync(new URL('../data/inter-advances.json', import.meta.url), 'utf8')) as AdvanceTable;
  return textWidth(table, 'title', s, METRICS.titlePx) <= METRICS.cardW - 60 + 0.01;
};
/**
 * Greedy word wrap of a title into at most `maxLines` lines of the card's text column. When it needs more lines, the
 * last line takes the rest, and the canvas clips that line with an ellipsis (the full label stays in the popover).
 */
export function wrapTitle(title: string, maxLines = 2): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of title.split(/\s+/).filter(Boolean)) {
    const t = cur ? cur + ' ' + w : w;
    if (!cur || titleFits(t)) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > maxLines ? [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')] : lines;
}
/** True when the wrapped title shows in full: every line fits the column. */
export const titleComplete = (title: string): boolean => wrapTitle(title).every(titleFits);
const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Card text. Title: the node's label (a rec's short name). Subtitle: the official short name, never the lane name.
 * When the label already is the short name, the subtitle is the full official name if it fits on one line (without
 * its trailing "(ABBR)" if needed), else nothing. Compact cards have no subtitle: details go to the hover popover.
 */
export function cardText(card: LayoutCard, display: Graph, catalog: Catalog): CardText {
  const e = entryOf(catalog, card.product);
  const node = Object.hasOwn(display.nodes, card.id) ? display.nodes[card.id] : undefined;
  const short = e?.short ?? card.product;
  const title = card.kind === 'rec' ? short : (node?.label ?? card.id);
  if (card.h < METRICS.cardH) return { title, subtitle: '' };
  // a title that needs a second line takes the subtitle's room (two title lines fill the 48 px card); the details go to the popover
  if (!titleFits(title)) return { title, subtitle: '' };
  const fullName = (): string => {
    if (!e || same(e.name, title)) return '';
    if (fitsSubtitle(e.name)) return e.name;
    const bare = e.name.replace(/\s*\([^)]*\)\s*$/, '');
    return bare && !same(bare, title) && fitsSubtitle(bare) ? bare : '';
  };
  if (card.kind === 'rec') return { title, subtitle: (e?.purchase ? PURCHASE[e.purchase] : undefined) ?? fullName() };
  return { title, subtitle: same(title, short) ? fullName() : short };
}
