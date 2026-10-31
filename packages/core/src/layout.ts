// Catalog-driven lane-grid layout, v2 ("stacked shelves" with grafts from the Phase 1 layout bake-off). Pure and
// deterministic: no DOM, no Node APIs, no clocks. Built for the canvas beside the chat console (about 880-1520 px).
//
// Placement comes from the catalog (placementOf), not from the model: a node's container follows its entry's scope,
// its column its lane, and its order inside a lane its pathRank. The model's groups only say WHICH region, VPC or zone
// a node belongs to; lay out the repairGraph() output (or the display graph), so those hints are already scope-correct.
//
//   Left to right, on one request-path row (y = 0):  Clients | Edge | Region
//   Region:   VPC(s) with three tier columns (ingress | compute or zones | data), then a shelf of managed services
//             BELOW the VPC, inside the region: lane blocks (storage, AI, analytics, integration, operations ...) in
//             three columns aligned with the VPC's columns. Integration and analytics prefer the data column, so a
//             pipeline reads top to bottom under its source database. Later regions (DR) stack below the first.
//             A VPC that arrives once the shelf stands (a DR VPC) goes below the shelf, with spare rows, so it pushes nothing.
//   VPC:      vpc-edge cards (NAT, VPN gateway, Cloud Firewall) sit inside the VPC in the ingress column, above the
//             load balancers; they never straddle the border. A compute tier of more than seven cards wraps into the
//             free space above the ingress column (sticky split). The VPC frame wraps only the columns in use.
//   Zones:    a multi-zone card shows its zones on the card (LayoutCard.zones) and needs no frame. A zone that holds
//             cards of its own gets a frame in the compute column, as tall as its cards, stacked above the multi-zone
//             row; zone frames and their cards (badges and attachment pills included) stay inside the VPC.
//   Bands:    Account, SaaS and Recommended stack under the Clients and Edge columns, two cards wide, each keeping
//             spare rows so it can grow without reaching the band below.
//   Outside services: a frame at the foot of the Clients column, so nothing ever sits right of the region.
//   Width:    fixed at Clients + Edge + a three-column region (GEOMETRY.archW, 1,044 px) once Clients, Edge or a band
//             exist, so the canvas fits the width (fitCamera) and pans vertically when a diagram is taller.
//   Solution map (recs only): Team, SaaS, Model service and Cloud resources as rows, top to bottom, three cards a row.
//
// Anchors, chosen so that growth never pushes a bystander:
//   - x = 0 is the region's left edge. Clients and Edge sit at negative x. y = 0 is the request-path row and the floor
//     of every VPC tier: tiers grow upwards, so a new tier card moves only the VPC's top border, never the shelf.
//     Coordinates can be negative; LayoutState.bounds is the bounding box (width and height are its size).
//   - Sticky tops with slack: whatever sits below something that can grow (the shelf, a later VPC or region, a lane
//     block below another, the bands, the solution rows) keeps its top while `prev` is passed; a part that is pushed
//     anyway overshoots by one row. Nothing moves up after a removal. Pass opts.tidy (or no prev) for the tidy
//     arrangement: tidy keeps every slot order and shelf column but drops the reserved room and holes.
//   - The layout does not read the canvas size: the same graph and prev give the same state at every canvas size.
//     The camera (fitCamera) is where the canvas size matters.
//
// Text: card titles wrap to two lines and shrink in 0.5 px steps before they would ever be cut (fitTitle); the
// subtitle is the official short name, or the full name when the title already is the short name, never the lane
// (cardText). Every size the canvas draws is in GEOMETRY, so the design phase can tune it and re-run the gates.
import type { Catalog, CatalogEntry, Graph, GraphGroup, GraphNode, Lane } from './types.ts';
import { placementOf } from './catalog.ts';
import { isCard } from './display.ts';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ShelfKind = 'data' | 'ops';

export type FrameKind = 'external' | 'onprem' | 'edge' | 'region' | 'vpc' | 'zone' | 'outside' | 'account' | 'saas' | 'recs' | 'lane' | 'solution';

export interface LayoutFrame extends Rect {
  id: string;
  kind: FrameKind;
  label: string;
  parent: string | null;
  depth: number;
  /** Drawn by the layout without a graph group: an implicit region, an edge column, a side band, a lane block. */
  implicit: boolean;
  /** No cards yet. */
  empty: boolean;
  /** Lane blocks and solution lanes: the lane they hold. */
  lane?: string;
  /** Zone frames: the zone letter. */
  zone?: string;
}

export interface LayoutCard extends Rect {
  /** Node id, or 'rec:<product>' for a recommendation (the reducer's id for recs). */
  id: string;
  kind: 'node' | 'rec';
  product: string;
  /** Innermost frame the card sits in. */
  frame: string;
  /** Sticky slot key, and the card's index in it. */
  slot: string;
  index: number;
  /** Zone letters of a multi-zone node; the canvas shows them on the card. */
  zones?: string[];
  /** Phase 0 layout only: horizontal extent of the zone frames a multi-zone card covered. v2 never sets it. */
  span?: { x0: number; x1: number };
  /** Phase 0 layout only: the card straddled its VPC's top edge. v2 never sets it (vpc-edge cards sit inside the VPC). */
  boundary?: boolean;
  fit?: 'primary' | 'complement';
  /** Ids of nodes drawn as badges or attachments on this card. */
  badges: string[];
}

export interface LayoutBadge extends Rect {
  id: string;
  product: string;
  host: string;
  as: 'badge' | 'attachment';
  index: number;
}

/** Sticky state v2 keeps between calls, beside the slot orders. Read back from `prev`; opaque to the canvas. */
export interface LayoutSticky {
  /** Sticky tops (px) of the parts that sit below something that can grow; a top never moves up while prev is passed. */
  tops: Record<string, number>;
  /** Shelf height per region that new lane blocks may fill without growing the shelf. */
  shelfH: Record<string, number>;
  /** Whether Clients, Edge or a band have existed: the left columns' room stays reserved. */
  left: { external: boolean; edge: boolean; bands: boolean };
  /** Per VPC with a wrapped compute tier: cards kept in the compute column, and the ingress-column row the rest start at. */
  spill: Record<string, { cap: number; r0: number }>;
}

export interface LayoutState {
  /** 1: the Phase 0 layout (coordinates from 0). 2: this layout (anchored coordinates, which can be negative). */
  version: 1 | 2;
  mode: 'architecture' | 'solution';
  /** Size of the bounding box. */
  width: number;
  height: number;
  /** y of the request-path row: every root column's first card sits on it (0 in v2). */
  pathY: number;
  cards: Record<string, LayoutCard>;
  frames: Record<string, LayoutFrame>;
  badges: Record<string, LayoutBadge>;
  /** Sticky state, read back from `prev`: ordered card ids per slot. */
  slots: Record<string, string[]>;
  /** Sticky state: lane-block frame ids per shelf column, per region. */
  shelves: Record<string, string[][]>;
  /** Sticky state: the kind of each shelf column, per region. */
  shelfKinds: Record<string, ShelfKind[]>;
  /** Sticky state: frame order per stacking parent (root columns, VPCs in a region, regions, bands). */
  order: Record<string, string[]>;
  /** v2: the bounding box of every frame, card and badge. x and y can be negative; draw from (bounds.x, bounds.y). */
  bounds?: Rect;
  /** v2: sticky tops and reserves. */
  sticky?: LayoutSticky;
}

export interface CanvasSize {
  w: number;
  h: number;
}

export interface LayoutOptions {
  /** Canvas the diagram is shown in. Default 1040x800. The layout itself does not depend on it (see fitCamera). */
  canvas?: CanvasSize;
  /** Keep every slot order, shelf column and frame order from prev, but drop reserved room and holes ("tidy up"). */
  tidy?: boolean;
}

export const DEFAULT_CANVAS: CanvasSize = { w: 1040, h: 800 };

/**
 * Every size the layout and the canvas use, in px at zoom 1. Change a value here and re-run the gates
 * (node --test in packages/core) and the bench (spikes/layout-bench/out/core-v2/README in the report).
 */
export const GEOMETRY = {
  // ----- cards -----
  cardW: 168,
  cardH: 60, // room for a two-line title and the subtitle
  /** Text column: cardW minus 10 px padding each side, the 30 px glyph tile and a 10 px gap. */
  textW: 108,
  // ----- typography (px at zoom 1) -----
  titlePx: 14,
  /** Titles wrap to titleLines lines, then shrink in titleStep steps down to titleMinPx; they are never cut before that. */
  titleLines: 2,
  titleStep: 0.5,
  titleMinPx: 10,
  titleLineHeight: 1.28,
  subtitlePx: 12,
  subtitleLineHeight: 1.27,
  frameLabelPx: 14, // 11.2 px on screen at 880x720, where the fit zoom is 0.797
  // ----- legibility floors on screen (fitCamera) -----
  /** The camera never shrinks a diagram so far that titles render below this; it pans vertically instead. */
  titleFloorPx: 12,
  /** Below this rendered size the canvas hides subtitles (semantic zoom); titles stay. */
  subtitleFloorPx: 11,
  // ----- camera -----
  fitPad: 24,
  maxZoom: 1.25,
  /** The camera keeps its zoom while the wanted zoom stays within this fraction of it (no pumping). */
  zoomHysteresis: 0.1,
  // ----- spacing -----
  gapY: 24, // between stacked cards: a horizontal routing channel (libavoid keeps 8 px clear of cards)
  gapX: 32, // between tier and shelf columns: a vertical routing channel
  rootGap: 22, // between the Clients, Edge and region columns
  padX: 10, // simple frames (Clients, Edge, bands, solution rows)
  regionPadX: 6,
  vpcPadX: 22,
  padTop: 6,
  padBottom: 10,
  head: 24, // frame label band (a 26 px band put the channel router's detour p95 at 3.79 instead of 1.15)
  vpcHead: 28,
  zoneHead: 26,
  zonePad: 8,
  zoneGap: 10,
  /** Below the lowest card row of a zone frame: room for an attachment pill (attachH / 2) plus 4 px. */
  zonePadBottom: 14,
  laneHead: 24,
  laneGap: 16,
  frameGap: 20, // between frames stacked in one root column, and between solution rows
  vpcGap: 28,
  shelfGap: 20, // between the VPC and the shelf
  bandGap: 24,
  /** Spare rows a band keeps below itself before the next band (Account grows the most). */
  bandSpareRows: { account: 2, saas: 1, recs: 1 },
  /** A compute tier wraps into the ingress column only above this many cards. */
  computeWrapMin: 7,
  solutionPerRow: 3,
  badge: 22,
  badgeStep: 26,
  attachW: 104,
  attachH: 20,
  /** Width of an architecture diagram once Clients, Edge or a band exist: 2 left columns + a 3-column region. */
  archW: 1044,
} as const;

const G = GEOMETRY;
const ROW = G.cardH + G.gapY;
const PITCH = G.cardW + G.gapX;
const rows = (n: number): number => (n <= 0 ? 0 : n * G.cardH + (n - 1) * G.gapY);
/** Grid columns of a region: ingress, compute (or zones), data. The shelf uses the same three columns. */
const GRID = 3;
const FRAME_W = G.cardW + 2 * G.padX;
/** x of grid column k, relative to the region's left edge (region padding plus VPC padding). */
const colX = (k: number): number => G.regionPadX + G.vpcPadX + k * PITCH;
const REGION_INNER_W = 2 * G.vpcPadX + GRID * G.cardW + (GRID - 1) * G.gapX; // a full VPC frame's width
/** From a VPC's floor row down to its bottom edge: the row, an attachment pill and the zone and VPC padding. */
const VPC_BELOW = G.cardH + G.zonePadBottom + G.padBottom;
/** Deprecated (Phase 0): the request-path row's y. In v2 it is always 0, as LayoutState.pathY says. */
export const PATH_ROW = 0;
/** Left edge of the Clients column: the left columns sit at negative x, the region starts at x = 0. */
export const ARCH_X0 = -2 * (FRAME_W + G.rootGap);

const DATA_LANES: readonly string[] = ['cache', 'database', 'search', 'filestore', 'middleware', 'ai', 'analytics', 'storage', 'integration', 'ops', 'security', 'network', 'compute', 'ingress'];
const ZONE_LANES: readonly string[] = ['ingress', 'compute', ...DATA_LANES];
const SHELF_LANES: readonly string[] = ['storage', 'ai', 'analytics', 'integration', 'compute', 'ops', 'security', 'network'];
/** Shelf lane for a VPC-scoped card that has no VPC to go to (unrepaired input only: repair creates the VPC). */
const LOOSE_SHELF: Record<string, string> = { ingress: 'network', boundary: 'network', compute: 'compute', middleware: 'integration', cache: 'storage', database: 'storage', search: 'storage', filestore: 'storage' };
/** Preferred shelf column per lane: storage under ingress, AI and compute under compute, data flows and operations under data. */
const SHELF_PREF: Record<string, number> = { storage: 0, network: 0, ai: 1, compute: 1, integration: 2, analytics: 2, ops: 2, security: 2 };
const SHELF_TITLES: Record<string, string> = { compute: 'Compute', storage: 'Storage', ai: 'AI', analytics: 'Analytics', integration: 'Integration', ops: 'Operations', security: 'Security', network: 'Network' };
const OPS_LANES: ReadonlySet<string> = new Set(['ops', 'security', 'network']);
const ROOT_LANES: readonly string[] = ['clients', 'onprem', 'thirdparty', 'dns', 'edge', 'network', 'governance', 'saas'];
const SOLUTION_LANES: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'team', label: 'Team' },
  { key: 'saas', label: 'SaaS' },
  { key: 'model', label: 'Model service' },
  { key: 'cloud', label: 'Cloud resources' },
];
/** Seat or credit plans whose job is model access; the solution map draws them in the Model service lane. */
const MODEL_ACCESS: ReadonlySet<string> = new Set(['coding-plan', 'token-plan', 'qwen-cloud']);
const BANDS: ReadonlyArray<{ id: string; kind: 'account' | 'saas' | 'recs'; label: string }> = [
  { id: '~account', kind: 'account', label: 'Account' },
  { id: '~saas', kind: 'saas', label: 'SaaS' },
  { id: '~recs', kind: 'recs', label: 'Recommended' },
];
/**
 * Spare room between the shelf and a VPC that arrived after it. Two things use it up before the VPC has to move: the
 * VPC's own tiers growing upwards (a DR VPC with three tiers is two rows taller than its first card) and the shelf
 * growing a block (a transit router or CEN lands in a lane that is not on the shelf yet: lane head, card and lane gap).
 * Phase 1 sessions showed the pair: 84 px of tier growth then a 100 px block pushed the DR VPC down 100 px.
 */
const LATE_VPC_ROOM = 2 * ROW + G.laneHead + G.cardH + G.laneGap;
/** Room above a later region's floor row that its first VPC may grow into: tiers three rows tall, the labels. */
const REGION_HEAD = G.head + 2 * ROW + G.cardH + 14;
/** Room above a later region besides REGION_HEAD, for the region above to grow down into. */
const REGION_SLACK = ROW;

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);

function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  const direct = catalog.byId.get(product);
  if (direct) return direct;
  try {
    return catalog.resolve(product).entry;
  } catch {
    return undefined;
  }
}

function chainOf(graph: Graph, groupId: string | null | undefined): GraphGroup[] {
  const out: GraphGroup[] = [];
  const seen = new Set<string>();
  let cur = groupId ?? null;
  while (cur !== null && !seen.has(cur) && out.length < 32) {
    seen.add(cur);
    const g: GraphGroup | undefined = has(graph.groups, cur) ? graph.groups[cur] : undefined;
    if (!g) break;
    out.push(g);
    cur = g.parent;
  }
  return out;
}

/** Zone letter from a zone group's label or id ('Zone A', 'zone-b', 'ap-southeast-1a'). Same rule as the validator. */
export function zoneLetter(z: GraphGroup): string {
  for (const s of [z.label, z.id]) {
    const m = /(?:zone|az)[\s_-]*([a-z0-9]{1,3})\s*$/i.exec(s) ?? /\d([a-z])\s*$/i.exec(s) ?? /(?:^|[\s_-])([a-z]|\d{1,2})\s*$/i.exec(s);
    if (m) return m[1].toLowerCase();
  }
  return z.id;
}

/** Solution-map lane of an entry: Team, SaaS, Model service or Cloud resources. */
export function solutionLane(e: CatalogEntry | undefined): 'team' | 'saas' | 'model' | 'cloud' {
  if (!e) return 'cloud';
  if (e.scope === 'external') return 'team';
  if (MODEL_ACCESS.has(e.id) || e.lane === 'ai' || (e.scope === 'saas' && e.icon === 'ai')) return 'model';
  if (e.scope === 'saas') return 'saas';
  return 'cloud';
}

// ---------- internal model ----------

type SortKey = [number, number, number]; // lane index, path rank, arrival

interface Item {
  id: string;
  kind: 'node' | 'rec';
  product: string;
  key: SortKey;
  zones?: string[];
  fit?: 'primary' | 'complement';
}

interface SimpleFrame {
  id: string;
  kind: FrameKind;
  label: string;
  implicit: boolean;
  column: 'external' | 'edge' | 'band' | 'solution';
  hasUpper: boolean;
  lane?: string;
}

interface ZoneModel {
  id: string;
  label: string;
  letter: string;
}

interface VpcModel {
  id: string;
  label: string;
  zones: ZoneModel[];
}

interface RegionModel {
  id: string;
  label: string;
  implicit: boolean;
  vpcs: string[];
  lanes: Set<string>;
}

function cmpKey(a: SortKey, b: SortKey): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** Sticky order for one slot: the previous order is kept; a new item goes after the last item that sorts before it. */
function orderSlot(items: Item[], prevOrder: readonly string[] | undefined): string[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const order = (prevOrder ?? []).filter((id) => byId.has(id));
  const placed = new Set(order);
  const fresh = items.filter((i) => !placed.has(i.id)).sort((a, b) => cmpKey(a.key, b.key) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const it of fresh) {
    let at = 0;
    for (let k = 0; k < order.length; k++) {
      const o = byId.get(order[k]);
      if (o && cmpKey(o.key, it.key) <= 0) at = k + 1;
    }
    order.splice(at, 0, it.id);
  }
  return order;
}

/** Sticky order of frame ids: the previous order is kept and new ids are appended in input order. */
function orderFrames(ids: readonly string[], prevOrder: readonly string[] | undefined): string[] {
  const want = new Set(ids);
  const out = (prevOrder ?? []).filter((id) => want.has(id));
  for (const id of ids) if (!out.includes(id)) out.push(id);
  return out;
}

const emptySticky = (): LayoutSticky => ({ tops: {}, shelfH: {}, left: { external: false, edge: false, bands: false }, spill: {} });

/**
 * Lays out a graph, normally the repairGraph() output or the display graph. Pass the previous LayoutState as `prev`
 * to keep sticky slots and reserves; without it the result is the tidy arrangement. Deterministic: the same graph,
 * catalog, prev and options always give the same state, whatever the canvas size.
 */
export function layoutGraph(graph: Graph, catalog: Catalog, prev?: LayoutState, opts: LayoutOptions = {}): LayoutState {
  const nodes = Object.values(graph.nodes ?? {});
  const recs = graph.recs ?? [];
  const arrival = new Map<string, number>();
  nodes.forEach((n, i) => arrival.set(n.id, i));
  recs.forEach((r, i) => arrival.set('rec:' + r.product, nodes.length + i));

  const entryCache = new Map<string, CatalogEntry | undefined>();
  const entry = (product: string): CatalogEntry | undefined => {
    if (!entryCache.has(product)) entryCache.set(product, entryOf(catalog, product));
    return entryCache.get(product);
  };

  // Badges: nodes attached to an existing host (display.isCard) that is not itself attached.
  const badgeOf = new Map<string, GraphNode>();
  for (const n of nodes) {
    if (isCard(graph, n) || n.attachTo === n.id) continue;
    const host = graph.nodes[n.attachTo!];
    if (host.attachTo && has(graph.nodes, host.attachTo)) continue;
    badgeOf.set(n.id, n);
  }
  const cardNodes = nodes.filter((n) => !badgeOf.has(n.id));
  const infra = cardNodes.filter((n) => entry(n.product)?.scope !== 'external');
  const mode: LayoutState['mode'] = recs.length > 0 && infra.length === 0 ? 'solution' : 'architecture';

  // a Phase 0 state (version 1) or a state of the other mode carries no usable sticky state
  const prevOk = prev && prev.version === 2 && prev.mode === mode ? prev : undefined;
  // tidy: keep the orders read from prev, but no sticky tops and no reserved room (a compact arrangement on request)
  const tidy = !!opts.tidy;
  const ps: LayoutSticky = prevOk && prevOk.sticky && !tidy ? prevOk.sticky : emptySticky();
  const sticky: LayoutSticky = emptySticky();
  /**
   * A sticky top: the previous value while what is above still fits; otherwise the need plus slack. A new part gets
   * `room` (or a row) only when `freshSlack`. A part that is pushed anyway overshoots by one row.
   */
  const stickyTop = (key: string, need: number, freshSlack: boolean, room: number = ROW): number => {
    const p = has(ps.tops, key) ? ps.tops[key] : undefined;
    let v: number;
    if (p !== undefined && need <= p) v = p;
    else if (p === undefined) v = freshSlack && !tidy ? need + room : need;
    else v = need + ROW;
    sticky.tops[key] = v;
    return v;
  };

  const slotItems = new Map<string, Item[]>();
  const put = (slot: string, it: Item): void => {
    const l = slotItems.get(slot);
    if (l) l.push(it);
    else slotItems.set(slot, [it]);
  };
  const keyOf = (id: string, e: CatalogEntry | undefined, laneList: readonly string[]): SortKey => {
    const li = laneList.indexOf(e ? e.lane : 'ops');
    return [li < 0 ? 99 : li, e && typeof e.pathRank === 'number' ? e.pathRank : 999, arrival.get(id) ?? 0];
  };
  const recKey = (fit: string, id: string): SortKey => [fit === 'primary' ? 0 : 1, 0, arrival.get(id) ?? 0];

  const simple = new Map<string, SimpleFrame>();
  const addSimple = (f: SimpleFrame): void => {
    if (!simple.has(f.id)) simple.set(f.id, f);
  };
  const regions = new Map<string, RegionModel>();
  const vpcs = new Map<string, VpcModel>();

  if (mode === 'solution') placeSolution();
  else placeArchitecture();

  const slots: Record<string, string[]> = {};
  const itemById = new Map<string, Item>();
  for (const [slot, items] of slotItems) {
    slots[slot] = orderSlot(items, prevOk?.slots[slot]);
    for (const it of items) itemById.set(it.id, it);
  }
  const slotOf = (key: string): string[] => slots[key] ?? [];

  const frames: Record<string, LayoutFrame> = {};
  const cards: Record<string, LayoutCard> = {};
  const badges: Record<string, LayoutBadge> = {};
  const shelves: Record<string, string[][]> = {};
  const shelfKinds: Record<string, ShelfKind[]> = {};
  const order: Record<string, string[]> = {};

  const place = (id: string, frame: string, slot: string, index: number, x: number, y: number): void => {
    const it = itemById.get(id);
    if (!it) return;
    const c: LayoutCard = { id, kind: it.kind, product: it.product, frame, slot, index, x, y, w: G.cardW, h: G.cardH, badges: [] };
    if (it.zones) c.zones = it.zones;
    if (it.fit) c.fit = it.fit;
    cards[id] = c;
  };

  if (mode === 'solution') drawSolution();
  else drawArchitecture();

  // ----- badges and attachments on their host cards -----
  for (const n of badgeOf.values()) {
    const host = cards[n.attachTo!];
    if (!host) continue;
    const e = entry(n.product);
    const as: 'badge' | 'attachment' = e && e.attach && e.attach.as === 'attachment' ? 'attachment' : 'badge';
    const index = host.badges.filter((b) => badges[b] && badges[b].as === as).length;
    host.badges.push(n.id);
    badges[n.id] =
      as === 'badge'
        ? { id: n.id, product: n.product, host: host.id, as, index, x: host.x + host.w - G.badge - 8 - index * G.badgeStep, y: host.y - G.badge / 2, w: G.badge, h: G.badge }
        : { id: n.id, product: n.product, host: host.id, as, index, x: host.x + 12 + index * (G.attachW + 6), y: host.y + host.h - G.attachH / 2, w: G.attachW, h: G.attachH };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of [...Object.values(frames), ...Object.values(cards), ...Object.values(badges)]) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
  const bounds: Rect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  return { version: 2, mode, width: Math.round(bounds.w), height: Math.round(bounds.h), pathY: 0, cards, frames, badges, slots, shelves, shelfKinds, order, bounds, sticky };

  // ---------- placement (which slot each card goes to) ----------

  function placeSolution(): void {
    for (const l of SOLUTION_LANES) addSimple({ id: '~sol:' + l.key, kind: 'solution', label: l.label, implicit: true, column: 'solution', hasUpper: false, lane: l.key });
    for (const n of cardNodes) put(`~sol:${solutionLane(entry(n.product))}#stack`, { id: n.id, kind: 'node', product: n.product, key: [0, 0, arrival.get(n.id) ?? 0] });
    for (const r of recs) {
      const id = 'rec:' + r.product;
      put(`~sol:${solutionLane(entry(r.product))}#stack`, { id, kind: 'rec', product: r.product, fit: r.fit, key: recKey(r.fit, id) });
    }
  }

  function placeArchitecture(): void {
    const groups = Object.values(graph.groups ?? {});
    const zoneVpc = new Map<string, string>();
    const firstOf = (kinds: string[]): GraphGroup | undefined => groups.find((g) => kinds.includes(g.kind));
    const ensureRegion = (id: string, label: string, implicit: boolean): RegionModel => {
      let r = regions.get(id);
      if (!r) {
        r = { id, label, implicit, vpcs: [], lanes: new Set() };
        regions.set(id, r);
      }
      return r;
    };
    const regionFor = (chain: GraphGroup[]): RegionModel => {
      const r = chain.find((g) => g.kind === 'region') ?? firstOf(['region']);
      return r ? ensureRegion(r.id, r.label, false) : ensureRegion('~region', 'Region', true);
    };
    for (const g of groups) if (g.kind === 'region') ensureRegion(g.id, g.label, false);
    for (const g of groups) {
      if (g.kind !== 'vpc' || vpcs.has(g.id)) continue;
      vpcs.set(g.id, { id: g.id, label: g.label, zones: [] });
      regionFor(chainOf(graph, g.parent)).vpcs.push(g.id);
    }
    for (const g of groups) {
      if (g.kind !== 'zone') continue;
      const vg = chainOf(graph, g.parent).find((x) => x.kind === 'vpc');
      const v = vg ? vpcs.get(vg.id) : undefined;
      if (!v) continue; // a zone outside every VPC is ignored; its members are placed by scope
      v.zones.push({ id: g.id, label: g.label, letter: zoneLetter(g) });
      zoneVpc.set(g.id, v.id);
    }
    for (const v of vpcs.values()) v.zones.sort((a, b) => (a.letter < b.letter ? -1 : a.letter > b.letter ? 1 : a.id < b.id ? -1 : 1));
    for (const g of groups) {
      if (g.kind === 'external' || g.kind === 'onprem') addSimple({ id: g.id, kind: g.kind, label: g.label, implicit: false, column: 'external', hasUpper: false });
      else if (g.kind === 'edge') addSimple({ id: g.id, kind: 'edge', label: g.label, implicit: false, column: 'edge', hasUpper: true });
    }
    // The VPC a VPC-scoped card goes to: its own, else the first VPC of its region, else the first VPC anywhere. The
    // validator creates a missing VPC group (repair c), so the layout never invents one.
    const vpcFor = (chain: GraphGroup[], region: RegionModel): VpcModel | undefined => {
      const vg = chain.find((g) => g.kind === 'vpc');
      const own = vg ? vpcs.get(vg.id) : undefined;
      if (own) return own;
      if (region.vpcs.length) return vpcs.get(region.vpcs[0]);
      for (const v of vpcs.values()) return v;
      return undefined;
    };
    const zoneIn = (chain: GraphGroup[], v: VpcModel): ZoneModel | undefined => {
      for (const g of chain) if (g.kind === 'zone' && zoneVpc.get(g.id) === v.id) return v.zones.find((z) => z.id === g.id);
      return undefined;
    };
    const toShelf = (region: RegionModel, shelfLane: string, n: GraphNode, e: CatalogEntry | undefined, base: Item): void => {
      region.lanes.add(shelfLane);
      put(`${region.id}~${shelfLane}#stack`, { ...base, key: keyOf(n.id, e, [e ? e.lane : shelfLane]) });
    };

    for (const n of cardNodes) {
      const e = entry(n.product);
      const chain = chainOf(graph, n.group);
      const lane: string = e ? e.lane : 'ops';
      const p = placementOf(e ?? { scope: 'region', lane: 'ops' });
      const base: Item = { id: n.id, kind: 'node', product: n.product, key: [0, 0, 0] };
      if (n.zones && n.zones.length) base.zones = n.zones.slice();
      if (p.band) {
        const b = BANDS.find((x) => x.kind === p.band)!;
        addSimple({ id: b.id, kind: b.kind, label: b.label, implicit: true, column: 'band', hasUpper: false });
        put(`${b.id}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
        continue;
      }
      switch (p.container) {
        case 'external':
        case 'onprem': {
          if (lane === 'thirdparty') {
            addSimple({ id: '~outside', kind: 'outside', label: 'Outside services', implicit: true, column: 'external', hasUpper: false });
            put('~outside#stack', { ...base, key: keyOf(n.id, e, ROOT_LANES) });
            break;
          }
          const own = chain.find((g) => g.kind === 'external' || g.kind === 'onprem');
          const fallback = (p.container === 'onprem' ? firstOf(['onprem']) : undefined) ?? firstOf(['external', 'onprem']);
          const fid = own ? own.id : fallback ? fallback.id : '~external';
          if (fid === '~external') addSimple({ id: fid, kind: 'external', label: 'Clients', implicit: true, column: 'external', hasUpper: false });
          put(`${fid}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        case null:
        case 'edge': {
          // global services (DNS, GTM) and the edge network: one Edge column, resolvers in a band above the path row
          const own = chain.find((g) => g.kind === 'edge') ?? firstOf(['edge']);
          const fid = own ? own.id : '~edge';
          if (fid === '~edge') addSimple({ id: fid, kind: 'edge', label: 'Edge', implicit: true, column: 'edge', hasUpper: true });
          put(lane === 'dns' ? `${fid}#upper` : `${fid}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        case 'vpc': {
          const region = regionFor(chain);
          const v = vpcFor(chain, region);
          if (!v) {
            toShelf(region, LOOSE_SHELF[lane] ?? 'compute', n, e, base);
            break;
          }
          // vpc-edge cards (p.boundary) share the ingress column's stack, above the load balancers
          if (p.boundary) {
            put(`${v.id}#ingress`, { ...base, key: keyOf(n.id, e, ['ingress', 'boundary']) });
            break;
          }
          const z = zoneIn(chain, v);
          if (z) put(`${z.id}#zone`, { ...base, key: keyOf(n.id, e, ZONE_LANES) });
          else if (lane === 'ingress') put(`${v.id}#ingress`, { ...base, key: keyOf(n.id, e, ['ingress']) });
          else if (lane === 'compute') put(v.zones.length ? `${v.id}#span` : `${v.id}#compute`, { ...base, key: keyOf(n.id, e, ['compute']) });
          else put(`${v.id}#data`, { ...base, key: keyOf(n.id, e, DATA_LANES) });
          break;
        }
        default: {
          // Region scope always goes to the shelf, even when the model put a VPC-attachable service (FC, Hologres,
          // DataWorks, OpenSearch, KMS) inside a VPC: one place per product, and the VPC does not grow for it.
          toShelf(regionFor(chain), SHELF_LANES.includes(lane) ? lane : 'ops', n, e, base);
        }
      }
    }
    if (recs.length) {
      addSimple({ id: '~recs', kind: 'recs', label: 'Recommended', implicit: true, column: 'band', hasUpper: false });
      for (const r of recs) {
        const id = 'rec:' + r.product;
        put('~recs#stack', { id, kind: 'rec', product: r.product, fit: r.fit, key: recKey(r.fit, id) });
      }
    }
  }

  // ---------- geometry ----------

  /** A simple frame (Clients, Edge, Outside services) whose first stack card sits on `rowY`. */
  function drawSimple(f: SimpleFrame, x: number, rowY: number): { top: number; bottom: number } {
    const upper = f.hasUpper ? slotOf(`${f.id}#upper`) : [];
    const stack = slotOf(`${f.id}#stack`);
    const upperH = upper.length ? rows(upper.length) + G.gapY : 0;
    const top = rowY - upperH - G.head - G.padTop;
    // an Edge frame that holds only resolvers (DNS) ends below them instead of keeping an empty path row
    const body = stack.length ? upperH + rows(stack.length) : upper.length ? upperH - G.gapY : rows(1);
    const h = G.head + G.padTop + body + G.padBottom;
    const fr: LayoutFrame = { id: f.id, kind: f.kind, label: f.label, parent: null, depth: 0, implicit: f.implicit, empty: upper.length + stack.length === 0, x, y: top, w: FRAME_W, h };
    if (f.lane) fr.lane = f.lane;
    frames[f.id] = fr;
    upper.forEach((id, i) => place(id, f.id, `${f.id}#upper`, i, x + G.padX, rowY - upperH + i * ROW));
    stack.forEach((id, i) => place(id, f.id, `${f.id}#stack`, i, x + G.padX, rowY + i * ROW));
    return { top, bottom: top + G.head + G.padTop + upperH + rows(Math.max(1, stack.length)) + G.padBottom };
  }

  /** A left column's frames (Clients and Outside services, or Edge): the first frame's first card on y = 0, the rest stacked below with sticky tops. Returns the column's bottom. */
  function drawColumn(key: string, ids: string[], x: number): number {
    const o = orderFrames(ids, prevOk?.order['col:' + key]);
    order['col:' + key] = o;
    let bottom = 0;
    o.forEach((id, i) => {
      const f = simple.get(id)!;
      const upper = f.hasUpper ? slotOf(`${f.id}#upper`) : [];
      const lead = G.head + G.padTop + (upper.length ? rows(upper.length) + G.gapY : 0);
      // a frame keeps its row when a frame above it is removed: nothing moves up
      const rowY = i === 0 && !has(ps.tops, `col:${id}`) ? 0 : stickyTop(`col:${id}`, i === 0 ? 0 : bottom + G.frameGap + lead, false);
      bottom = drawSimple(f, x, rowY).bottom;
    });
    return bottom;
  }

  /** Solution map: one row per lane (Team, SaaS, Model service, Cloud resources), top to bottom, solutionPerRow cards a row. */
  function drawSolution(): void {
    const per = G.solutionPerRow;
    const w = per * G.cardW + (per - 1) * G.gapX + 2 * G.padX;
    const lead = G.head + G.padTop;
    let bottom = -Infinity;
    order['col:solution'] = SOLUTION_LANES.map((l) => '~sol:' + l.key);
    SOLUTION_LANES.forEach((l, k) => {
      const id = '~sol:' + l.key;
      const f = simple.get(id)!;
      const ids = slotOf(`${id}#stack`);
      const rowY = k === 0 ? 0 : stickyTop(`sol:${l.key}`, bottom + G.frameGap + lead, false);
      const top = rowY - lead;
      const h = lead + rows(Math.max(1, Math.ceil(ids.length / per))) + G.padBottom;
      frames[id] = { id, kind: 'solution', label: f.label, parent: null, depth: 0, implicit: true, empty: ids.length === 0, lane: l.key, x: 0, y: top, w, h };
      ids.forEach((cid, i) => place(cid, id, `${id}#stack`, i, G.padX + (i % per) * PITCH, rowY + Math.floor(i / per) * ROW));
      bottom = top + h;
    });
  }

  interface VpcGeom {
    v: VpcModel;
    /** From the first row (the request-path row) up to the frame top: the tiers above it, zone frames, label band. */
    above: number;
    below: number;
    draw(regionX: number, firstRow: number, parent: string, depth: number): void;
  }

  /**
   * A VPC: three tier columns (ingress | compute or zones | data) whose first cards sit on the request-path row, the
   * VPC's floor. A tier grows upwards, so a new card never pushes the shelf below the VPC; only the frame top rises.
   */
  function vpcGeom(v: VpcModel): VpcGeom {
    const ingress = slotOf(`${v.id}#ingress`);
    const data = slotOf(`${v.id}#data`);
    const zoned = v.zones.length > 0;
    const span = zoned ? slotOf(`${v.id}#span`) : [];
    const computeAll = zoned ? [] : slotOf(`${v.id}#compute`);
    // A tall compute tier (more than computeWrapMin cards, taller than the other tiers) wraps into the free space above
    // the ingress column, from row r0 up, leaving an empty row above the ingress stack. The split is sticky: it changes
    // only in a frame where the compute tier itself changes, so a growing data or ingress tier never re-flows it.
    const prevSpill = has(ps.spill, v.id) ? ps.spill[v.id] : undefined;
    const prevCompute = prevOk?.slots[`${v.id}#compute`];
    const computeChanged = !prevCompute || prevCompute.length !== computeAll.length || prevCompute.some((id, i) => id !== computeAll[i]);
    let cap = computeAll.length;
    let r0 = ingress.length + 1;
    if (prevSpill && !computeChanged) {
      cap = Math.min(prevSpill.cap, computeAll.length);
      r0 = Math.max(prevSpill.r0, ingress.length);
    } else {
      if (prevSpill) r0 = Math.max(prevSpill.r0, ingress.length);
      const other = Math.max(data.length, ingress.length);
      if (computeAll.length > Math.max(other, G.computeWrapMin)) cap = Math.max(other, G.computeWrapMin, Math.ceil((computeAll.length + r0) / 2));
    }
    if (cap < computeAll.length) sticky.spill[v.id] = { cap, r0 };
    const compute = computeAll.slice(0, cap);
    const spill = computeAll.slice(cap);
    const col0 = spill.length ? r0 + spill.length : ingress.length;
    // Zone frames: only zones that hold cards of their own, stacked upwards in the compute column above the multi-zone
    // row, the first zone on top. Each frame is as tall as its cards and keeps room for attachment pills.
    const members = v.zones.map((z) => slotOf(`${z.id}#zone`));
    const shown = v.zones.map((_, k) => k).filter((k) => members[k].length > 0);
    const up = (n: number): number => (n > 1 ? (n - 1) * ROW : 0); // a column's extent above the first row's top
    interface ZoneBox {
      k: number;
      bottom: number; // relative to the first row's top
      top: number;
    }
    const zoneBoxes: ZoneBox[] = [];
    {
      let bottom = span.length ? -up(span.length) - G.gapY : G.cardH + G.zonePadBottom;
      for (let i = shown.length - 1; i >= 0; i--) {
        const k = shown[i];
        const top = bottom - G.zonePadBottom - rows(members[k].length) - G.zoneHead;
        zoneBoxes.push({ k, bottom, top });
        bottom = top - G.zoneGap;
      }
    }
    const zoneUp = zoneBoxes.length ? -Math.min(...zoneBoxes.map((b) => b.top)) : 0;
    const tiersUp = Math.max(up(col0), up(data.length), up(compute.length), up(span.length), zoneUp);
    const above = tiersUp + G.vpcHead;
    const used = [col0 > 0, compute.length + span.length + shown.length > 0, data.length > 0];
    let c0 = used.indexOf(true);
    let c1 = used.lastIndexOf(true);
    if (c0 < 0) c0 = c1 = 1;
    return {
      v,
      above,
      below: VPC_BELOW,
      draw(regionX, firstRow, parent, depth) {
        const cx = (k: number): number => regionX + colX(k);
        // the frame wraps the columns in use; the columns themselves never move
        const x = cx(c0) - G.vpcPadX;
        const w = cx(c1) + G.cardW + G.vpcPadX - x;
        const empty = ingress.length + data.length + span.length + computeAll.length + members.reduce((sum, m) => sum + m.length, 0) === 0;
        frames[v.id] = { id: v.id, kind: 'vpc', label: v.label, parent, depth, implicit: false, empty, x, y: firstRow - above, w, h: above + VPC_BELOW };
        const upY = (i: number): number => firstRow - i * ROW;
        ingress.forEach((id, i) => place(id, v.id, `${v.id}#ingress`, i, cx(0), upY(i)));
        compute.forEach((id, i) => place(id, v.id, `${v.id}#compute`, i, cx(1), upY(i)));
        spill.forEach((id, j) => place(id, v.id, `${v.id}#compute`, cap + j, cx(0), upY(r0 + j)));
        data.forEach((id, i) => place(id, v.id, `${v.id}#data`, i, cx(2), upY(i)));
        span.forEach((id, i) => place(id, v.id, `${v.id}#span`, i, cx(1), upY(i)));
        const zx = cx(1) - G.zonePad;
        const zw = G.cardW + 2 * G.zonePad;
        for (const b of zoneBoxes) {
          const zm = v.zones[b.k];
          const m = members[b.k];
          frames[zm.id] = { id: zm.id, kind: 'zone', label: zm.label, parent: v.id, depth: depth + 1, implicit: false, empty: false, zone: zm.letter, x: zx, y: firstRow + b.top, w: zw, h: b.bottom - b.top };
          const first = firstRow + b.bottom - G.zonePadBottom - G.cardH;
          m.forEach((id, j) => place(id, zm.id, `${zm.id}#zone`, j, cx(1), first - j * ROW));
        }
      },
    };
  }

  interface RegionGeom {
    top: number; // relative to the anchor row
    bottom: number;
    draw(anchor: number): void;
  }

  function regionGeom(r: RegionModel): RegionGeom {
    const vpcOrder = orderFrames(r.vpcs, prevOk?.order[r.id]);
    order[r.id] = vpcOrder;
    const vg = vpcOrder.map((id) => vpcGeom(vpcs.get(id)!));

    // Shelf: lane blocks in three columns aligned with the VPC's columns. A block keeps its column; a block that
    // grows into the block below it moves to the foot of the shortest column instead of pushing that block down.
    const laneFrame = (lane: string): string => `${r.id}~${lane}`;
    const laneOfFrame = (fid: string): string => fid.slice(r.id.length + 1);
    const present = SHELF_LANES.filter((l) => r.lanes.has(l)).map(laneFrame);
    const blockH = (fid: string): number => G.laneHead + rows(slotOf(`${fid}#stack`).length);
    const colH = (c: string[]): number => c.reduce((sum, fid, i) => sum + blockH(fid) + (i ? G.laneGap : 0), 0);
    const prevCols = prevOk?.shelves[r.id] ?? [];
    const cols: string[][] = Array.from({ length: GRID }, (_, k) => (prevCols[k] ?? []).filter((fid) => present.includes(fid)));
    const placed = new Set(cols.flat());
    const reserve = present.length ? (ps.shelfH[r.id] ?? 0) : 0;
    const relocated = new Set<string>();
    const prevTop = (fid: string): number | undefined => (!relocated.has(fid) && has(ps.tops, `blk:${fid}`) ? ps.tops[`blk:${fid}`] : undefined);
    const grew = (fid: string): boolean => {
      const pf = prevOk?.frames[fid];
      return !!pf && pf.h < blockH(fid) - 0.5;
    };
    for (let pass = 0; pass < GRID + 1; pass++) {
      let moved = false;
      for (let k = 0; k < GRID && !moved; k++) {
        let y = 0;
        for (let i = 0; i < cols[k].length; i++) {
          const fid = cols[k][i];
          const p = prevTop(fid);
          const t = Math.max(y, p ?? y);
          const next = cols[k][i + 1];
          const nextTop = next === undefined ? undefined : prevTop(next);
          if (nextTop !== undefined && grew(fid) && t + blockH(fid) + G.laneGap > nextTop) {
            cols[k].splice(i, 1);
            let best = 0;
            for (let j = 1; j < GRID; j++) if (colH(cols[j]) < colH(cols[best])) best = j;
            cols[best].push(fid);
            relocated.add(fid);
            moved = true;
            break;
          }
          y = t + blockH(fid) + G.laneGap;
        }
      }
      if (!moved) break;
    }
    for (const fid of present) {
      if (placed.has(fid)) continue;
      placed.add(fid);
      const pref = SHELF_PREF[laneOfFrame(fid)] ?? 2;
      const after = (k: number): number => colH(cols[k]) + (cols[k].length ? G.laneGap : 0) + blockH(fid);
      let best = -1;
      if (cols[pref].length === 0 || after(pref) <= reserve) best = pref;
      else {
        for (let k = 0; k < GRID; k++) {
          if (best < 0 || after(k) < after(best) || (after(k) === after(best) && Math.abs(k - pref) < Math.abs(best - pref))) best = k;
        }
      }
      cols[best].push(fid);
    }
    shelves[r.id] = cols.map((c) => c.slice());
    shelfKinds[r.id] = cols.map((c) => (c.length && OPS_LANES.has(laneOfFrame(c[0])) ? 'ops' : 'data'));
    // block tops are sticky: a block keeps its top while the block above it fits; a relocated block starts fresh. A
    // new block below another keeps a spare row above it only when that does not make the shelf taller (a taller
    // shelf would push a later region down).
    const blockTop = new Map<string, number>();
    const shelfCap = Math.max(reserve, ...cols.map(colH));
    let shelfBottom = 0;
    for (const col of cols) {
      let by = 0;
      col.forEach((fid, i) => {
        let t: number;
        if (relocated.has(fid)) {
          t = by;
          sticky.tops[`blk:${fid}`] = t;
        } else t = i === 0 && !has(ps.tops, `blk:${fid}`) ? 0 : stickyTop(`blk:${fid}`, by, by + ROW + blockH(fid) <= shelfCap); // a block never moves up
        blockTop.set(fid, t);
        by = t + blockH(fid) + G.laneGap;
        shelfBottom = Math.max(shelfBottom, t + blockH(fid));
      });
    }
    if (present.length) sticky.shelfH[r.id] = Math.max(reserve, ...cols.map(colH));

    // Vertical plan relative to the anchor row (y = 0 for the first region): the first VPC's floor is the anchor row,
    // later VPCs stack below it with sticky rows, and the shelf sits below the last VPC. A region whose shelf came
    // before any VPC keeps the room a one-row VPC needs above its shelf, so a late VPC fills it and moves nothing.
    // A VPC that arrives after the shelf stands (a DR VPC added to a region that already shows its managed services) goes
    // below the shelf and stays there: placing it above would push the whole shelf down by a VPC. Later VPCs follow it.
    const shelfStood = present.length > 0 && has(ps.tops, `shelf:${r.id}`);
    const lateIds = new Set<string>();
    vg.forEach((g, i) => {
      if (i > 0 && (has(ps.tops, `vlate:${g.v.id}`) || (shelfStood && !has(ps.tops, `vrow:${g.v.id}`)))) lateIds.add(g.v.id);
    });
    const vgo = [...vg.filter((g) => !lateIds.has(g.v.id)), ...vg.filter((g) => lateIds.has(g.v.id))];
    const early = vgo.length - lateIds.size;
    const vpcRows: number[] = [];
    let top: number;
    let shelfTop = 0;
    let cursor: number; // bottom of the last placed part
    if (vgo.length) {
      vpcRows.push(0);
      cursor = vgo[0].below;
      for (let i = 1; i < early; i++) {
        const g = vgo[i];
        const row = stickyTop(`vrow:${g.v.id}`, cursor + G.vpcGap + g.above, true);
        vpcRows.push(row);
        cursor = row + g.below;
      }
      top = -vgo[0].above - G.head;
    } else if (present.length) {
      cursor = VPC_BELOW;
      top = -G.vpcHead - G.head;
    } else {
      cursor = 0; // an empty region is just its label band
      top = -G.laneHead - G.head;
    }
    if (present.length) {
      shelfTop = stickyTop(`shelf:${r.id}`, cursor + G.shelfGap, false);
      cursor = shelfTop + shelfBottom;
    }
    for (let i = early; i < vgo.length; i++) {
      const g = vgo[i];
      const row = stickyTop(`vrow:${g.v.id}`, cursor + G.vpcGap + g.above, true, LATE_VPC_ROOM);
      sticky.tops[`vlate:${g.v.id}`] = 1;
      vpcRows.push(row);
      cursor = row + g.below;
    }
    const bottom = cursor + G.padBottom;
    return {
      top,
      bottom,
      draw(anchor) {
        const w = 2 * G.regionPadX + REGION_INNER_W;
        frames[r.id] = { id: r.id, kind: 'region', label: r.label, parent: null, depth: 0, implicit: r.implicit, empty: vg.length === 0 && present.length === 0, x: 0, y: anchor + top, w, h: bottom - top };
        vgo.forEach((g, i) => g.draw(0, anchor + vpcRows[i], r.id, 1));
        cols.forEach((col, k) => {
          const bx = colX(k);
          for (const fid of col) {
            const by = anchor + shelfTop + blockTop.get(fid)!;
            const lane = laneOfFrame(fid);
            const ids = slotOf(`${fid}#stack`);
            frames[fid] = { id: fid, kind: 'lane', label: SHELF_TITLES[lane] ?? lane, parent: r.id, depth: 1, implicit: true, empty: ids.length === 0, lane, x: bx, y: by, w: G.cardW, h: blockH(fid) };
            ids.forEach((id, i) => place(id, fid, `${fid}#stack`, i, bx, by + G.laneHead + i * ROW));
          }
        });
      },
    };
  }

  /**
   * Bands (Account, SaaS, Recommended) stacked below the left columns, each two cards wide (one card: one column). A
   * band's top is sticky, and the band below it starts after the band's spare rows (GEOMETRY.bandSpareRows), so a
   * band grows in place. A band that outgrows its spare rows moves to the foot of the stack instead of pushing the
   * band below it down. The first band sits a row below the left columns, or on the path row without them.
   */
  function drawLeftBands(colBottom: number, extX: number, hasLeft: boolean): void {
    const bandIds = BANDS.map((b) => b.id).filter((id) => simple.has(id));
    const lead = G.head + G.padTop;
    const spare = (id: string): number => G.bandSpareRows[BANDS.find((b) => b.id === id)!.kind];
    const bandRows = (id: string): number => Math.max(1, Math.ceil(slotOf(`${id}#stack`).length / 2));
    const bandH = (id: string, extra = 0): number => lead + rows(bandRows(id) + extra) + G.padBottom;
    const bandOrder = orderFrames(bandIds, prevOk?.order['bands']);
    const prevBandTop = (id: string): number | undefined => (has(ps.tops, `band:${id}`) ? ps.tops[`band:${id}`] : undefined);
    const bandGrew = (id: string): boolean => {
      const pf = prevOk?.frames[id];
      return !!pf && pf.h < bandH(id) - 0.5;
    };
    const movedBands = new Set<string>();
    for (let i = 0; i + 1 < bandOrder.length; i++) {
      const id = bandOrder[i];
      const p = prevBandTop(id);
      const nextTop = prevBandTop(bandOrder[i + 1]);
      if (p !== undefined && nextTop !== undefined && bandGrew(id) && p - lead + bandH(id) + G.bandGap > nextTop - lead) {
        bandOrder.splice(i, 1);
        bandOrder.push(id);
        movedBands.add(id);
        i--;
        if (movedBands.size >= bandIds.length) break;
      }
    }
    order['bands'] = bandOrder;
    let bandCursor = hasLeft ? colBottom + G.bandGap + lead : 0;
    let room = ROW; // fresh room above a new band: a row below the left columns, else the spare rows of the band above
    bandOrder.forEach((id, i) => {
      const f = simple.get(id)!;
      const ids = slotOf(`${id}#stack`);
      const fresh = movedBands.has(id) || prevBandTop(id) === undefined;
      const rowY = movedBands.has(id) ? bandCursor : stickyTop(`band:${id}`, bandCursor, i > 0 || hasLeft, room);
      if (fresh) sticky.tops[`band:${id}`] = rowY;
      const ncols = ids.length > 1 ? 2 : 1;
      const top = rowY - lead;
      frames[id] = { id, kind: f.kind, label: f.label, parent: null, depth: 0, implicit: true, empty: ids.length === 0, x: extX, y: top, w: ncols * FRAME_W + (ncols - 1) * G.rootGap, h: bandH(id) };
      ids.forEach((cid, k) => place(cid, id, `${id}#stack`, k, extX + G.padX + (k % 2) * (FRAME_W + G.rootGap), rowY + Math.floor(k / 2) * ROW));
      bandCursor = top + bandH(id) + G.bandGap + lead;
      room = spare(id) * ROW;
    });
  }

  function drawArchitecture(): void {
    const ofColumn = (c: SimpleFrame['column']): string[] => [...simple.values()].filter((f) => f.column === c).map((f) => f.id);
    const extIds = ofColumn('external');
    const edgeIds = ofColumn('edge');
    // The two left columns (Clients, Edge) are reserved once Clients, Edge or a band have existed, so a late DNS, CDN
    // or band never moves what is already drawn, and the diagram keeps one width (GEOMETRY.archW).
    const realExt = extIds.length > 0 || ps.left.external;
    const realEdge = edgeIds.length > 0 || ps.left.edge;
    const hasBands = BANDS.some((b) => simple.has(b.id)) || ps.left.bands;
    sticky.left = { external: realExt, edge: realEdge, bands: hasBands };
    const edgeX = -G.rootGap - FRAME_W;
    const extX = edgeX - G.rootGap - FRAME_W;
    const colBottom = Math.max(drawColumn('external', extIds, extX), drawColumn('edge', edgeIds, edgeX));
    drawLeftBands(colBottom, extX, realExt || realEdge);

    // regions stacked vertically at x = 0; the first one's anchor row is the request-path row
    const regionOrder = orderFrames([...regions.keys()], prevOk?.order['col:regions']);
    order['col:regions'] = regionOrder;
    let lastBottom: number | null = null;
    for (const rid of regionOrder) {
      const g = regionGeom(regions.get(rid)!);
      // a later region keeps room above it for its VPC's tiers to reach three rows, and a row more for the region
      // above to grow into; its label band and tiers grow upwards into that room
      const anchor: number = lastBottom === null ? 0 : stickyTop(`region:${rid}`, lastBottom + G.frameGap - g.top, true, Math.max(0, REGION_HEAD + g.top) + REGION_SLACK);
      g.draw(anchor);
      lastBottom = anchor + g.bottom;
    }
  }
}

// ---------- camera ----------

export interface Camera {
  zoom: number;
  /** World coordinates at the canvas's top-left corner: screen = (world - (x, y)) * zoom. */
  x: number;
  y: number;
  /** The diagram is taller than the canvas at this zoom: the canvas pans vertically with y between y0 and y1. */
  pan: { y0: number; y1: number } | null;
  /** Whether subtitles render at GEOMETRY.subtitleFloorPx or more; below it the canvas draws titles only (semantic zoom). */
  subtitles: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * The canvas camera: fit the width, never shrink titles below GEOMETRY.titleFloorPx, pan vertically when the diagram
 * is taller than that allows. Sticky when `prev` is passed: the zoom holds while the wanted zoom stays within
 * GEOMETRY.zoomHysteresis of it (and the width still fits), and the view moves only as far as it must to keep the
 * diagram in view, so content that did not move stays put on screen. An architecture diagram is fitted as at least
 * GEOMETRY.archW wide, the width it takes once the Clients and Edge columns exist, so their arrival does not zoom.
 */
export function fitCamera(layout: LayoutState, canvas: CanvasSize = DEFAULT_CANVAS, prev?: Camera): Camera {
  const b = layout.bounds ?? { x: 0, y: 0, w: layout.width, h: layout.height };
  const pad = G.fitPad;
  const availW = Math.max(1, canvas.w - 2 * pad);
  const availH = Math.max(1, canvas.h - 2 * pad);
  // an architecture diagram is fitted as the box it takes once Clients and Edge exist: x from ARCH_X0, archW wide
  const arch = layout.mode === 'architecture' && layout.version === 2;
  const x0 = arch ? Math.min(b.x, ARCH_X0) : b.x;
  const fitW = arch ? Math.max(b.x + b.w, ARCH_X0 + G.archW) - x0 : b.w;
  const zW = fitW > 0 ? availW / fitW : G.maxZoom;
  const zH = b.h > 0 ? availH / b.h : G.maxZoom;
  const capW = Math.min(G.maxZoom, zW);
  let zoom = Math.min(capW, Math.max(zH, G.titleFloorPx / G.titlePx));
  if (prev && prev.zoom <= capW + 1e-9 && Math.abs(prev.zoom - zoom) <= G.zoomHysteresis * zoom) zoom = prev.zoom;
  const same = !!prev && Math.abs(prev.zoom - zoom) < 1e-9;
  // a changed zoom keeps the screen position of the region's corner on the path row (world 0, 0)
  const startOf = (p: number | undefined, pz: number | undefined): number | undefined => (p === undefined || pz === undefined ? undefined : same ? p : (p * pz) / zoom);
  const axis = (start0: number | undefined, lo: number, size: number, view: number): { start: number; pan: { y0: number; y1: number } | null } => {
    const p = pad / zoom;
    const min = lo - p;
    const max = lo + size + p;
    if (max - min <= view + 1e-9) {
      const centred = min - (view - (max - min)) / 2;
      return { start: start0 === undefined ? centred : clamp(start0, max - view, min), pan: null };
    }
    return { start: start0 === undefined ? min : clamp(start0, min, max - view), pan: { y0: min, y1: max - view } };
  };
  const ax = axis(startOf(prev?.x, prev?.zoom), x0, fitW, canvas.w / zoom);
  const ay = axis(startOf(prev?.y, prev?.zoom), b.y, b.h, canvas.h / zoom);
  return { zoom, x: ax.start, y: ay.start, pan: ay.pan, subtitles: G.subtitlePx * zoom >= G.subtitleFloorPx - 1e-9 };
}

// ---------- card text ----------

/** Width in px of `text` set in the title style at `px` (the canvas measures with canvas measureText or the DOM). */
export type MeasureText = (text: string, px: number) => number;

export interface TitleSet {
  lines: string[];
  px: number;
}

const CJK = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯＀-￯]/;

/** Break units: a unit ends after a space, '/', '-' or a CJK character. */
function breakUnits(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of text) {
    cur += ch;
    if (ch === ' ' || ch === '/' || ch === '-' || CJK.test(ch)) {
      out.push(cur);
      cur = '';
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Greedy word wrap (CSS white-space: normal; overflow-wrap: anywhere). broke: a unit had to break inside itself. */
function wrapText(text: string, px: number, room: number, measure: MeasureText): { lines: string[]; broke: boolean } {
  const w = (s: string): number => measure(s.trimEnd(), px);
  const lines: string[] = [];
  let line = '';
  let broke = false;
  for (const u of breakUnits(text.trim())) {
    if (w(line + u) <= room + 0.01) {
      line += u;
      continue;
    }
    if (line) {
      lines.push(line.trimEnd());
      line = '';
    }
    if (w(u) <= room + 0.01) {
      line = u;
      continue;
    }
    broke = true;
    for (const ch of u) {
      if (!line || w(line + ch) <= room + 0.01) line += ch;
      else {
        lines.push(line.trimEnd());
        line = ch;
      }
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return { lines: lines.length ? lines : [''], broke };
}

/**
 * How a card title is set: on up to GEOMETRY.titleLines lines of the text column at GEOMETRY.titlePx, wrapping at
 * word breaks; when that is not enough, the largest size in GEOMETRY.titleStep steps down to titleMinPx that fits
 * without breaking a word. A title that does not fit even then breaks inside words at titleMinPx and may take a
 * third line (the card has room for three lines at that size when the subtitle is dropped). The validator caps labels
 * at 40 characters (TEXT_LIMITS.label), which always fit that way, so a title is never cut; only a longer text than
 * three such lines hold ends its third line with an ellipsis.
 */
export function fitTitle(text: string, measure: MeasureText, room: number = G.textW): TitleSet {
  for (let px = G.titlePx; px >= G.titleMinPx - 1e-9; px -= G.titleStep) {
    const r = wrapText(text, px, room, measure);
    if (r.lines.length <= G.titleLines && !r.broke) return { lines: r.lines, px };
  }
  const px = G.titleMinPx;
  const lines = wrapText(text, px, room, measure).lines;
  const max = G.titleLines + 1;
  if (lines.length <= max) return { lines, px };
  let last = lines[max - 1];
  while (last && measure(last + '…', px) > room + 0.01) last = Array.from(last).slice(0, -1).join('');
  return { lines: [...lines.slice(0, max - 1), last.trimEnd() + '…'], px };
}

export interface CardText {
  title: string;
  subtitle: string;
}

const PURCHASE: Record<string, string> = {
  'saas-seat': 'Per-seat SaaS',
  'subscription-plan': 'Subscription plan',
  'cloud-payg': 'Pay as you go',
  'open-source': 'Open source',
  'contact-sales': 'Contact sales',
};

const normText = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');
const sameText = (a: string, b: string): boolean => normText(a) === normText(b);

/**
 * The two text lines of a card. Title: the node label (a recommendation: the product's short name). Subtitle: the
 * product's official short name; when the title already says it, the official full name if it fits on one line
 * (without a trailing "(ABBR)" if only that fits), else nothing. Recommendations show the purchase model. Never the
 * lane name. `fits` measures the subtitle against the text column (default: everything fits).
 */
export function cardText(card: Pick<LayoutCard, 'id' | 'kind' | 'product'>, graph: Graph, catalog: Catalog, fits: (subtitle: string) => boolean = () => true): CardText {
  const e = entryOf(catalog, card.product);
  const short = e?.short ?? card.product;
  const node = has(graph.nodes, card.id) ? graph.nodes[card.id] : undefined;
  const title = card.kind === 'rec' ? short : (node?.label ?? card.id).trim() || short;
  if (card.kind === 'rec') {
    const p = e?.purchase ? PURCHASE[e.purchase] : undefined;
    if (p) return { title, subtitle: p };
  } else if (!sameText(title, short)) {
    return { title, subtitle: short };
  }
  const name = e?.name ?? '';
  if (!name || sameText(name, title)) return { title, subtitle: '' };
  if (fits(name)) return { title, subtitle: name };
  const bare = name.replace(/\s*\([^)]*\)\s*$/, '');
  if (bare && !sameText(bare, title) && fits(bare)) return { title, subtitle: bare };
  return { title, subtitle: '' };
}

// ---------- diffs and helpers ----------

export interface LayoutDiff {
  entered: string[];
  exited: string[];
  /** Cards present in both states whose position changed by more than 0.5 px. */
  moved: string[];
  displacement: Record<string, number>;
  /** Frames present in both states that moved or resized. */
  framesChanged: string[];
}

export function layoutDiff(prev: LayoutState | undefined, next: LayoutState): LayoutDiff {
  const out: LayoutDiff = { entered: [], exited: [], moved: [], displacement: {}, framesChanged: [] };
  const a: Record<string, LayoutCard> = prev ? prev.cards : {};
  for (const id of Object.keys(next.cards)) {
    if (!has(a, id)) {
      out.entered.push(id);
      continue;
    }
    const p = a[id];
    const n = next.cards[id];
    const d = Math.hypot(n.x - p.x, n.y - p.y);
    if (d > 0.5) {
      out.moved.push(id);
      out.displacement[id] = Math.round(d * 10) / 10;
    }
  }
  for (const id of Object.keys(a)) if (!has(next.cards, id)) out.exited.push(id);
  const fa: Record<string, LayoutFrame> = prev ? prev.frames : {};
  for (const id of Object.keys(next.frames)) {
    if (!has(fa, id)) continue;
    const p = fa[id];
    const n = next.frames[id];
    if (Math.abs(p.x - n.x) > 0.5 || Math.abs(p.y - n.y) > 0.5 || Math.abs(p.w - n.w) > 0.5 || Math.abs(p.h - n.h) > 0.5) out.framesChanged.push(id);
  }
  return out;
}

/**
 * The block a card's slot belongs to. Slots that share rows form one block: a VPC's multi-zone row and its zone
 * frames share the zones block, so a new multi-zone card legitimately pushes the zone frames above it up a row.
 */
export function blockOf(layout: LayoutState, id: string): string {
  const c = layout.cards[id];
  if (c.slot.endsWith('#span')) return c.slot.slice(0, -'#span'.length) + '#zones';
  if (c.slot.endsWith('#zone')) return (layout.frames[c.frame]?.parent ?? c.frame) + '#zones';
  return c.slot;
}

/**
 * Moved cards that are bystanders: no card entered, left or changed block in their block, and they kept their own
 * slot. The stability target for these is 0; same-block siblings that shift for a rank insertion or a compaction,
 * and cards that repair re-slotted (a replica merged into a multi-zone card), are the change itself.
 */
export function unrelatedMoves(prev: LayoutState, next: LayoutState, moved: readonly string[]): string[] {
  const touched = new Set<string>();
  for (const id of Object.keys(next.cards)) if (!has(prev.cards, id)) touched.add(blockOf(next, id));
  for (const id of Object.keys(prev.cards)) if (!has(next.cards, id)) touched.add(blockOf(prev, id));
  for (const id of Object.keys(next.cards)) {
    if (has(prev.cards, id) && blockOf(prev, id) !== blockOf(next, id)) {
      touched.add(blockOf(prev, id));
      touched.add(blockOf(next, id));
    }
  }
  return moved.filter((id) => has(prev.cards, id) && has(next.cards, id) && prev.cards[id].slot === next.cards[id].slot && !touched.has(blockOf(next, id)));
}

export interface BystanderMoves {
  /** Moved cards whose slot (before and after) shares no slot with the op's subjects or with a card that entered or left: nothing about the op explains them. */
  foreign: string[];
  /** Moved cards in the op's own slots that shifted by more than FAR_SIBLING px (a rank insertion shifts siblings by one row; more is a re-flow). */
  farSibling: string[];
}

/** A same-slot sibling may shift by up to two rows (rank insertion, compaction); more counts as a far sibling. */
export const FAR_SIBLING = 2 * (GEOMETRY.cardH + GEOMETRY.gapY);

/**
 * The strict stability measure: unrelatedMoves exempts every card that changed slot and every card in a block where
 * something entered or left, so a mode switch or a re-flow of one lane hides behind it. Here a moved card is a bystander
 * unless it is a subject of the op (the ids touchedBy() names), or entered or left, or sits in a slot that one of those
 * is in. Changing slot is no excuse for a card the op did not name. `subjects` are the ids the op names; pass none for
 * a turn-end (repair) frame, where the cards that entered or left explain the slots.
 */
export function bystanderMoves(prev: LayoutState, next: LayoutState, moved: readonly string[], subjects: Iterable<string>): BystanderMoves {
  const named = new Set<string>(subjects);
  for (const id of Object.keys(next.cards)) if (!has(prev.cards, id)) named.add(id);
  for (const id of Object.keys(prev.cards)) if (!has(next.cards, id)) named.add(id);
  const slots = new Set<string>();
  for (const id of named) {
    if (has(prev.cards, id)) slots.add(prev.cards[id].slot);
    if (has(next.cards, id)) slots.add(next.cards[id].slot);
  }
  const out: BystanderMoves = { foreign: [], farSibling: [] };
  for (const id of moved) {
    if (named.has(id) || !has(prev.cards, id) || !has(next.cards, id)) continue;
    const a = prev.cards[id];
    const b = next.cards[id];
    if (!slots.has(a.slot) && !slots.has(b.slot)) out.foreign.push(id);
    else if (Math.hypot(b.x - a.x, b.y - a.y) > FAR_SIBLING) out.farSibling.push(id);
  }
  return out;
}

/** A card's rectangle including its badges and attachments (routing obstacle, hit target). */
export function cardBounds(layout: LayoutState, id: string): Rect | undefined {
  const c = layout.cards[id];
  if (!c) return undefined;
  let x0 = c.x;
  let y0 = c.y;
  let x1 = c.x + c.w;
  let y1 = c.y + c.h;
  for (const b of c.badges) {
    const r = layout.badges[b];
    if (!r) continue;
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The layout card that draws a graph element: a node's own card, a badge's host card, or 'rec:<product>'. */
export function cardFor(layout: LayoutState, id: string): LayoutCard | undefined {
  if (has(layout.cards, id)) return layout.cards[id];
  if (has(layout.badges, id)) return layout.cards[layout.badges[id].host];
  if (has(layout.cards, 'rec:' + id)) return layout.cards['rec:' + id];
  return undefined;
}

/** Lane of a product's catalog entry, for renderers that label or tint by lane. */
export function laneOf(catalog: Catalog, product: string): Lane | undefined {
  return entryOf(catalog, product)?.lane;
}
