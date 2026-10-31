// The view model of the canvas: the layout and the display graph turned into what the components draw (frames with
// their labels, cards with set titles, badges, zone chips and cautions). Pure: text is measured through an injected
// function, so the same code runs in the browser (canvas measureText) and in Node tests.
import { GEOMETRY, cardFor, cardText, fitTitle } from '@ali/core/layout.ts';
import type { LayoutBadge, LayoutCard, LayoutFrame, LayoutState, MeasureText } from '@ali/core/layout.ts';
import type { Catalog, CatalogEntry, Graph } from '@ali/core/types.ts';
import type { Lang, TFn } from '../i18n/t.ts';
import { label, laneLabelKey } from './labels.ts';

const G = GEOMETRY;

export interface Measurer {
  /** Width of text set in the card-title style (weight 500). */
  title: MeasureText;
  /** Width of text set in the body style (weight 400): subtitles. */
  body: MeasureText;
}

export interface FrameView {
  id: string;
  kind: LayoutFrame['kind'];
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  /** The label text (already in the UI language where the layout wrote it in English). */
  text: string;
  /** A second, quieter part: the region id after the region name, or "VPC" before a VPC name. */
  aside?: string;
  asidePlace?: 'after' | 'before';
  empty: boolean;
  lane?: string;
}

export interface BadgeView {
  id: string;
  product: string;
  host: string;
  as: 'badge' | 'attachment';
  /** Offsets from the host card's top-left corner. */
  x: number;
  y: number;
  w: number;
  h: number;
  short: string;
  name: string;
  why: string | null;
}

export interface CardView {
  id: string;
  kind: 'node' | 'rec';
  product: string;
  x: number;
  y: number;
  w: number;
  h: number;
  frame: string;
  titleLines: string[];
  titlePx: number;
  subtitle: string;
  /** Upper-case zone letters. */
  zones: string[];
  fit?: 'primary' | 'complement';
  badges: BadgeView[];
  attachments: BadgeView[];
  /** The lifecycle or availability note, when a caution remains for this product. */
  caution: string | null;
  label: string;
  /** The official full product name. */
  name: string;
  where: string;
  why: string | null;
}

export interface Scene {
  frames: FrameView[];
  cards: CardView[];
  byId: Map<string, CardView>;
  /** Badge id -> its view (badges and attachments), for popovers and highlights. */
  badgeById: Map<string, BadgeView>;
}

export function entryFor(catalog: Catalog, product: string): CatalogEntry | undefined {
  const direct = catalog.byId.get(product);
  if (direct) return direct;
  try {
    return catalog.resolve(product).entry;
  } catch {
    return undefined;
  }
}

/** The name and the quieter part of a region label such as "Singapore (ap-southeast-1)". */
export function splitRegionLabel(text: string): { name: string; id?: string } {
  const m = /^(.*?)\s*[(（]([a-z]{2}-[a-z0-9-]+)[)）]\s*$/i.exec(text.trim());
  return m && m[1] ? { name: m[1], id: m[2] } : { name: text.trim() };
}

const SOLUTION_LANES = new Set(['team', 'saas', 'model', 'cloud']);

export function frameView(f: LayoutFrame, lang: Lang, t: TFn): FrameView {
  const base = { id: f.id, kind: f.kind, x: f.x, y: f.y, w: f.w, h: f.h, depth: f.depth, empty: f.empty, lane: f.lane };
  const named = (text: string): FrameView => ({ ...base, text });
  switch (f.kind) {
    case 'region': {
      if (f.implicit) return named(label(lang, 'frame.region'));
      const r = splitRegionLabel(f.label);
      return { ...base, text: r.name, aside: r.id, asidePlace: 'after' };
    }
    case 'vpc': {
      if (f.implicit || !f.label.trim()) return named(label(lang, 'frame.vpc'));
      // "Portal VPC" already says what it is; a bare name such as "Portal" gets the quiet "VPC" before it
      return /vpc/i.test(f.label) ? named(f.label.trim()) : { ...base, text: f.label.trim(), aside: label(lang, 'frame.vpc'), asidePlace: 'before' };
    }
    case 'zone':
      return named(label(lang, 'frame.zone', { letter: (f.zone ?? f.label.replace(/^.*\s/, '')).toUpperCase() }));
    case 'edge':
      return named(f.implicit ? t('panel.group.edge') : f.label);
    case 'outside':
      return named(t('panel.group.outside'));
    case 'account':
      return named(t('panel.group.account'));
    case 'saas':
      return named(t('panel.group.saas'));
    case 'recs':
      return named(t('panel.group.recs'));
    case 'solution':
      return named(f.lane && SOLUTION_LANES.has(f.lane) ? t(`canvas.lane.${f.lane}` as 'canvas.lane.team') : f.label);
    case 'lane': {
      const key = f.lane ? laneLabelKey(f.lane) : undefined;
      return named(key ? label(lang, key) : f.label);
    }
    default:
      // external and onprem frames are written by the model (or are the layout's "Internet"); keep their text
      return named(f.label);
  }
}

const FLAG_KEYS = {
  preview: 'pop.lifecycle.preview',
  legacy: 'pop.lifecycle.legacy',
  'no-new-purchases': 'pop.lifecycle.noNew',
  retired: 'pop.lifecycle.retired',
} as const;
const AVAIL_KEYS = {
  'china-only': 'pop.lifecycle.chinaOnly',
  restricted: 'pop.lifecycle.restricted',
  announced: 'pop.lifecycle.announced',
} as const;

/** The caution a product carries: its lifecycle state or availability limit, with the catalog's own note when it has one. */
export function cautionOf(e: CatalogEntry | undefined, lang: Lang): string | null {
  if (!e) return null;
  const parts: string[] = [];
  if (Object.hasOwn(FLAG_KEYS, e.status)) parts.push(label(lang, FLAG_KEYS[e.status as keyof typeof FLAG_KEYS]));
  if (Object.hasOwn(AVAIL_KEYS, e.availability)) parts.push(label(lang, AVAIL_KEYS[e.availability as keyof typeof AVAIL_KEYS]));
  if (!parts.length) return null;
  if (e.note) parts.push(e.note);
  return parts.join(' ');
}

function frameName(f: FrameView | undefined): string {
  if (!f) return '';
  return f.aside && f.asidePlace === 'before' ? `${f.aside} ${f.text}` : f.text;
}

export interface SceneInput {
  layout: LayoutState;
  graph: Graph;
  catalog: Catalog;
  lang: Lang;
  t: TFn;
  measure: Measurer;
}

function badgeView(b: LayoutBadge, host: LayoutCard, graph: Graph, catalog: Catalog): BadgeView {
  const e = entryFor(catalog, b.product);
  const node = Object.hasOwn(graph.nodes, b.id) ? graph.nodes[b.id] : undefined;
  return { id: b.id, product: b.product, host: b.host, as: b.as, x: b.x - host.x, y: b.y - host.y, w: b.w, h: b.h, short: e?.short ?? b.product, name: e?.name ?? b.product, why: node?.why ?? null };
}

export function buildScene(i: SceneInput): Scene {
  const { layout, graph, catalog, lang, t, measure } = i;
  const frames = Object.values(layout.frames).map((f) => frameView(f, lang, t));
  const frameById = new Map(frames.map((f) => [f.id, f]));
  const cards: CardView[] = [];
  const byId = new Map<string, CardView>();
  const badgeById = new Map<string, BadgeView>();
  for (const c of Object.values(layout.cards)) {
    const e = entryFor(catalog, c.product);
    const zones = (c.zones ?? []).map((z) => z.toUpperCase());
    // the subtitle shares its line with the zone chips: leave room for them
    const chipsW = zones.length ? measure.title(zones.join(' '), 12) + 6 : 0;
    const text = cardText(c, graph, catalog, (s) => measure.body(s, G.subtitlePx) <= G.textW - chipsW + 0.01);
    const set = fitTitle(text.title, measure.title);
    const bs = c.badges
      .map((id) => layout.badges[id])
      .filter((b): b is LayoutBadge => !!b)
      .map((b) => badgeView(b, c, graph, catalog));
    for (const b of bs) badgeById.set(b.id, b);
    const rec = c.kind === 'rec' ? graph.recs.find((r) => 'rec:' + r.product === c.id || r.product === c.product) : undefined;
    const node = c.kind === 'node' && Object.hasOwn(graph.nodes, c.id) ? graph.nodes[c.id] : undefined;
    const fr = frameById.get(c.frame);
    const where = [frameName(fr), zones.length ? label(lang, 'card.zones', { list: zones.join(', ') }) : ''].filter(Boolean).join(', ');
    const view: CardView = {
      id: c.id,
      kind: c.kind,
      product: c.product,
      x: c.x,
      y: c.y,
      w: c.w,
      h: c.h,
      frame: c.frame,
      titleLines: set.lines,
      titlePx: set.px,
      subtitle: text.subtitle,
      zones,
      fit: c.kind === 'rec' ? (rec?.fit ?? c.fit) : undefined,
      badges: bs.filter((b) => b.as === 'badge'),
      attachments: bs.filter((b) => b.as === 'attachment'),
      caution: cautionOf(e, lang),
      label: text.title,
      name: e?.name ?? c.product,
      where,
      why: (c.kind === 'rec' ? rec?.why : node?.why) ?? null,
    };
    cards.push(view);
    byId.set(view.id, view);
  }
  return { frames, cards, byId, badgeById };
}

/** The card id that draws a graph element id (a badge's host card), or null when it is not on the canvas. */
export function hostCardId(layout: LayoutState, id: string): string | null {
  return cardFor(layout, id)?.id ?? null;
}
