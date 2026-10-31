// "Stacked shelves" layout: the lane-grid layout of packages/core/src/layout.ts, re-arranged for the canvas beside the
// chat console (about 900-1150 px wide). Pure and deterministic: no DOM, no Node APIs, no clocks.
//
//   Left to right, on one request-path row (y = 0):  Clients | Edge | Region
//   Region:  VPC(s) with three columns (ingress | compute or zones | data), then the shelf row BELOW the VPC: lane
//            blocks of managed services (storage, AI, analytics, integration, compute, operations, security, network)
//            in three shelf columns aligned with the VPC's columns. Region-scope services always go to the shelf, even
//            when the model put a VPC-attachable one in the VPC. Later regions stack below the first.
//   vpc-edge items (NAT, VPN gateway, Cloud Firewall): in the ingress column above the ingress cards, inside the VPC.
//   Tall compute tier: more than seven cards, taller than the other tiers, wraps into the free space above the
//            ingress column (one empty row above the ingress stack). The split is sticky.
//   Zones:   stacked vertically inside the compute column, each frame as tall as its own cards; multi-zone compute
//            cards sit first, in one frame labelled with all their zones. The diagram never gets wider for zones.
//   Bands:   Account, SaaS and Recommended stacked under the short Clients and Edge columns (default). The option
//            bands: 'below' puts Account and SaaS in one row below the regions instead, as the direction first asked;
//            on the replay bench that costs 87 first-turn and 1 follow-up unrelated moves, so it is not the default.
//   Outside services: a frame at the bottom of the Clients column, so nothing ever sits right of the region.
//   Width:   fixed at Clients + Edge + a three-column region (1,044 px) once Clients exist, so a canvas can always fit
//            the width (title 11.2 px at 880 px, 13.3 px at 1,040 px) and scroll vertically when a diagram is taller.
//   Solution map (recs only): Team | SaaS | Model service | Cloud resources.
//
// Anchors, chosen so that growth never pushes a bystander:
//   - x = 0 is the region's left edge. Clients and Edge sit at negative x and grow leftwards, so a late Edge column
//     moves only the Clients column, never the region.
//   - y = 0 is the request-path row and every VPC column's floor. Tiers grow upwards, so a new tier card moves only
//     the VPC's top border and never the shelf below it; DNS above the edge stack and zone labels grow upwards too.
//   - Sticky tops with slack: whatever sits below something that can grow (the shelf below the VPC, a later VPC or
//     region, a lane block below another, the bands) keeps its top while `prev` is passed and is placed with some
//     free room above it (RESERVE); a part that is pushed anyway overshoots by a row. Nothing moves up after a
//     removal. The left columns' room is reserved once they exist. A fresh layout (no prev) is the tidy arrangement.
//   - A region that got shelf cards before it had a VPC keeps the room a one-row VPC needs above its shelf, so a late
//     VPC fills it and moves nothing.
//   - The layout does not read the canvas size: the same graph and prev give the same state at every canvas size.
import type { Catalog, CatalogEntry, Graph, GraphGroup, GraphNode } from '../../../../packages/core/src/types.ts';
import type { FrameKind, LayoutBadge, LayoutCard, LayoutFrame, LayoutState, ShelfKind } from '../../../../packages/core/src/layout.ts';
import { solutionLane, zoneLetter } from '../../../../packages/core/src/layout.ts';

/** Fixed geometry: every card has one size, so the layout never waits for DOM measuring. */
export const STACKED = {
  cardW: 168,
  cardH: 60, // room for a two-line title and the subtitle
  gapY: 24, // between stacked cards: a horizontal routing channel
  gapX: 32, // between columns inside the region: a vertical routing channel
  rootGap: 22, // between root columns
  padX: 10, // simple frames (Clients, Edge, bands)
  regionPadX: 6,
  vpcPadX: 22,
  padTop: 6,
  padBottom: 10,
  head: 24, // frame label band
  vpcHead: 26,
  zoneHead: 24,
  zonePad: 8,
  zoneGap: 10,
  emptyZone: 24,
  laneHead: 20,
  laneGap: 16,
  frameGap: 20, // between frames stacked in one root column
  vpcGap: 28,
  shelfGap: 20, // between the VPC and the shelf row
  bandGap: 24,
  badge: 22,
  badgeStep: 26,
  attachW: 104,
  attachH: 20,
} as const;

const G = STACKED;
const ROW = G.cardH + G.gapY;
const PITCH = G.cardW + G.gapX;
const rows = (n: number): number => (n <= 0 ? 0 : n * G.cardH + (n - 1) * G.gapY);
/** Grid columns of a region: ingress, compute (or zones), data. The shelf uses the same three columns. */
const GRID = 3;
const FRAME_W = G.cardW + 2 * G.padX;
/** x of grid column k, relative to the region's left edge (region padding plus VPC padding). */
const colX = (k: number): number => G.regionPadX + G.vpcPadX + k * PITCH;
const REGION_INNER_W = 2 * G.vpcPadX + GRID * G.cardW + (GRID - 1) * G.gapX; // the VPC frame's width

const DATA_LANES: readonly string[] = ['cache', 'database', 'search', 'filestore', 'middleware', 'ai', 'analytics', 'storage', 'integration', 'ops', 'security', 'network', 'compute', 'ingress'];
const ZONE_LANES: readonly string[] = ['ingress', 'compute', ...DATA_LANES];
const SHELF_LANES: readonly string[] = ['storage', 'ai', 'analytics', 'integration', 'compute', 'ops', 'security', 'network'];
/** Preferred shelf column per lane: storage under ingress (near the edge), AI and compute under compute, operations under data. */
const SHELF_PREF: Record<string, number> = { storage: 0, network: 0, ai: 1, compute: 1, integration: 1, analytics: 2, ops: 2, security: 2 };
const SHELF_TITLES: Record<string, string> = { compute: 'Compute', storage: 'Storage', ai: 'AI', analytics: 'Analytics', integration: 'Integration', ops: 'Operations', security: 'Security', network: 'Network' };
const ROOT_LANES: readonly string[] = ['clients', 'onprem', 'thirdparty', 'dns', 'edge', 'network', 'governance', 'saas'];
const SOLUTION_LANES: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'team', label: 'Team' },
  { key: 'saas', label: 'SaaS' },
  { key: 'model', label: 'Model service' },
  { key: 'cloud', label: 'Cloud resources' },
];
const BANDS: ReadonlyArray<{ id: string; kind: FrameKind; label: string }> = [
  { id: '~account', kind: 'account', label: 'Account' },
  { id: '~saas', kind: 'saas', label: 'SaaS' },
  { id: '~recs', kind: 'recs', label: 'Recommended' },
];

/** Sticky state the stacked layout keeps beside the core LayoutState fields. */
export interface StackedSticky {
  /**
   * Sticky tops of the parts that sit below something that can grow: the shelf row, later VPCs and regions, lane
   * blocks below another block, frames below another frame in a root column, and the bands. A top never moves up
   * while `prev` is passed; when what is above it outgrows the gap, it moves down by the overflow plus the slack.
   */
  tops: Record<string, number>;
  /** Shelf height per region that new lane blocks may fill without growing the shelf. */
  shelfH: Record<string, number>;
  /** Whether Clients, Edge and Recommended have existed: the left columns' room stays reserved. */
  left: { external: boolean; edge: boolean; bands: boolean };
  /** Account and SaaS bands ('below' mode): first grid column, cards per row and fill direction, fixed when the band appears. */
  bands: Record<string, { c0: number; max: number; dir: number }>;
  /** Per VPC with a wrapped compute tier: cards kept in the compute column, and the ingress-column row the rest start at. */
  spill: Record<string, { cap: number; r0: number }>;
  /** Top-left of the bounding box (coordinates may be negative). */
  origin: { x: number; y: number };
}

export interface StackedOptions {
  /** Canvas the diagram is fitted into. Accepted for the bench's interface; the layout does not depend on it. */
  canvas?: { w: number; h: number };
  /** Overshoot (px) when a part is pushed anyway, so the next growth fits. Default one card row. */
  pushMin?: number;
  /** Room (px) a new part keeps for growth, by kind of part. Defaults in RESERVE. */
  reserve?: Partial<Record<ReserveKind, number>>;
  /**
   * Where the Account and SaaS bands go. 'left' (default): stacked under the Clients and Edge columns, where nothing
   * grows. 'below': one row below the regions across the diagram's width, as the direction first proposed; measured
   * on the replay bench, the growing region pushes them (91 first-turn and 8 follow-up unrelated moves).
   */
  bands?: 'left' | 'below';
}

/** Room above a later region's floor row that its first VPC may grow into: tiers three rows tall, vpc-edge cards. */
const REGION_HEAD = G.head + 2 * ROW + G.cardH + 14;

/** Parts that keep room to grow into, and how much (px) by default. */
type ReserveKind = 'region' | 'regionHead' | 'vrow' | 'band';
const RESERVE: Record<ReserveKind, number> = {
  regionHead: REGION_HEAD, // a later region keeps this much room above its floor row (at least), for its VPC's tiers
  region: ROW, // above a later region, besides REGION_HEAD: for the region above to grow down into
  vrow: ROW, // above a later VPC in the same region
  band: ROW, // between the left columns and the first band, so a few more Clients or Edge cards do not push the bands
};

export interface StackedState extends LayoutState {
  stacked: StackedSticky;
}

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
  implicit: boolean;
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

const emptySticky = (): StackedSticky => ({ tops: {}, shelfH: {}, left: { external: false, edge: false, bands: false }, bands: {}, spill: {}, origin: { x: 0, y: 0 } });

/** A compute tier wraps into the ingress column only above this many cards. */
const SPILL_MIN = 7;

/** From a VPC's floor row down to its bottom edge, with or without zones, so zones arriving never push the shelf. */
const VPC_BELOW = G.cardH + Math.max(G.padBottom, G.zonePad + 4);

/**
 * Lays out a graph, normally the repairGraph() output. Pass the previous state as `prev` to keep sticky slots and
 * reserves; without it the result is the tidy arrangement. Deterministic: the same graph, catalog and prev always
 * give the same state, whatever the canvas size.
 */
export function layoutStacked(graph: Graph, catalog: Catalog, prevState?: LayoutState, opts: StackedOptions = {}): StackedState {
  const pushMin = opts.pushMin ?? ROW;
  const reserve: Record<string, number> = { ...RESERVE, ...opts.reserve };
  return layoutPass(graph, catalog, prevState, (key, pushed) => (pushed ? pushMin : (reserve[key.split(':')[0]] ?? 0)), reserve, opts.bands ?? 'left');
}

function layoutPass(graph: Graph, catalog: Catalog, prevState: LayoutState | undefined, slackOf: (key: string, pushed: boolean) => number, reserve: Record<string, number>, bandsMode: 'left' | 'below'): StackedState {
  const reserveOf = (k: ReserveKind): number => reserve[k] ?? 0;
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

  // Badges: nodes attached to an existing host that is not itself attached.
  const badgeOf = new Map<string, GraphNode>();
  for (const n of nodes) {
    if (!n.attachTo || n.attachTo === n.id || !has(graph.nodes, n.attachTo)) continue;
    const host = graph.nodes[n.attachTo];
    if (host.attachTo && has(graph.nodes, host.attachTo)) continue;
    badgeOf.set(n.id, n);
  }
  const cardNodes = nodes.filter((n) => !badgeOf.has(n.id));
  const infra = cardNodes.filter((n) => entry(n.product)?.scope !== 'external');
  const mode: LayoutState['mode'] = recs.length > 0 && infra.length === 0 ? 'solution' : 'architecture';

  const prevS = prevState as StackedState | undefined;
  const prev = prevS && prevS.mode === mode ? prevS : undefined;
  const ps: StackedSticky = prev && prev.stacked ? prev.stacked : emptySticky();
  const sticky: StackedSticky = emptySticky();
  /**
   * A sticky top: the previous value while what is above still fits; otherwise the need plus slack. A new part gets
   * slack only when `freshSlack` (the shelf, later VPCs and regions, the bands). Records the keys that took slack.
   */
  const stickyTop = (key: string, need: number, freshSlack: boolean, room?: number): number => {
    const p = has(ps.tops, key) ? ps.tops[key] : undefined;
    let v: number;
    if (p !== undefined && need <= p) v = p;
    else if (p === undefined && !freshSlack) v = need;
    else v = need + (p === undefined && room !== undefined ? room : slackOf(key, p !== undefined));
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
    slots[slot] = orderSlot(items, prev?.slots[slot]);
    for (const it of items) itemById.set(it.id, it);
  }
  const slotOf = (key: string): string[] => slots[key] ?? [];

  const frames: Record<string, LayoutFrame> = {};
  const cards: Record<string, LayoutCard> = {};
  const badges: Record<string, LayoutBadge> = {};
  const shelves: Record<string, string[][]> = {};
  const shelfKinds: Record<string, ShelfKind[]> = {};
  const order: Record<string, string[]> = {};

  const place = (id: string, frame: string, slot: string, index: number, x: number, y: number, extra?: Partial<LayoutCard>): void => {
    const it = itemById.get(id);
    if (!it) return;
    const c: LayoutCard = { id, kind: it.kind, product: it.product, frame, slot, index, x, y, w: G.cardW, h: G.cardH, badges: [] };
    if (it.zones) c.zones = it.zones;
    if (it.fit) c.fit = it.fit;
    cards[id] = extra ? Object.assign(c, extra) : c;
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
  sticky.origin = { x: minX, y: minY };
  return { version: 1, mode, width: Math.round(maxX - minX), height: Math.round(maxY - minY), pathY: 0, cards, frames, badges, slots, shelves, shelfKinds, order, stacked: sticky };

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
    const ensureVpc = (id: string, label: string, implicit: boolean, region: RegionModel): VpcModel => {
      let v = vpcs.get(id);
      if (!v) {
        v = { id, label, implicit, zones: [] };
        vpcs.set(id, v);
        region.vpcs.push(id);
      }
      return v;
    };
    for (const g of groups) if (g.kind === 'region') ensureRegion(g.id, g.label, false);
    for (const g of groups) if (g.kind === 'vpc') ensureVpc(g.id, g.label, false, regionFor(chainOf(graph, g.parent)));
    for (const g of groups) {
      if (g.kind !== 'zone') continue;
      const vg = chainOf(graph, g.parent).find((x) => x.kind === 'vpc');
      const v = vg ? vpcs.get(vg.id) : undefined;
      if (!v) continue;
      v.zones.push({ id: g.id, label: g.label, letter: zoneLetter(g) });
      zoneVpc.set(g.id, v.id);
    }
    for (const v of vpcs.values()) v.zones.sort((a, b) => (a.letter < b.letter ? -1 : a.letter > b.letter ? 1 : a.id < b.id ? -1 : 1));
    for (const g of groups) {
      if (g.kind === 'external' || g.kind === 'onprem') addSimple({ id: g.id, kind: g.kind, label: g.label, implicit: false, column: 'external', hasUpper: false });
      else if (g.kind === 'edge') addSimple({ id: g.id, kind: 'edge', label: g.label, implicit: false, column: 'edge', hasUpper: true });
    }
    const vpcFor = (chain: GraphGroup[], region: RegionModel): VpcModel => {
      const vg = chain.find((g) => g.kind === 'vpc');
      const own = vg ? vpcs.get(vg.id) : undefined;
      if (own) return own;
      const first = region.vpcs.length ? vpcs.get(region.vpcs[0]) : undefined;
      return first ?? ensureVpc(`~vpc@${region.id}`, 'VPC', true, region);
    };
    const zoneIn = (chain: GraphGroup[], v: VpcModel): ZoneModel | undefined => {
      for (const g of chain) if (g.kind === 'zone' && zoneVpc.get(g.id) === v.id) return v.zones.find((z) => z.id === g.id);
      return undefined;
    };
    const inVpcSlots = (n: GraphNode, e: CatalogEntry | undefined, chain: GraphGroup[], v: VpcModel, base: Item): void => {
      const lane = e ? e.lane : 'ops';
      const z = zoneIn(chain, v);
      if (z) put(`${z.id}#zone`, { ...base, key: keyOf(n.id, e, ZONE_LANES) });
      else if (lane === 'ingress') put(`${v.id}#ingress`, { ...base, key: keyOf(n.id, e, ['ingress']) });
      else if (lane === 'compute') put(v.zones.length ? `${v.id}#span` : `${v.id}#compute`, { ...base, key: keyOf(n.id, e, ['compute']) });
      else put(`${v.id}#data`, { ...base, key: keyOf(n.id, e, DATA_LANES) });
    };

    for (const n of cardNodes) {
      const e = entry(n.product);
      const chain = chainOf(graph, n.group);
      const scope = e ? e.scope : 'region';
      const lane: string = e ? e.lane : 'ops';
      const base: Item = { id: n.id, kind: 'node', product: n.product, key: [0, 0, 0] };
      if (n.zones && n.zones.length) base.zones = n.zones.slice();
      switch (scope) {
        case 'external': {
          if (lane === 'thirdparty') {
            addSimple({ id: '~outside', kind: 'outside', label: 'Outside services', implicit: true, column: 'external', hasUpper: false });
            put('~outside#stack', { ...base, key: keyOf(n.id, e, ROOT_LANES) });
            break;
          }
          const own = chain.find((g) => g.kind === 'external' || g.kind === 'onprem');
          const fallback = (lane === 'onprem' ? firstOf(['onprem']) : undefined) ?? firstOf(['external', 'onprem']);
          const fid = own ? own.id : fallback ? fallback.id : '~external';
          if (fid === '~external') addSimple({ id: fid, kind: 'external', label: 'Clients', implicit: true, column: 'external', hasUpper: false });
          put(`${fid}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        case 'global':
        case 'edge': {
          const own = chain.find((g) => g.kind === 'edge') ?? firstOf(['edge']);
          const fid = own ? own.id : '~edge';
          if (fid === '~edge') addSimple({ id: fid, kind: 'edge', label: 'Edge', implicit: true, column: 'edge', hasUpper: true });
          put(lane === 'dns' ? `${fid}#upper` : `${fid}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        case 'account':
        case 'saas': {
          const b = BANDS.find((x) => x.kind === scope)!;
          addSimple({ id: b.id, kind: b.kind, label: b.label, implicit: true, column: 'band', hasUpper: false });
          put(`${b.id}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        case 'vpc':
        case 'vpc-edge': {
          const v = vpcFor(chain, regionFor(chain));
          // vpc-edge cards share the ingress column's stack, above the ingress cards
          if (scope === 'vpc-edge') put(`${v.id}#ingress`, { ...base, key: keyOf(n.id, e, ['ingress', 'boundary']) });
          else inVpcSlots(n, e, chain, v, base);
          break;
        }
        default: {
          // Region scope always goes to the shelf, even when the model put a VPC-attachable service (FC, Hologres,
          // DataWorks, OpenSearch, KMS) inside a VPC: one place per product, and the VPC does not grow for it.
          const region = regionFor(chain);
          const shelfLane = SHELF_LANES.includes(lane) ? lane : 'ops';
          region.lanes.add(shelfLane);
          put(`${region.id}~${shelfLane}#stack`, { ...base, key: keyOf(n.id, e, [shelfLane]) });
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

  /** A simple frame (Clients, Edge, Outside services, a solution lane) whose first stack card sits on `rowY`. */
  function drawSimple(f: SimpleFrame, x: number, rowY: number, parent: string | null, depth: number): { top: number; bottom: number } {
    const upper = f.hasUpper ? slotOf(`${f.id}#upper`) : [];
    const stack = slotOf(`${f.id}#stack`);
    const upperH = upper.length ? rows(upper.length) + G.gapY : 0;
    const top = rowY - upperH - G.head - G.padTop;
    const h = G.head + G.padTop + upperH + rows(Math.max(1, stack.length)) + G.padBottom;
    const fr: LayoutFrame = { id: f.id, kind: f.kind, label: f.label, parent, depth, implicit: f.implicit, empty: upper.length + stack.length === 0, x, y: top, w: FRAME_W, h };
    if (f.lane) fr.lane = f.lane;
    frames[f.id] = fr;
    upper.forEach((id, i) => place(id, f.id, `${f.id}#upper`, i, x + G.padX, rowY - upperH + i * ROW));
    stack.forEach((id, i) => place(id, f.id, `${f.id}#stack`, i, x + G.padX, rowY + i * ROW));
    return { top, bottom: top + h };
  }

  /** A left column's frames (Clients and Outside services, or Edge): the first frame's first card on y = 0, the rest stacked below with sticky tops. Returns the column's bottom. */
  function drawColumn(key: string, ids: string[], x: number): number {
    const o = orderFrames(ids, prev?.order['col:' + key]);
    order['col:' + key] = o;
    let bottom = 0;
    o.forEach((id, i) => {
      const f = simple.get(id)!;
      const upper = f.hasUpper ? slotOf(`${f.id}#upper`) : [];
      const lead = G.head + G.padTop + (upper.length ? rows(upper.length) + G.gapY : 0);
      // a frame keeps its row when a frame above it is removed: nothing moves up
      const rowY = i === 0 && !has(ps.tops, `col:${id}`) ? 0 : stickyTop(`col:${id}`, i === 0 ? 0 : bottom + G.frameGap + lead, false);
      bottom = drawSimple(f, x, rowY, null, 0).bottom;
    });
    return bottom;
  }

  function drawSolution(): void {
    SOLUTION_LANES.forEach((l, k) => {
      const id = '~sol:' + l.key;
      order['col:sol:' + l.key] = [id];
      drawSimple(simple.get(id)!, k * (FRAME_W + G.rootGap), 0, null, 0);
    });
  }

  interface VpcGeom {
    v: VpcModel;
    /** From the first row (the request-path row) up to the frame top: the tiers above it, zone labels, label band. */
    above: number;
    /** From the first row down to the frame bottom. */
    below: number;
    w: number;
    draw(x: number, firstRow: number, parent: string, depth: number): void;
  }

  /**
   * A VPC: three tier columns (ingress | compute or zones | data) whose first cards sit on the request-path row, the
   * VPC's floor. A tier grows upwards, so a new card never pushes the shelf below the VPC; only the frame top rises.
   * vpc-edge cards (NAT, VPN gateway, Cloud Firewall) stack in the ingress column above the ingress cards: the
   * network edge of the VPC, facing the Clients and Edge columns. They do not straddle the top edge, because a taller
   * compute or data tier would then lift them.
   */
  function vpcGeom(v: VpcModel): VpcGeom {
    const ingress = slotOf(`${v.id}#ingress`);
    const data = slotOf(`${v.id}#data`);
    const zoned = v.zones.length > 0;
    const span = zoned ? slotOf(`${v.id}#span`) : [];
    const computeAll = zoned ? [] : slotOf(`${v.id}#compute`);
    // A tall compute tier (more than SPILL_MIN cards, taller than the other tiers) wraps into the free space above the
    // ingress column, from row r0 up, leaving an empty row above the ingress stack. The split is sticky: it changes only
    // in a frame where the compute tier itself changes, so a growing data or ingress tier never re-flows compute cards.
    const prevSpill = has(ps.spill, v.id) ? ps.spill[v.id] : undefined;
    const prevCompute = prev?.slots[`${v.id}#compute`];
    const computeChanged = !prevCompute || prevCompute.length !== computeAll.length || prevCompute.some((id, i) => id !== computeAll[i]);
    let cap = computeAll.length;
    let r0 = ingress.length + 1;
    if (prevSpill && !computeChanged) {
      cap = Math.min(prevSpill.cap, computeAll.length);
      r0 = Math.max(prevSpill.r0, ingress.length);
    } else {
      if (prevSpill) r0 = Math.max(prevSpill.r0, ingress.length);
      const other = Math.max(data.length, ingress.length);
      if (computeAll.length > Math.max(other, SPILL_MIN)) cap = Math.max(other, SPILL_MIN, Math.ceil((computeAll.length + r0) / 2));
    }
    if (cap < computeAll.length) sticky.spill[v.id] = { cap, r0 };
    const compute = computeAll.slice(0, cap);
    const spill = computeAll.slice(cap);
    const col0 = spill.length ? r0 + spill.length : ingress.length;
    const members = v.zones.map((z) => slotOf(`${z.id}#zone`));
    // Zones stack upwards in the compute column, each frame as tall as its own cards: multi-zone cards first (on the
    // path row), in one frame labelled with every zone they span; a zone with no cards of its own is then not drawn.
    const shown = v.zones.map((_, k) => k).filter((k) => members[k].length > 0 || span.length === 0);
    const zoneCardsH = (n: number): number => (n ? rows(n) : G.emptyZone);
    const up = (n: number): number => (n > 1 ? (n - 1) * ROW : 0); // a column's extent above the first row's top
    let zoneUp = 0;
    if (zoned) {
      let bottom = G.cardH + G.zonePad; // the lowest zone frame's bottom, relative to the first row
      const sizes: number[] = span.length ? [span.length] : [];
      for (const k of shown) sizes.push(members[k].length);
      for (const n of sizes) {
        const top = bottom - G.zonePad - zoneCardsH(n) - G.zoneHead;
        zoneUp = -top;
        bottom = top - G.zoneGap;
      }
    }
    const tiersUp = Math.max(up(col0), up(data.length), up(compute.length), zoneUp);
    const above = tiersUp + G.vpcHead;
    const letters = v.zones.map((z) => z.letter.toUpperCase());
    const spanLabel = letters.every((l) => l.length <= 3) ? `Zones ${letters.join(' · ')}` : v.zones.map((z) => z.label).join(' · ');
    const spanFrame = `~zones@${v.id}`;
    const w = REGION_INNER_W;
    const below = VPC_BELOW;
    return {
      v,
      above,
      below,
      w,
      draw(x, firstRow, parent, depth) {
        const top = firstRow - above;
        const cx = (k: number): number => x + G.vpcPadX + k * PITCH;
        frames[v.id] = { id: v.id, kind: 'vpc', label: v.label, parent, depth, implicit: v.implicit, empty: false, x, y: top, w, h: above + below };
        const upY = (i: number): number => firstRow - i * ROW;
        ingress.forEach((id, i) => place(id, v.id, `${v.id}#ingress`, i, cx(0), upY(i)));
        compute.forEach((id, i) => place(id, v.id, `${v.id}#compute`, i, cx(1), upY(i)));
        spill.forEach((id, j) => place(id, v.id, `${v.id}#compute`, cap + j, cx(0), upY(r0 + j)));
        data.forEach((id, i) => place(id, v.id, `${v.id}#data`, i, cx(2), upY(i)));
        const zx0 = cx(1) - G.zonePad;
        const zw = G.cardW + 2 * G.zonePad;
        let bottom = firstRow + G.cardH + G.zonePad;
        if (span.length) {
          const first = bottom - G.zonePad - G.cardH;
          const t = bottom - G.zonePad - zoneCardsH(span.length) - G.zoneHead;
          frames[spanFrame] = { id: spanFrame, kind: 'zone', label: spanLabel, parent: v.id, depth: depth + 1, implicit: true, empty: false, x: zx0, y: t, w: zw, h: bottom - t };
          span.forEach((id, i) => place(id, spanFrame, `${v.id}#span`, i, cx(1), first - i * ROW, { span: { x0: zx0, x1: zx0 + zw } }));
          bottom = t - G.zoneGap;
        }
        for (const k of shown) {
          const zm = v.zones[k];
          const m = members[k];
          const first = bottom - G.zonePad - G.cardH;
          const t = bottom - G.zonePad - zoneCardsH(m.length) - G.zoneHead;
          frames[zm.id] = { id: zm.id, kind: 'zone', label: zm.label, parent: v.id, depth: depth + 1, implicit: false, empty: m.length === 0, zone: zm.letter, x: zx0, y: t, w: zw, h: bottom - t };
          m.forEach((id, j) => place(id, zm.id, `${zm.id}#zone`, j, cx(1), first - j * ROW));
          bottom = t - G.zoneGap;
        }
        frames[v.id].empty = ingress.length + data.length + span.length + computeAll.length + members.reduce((sum, m) => sum + m.length, 0) === 0;
      },
    };
  }

  interface RegionGeom {
    top: number; // relative to the anchor row
    bottom: number;
    w: number;
    draw(x: number, anchor: number, depth: number): void;
  }

  function regionGeom(r: RegionModel): RegionGeom {
    const vpcOrder = orderFrames(r.vpcs, prev?.order[r.id]);
    order[r.id] = vpcOrder;
    const vg = vpcOrder.map((id) => vpcGeom(vpcs.get(id)!));

    // Shelf: lane blocks in three columns aligned with the VPC's columns. A block keeps its column; a block that
    // grows into the block below it moves to the foot of the shortest column instead of pushing that block down.
    const laneFrame = (lane: string): string => `${r.id}~${lane}`;
    const laneOfFrame = (fid: string): string => fid.slice(r.id.length + 1);
    const present = SHELF_LANES.filter((l) => r.lanes.has(l)).map(laneFrame);
    const blockH = (fid: string): number => G.laneHead + rows(slotOf(`${fid}#stack`).length);
    const colH = (c: string[]): number => c.reduce((sum, fid, i) => sum + blockH(fid) + (i ? G.laneGap : 0), 0);
    const prevCols = prev?.shelves[r.id] ?? [];
    const cols: string[][] = Array.from({ length: GRID }, (_, k) => (prevCols[k] ?? []).filter((fid) => present.includes(fid)));
    const placed = new Set(cols.flat());
    const reserve = present.length ? (ps.shelfH[r.id] ?? 0) : 0;
    const relocated = new Set<string>();
    const prevTop = (fid: string): number | undefined => (!relocated.has(fid) && has(ps.tops, `blk:${fid}`) ? ps.tops[`blk:${fid}`] : undefined);
    const grew = (fid: string): boolean => {
      const pf = prev?.frames[fid];
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
    shelfKinds[r.id] = cols.map((c) => (c.length && ['ops', 'security', 'network'].includes(laneOfFrame(c[0])) ? 'ops' : 'data'));
    // block tops are sticky: a block keeps its top while the block above it fits; a relocated block starts fresh
    const blockTop = new Map<string, number>();
    let shelfBottom = 0;
    for (const col of cols) {
      let by = 0;
      col.forEach((fid, i) => {
        let t: number;
        if (relocated.has(fid)) {
          t = by;
          sticky.tops[`blk:${fid}`] = t;
        } else t = i === 0 && !has(ps.tops, `blk:${fid}`) ? 0 : stickyTop(`blk:${fid}`, by, true); // a block never moves up
        blockTop.set(fid, t);
        by = t + blockH(fid) + G.laneGap;
        shelfBottom = Math.max(shelfBottom, t + blockH(fid));
      });
    }
    if (present.length) sticky.shelfH[r.id] = Math.max(reserve, ...cols.map(colH));

    // Vertical plan relative to the anchor row (y = 0 for the first region): the first VPC's floor is the anchor row,
    // later VPCs stack below it with sticky rows, and the shelf sits below the last VPC. A region whose shelf came
    // before any VPC keeps the room a one-row VPC needs above its shelf, so a late VPC fills it and moves nothing.
    const vpcRows: number[] = [];
    let top: number;
    let shelfTop = 0;
    let cursor: number; // bottom of the last placed part
    const headOf = (g: VpcGeom): number => g.above;
    if (vg.length) {
      vpcRows.push(0);
      cursor = vg[0].below;
      for (let i = 1; i < vg.length; i++) {
        const g = vg[i];
        const row = stickyTop(`vrow:${g.v.id}`, cursor + G.vpcGap + headOf(g), true);
        vpcRows.push(row);
        cursor = row + g.below;
      }
      top = -headOf(vg[0]) - G.head;
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
    const bottom = cursor + G.padBottom;
    const w = 2 * G.regionPadX + REGION_INNER_W;
    return {
      top,
      bottom,
      w,
      draw(x, anchor, depth) {
        frames[r.id] = { id: r.id, kind: 'region', label: r.label, parent: null, depth, implicit: r.implicit, empty: vg.length === 0 && present.length === 0, x, y: anchor + top, w, h: bottom - top };
        vg.forEach((g, i) => g.draw(x + G.regionPadX, anchor + vpcRows[i], r.id, depth + 1));
        cols.forEach((col, k) => {
          const bx = x + colX(k);
          for (const fid of col) {
            const by = anchor + shelfTop + blockTop.get(fid)!;
            const lane = laneOfFrame(fid);
            const ids = slotOf(`${fid}#stack`);
            frames[fid] = { id: fid, kind: 'lane', label: SHELF_TITLES[lane] ?? lane, parent: r.id, depth: depth + 1, implicit: true, empty: ids.length === 0, lane, x: bx, y: by, w: G.cardW, h: blockH(fid) };
            ids.forEach((id, i) => place(id, fid, `${fid}#stack`, i, bx, by + G.laneHead + i * ROW));
          }
        });
      },
    };
  }

  /**
   * Bands (Account, SaaS, Recommended) stacked below the left columns, each two cards wide (one card: one column).
   * A band's top is sticky; a band that grows into the band below it moves to the foot of the stack instead of
   * pushing that band down. The first band sits a row below the left columns, or on the path row without them.
   */
  function drawLeftBands(colBottom: number, extX: number, hasLeft: boolean): void {
    const bandIds = BANDS.map((b) => b.id).filter((id) => simple.has(id));
    const lead = G.head + G.padTop;
    const bandRows = (id: string): number => Math.max(1, Math.ceil(slotOf(`${id}#stack`).length / 2));
    const bandH = (id: string): number => lead + rows(bandRows(id)) + G.padBottom;
    const bandOrder = orderFrames(bandIds, prev?.order['bands']);
    const prevBandTop = (id: string): number | undefined => (has(ps.tops, `band:${id}`) ? ps.tops[`band:${id}`] : undefined);
    const bandGrew = (id: string): boolean => {
      const pf = prev?.frames[id];
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
    bandOrder.forEach((id, i) => {
      const f = simple.get(id)!;
      const ids = slotOf(`${id}#stack`);
      const fresh = movedBands.has(id) || prevBandTop(id) === undefined;
      const rowY = movedBands.has(id) ? bandCursor : stickyTop(`band:${id}`, bandCursor, i === 0 && hasLeft);
      if (fresh) sticky.tops[`band:${id}`] = rowY;
      const cols = ids.length > 1 ? 2 : 1;
      const top = rowY - lead;
      frames[id] = { id, kind: f.kind, label: f.label, parent: null, depth: 0, implicit: true, empty: ids.length === 0, x: extX, y: top, w: cols * FRAME_W + (cols - 1) * G.rootGap, h: bandH(id) };
      ids.forEach((cid, k) => place(cid, id, `${id}#stack`, k, extX + G.padX + (k % 2) * (FRAME_W + G.rootGap), rowY + Math.floor(k / 2) * ROW));
      bandCursor = top + bandH(id) + G.bandGap + lead;
    });
  }

  function drawArchitecture(): void {
    const ofColumn = (c: SimpleFrame['column']): string[] => [...simple.values()].filter((f) => f.column === c).map((f) => f.id);
    const extIds = ofColumn('external');
    const edgeIds = ofColumn('edge');
    // The two left columns (Clients, Edge) are reserved once Clients, Edge or a band have existed, so a late DNS, CDN
    // or band never moves what is already drawn. The bands (Account, SaaS, Recommended) live below the left columns,
    // outside the region, so the region's growth never reaches them.
    const hasRecs = simple.has('~recs');
    const realExt = extIds.length > 0 || ps.left.external;
    const realEdge = edgeIds.length > 0 || ps.left.edge;
    const leftRecs = hasRecs || ps.left.bands;
    sticky.left = { external: realExt, edge: realEdge, bands: leftRecs };
    const edgeX = -G.rootGap - FRAME_W;
    const extX = edgeX - G.rootGap - FRAME_W;
    const colBottom = Math.max(drawColumn('external', extIds, extX), drawColumn('edge', edgeIds, edgeX));
    const lead = G.head + G.padTop;

    // Recommended (architecture mode): under the left columns, two cards wide, a row below them so a few more Clients
    // or Edge cards do not push it; on the path row when there are no left columns.
    let leftBottom = realExt || realEdge ? colBottom : -Infinity;
    if (bandsMode === 'left') drawLeftBands(colBottom, extX, realExt || realEdge);
    else if (hasRecs) {
      const id = '~recs';
      const f = simple.get(id)!;
      const ids = slotOf(`${id}#stack`);
      const rowY = stickyTop(`band:${id}`, realExt || realEdge ? colBottom + G.bandGap + lead : 0, realExt || realEdge);
      const cols = ids.length > 1 ? 2 : 1;
      const h = lead + rows(Math.max(1, Math.ceil(ids.length / 2))) + G.padBottom;
      frames[id] = { id, kind: f.kind, label: f.label, parent: null, depth: 0, implicit: true, empty: ids.length === 0, x: extX, y: rowY - lead, w: cols * FRAME_W + (cols - 1) * G.rootGap, h };
      ids.forEach((cid, k) => place(cid, id, `${id}#stack`, k, extX + G.padX + (k % 2) * (FRAME_W + G.rootGap), rowY + Math.floor(k / 2) * ROW));
      leftBottom = Math.max(leftBottom, rowY - lead + h);
    }

    // regions stacked vertically at x = 0; the first one's anchor row is the request-path row
    const regionOrder = orderFrames([...regions.keys()], prev?.order['col:regions']);
    order['col:regions'] = regionOrder;
    let lastBottom: number | null = null;
    for (const rid of regionOrder) {
      const g = regionGeom(regions.get(rid)!);
      // a later region keeps room above it for its VPC's tiers to reach three rows, and a row more for the region
      // above to grow into; its label band and tiers grow upwards into that room
      const anchor: number = lastBottom === null ? 0 : stickyTop(`region:${rid}`, lastBottom + G.frameGap - g.top, true, Math.max(0, reserveOf('regionHead') + g.top) + reserveOf('region'));
      g.draw(0, anchor, 0);
      lastBottom = anchor + g.bottom;
    }

    // Account and SaaS bands: one row below the regions and the left columns, across the diagram's width. Account
    // fills from the left (up to three cards a row), SaaS from the right (up to two a row); each grows downwards, and
    // a card's place depends only on its index, so a new card never moves another.
    const bandIds = ['~account', '~saas'].filter((id) => simple.has(id));
    if (bandsMode === 'below' && bandIds.length) {
      const leftUsable = realExt || realEdge || leftRecs;
      const xs = [extX + G.padX, edgeX + G.padX, colX(0), colX(1), colX(2)];
      const above = Math.max(lastBottom ?? -Infinity, leftBottom);
      const rowY = stickyTop('band:row', (Number.isFinite(above) ? above + G.bandGap : 0) + lead, Number.isFinite(above));
      for (const id of bandIds) {
        const f = simple.get(id)!;
        const ids = slotOf(`${id}#stack`);
        const cfg = has(ps.bands, id) ? ps.bands[id] : id === '~account' ? { c0: leftUsable ? 0 : 2, max: leftUsable ? 3 : 1, dir: 1 } : { c0: 4, max: 2, dir: -1 };
        sticky.bands[id] = cfg;
        const n = Math.max(1, ids.length);
        const colOf = (k: number): number => cfg.c0 + cfg.dir * (k % cfg.max);
        const ends = [colOf(0), colOf(Math.min(n, cfg.max) - 1)];
        const x = xs[Math.min(...ends)] - G.padX;
        const right = xs[Math.max(...ends)] + G.cardW + G.padX;
        const h = lead + rows(Math.ceil(n / cfg.max)) + G.padBottom;
        frames[id] = { id, kind: f.kind, label: f.label, parent: null, depth: 0, implicit: true, empty: ids.length === 0, x, y: rowY - lead, w: right - x, h };
        ids.forEach((cid, k) => place(cid, id, `${id}#stack`, k, xs[colOf(k)], rowY + Math.floor(k / cfg.max) * ROW));
      }
    }
  }
}
