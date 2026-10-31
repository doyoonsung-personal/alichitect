// Catalog-driven lane-grid layout with sticky slots. Pure and deterministic: no DOM, no Node APIs, no clocks.
//
// Placement comes from the catalog, not from the model: a node's root column, container and lane follow its entry's
// scope and lane, and its order inside a lane follows pathRank. The model's groups only say WHICH region, VPC or zone
// a node belongs to; use the repairGraph() output as input, so those hints are already scope-correct.
//
//   Root columns, left to right:  Clients (side bands Account, SaaS, Recommended stacked below) | Edge | Region(s) |
//                                 Outside services. The side bands sit under the short Clients column, which rarely
//                                 grows, instead of right of the regions, so a widening region never shifts them
//                                 and the diagram is about 270 px narrower.
//   Region:                       VPC column (VPCs stacked) | shelf of managed services in lane blocks
//   VPC:                          ingress | zones block (fixed zone order, multi-zone row on top) | data lanes,
//                                 with vpc-edge items (NAT, VPN, Cloud Firewall) straddling the VPC's top edge
//   Solution map (recs only):     Team | SaaS | Model service | Cloud resources
//
// Sticky slots: with `prev`, a placed node keeps its (frame, slot, order); a new node is inserted at its catalog rank
// inside its slot; a removal compacts the slot. Lane blocks keep their shelf column. Every root column puts its first
// card on one fixed request-path row (PATH_ROW), so a column that grows upward (DNS above the edge stack) or a region
// that appears later moves nothing else.
import type { Catalog, CatalogEntry, Graph, GraphGroup, GraphNode, Lane } from './types.ts';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ShelfKind = 'data' | 'ops';

export type FrameKind ='external' | 'onprem' | 'edge' | 'region' | 'vpc' | 'zone' | 'outside' | 'account' | 'saas' | 'recs' | 'lane' | 'solution';

export interface LayoutFrame extends Rect {
  id: string;
  kind: FrameKind;
  label: string;
  parent: string | null;
  depth: number;
  /** Drawn by the layout without a graph group: an implicit region or VPC, an edge column, a side band, a lane block. */
  implicit: boolean;
  /** No cards yet: the frame keeps one empty slot, so it does not grow when its first card arrives. */
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
  /** Zone letters of a multi-zone node, drawn once across the zone frames it covers. */
  zones?: string[];
  /** Horizontal extent of the zone frames a multi-zone card covers. */
  span?: { x0: number; x1: number };
  /** Straddles its VPC frame's top edge (vpc-edge scope). */
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

export interface LayoutState {
  version: 1;
  mode: 'architecture' | 'solution';
  width: number;
  height: number;
  /** y of the request-path row: every root column's first card sits on it. */
  pathY: number;
  cards: Record<string, LayoutCard>;
  frames: Record<string, LayoutFrame>;
  badges: Record<string, LayoutBadge>;
  /** Sticky state, read back from `prev`: ordered card ids per slot. */
  slots: Record<string, string[]>;
  /** Sticky state: lane-block frame ids per shelf column, per region (an empty column is a reserved one). */
  shelves: Record<string, string[][]>;
  /** Sticky state: the kind of each shelf column, per region (data lanes or operations lanes). */
  shelfKinds: Record<string, ShelfKind[]>;
  /** Sticky state: frame order per stacking parent (root columns, VPC columns). */
  order: Record<string, string[]>;
}

/** Fixed geometry. Every card has one size, so the layout never waits for DOM measuring. */
export const GEOMETRY = {
  cardW: 188, // fits an 18-character short name at 12.5px next to the glyph tile
  cardH: 52,
  gapY: 24, // between stacked cards: a horizontal routing channel
  gapX: 40, // between columns inside a frame: a vertical routing channel
  rootGap: 56, // between root columns
  padX: 14,
  padTop: 6,
  padBottom: 16,
  head: 34, // frame label band
  vpcHead: 40, // VPC label band, deep enough to clear the lower half of boundary cards
  boundaryRise: 34, // room above a VPC for the upper half of its boundary cards (cardH / 2 + 8)
  boundaryGap: 20,
  zonePad: 10,
  zoneHead: 26,
  zoneGap: 10,
  laneHead: 22, // lane-block label in the shelf
  laneGap: 18,
  frameGap: 28, // between frames stacked in one root column
  vpcGap: 50, // between stacked VPCs (room for the next VPC's boundary row)
  badge: 22,
  badgeStep: 26,
  attachW: 104,
  attachH: 20,
} as const;

const G = GEOMETRY;
const ROW = G.cardH + G.gapY;
const rows = (n: number): number => (n <= 0 ? 0 : n * G.cardH + (n - 1) * G.gapY);

const REGION_CONTENT_TOP = G.head + G.boundaryRise;
const VPC_ROW0 = G.vpcHead + G.zoneHead;
/** Row 0 of a region's first VPC, relative to the region's top. Every root column aligns its first card with it. */
export const PATH_ROW = REGION_CONTENT_TOP + VPC_ROW0;

/** Data lanes inside a VPC, top to bottom; lanes of VPC-attached regional services follow. */
const DATA_LANES: readonly string[] = ['cache', 'database', 'search', 'filestore', 'middleware', 'ai', 'analytics', 'storage', 'integration', 'ops', 'security', 'network', 'compute', 'ingress'];
const ZONE_LANES: readonly string[] = ['ingress', 'compute', ...DATA_LANES];
/** Shelf lane blocks in canonical order (a fresh layout fills shelf columns in this order). */
const SHELF_LANES: readonly string[] = ['compute', 'storage', 'ai', 'analytics', 'integration', 'ops', 'security', 'network'];
/** Operations-style lanes share their own shelf column, so edits to data lanes never push them around. */
const OPS_LANES: ReadonlySet<string> = new Set(['ops', 'security', 'network']);
const SHELF_TITLES: Record<string, string> = {
  compute: 'Compute',
  storage: 'Storage',
  ai: 'AI',
  analytics: 'Analytics',
  integration: 'Integration',
  ops: 'Operations',
  security: 'Security',
  network: 'Network',
};
const ROOT_LANES: readonly string[] = ['clients', 'onprem', 'thirdparty', 'dns', 'edge', 'network', 'governance', 'saas'];
const MAX_SHELF_COLUMNS = 3;

const SOLUTION_LANES: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'team', label: 'Team' },
  { key: 'saas', label: 'SaaS' },
  { key: 'model', label: 'Model service' },
  { key: 'cloud', label: 'Cloud resources' },
];
/** Seat or credit plans whose job is model access; the solution map draws them in the Model service lane. */
const MODEL_ACCESS: ReadonlySet<string> = new Set(['coding-plan', 'token-plan', 'qwen-cloud']);

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
  column: string; // root column key
  hasUpper: boolean; // edge frames keep resolvers (DNS) in a band above the main stack
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
  lanes: Set<string>; // shelf lanes with at least one card
}

interface Block {
  w: number;
  h: number;
  anchor: number; // y of the block's first path card, relative to the block's top
  draw(x: number, y: number, parent: string | null, depth: number): void;
}

interface Column {
  key: string;
  blocks: Block[];
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

/** Sticky order of frame ids under one parent: the previous order is kept and new ids are appended in input order. */
function orderFrames(ids: readonly string[], prevOrder: readonly string[] | undefined): string[] {
  const want = new Set(ids);
  const out = (prevOrder ?? []).filter((id) => want.has(id));
  for (const id of ids) if (!out.includes(id)) out.push(id);
  return out;
}

/**
 * Lays out a graph, normally the repairGraph() output. Pass the previous LayoutState as `prev` to keep sticky slots;
 * without it the result is the canonical arrangement (an explicit "tidy up"). Deterministic: the same graph, catalog
 * and prev always give the same state.
 */
export function layoutGraph(graph: Graph, catalog: Catalog, prev?: LayoutState): LayoutState {
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

  // ----- sticky slot order -----
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

  const SIDE: ReadonlySet<string> = new Set(['~account', '~saas', '~recs']);
  const columnOf = (key: string, ids: string[], make: (id: string) => Block): Column => {
    const sticky = orderFrames(ids, prev?.order['col:' + key]);
    const o = [...sticky.filter((id) => !SIDE.has(id)), ...sticky.filter((id) => SIDE.has(id))];
    order['col:' + key] = o;
    return { key, blocks: o.map(make) };
  };
  const simpleIn = (col: string): string[] => [...simple.values()].filter((f) => f.column === col).map((f) => f.id);

  let columns: Column[];
  let minPath: number;
  if (mode === 'solution') {
    columns = SOLUTION_LANES.map((l) => columnOf('sol:' + l.key, ['~sol:' + l.key], (id) => simpleBlock(simple.get(id)!)));
    minPath = 0;
  } else {
    columns = [
      columnOf('external', [...simpleIn('external'), ...['~account', '~saas', '~recs'].filter((id) => simple.has(id))], (id) => simpleBlock(simple.get(id)!)),
      columnOf('edge', simpleIn('edge'), (id) => simpleBlock(simple.get(id)!)),
      columnOf('regions', [...regions.keys()], (id) => regionBlock(regions.get(id)!)),
      columnOf('outside', simpleIn('outside'), (id) => simpleBlock(simple.get(id)!)),
    ].filter((c) => c.blocks.length > 0);
    minPath = PATH_ROW;
  }

  // ----- root composition: columns left to right, first cards on the request-path row -----
  const pathY = Math.max(minPath, ...columns.map((c) => c.blocks[0].anchor));
  let cx = 0;
  for (const c of columns) {
    let y = pathY - c.blocks[0].anchor;
    for (const b of c.blocks) {
      b.draw(cx, y, null, 0);
      y += b.h + G.frameGap;
    }
    cx += Math.max(...c.blocks.map((b) => b.w)) + G.rootGap;
  }

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

  let maxX = 0;
  let maxY = 0;
  for (const r of [...Object.values(frames), ...Object.values(cards), ...Object.values(badges)]) {
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { version: 1, mode, width: Math.round(maxX), height: Math.round(maxY), pathY, cards, frames, badges, slots, shelves, shelfKinds, order };

  // ---------- placement ----------

  function placeSolution(): void {
    for (const l of SOLUTION_LANES) addSimple({ id: '~sol:' + l.key, kind: 'solution', label: l.label, implicit: true, column: 'sol:' + l.key, hasUpper: false, lane: l.key });
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
      if (!v) continue; // a zone outside every VPC is ignored; its members are placed by scope
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
            addSimple({ id: '~outside', kind: 'outside', label: 'Outside services', implicit: true, column: 'outside', hasUpper: false });
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
          const fid = scope === 'account' ? '~account' : '~saas';
          addSimple({ id: fid, kind: scope, label: scope === 'account' ? 'Account' : 'SaaS', implicit: true, column: 'side', hasUpper: false });
          put(`${fid}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        case 'vpc':
        case 'vpc-edge': {
          const v = vpcFor(chain, regionFor(chain));
          if (scope === 'vpc-edge') put(`${v.id}#boundary`, { ...base, key: keyOf(n.id, e, ['boundary']) });
          else inVpcSlots(n, e, chain, v, base);
          break;
        }
        default: {
          // region scope: a VPC-attached service the model put inside a VPC stays there; the rest go to the shelf
          const region = regionFor(chain);
          const inVpc = chain.some((g) => g.kind === 'vpc' || g.kind === 'zone' || g.kind === 'subnet');
          if (inVpc && e && e.vpcAttachable) {
            inVpcSlots(n, e, chain, vpcFor(chain, region), base);
            break;
          }
          const shelfLane = SHELF_LANES.includes(lane) ? lane : 'ops';
          region.lanes.add(shelfLane);
          put(`${region.id}~${shelfLane}#stack`, { ...base, key: keyOf(n.id, e, [shelfLane]) });
        }
      }
    }
    if (recs.length) {
      addSimple({ id: '~recs', kind: 'recs', label: 'Recommended', implicit: true, column: 'side', hasUpper: false });
      for (const r of recs) {
        const id = 'rec:' + r.product;
        put('~recs#stack', { id, kind: 'rec', product: r.product, fit: r.fit, key: recKey(r.fit, id) });
      }
    }
  }

  // ---------- geometry ----------

  function simpleBlock(f: SimpleFrame): Block {
    const upper = f.hasUpper ? slotOf(`${f.id}#upper`) : [];
    const stack = slotOf(`${f.id}#stack`);
    const upperH = upper.length ? rows(upper.length) + G.gapY : 0;
    const top = G.head + G.padTop;
    const w = G.cardW + 2 * G.padX;
    const h = top + upperH + rows(Math.max(1, stack.length)) + G.padBottom;
    return {
      w,
      h,
      anchor: top + upperH,
      draw(x, y, parent, depth) {
        const fr: LayoutFrame = { id: f.id, kind: f.kind, label: f.label, parent, depth, implicit: f.implicit, empty: upper.length + stack.length === 0, x, y, w, h };
        if (f.lane) fr.lane = f.lane;
        frames[f.id] = fr;
        upper.forEach((id, i) => place(id, f.id, `${f.id}#upper`, i, x + G.padX, y + top + i * ROW));
        stack.forEach((id, i) => place(id, f.id, `${f.id}#stack`, i, x + G.padX, y + top + upperH + i * ROW));
      },
    };
  }

  function vpcBlock(v: VpcModel): Block {
    const ingress = slotOf(`${v.id}#ingress`);
    const data = slotOf(`${v.id}#data`);
    const boundary = slotOf(`${v.id}#boundary`);
    const span = v.zones.length ? slotOf(`${v.id}#span`) : [];
    const compute = v.zones.length ? [] : slotOf(`${v.id}#compute`);
    const members = v.zones.map((z) => slotOf(`${z.id}#zone`));
    const zoneW = G.cardW + 2 * G.zonePad;
    const zonesW = v.zones.length ? v.zones.length * zoneW + (v.zones.length - 1) * G.zoneGap : G.cardW;
    const zoneRows = span.length + Math.max(0, ...members.map((m) => m.length));
    const contentRows = Math.max(1, ingress.length, data.length, v.zones.length ? zoneRows : compute.length);
    // ingress and data columns are always reserved, so a first load balancer or database moves nothing
    const xIngress = G.padX;
    const xZones = xIngress + G.cardW + G.gapX;
    const xData = xZones + zonesW + G.gapX;
    let w = xData + G.cardW + G.padX;
    if (boundary.length) w = Math.max(w, xZones + boundary.length * G.cardW + (boundary.length - 1) * G.boundaryGap + G.padX);
    const zoneH = G.zoneHead + rows(contentRows) + G.zonePad;
    const h = v.zones.length ? G.vpcHead + zoneH + G.padBottom : VPC_ROW0 + rows(contentRows) + G.padBottom;
    return {
      w,
      h,
      anchor: VPC_ROW0,
      draw(x, y, parent, depth) {
        const row = (i: number): number => y + VPC_ROW0 + i * ROW;
        frames[v.id] = { id: v.id, kind: 'vpc', label: v.label, parent, depth, implicit: v.implicit, empty: false, x, y, w, h };
        ingress.forEach((id, i) => place(id, v.id, `${v.id}#ingress`, i, x + xIngress, row(i)));
        data.forEach((id, i) => place(id, v.id, `${v.id}#data`, i, x + xData, row(i)));
        compute.forEach((id, i) => place(id, v.id, `${v.id}#compute`, i, x + xZones, row(i)));
        boundary.forEach((id, i) => place(id, v.id, `${v.id}#boundary`, i, x + xZones + i * (G.cardW + G.boundaryGap), y - G.cardH / 2, { boundary: true }));
        const zx = (k: number): number => x + xZones + k * (zoneW + G.zoneGap);
        v.zones.forEach((z, k) => {
          frames[z.id] = { id: z.id, kind: 'zone', label: z.label, parent: v.id, depth: depth + 1, implicit: false, empty: members[k].length === 0 && span.length === 0, zone: z.letter, x: zx(k), y: y + G.vpcHead, w: zoneW, h: zoneH };
        });
        span.forEach((id, i) => {
          const want = itemById.get(id)?.zones;
          let ks = v.zones.map((z, k) => (want && want.length && !want.includes(z.letter) ? -1 : k)).filter((k) => k >= 0);
          if (!ks.length) ks = v.zones.map((_, k) => k);
          const x0 = zx(Math.min(...ks));
          const x1 = zx(Math.max(...ks)) + zoneW;
          place(id, v.id, `${v.id}#span`, i, Math.round((x0 + x1) / 2 - G.cardW / 2), row(i), { span: { x0, x1 } });
        });
        members.forEach((list, k) => list.forEach((id, j) => place(id, v.zones[k].id, `${v.zones[k].id}#zone`, j, zx(k) + G.zonePad, row(span.length + j))));
        frames[v.id].empty = ingress.length + data.length + boundary.length + span.length + compute.length + members.reduce((s, m) => s + m.length, 0) === 0;
      },
    };
  }

  function regionBlock(r: RegionModel): Block {
    const vpcOrder = orderFrames(r.vpcs, prev?.order[r.id]);
    order[r.id] = vpcOrder;
    const vb = vpcOrder.map((id) => vpcBlock(vpcs.get(id)!));
    const vpcColW = vb.length ? Math.max(...vb.map((b) => b.w)) : 0;
    const vpcColH = vb.length ? vb.reduce((s, b) => s + b.h, 0) + (vb.length - 1) * G.vpcGap : 0;

    // Shelf. Columns have a kind: data lanes (storage, AI, analytics, integration, compute) or operations lanes
    // (ops, security, network). As soon as the region holds any shelf block it reserves one column of each kind, data
    // nearer the VPC, so the first operations service never widens the region (which would shift every root column
    // to its right). A lane block keeps its column. A new block joins the shortest column of its kind while that
    // stays under the soft budget, else opens another column of its kind (up to 3 in all), else joins the shortest
    // column of its kind anyway. Columns never close while the shelf has blocks (an emptied column stays reserved),
    // so removals never pull the region narrower; a fresh layout without `prev` drops unused reserves.
    const laneFrame = (lane: string): string => `${r.id}~${lane}`;
    const laneOfFrame = (fid: string): string => fid.slice(r.id.length + 1);
    const kindOf = (fid: string): ShelfKind => (OPS_LANES.has(laneOfFrame(fid)) ? 'ops' : 'data');
    const present = SHELF_LANES.filter((l) => r.lanes.has(l)).map(laneFrame);
    const blockH = (fid: string): number => G.laneHead + rows(slotOf(`${fid}#stack`).length);
    const colH = (c: string[]): number => c.reduce((s, fid, i) => s + blockH(fid) + (i ? G.laneGap : 0), 0);
    const prevCols = present.length ? (prev?.shelves[r.id] ?? []) : [];
    const prevKinds = prev?.shelfKinds?.[r.id] ?? [];
    const cols: string[][] = prevCols.map((c) => c.filter((fid) => present.includes(fid)));
    const kinds: ShelfKind[] = prevCols.map((c, k) => prevKinds[k] ?? (c.length ? kindOf(c[0]) : 'data'));
    if (present.length && prev) {
      if (!kinds.includes('data')) {
        cols.unshift([]);
        kinds.unshift('data');
      }
      if (!kinds.includes('ops')) {
        cols.push([]);
        kinds.push('ops');
      }
    }
    const placed = new Set(cols.flat());
    const soft = Math.max(vpcColH * 1.75, rows(5) + 2 * G.laneHead);
    for (const fid of present) {
      if (placed.has(fid)) continue;
      placed.add(fid);
      const kind = kindOf(fid);
      const same = cols.map((c, k) => ({ c, k })).filter(({ k }) => kinds[k] === kind);
      same.sort((a, b) => colH(a.c) - colH(b.c) || a.k - b.k);
      const best = same[0];
      if (best && (best.c.length === 0 || colH(best.c) + G.laneGap + blockH(fid) <= soft)) best.c.push(fid);
      else if (cols.length < MAX_SHELF_COLUMNS) {
        // a new column of this kind goes right after the last column of the same kind (data before operations)
        const lastSame = same.length ? Math.max(...same.map((s) => s.k)) : kind === 'data' ? -1 : cols.length - 1;
        cols.splice(lastSame + 1, 0, [fid]);
        kinds.splice(lastSame + 1, 0, kind);
      } else if (best) best.c.push(fid);
      else cols.reduce((a, c) => (colH(c) < colH(a) ? c : a), cols[0]).push(fid);
    }
    shelves[r.id] = cols.map((c) => c.slice());
    shelfKinds[r.id] = kinds.slice();
    const shelfW = cols.length ? cols.length * G.cardW + (cols.length - 1) * G.gapX : 0;
    const shelfH = cols.length ? Math.max(...cols.map(colH)) : 0;
    const innerW = vpcColW + (vpcColW && shelfW ? G.gapX : 0) + shelfW;
    const w = Math.max(G.cardW, innerW) + 2 * G.padX;
    const h = REGION_CONTENT_TOP + Math.max(vpcColH, shelfH, rows(1)) + G.padBottom;
    return {
      w,
      h,
      anchor: PATH_ROW,
      draw(x, y, parent, depth) {
        frames[r.id] = { id: r.id, kind: 'region', label: r.label, parent, depth, implicit: r.implicit, empty: vb.length === 0 && cols.length === 0, x, y, w, h };
        let vy = y + REGION_CONTENT_TOP;
        for (const b of vb) {
          b.draw(x + G.padX, vy, r.id, depth + 1);
          vy += b.h + G.vpcGap;
        }
        const sx = x + G.padX + vpcColW + (vpcColW ? G.gapX : 0);
        cols.forEach((col, k) => {
          const bx = sx + k * (G.cardW + G.gapX);
          let by = y + REGION_CONTENT_TOP;
          for (const fid of col) {
            const lane = laneOfFrame(fid);
            const ids = slotOf(`${fid}#stack`);
            const bh = blockH(fid);
            frames[fid] = { id: fid, kind: 'lane', label: SHELF_TITLES[lane] ?? lane, parent: r.id, depth: depth + 1, implicit: true, empty: ids.length === 0, lane, x: bx, y: by, w: G.cardW, h: bh };
            ids.forEach((id, i) => place(id, fid, `${fid}#stack`, i, bx, by + G.laneHead + i * ROW));
            by += bh + G.laneGap;
          }
        });
      },
    };
  }
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
 * The block a card's slot belongs to. Slots that share rows form one block: a VPC's multi-zone row and its per-zone
 * stacks share the zones block, so a new multi-zone card legitimately pushes per-zone cards down a row.
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
