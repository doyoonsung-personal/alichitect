// The products panel's table, as data (spec 7.26). Pure: a drawn graph and its layout in, groups of rows out. The
// component only draws it; node:test checks it. Names come from the catalog (short names), reasons from the model's
// `why` (verbatim) with the catalog's `purpose` as the fallback, and prices only from the catalog.
import type { Catalog, CatalogEntry, Graph, GraphNode } from '@ali/core/types.ts';
import type { LayoutFrame, LayoutState } from '@ali/core/layout.ts';
import type { TFn } from '../i18n/t.ts';
import { labelIfDiffers } from '../store/changes.ts';

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);

export type FlagKind = 'preview' | 'legacy' | 'noNew' | 'retired' | 'chinaOnly' | 'restricted' | 'announced';

export interface PanelRow {
  /** The canvas id: a node id (card or badge), or 'rec:<product>'. Hovering the row highlights it. */
  id: string;
  kind: 'node' | 'badge' | 'rec';
  product: string;
  /** Catalog short name. */
  name: string;
  /** Full official name, for the icon's tooltip and the link's name. */
  fullName: string;
  /** The card label, only when it differs from the short name. */
  label?: string;
  /** The model's reason, verbatim; empty only when the catalog has no purpose either. */
  why: string;
  /** `why` is the catalog's purpose, not the model's reason. */
  whyIsCatalog: boolean;
  /** Where it sits: zones, the host a badge is on, else the catalog category. */
  where: string;
  /** Lifecycle and availability flags, worst first. */
  flags: FlagKind[];
  /** The catalog's caveat for the product. */
  note?: string;
  price?: { summary: string; asOf: string };
  docs?: string;
  fit?: 'primary' | 'complement';
  /** A badge or attachment row, listed under its host and indented. */
  indent: boolean;
  /** Revisions that added and last changed it, once a revision has been saved. */
  addedIn?: number;
  changedIn?: number;
}

export interface PanelGroup {
  key: string;
  /** Localized heading; empty for the flat solution-map table. */
  label: string;
  rows: PanelRow[];
}

export interface PanelEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind: 'data' | 'async' | 'control' | 'resolve';
}

export interface PanelModel {
  groups: PanelGroup[];
  edges: PanelEdge[];
  /** Rows in reading order, for counting and for tests. */
  rows: PanelRow[];
  recs: number;
}

export function flagsOf(e: CatalogEntry | undefined): FlagKind[] {
  if (!e) return [];
  const out: FlagKind[] = [];
  if (e.status === 'retired') out.push('retired');
  else if (e.status === 'no-new-purchases') out.push('noNew');
  else if (e.status === 'legacy') out.push('legacy');
  else if (e.status === 'preview') out.push('preview');
  if (e.availability === 'china-only') out.push('chinaOnly');
  else if (e.availability === 'restricted') out.push('restricted');
  else if (e.availability === 'announced') out.push('announced');
  return out;
}

/** Only an https link opens from the panel. */
export function safeDocs(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

interface Place {
  key: string;
  label: string;
  /** Sort keys: the root frame's x and y, regional after VPC, then the frame's own y and x. */
  order: [number, number, number, number, number];
}

function ancestor(frames: Record<string, LayoutFrame>, f: LayoutFrame, pred: (x: LayoutFrame) => boolean): LayoutFrame | undefined {
  for (let cur: LayoutFrame | undefined = f, n = 0; cur && n < 12; cur = cur.parent && has(frames, cur.parent) ? frames[cur.parent] : undefined, n++) if (pred(cur)) return cur;
  return undefined;
}

const root = (frames: Record<string, LayoutFrame>, f: LayoutFrame): LayoutFrame => ancestor(frames, f, (x) => !x.parent || !has(frames, x.parent)) ?? f;

function placeOf(frame: LayoutFrame | undefined, layout: LayoutState, t: TFn): Place {
  if (!frame) return { key: 'other', label: t('panel.group.misc'), order: [1e9, 0, 0, 0, 0] };
  const frames = layout.frames;
  const r = root(frames, frame);
  const regionLabel = (reg: LayoutFrame | undefined): string => (reg ? (reg.implicit ? t('panel.group.region') : reg.label) : '');
  const kindOrder = (regional: boolean): Place['order'] => [r.x, r.y, regional ? 1 : 0, frame.y, frame.x];
  if (frame.kind === 'zone' || frame.kind === 'vpc') {
    const vpc = frame.kind === 'zone' ? (ancestor(frames, frame, (x) => x.kind === 'vpc') ?? frame) : frame;
    const reg = ancestor(frames, vpc, (x) => x.kind === 'region');
    const label = reg ? t('panel.group.vpc', { region: regionLabel(reg), vpc: vpc.label }) : vpc.label;
    return { key: `vpc:${vpc.id}`, label, order: [r.x, r.y, 0, vpc.y, vpc.x] };
  }
  if (frame.kind === 'region' || frame.kind === 'lane') {
    const reg = frame.kind === 'region' ? frame : ancestor(frames, frame, (x) => x.kind === 'region');
    return { key: `regional:${reg?.id ?? frame.id}`, label: t('panel.group.regional', { region: regionLabel(reg) }), order: kindOrder(true) };
  }
  const named: Partial<Record<LayoutFrame['kind'], Parameters<TFn>[0]>> = {
    external: 'panel.group.clients',
    edge: 'panel.group.edge',
    outside: 'panel.group.outside',
    account: 'panel.group.account',
    saas: 'panel.group.saas',
    recs: 'panel.group.recs',
  };
  // a drawn group keeps the model's own heading; the layout's implicit ones are localized
  const key = named[frame.kind];
  const label = frame.implicit && key ? t(key) : frame.label || (key ? t(key) : t('panel.group.misc'));
  return { key: `frame:${frame.id}`, label, order: kindOrder(false) };
}

function rowFor(
  catalog: Catalog,
  t: TFn,
  prov: Readonly<Record<string, { addedIn: number; changedIn: number }>>,
  id: string,
  kind: PanelRow['kind'],
  product: string,
  label: string | undefined,
  why: string | undefined,
  where: string | null,
  fit?: 'primary' | 'complement',
): PanelRow {
  const e = catalog.byId.get(product);
  const name = e?.short ?? product;
  const modelWhy = (why ?? '').trim();
  const p = has(prov, id) ? prov[id] : undefined;
  return {
    id,
    kind,
    product,
    name,
    fullName: e?.name ?? name,
    label: labelIfDiffers(label, name),
    why: modelWhy || e?.purpose || '',
    whyIsCatalog: !modelWhy && !!e?.purpose,
    where: where ?? (e && e.kind !== 'construct' ? e.category : ''),
    flags: flagsOf(e),
    note: e?.note?.trim() || undefined,
    price: e?.price,
    docs: safeDocs(e?.docs),
    fit,
    indent: kind === 'badge',
    addedIn: p?.addedIn,
    changedIn: p?.changedIn,
  };
}

const zoneText = (t: TFn, zones: readonly string[] | undefined): string | null =>
  zones && zones.length ? t('panel.zone', { n: zones.length, z: zones.map((z) => z.toUpperCase()).join(', ') }) : null;

/**
 * Architecture: rows grouped by the frame they sit in (Clients, Edge network, "Singapore · Customer VPC", "Singapore ·
 * regional services", Account, Recommended), groups left to right as the diagram runs, rows in reading order, and
 * badges under their hosts. Solution map: one flat table, the primary recommendations first.
 */
export function buildPanelModel(
  graph: Graph,
  layout: LayoutState | null,
  catalog: Catalog,
  t: TFn,
  provenance: Readonly<Record<string, { addedIn: number; changedIn: number }>> = {},
): PanelModel {
  const edges: PanelEdge[] = Object.values(graph.edges).map((e) => ({ id: e.id, from: labelOfEnd(graph, catalog, e.from), to: labelOfEnd(graph, catalog, e.to), label: e.label?.trim() || undefined, kind: e.kind ?? 'data' }));
  const nodes = Object.values(graph.nodes);
  const solution = layout?.mode === 'solution';

  if (solution || (nodes.length === 0 && graph.recs.length > 0)) {
    const recs = [...graph.recs].sort((a, b) => (a.fit === b.fit ? 0 : a.fit === 'primary' ? -1 : 1));
    const rows = recs.map((r) => rowFor(catalog, t, provenance, 'rec:' + r.product, 'rec', r.product, undefined, r.why, null, r.fit));
    // infrastructure drawn beside a solution map is still listed, after the recommendations
    const extra = nodes.map((n) => nodeRow(catalog, t, provenance, graph, n));
    const all = [...rows, ...extra];
    return { groups: all.length ? [{ key: 'solution', label: '', rows: all }] : [], edges, rows: all, recs: graph.recs.length };
  }

  const buckets = new Map<string, { place: Place; entries: Array<{ x: number; y: number; row: PanelRow; badges: PanelRow[] }> }>();
  const put = (frameId: string | undefined, x: number, y: number, row: PanelRow, badges: PanelRow[]): void => {
    const frame = frameId && layout && has(layout.frames, frameId) ? layout.frames[frameId] : undefined;
    const place = layout ? placeOf(frame, layout, t) : { key: 'other', label: t('panel.group.misc'), order: [1e9, 0, 0, 0, 0] as Place['order'] };
    let b = buckets.get(place.key);
    if (!b) buckets.set(place.key, (b = { place, entries: [] }));
    b.entries.push({ x, y, row, badges });
  };

  const placedBadges = new Set<string>();
  const cardRowFor = (id: string): { row: PanelRow; badges: PanelRow[] } | undefined => {
    if (has(graph.nodes, id)) {
      const n = graph.nodes[id];
      const badges: PanelRow[] = [];
      const lc = layout && has(layout.cards, id) ? layout.cards[id] : undefined;
      for (const bid of lc?.badges ?? []) if (has(graph.nodes, bid)) badges.push(nodeRow(catalog, t, provenance, graph, graph.nodes[bid]));
      for (const bid of lc?.badges ?? []) placedBadges.add(bid);
      return { row: nodeRow(catalog, t, provenance, graph, n), badges };
    }
    return undefined;
  };

  if (layout) {
    for (const c of Object.values(layout.cards)) {
      if (c.kind === 'rec') {
        const r = graph.recs.find((x) => 'rec:' + x.product === c.id);
        if (r) put(c.frame, c.x, c.y, rowFor(catalog, t, provenance, c.id, 'rec', r.product, undefined, r.why, null, r.fit), []);
        continue;
      }
      const made = cardRowFor(c.id);
      if (made) put(c.frame, c.x, c.y, made.row, made.badges);
    }
  }
  // nodes the layout has no card for yet (a badge whose host is missing, or no layout): listed last, never dropped
  const inLayout = new Set(layout ? Object.keys(layout.cards) : []);
  for (const n of nodes) {
    if (inLayout.has(n.id) || placedBadges.has(n.id)) continue;
    put(undefined, 1e9, 0, nodeRow(catalog, t, provenance, graph, n), []);
  }
  for (const r of graph.recs) {
    if (inLayout.has('rec:' + r.product)) continue;
    put(undefined, 1e9, 0, rowFor(catalog, t, provenance, 'rec:' + r.product, 'rec', r.product, undefined, r.why, null, r.fit), []);
  }

  const groups: PanelGroup[] = [...buckets.values()]
    .sort((a, b) => {
      for (let i = 0; i < 5; i++) if (a.place.order[i] !== b.place.order[i]) return a.place.order[i] - b.place.order[i];
      return 0;
    })
    .map((b) => ({
      key: b.place.key,
      label: b.place.label,
      rows: b.entries
        .sort((p, q) => p.x - q.x || p.y - q.y)
        .flatMap((e) => [e.row, ...e.badges]),
    }));
  return { groups, edges, rows: groups.flatMap((g) => g.rows), recs: graph.recs.length };
}

function nodeRow(catalog: Catalog, t: TFn, prov: Readonly<Record<string, { addedIn: number; changedIn: number }>>, graph: Graph, n: GraphNode): PanelRow {
  const host = n.attachTo && has(graph.nodes, n.attachTo) ? graph.nodes[n.attachTo] : undefined;
  const hostName = host ? host.label?.trim() || catalog.byId.get(host.product)?.short || host.product : null;
  const where = hostName ? t('panel.onHost', { host: hostName }) : zoneText(t, n.zones);
  return rowFor(catalog, t, prov, n.id, host ? 'badge' : 'node', n.product, n.label, n.why, where);
}

function labelOfEnd(graph: Graph, catalog: Catalog, id: string): string {
  if (has(graph.nodes, id)) {
    const n = graph.nodes[id];
    return n.label?.trim() || catalog.byId.get(n.product)?.short || id;
  }
  if (id.startsWith('rec:')) return catalog.byId.get(id.slice(4))?.short ?? id;
  return id;
}

/** The revision a row's Rev. cell shows: the one that added it. Null while its revision is still streaming. */
export function revOf(row: PanelRow): number | null {
  return row.addedIn ?? null;
}

/** Filled tag: the latest saved revision added or changed the row. */
export function isLatest(row: PanelRow, latest: number | null): boolean {
  return latest !== null && (row.addedIn === latest || row.changedIn === latest);
}

/** "14 products · 2 recommendations" for the collapsed bar. */
export function summaryParts(t: TFn, count: number, recs: number, solution: boolean): string[] {
  if (count === 0) return [];
  const parts = [t('panel.count', { n: count })];
  if (recs > 0 && !solution) parts.push(t('panel.recs', { n: recs }));
  return parts;
}
