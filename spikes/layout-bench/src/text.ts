// Card and frame text as the canvas draws it, and a width estimate from measured Inter advance widths.
// The text rules are copied from spikes/canvas/src/canvas/Canvas.tsx (cardData, frameLabel); the styles from
// spikes/canvas/src/canvas/canvas.css. Pure: the advance table is passed in (data/inter-advances.json).
import type { LayoutCard, LayoutFrame } from '../../../packages/core/src/layout.ts';
import type { Catalog, CatalogEntry, Graph } from '../../../packages/core/src/types.ts';

export type StyleKey = 'title' | 'subtitle' | 'frame' | 'caption' | 'attach';

/** Weight, caps and tracking per text style (canvas.css: .card-label, .card-sub, .frame-label, .frame-caption, .card-attach). */
export const STYLES: Record<StyleKey, { weight: number; smallCaps: boolean; letterSpacingEm: number }> = {
  title: { weight: 600, smallCaps: false, letterSpacingEm: -0.006 },
  subtitle: { weight: 450, smallCaps: false, letterSpacingEm: 0 },
  frame: { weight: 650, smallCaps: true, letterSpacingEm: 0.07 },
  caption: { weight: 500, smallCaps: false, letterSpacingEm: 0 },
  attach: { weight: 550, smallCaps: false, letterSpacingEm: 0 },
};

export interface StyleAdvances {
  /** em per character, measured at 100 px in Chrome with Inter Variable. */
  widths: Record<string, number>;
  /** Average em per character of the system fallback font. */
  cjk: { hangul: number; han: number; kana: number };
}

export interface AdvanceTable {
  styles: Record<string, StyleAdvances>;
}

function charEm(s: StyleAdvances, ch: string): number {
  const w = s.widths[ch];
  if (w !== undefined) return w;
  const c = ch.codePointAt(0) ?? 0;
  if ((c >= 0xac00 && c <= 0xd7af) || (c >= 0x1100 && c <= 0x11ff) || (c >= 0x3130 && c <= 0x318f)) return s.cjk.hangul;
  if (c >= 0x3040 && c <= 0x30ff) return s.cjk.kana;
  if ((c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3000 && c <= 0x303f) || (c >= 0xff00 && c <= 0xffef) || (c >= 0x3400 && c <= 0x4dbf)) return s.cjk.han;
  return s.widths['n'] ?? 0.56;
}

/** Estimated rendered width in px (sum of advances plus tracking; no kerning). */
export function textWidth(t: AdvanceTable, style: StyleKey, text: string, px: number): number {
  const s = t.styles[style];
  if (!s) throw new Error(`advance table has no style ${style}`);
  const ls = STYLES[style].letterSpacingEm;
  let em = 0;
  for (const ch of text) em += charEm(s, ch) + ls;
  return em * px;
}

export const fits = (t: AdvanceTable, style: StyleKey, text: string, px: number, avail: number): boolean => textWidth(t, style, text, px) <= avail + 0.01;

/** CSS text-overflow: ellipsis, estimated: the longest prefix that fits with a trailing ellipsis. */
export function ellipsize(t: AdvanceTable, style: StyleKey, text: string, px: number, avail: number): string {
  if (fits(t, style, text, px, avail)) return text;
  const chars = [...text];
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(t, style, chars.slice(0, mid).join('') + '…', px, avail)) lo = mid;
    else hi = mid - 1;
  }
  return chars.slice(0, lo).join('').trimEnd() + '…';
}

// ---------- the canvas text rules ----------

const FRAME_TITLE: Record<string, string> = { region: 'Region', vpc: 'VPC', zone: 'Zone' };
const PURCHASE: Record<string, string> = { 'saas-seat': 'Per-seat SaaS', 'subscription-plan': 'Subscription plan', 'cloud-payg': 'Pay as you go', 'open-source': 'Open source', 'contact-sales': 'Contact sales' };
export const LANE_TITLE: Record<string, string> = {
  clients: 'Clients', onprem: 'On-premises', thirdparty: 'Third party', dns: 'DNS', edge: 'Edge network', ingress: 'Load balancing', compute: 'Compute',
  middleware: 'Messaging', cache: 'Cache', database: 'Database', search: 'Search', filestore: 'File storage', boundary: 'VPC boundary', storage: 'Storage',
  ai: 'AI', analytics: 'Analytics', integration: 'Integration', ops: 'Operations', security: 'Security', network: 'Network', governance: 'Governance', saas: 'SaaS',
};

export function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  const direct = catalog.byId.get(product);
  if (direct) return direct;
  try {
    return catalog.resolve(product).entry;
  } catch {
    return undefined;
  }
}

export interface CardText {
  title: string;
  subtitle: string;
}

/** The two lines of a card (Canvas.tsx cardData): the node label, then the short name, full name or lane, never a repeat. */
export function cardText(card: LayoutCard, display: Graph, catalog: Catalog): CardText {
  const e = entryOf(catalog, card.product);
  const node = Object.hasOwn(display.nodes, card.id) ? display.nodes[card.id] : undefined;
  const short = e?.short ?? card.product;
  const label = node?.label ?? (card.kind === 'rec' ? short : card.id);
  const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();
  const purchase = e?.purchase ? PURCHASE[e.purchase] : undefined;
  let secondary = same(label, short) ? (e?.name ?? short) : short;
  if (card.kind === 'rec') secondary = purchase ?? (e && !same(e.name, short) ? e.name : LANE_TITLE[e?.lane ?? ''] ?? '');
  else if (same(secondary, label)) secondary = LANE_TITLE[e?.lane ?? ''] ?? secondary;
  return { title: card.kind === 'rec' ? short : label, subtitle: secondary };
}

/** A frame's small-caps label and optional caption (Canvas.tsx frameLabel). */
export function frameText(f: LayoutFrame): { label: string; caption?: string } {
  if (f.kind === 'region' || f.kind === 'vpc') return f.implicit ? { label: FRAME_TITLE[f.kind] } : { label: FRAME_TITLE[f.kind], caption: f.label };
  return { label: f.label };
}

/** Horizontal room for a frame label: the frame width minus its inset (canvas.css .frame-label). */
export function frameLabelRoom(f: LayoutFrame): number {
  if (f.kind === 'lane') return f.w;
  if (f.kind === 'zone') return f.w - 16;
  return f.w - 24;
}

/** Width of a frame label plus caption, with the 7 px gap between them. */
export function frameLabelWidth(t: AdvanceTable, f: LayoutFrame, px: number): number {
  const { label, caption } = frameText(f);
  return textWidth(t, 'frame', label, px) + (caption ? 7 + textWidth(t, 'caption', caption, px) : 0);
}
