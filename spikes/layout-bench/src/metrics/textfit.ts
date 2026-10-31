// Truncation, estimated from Inter advance widths: card titles and subtitles against the card's text column, frame
// labels (with caption) against the frame's label room. The estimate ignores kerning; the bench checks it in Chrome.
import type { LayoutState } from '../../../../packages/core/src/layout.ts';
import type { Catalog, Graph } from '../../../../packages/core/src/types.ts';
import type { LayoutModule } from '../layouts.ts';
import { textWidthOf } from '../layouts.ts';
import { cardText, frameLabelRoom, frameLabelWidth, textWidth } from '../text.ts';
import type { AdvanceTable } from '../text.ts';

export interface TextFit {
  cards: number;
  titleCut: number;
  subtitleCut: number;
  frames: number;
  frameCut: number;
  /** A few truncated strings, for the report. */
  examples: string[];
}

export function textFit(l: LayoutState, display: Graph, catalog: Catalog, table: AdvanceTable, layout: LayoutModule): TextFit {
  const m = layout.METRICS;
  const room = textWidthOf(m);
  const rule = layout.cardText ?? cardText;
  const out: TextFit = { cards: 0, titleCut: 0, subtitleCut: 0, frames: 0, frameCut: 0, examples: [] };
  for (const c of Object.values(l.cards)) {
    out.cards++;
    const t = rule(c, display, catalog);
    if (textWidth(table, 'title', t.title, m.titlePx) > room + 0.01) {
      out.titleCut++;
      if (out.examples.length < 6) out.examples.push(`title "${t.title}"`);
    }
    if (t.subtitle && textWidth(table, 'subtitle', t.subtitle, m.subtitlePx) > room + 0.01) {
      out.subtitleCut++;
      if (out.examples.length < 6) out.examples.push(`subtitle "${t.subtitle}"`);
    }
  }
  for (const f of Object.values(l.frames)) {
    if (!f.label) continue;
    out.frames++;
    if (frameLabelWidth(table, f, m.frameLabelPx) > frameLabelRoom(f) + 0.01) out.frameCut++;
  }
  return out;
}
