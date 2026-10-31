// Layout direction "topdown" (top-down tiers): the request path runs from the top of the diagram to the bottom.
//
//   Top row       the clients, the first one centred on the request-path line x = 0 and more extending to the left;
//                 right of the line DNS, then the Account, SaaS, Recommended and Outside-services bands. Every frame
//                 in this row stands on one baseline and grows upward, so it never pushes anything.
//   Edge row      edge services in path order from the request-path line to the right (ESA, Anti-DDoS ...), then
//                 the ones off the data path.
//   Region(s)     stacked downward. Inside a region the VPC column is on the left, with its right edge fixed, and
//                 grows to the left; the shelf of managed services is on the right, at a fixed x, and grows to the
//                 right and down.
//     VPC         boundary cards (NAT, VPN, Cloud Firewall) straddle its top edge; then the ingress, compute and
//                 data tiers as rows. Zones are columns inside the compute tier, multi-zone cards centred across them.
//     Shelf       lanes (Storage, AI, Operations ...) as labelled rows, in up to three columns.
//   Solution map  Team, SaaS, Model service and Cloud resources as rows, top to bottom.
//
// Stability. The three layers (top row, edge row, regions) keep the y they were first given while `prev` is passed.
// A layer that appears later goes above or below the layers that exist, so tiers that arrive in request-path order
// (the model's usual order) move nothing; an edge row that arrives after both others joins the top row instead.
// Inside a layer every container grows only into free space: rows to the side, the top row upward, the bottom-most
// tier, lane and region downward, and it keeps its high-water size. When a growth step can go either way (widen or
// wrap) the layout takes the one with the larger fit zoom for opts.canvas, so the shape follows the canvas.
// Placement follows the catalog (scope, lane, pathRank) as in core layout.ts; the model's groups only say which region,
// VPC or zone. Pure and deterministic: no DOM, no Node APIs, no clocks.
import { solutionLane, zoneLetter } from '../../../../packages/core/src/layout.ts';
import type { FrameKind, LayoutBadge, LayoutCard, LayoutFrame, LayoutState, ShelfKind } from '../../../../packages/core/src/layout.ts';
import type { Catalog, CatalogEntry, Graph, GraphGroup, GraphNode } from '../../../../packages/core/src/types.ts';

export const TOPDOWN = {
  cardW: 204,
  cardH: 60, // room for a two-line title (2 x 19 px) and the subtitle (15 px)
  gapX: 40, // between card columns: a vertical routing channel
  rowGap: 22, // between wrapped rows of one tier, lane or frame
  tierGap: 36, // between the ingress, compute and data tiers: a horizontal routing channel
  pad: 22,
  padBottom: 22,
  head: 30, // label band of top-row, edge-row and solution frames
  regionHead: 38, // region label band; it also holds the upper half of boundary cards (cardH / 2 + 8)
  vpcHead: 44, // VPC label band, deep enough to clear the lower half of boundary cards
  zonePad: 10,
  zoneHead: 24,
  laneHead: 22,
  laneGap: 16,
  shelfGap: 40, // VPC frame border to the shelf's first column: keeps that channel's midline off the border
  layerGap: 36, // between the top row, the edge row and the first region
  regionGap: 44,
  vpcGap: 52, // between stacked VPCs (room for the next VPC's boundary cards)
  frameGapX: 32, // between frames side by side in the top row and the edge row
  kMax: 4, // most cards in one row of a VPC tier
  laneMax: 3, // most cards in one row of a shelf lane
  bandMax: 4, // most cards in one row of the outermost top-row frame
  shelfCols: 3,
  solutionCols: 4,
  badge: 22,
  badgeStep: 26,
  attachW: 104,
  attachH: 20,
} as const;

const G = TOPDOWN;
const CW = G.cardW;
const CH = G.cardH;
const COL = CW + G.gapX;
const ROW = CH + G.rowGap;
const rowsH = (n: number): number => (n <= 0 ? 0 : n * CH + (n - 1) * G.rowGap);
/** Inner right edge of a VPC's rightmost column. A two-card row straddles the request-path line x = 0. */
const R0 = G.gapX / 2 + CW;
/** Left x of VPC column k (0 is the rightmost column; columns are added to the left). */
const colX = (k: number): number => R0 - CW - k * COL;
/** Left x of the shelf's first column; fixed, so a VPC that appears or widens never moves the shelf. */
const SHELF_X = R0 + G.pad + G.shelfGap;
const EDGE_H = G.head + CH + G.padBottom;
const FIT_PAD = 24;
const MAX_ZOOM = 1.25;
const MAX_DECISIONS = 10;

const DATA_LANES: readonly string[] = ['database', 'cache', 'search', 'filestore', 'middleware', 'ai', 'analytics', 'storage', 'integration', 'ops', 'security', 'network', 'compute', 'ingress'];
const ZONE_LANES: readonly string[] = ['ingress', 'compute', ...DATA_LANES];
const SHELF_LANES: readonly string[] = ['compute', 'storage', 'ai', 'analytics', 'integration', 'ops', 'security', 'network'];
const SHELF_TITLES: Record<string, string> = { compute: 'Compute', storage: 'Storage', ai: 'AI', analytics: 'Analytics', integration: 'Integration', ops: 'Operations', security: 'Security', network: 'Network' };
const ROOT_LANES: readonly string[] = ['clients', 'onprem', 'thirdparty', 'dns', 'edge', 'network', 'governance', 'saas'];
const SOLUTION_LANES: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'team', label: 'Team' },
  { key: 'saas', label: 'SaaS' },
  { key: 'model', label: 'Model service' },
  { key: 'cloud', label: 'Cloud resources' },
];
const TIERS = ['ingress', 'compute', 'data'] as const;

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);

export function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
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

// ---------- sticky memo ----------

/** Sticky state this layout keeps on the LayoutState it returns, read back from `prev`. */
export interface TopdownMemo {
  /** y of each layer: the top row's baseline (its bottom), the edge row's top, the region stack's top. */
  layer: { top?: number; edge?: number; region?: number };
  /** The edge frames stand in the top row: they appeared when the top row and a region both existed. */
  edgeBeside: boolean;
  /** Cards per row, per slot (VPC tier, shelf lane, top-row frame). */
  cap: Record<string, number>;
  /** High-water rows, per slot. */
  rows: Record<string, number>;
  /** High-water widths: top-row and edge frames in px; 'k:<vpc>' VPC columns; 'scol:<region>:<c>' shelf column widths in cards. */
  w: Record<string, number>;
  /** Shelf column of each lane frame. */
  lane: Record<string, number>;
  /** High-water height of each region frame. */
  rh: Record<string, number>;
}

export type TopdownState = LayoutState & { topdown: TopdownMemo };

function memoOf(prev: LayoutState | undefined): TopdownMemo | undefined {
  const m = prev ? (prev as Partial<TopdownState>).topdown : undefined;
  return m && typeof m === 'object' && m.layer ? m : undefined;
}

// ---------- internal model ----------

type SortKey = [number, number, number];

interface Item {
  id: string;
  kind: 'node' | 'rec';
  product: string;
  key: SortKey;
  zones?: string[];
  fit?: 'primary' | 'complement';
}

interface RowFrame {
  id: string;
  kind: FrameKind;
  label: string;
  implicit: boolean;
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

/** Sticky order for one slot (as core): the previous order is kept; a new item goes after the last item that sorts before it. */
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

interface Built {
  frames: Record<string, LayoutFrame>;
  cards: Record<string, LayoutCard>;
  shelves: Record<string, string[][]>;
  shelfKinds: Record<string, ShelfKind[]>;
  order: Record<string, string[]>;
  memo: TopdownMemo;
  pathY: number;
  fit: number;
  aspect: number;
}

/**
 * Lays out a graph (normally the repairGraph() output). Pass the previous state as `prev` to keep sticky slots,
 * layer positions and container sizes; without it the result is the canonical arrangement for the canvas.
 */
export function layoutTopdown(graph: Graph, catalog: Catalog, prev: LayoutState | undefined, canvas: { w: number; h: number }): TopdownState {
  const memoPrev = memoOf(prev);
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

  // badges: nodes attached to an existing host that is not itself attached
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
  /** Edge row: request-path services by rank, then the services off the data path. */
  const edgeKey = (id: string, e: CatalogEntry | undefined): SortKey => [!e || typeof e.pathRank !== 'number' ? 1 : 0, e && typeof e.pathRank === 'number' ? e.pathRank : 999, arrival.get(id) ?? 0];
  const recKey = (fit: string, id: string): SortKey => [fit === 'primary' ? 0 : 1, 0, arrival.get(id) ?? 0];

  const topLeft = new Map<string, RowFrame>(); // client frames, centred on and extending left of the path line
  const topRight = new Map<string, RowFrame>(); // DNS and the bands, right of the path line
  const edges = new Map<string, RowFrame>();
  const regions = new Map<string, RegionModel>();
  const vpcs = new Map<string, VpcModel>();

  if (mode === 'solution') {
    for (const n of cardNodes) put(`~sol:${solutionLane(entry(n.product))}#row`, { id: n.id, kind: 'node', product: n.product, key: [0, 0, arrival.get(n.id) ?? 0] });
    for (const r of recs) {
      const id = 'rec:' + r.product;
      put(`~sol:${solutionLane(entry(r.product))}#row`, { id, kind: 'rec', product: r.product, fit: r.fit, key: recKey(r.fit, id) });
    }
  } else classify();

  const slots: Record<string, string[]> = {};
  const itemById = new Map<string, Item>();
  for (const [slot, items] of slotItems) {
    slots[slot] = orderSlot(items, prev?.slots[slot]);
    for (const it of items) itemById.set(it.id, it);
  }
  const slotOf = (key: string): string[] => slots[key] ?? [];

  // ----- growth decisions: settle each one greedily by fit zoom, then build for real -----
  const dec = new Map<string, boolean>();
  const pending: string[] = [];
  let best = build(dec, pending);
  for (let i = 0; i < pending.length && i < MAX_DECISIONS; i++) {
    const key = pending[i];
    const a = build(new Map(dec).set(key, true), pending);
    const b = build(new Map(dec).set(key, false), pending);
    dec.set(key, better(a, b));
  }
  if (pending.length) best = build(dec, null);
  const { frames, cards, shelves, shelfKinds, order, memo, pathY } = best;

  // ----- badges and attachments on their host cards -----
  const badges: Record<string, LayoutBadge> = {};
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

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of [...Object.values(frames), ...Object.values(cards), ...Object.values(badges)]) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  const width = Number.isFinite(x0) ? Math.round(x1 - x0) : 0;
  const height = Number.isFinite(y0) ? Math.round(y1 - y0) : 0;
  return { version: 1, mode, width, height, pathY, cards, frames, badges, slots, shelves, shelfKinds, order, topdown: memo };

  /** The better of two builds: the larger fit zoom; on a tie, the shape nearer the canvas's aspect ratio. */
  function better(wide: Built, wrap: Built): boolean {
    if (wide.fit > wrap.fit * 1.005) return true;
    if (wrap.fit > wide.fit * 1.005) return false;
    const target = canvas.w / canvas.h;
    return Math.abs(Math.log(wide.aspect / target)) < Math.abs(Math.log(wrap.aspect / target)) - 0.02;
  }

  // ---------- classification (the catalog decides; groups say which region, VPC or zone) ----------

  function classify(): void {
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
      if (g.kind === 'external' || g.kind === 'onprem') topLeft.set(g.id, { id: g.id, kind: g.kind, label: g.label, implicit: false });
      else if (g.kind === 'edge') edges.set(g.id, { id: g.id, kind: 'edge', label: g.label, implicit: false });
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
    const band = (id: string, kind: FrameKind, label: string): void => {
      if (!topRight.has(id)) topRight.set(id, { id, kind, label, implicit: true });
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
            band('~outside', 'outside', 'Outside services');
            put('~outside#row', { ...base, key: keyOf(n.id, e, ROOT_LANES) });
            break;
          }
          const own = chain.find((g) => g.kind === 'external' || g.kind === 'onprem');
          const fallback = (lane === 'onprem' ? firstOf(['onprem']) : undefined) ?? firstOf(['external', 'onprem']);
          const fid = own ? own.id : fallback ? fallback.id : '~external';
          if (fid === '~external' && !topLeft.has(fid)) topLeft.set(fid, { id: fid, kind: 'external', label: 'Clients', implicit: true });
          put(`${fid}#row`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        case 'global':
        case 'edge': {
          if (lane === 'dns') {
            // DNS answers the clients, so it stands beside them in the top row, off the request path
            band('~dns', 'edge', 'DNS');
            put('~dns#row', { ...base, key: edgeKey(n.id, e) });
            break;
          }
          const own = chain.find((g) => g.kind === 'edge') ?? firstOf(['edge']);
          const fid = own ? own.id : '~edge';
          if (fid === '~edge' && !edges.has(fid)) edges.set(fid, { id: fid, kind: 'edge', label: 'Edge', implicit: true });
          put(`${fid}#row`, { ...base, key: edgeKey(n.id, e) });
          break;
        }
        case 'account':
        case 'saas': {
          const fid = scope === 'account' ? '~account' : '~saas';
          band(fid, scope, scope === 'account' ? 'Account' : 'SaaS');
          put(`${fid}#row`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
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
      band('~recs', 'recs', 'Recommended');
      for (const r of recs) {
        const id = 'rec:' + r.product;
        put('~recs#row', { id, kind: 'rec', product: r.product, fit: r.fit, key: recKey(r.fit, id) });
      }
    }
  }

  // ---------- one build: places everything for a set of growth decisions ----------

  function build(dec: ReadonlyMap<string, boolean>, pending: string[] | null): Built {
    const frames: Record<string, LayoutFrame> = {};
    const cards: Record<string, LayoutCard> = {};
    const shelves: Record<string, string[][]> = {};
    const shelfKinds: Record<string, ShelfKind[]> = {};
    const order: Record<string, string[]> = {};
    const memo: TopdownMemo = { layer: { ...(memoPrev?.layer ?? {}) }, edgeBeside: memoPrev?.edgeBeside ?? false, cap: {}, rows: {}, w: {}, lane: {}, rh: {} };
    let pathY = 0;

    /** A growth step that can go either way: true widens, false wraps. Unsettled steps take `dflt`. */
    const ask = (key: string, dflt: boolean): boolean => {
      if (pending && !pending.includes(key)) pending.push(key);
      return dec.get(key) ?? dflt;
    };
    const place = (id: string, frame: string, slot: string, index: number, x: number, y: number, extra?: Partial<LayoutCard>): void => {
      const it = itemById.get(id);
      if (!it) return;
      const c: LayoutCard = { id, kind: it.kind, product: it.product, frame, slot, index, x, y, w: CW, h: CH, badges: [] };
      if (it.zones) c.zones = it.zones;
      if (it.fit) c.fit = it.fit;
      cards[id] = extra ? Object.assign(c, extra) : c;
    };
    const addFrame = (f: RowFrame, parent: string | null, depth: number, x: number, y: number, w: number, h: number, empty: boolean, lane?: string): void => {
      const fr: LayoutFrame = { id: f.id, kind: f.kind, label: f.label, parent, depth, implicit: f.implicit, empty, x, y, w, h };
      if (lane) fr.lane = lane;
      frames[f.id] = fr;
    };

    if (mode === 'solution') drawSolution();
    else {
      settleLayers();
      drawTopRow();
      drawEdgeRow();
      drawRegions();
    }

    let a = Infinity;
    let b = -Infinity;
    let c = Infinity;
    let d = -Infinity;
    for (const r of [...Object.values(frames), ...Object.values(cards)]) {
      a = Math.min(a, r.x);
      b = Math.max(b, r.x + r.w);
      c = Math.min(c, r.y);
      d = Math.max(d, r.y + r.h);
    }
    const bw = Number.isFinite(a) ? b - a : 1;
    const bh = Number.isFinite(c) ? d - c : 1;
    const fit = Math.min((canvas.w - 2 * FIT_PAD) / bw, (canvas.h - 2 * FIT_PAD) / bh, MAX_ZOOM);
    return { frames, cards, shelves, shelfKinds, order, memo, pathY, fit, aspect: bw / bh };

    // ----- layers -----

    /** Gives each layer that appears for the first time a y above or below the layers that exist. */
    function settleLayers(): void {
      const L = memo.layer;
      const hasTop = topLeft.size + topRight.size > 0;
      const hasEdge = edges.size > 0;
      if (hasTop && L.top === undefined) {
        if (L.edge !== undefined) L.top = L.edge - G.layerGap;
        else if (L.region !== undefined) L.top = L.region - G.layerGap;
        else L.top = 0;
      }
      if (hasEdge && L.edge === undefined && !memo.edgeBeside) {
        if (L.top !== undefined && L.region !== undefined) memo.edgeBeside = true; // no room between them: join the top row
        else if (L.top !== undefined) L.edge = L.top + G.layerGap;
        else if (L.region !== undefined) L.edge = L.region - G.layerGap - EDGE_H;
        else L.edge = 0;
      }
      if (regions.size && L.region === undefined) {
        if (L.edge !== undefined) L.region = L.edge + EDGE_H + G.layerGap;
        else if (L.top !== undefined) L.region = L.top + G.layerGap;
        else L.region = 0;
      }
    }

    /** Frame ids in sticky order, with frames that were removed while `prev` is passed kept as gaps of their width. */
    function rowOrder(key: string, ids: readonly string[]): string[] {
      const prevIds = prev?.order[key] ?? [];
      const ghosts = prevIds.filter((id) => !ids.includes(id) && (memoPrev?.w[id] ?? 0) > 0);
      const out = orderFrames([...ghosts, ...ids], prevIds);
      order[key] = out;
      return out;
    }

    /** Cards per row and rows of a top-row frame that grows upward; `outer` frames may also widen. */
    function topGrowth(slot: string, n: number, outer: boolean, maxCap: number): { cap: number; rows: number } {
      let cap = memoPrev?.cap[slot] ?? 1;
      const r = memoPrev?.rows[slot] ?? 0;
      if (outer && n > cap * Math.max(r, 1) && cap < maxCap && ask('cap:' + slot, false)) cap = Math.min(maxCap, Math.ceil(n / Math.max(r, 1)));
      const rows = Math.max(r, 1, Math.ceil(n / cap));
      memo.cap[slot] = cap;
      memo.rows[slot] = rows;
      return { cap, rows };
    }

    /**
     * The top row, on the baseline memo.layer.top. Client frames are right-aligned at the path line, the first one
     * centring its first card on it; DNS and the bands start right of it. Each frame fills rows from the bottom up,
     * so a new row never moves a card; only the outermost frame on each side may widen.
     */
    function drawTopRow(): void {
      const yB = memo.layer.top;
      const beside = memo.edgeBeside ? [...edges.keys()] : [];
      if (yB === undefined) return;
      const frameAt = (f: RowFrame, list: string[], left: number, cap: number, rows: number, w: number, rightAligned: boolean): void => {
        const h = G.head + rowsH(rows) + G.padBottom;
        addFrame(f, null, 0, left, yB - h, w, h, list.length === 0);
        list.forEach((id, i) => {
          const col = i % cap;
          const row = Math.floor(i / cap);
          const x = rightAligned ? left + w - G.pad - CW - col * COL : left + G.pad + col * COL;
          place(id, f.id, `${f.id}#row`, i, x, yB - G.padBottom - CH - row * ROW);
        });
      };
      // left: client frames, extending left of the path line
      const left = rowOrder('top:left', [...topLeft.keys()]);
      let right = CW / 2 + G.pad;
      left.forEach((fid, i) => {
        const f = topLeft.get(fid);
        if (!f) {
          memo.w[fid] = memoPrev!.w[fid];
          right -= memo.w[fid] + G.frameGapX;
          return;
        }
        const list = slotOf(`${fid}#row`);
        const g = topGrowth(`${fid}#row`, list.length, i === left.length - 1, G.bandMax);
        const w = Math.max(memoPrev?.w[fid] ?? 0, 2 * G.pad + CW + (g.cap - 1) * COL);
        memo.w[fid] = w;
        frameAt(f, list, right - w, g.cap, g.rows, w, true);
        right -= w + G.frameGapX;
      });
      // right: DNS and the bands, then edge frames that joined the top row
      const rightIds = rowOrder('top:right', [...topRight.keys(), ...beside]);
      let x = CW / 2 + G.pad + G.frameGapX;
      rightIds.forEach((fid, i) => {
        const f = topRight.get(fid) ?? edges.get(fid);
        if (!f) {
          memo.w[fid] = memoPrev!.w[fid];
          x += memo.w[fid] + G.frameGapX;
          return;
        }
        const list = slotOf(`${fid}#row`);
        const isEdge = edges.has(fid);
        const g = isEdge ? { cap: Math.max(1, list.length), rows: 1 } : topGrowth(`${fid}#row`, list.length, i === rightIds.length - 1, G.bandMax);
        const w = Math.max(memoPrev?.w[fid] ?? 0, 2 * G.pad + CW + (g.cap - 1) * COL);
        memo.w[fid] = w;
        frameAt(f, list, x, g.cap, g.rows, w, false);
        x += w + G.frameGapX;
      });
    }

    /** The edge row: the first frame centres its first service on the path line; services follow to the right. */
    function drawEdgeRow(): void {
      const y = memo.layer.edge;
      if (y === undefined || memo.edgeBeside) return;
      const ids = rowOrder('edge', [...edges.keys()]);
      let left = -CW / 2 - G.pad;
      for (const fid of ids) {
        const f = edges.get(fid);
        if (!f) {
          memo.w[fid] = memoPrev!.w[fid];
          left += memo.w[fid] + G.frameGapX;
          continue;
        }
        const list = slotOf(`${fid}#row`);
        const w = Math.max(memoPrev?.w[fid] ?? 0, 2 * G.pad + CW + Math.max(0, list.length - 1) * COL);
        memo.w[fid] = w;
        addFrame(f, null, 0, left, y, w, EDGE_H, list.length === 0);
        list.forEach((id, i) => place(id, fid, `${fid}#row`, i, left + G.pad + i * COL, y + G.head));
        left += w + G.frameGapX;
      }
    }

    // ----- regions -----

    function drawRegions(): void {
      const top0 = memo.layer.region;
      if (top0 === undefined || !regions.size) return;
      const ids = orderFrames([...regions.keys()], prev?.order['regions']);
      order['regions'] = ids;
      let top = top0;
      ids.forEach((id, i) => {
        top += drawRegion(regions.get(id)!, top, i === ids.length - 1) + G.regionGap;
      });
      pathY = top0 + G.regionHead + G.vpcHead;
    }

    /** Places one VPC with its top edge at `top`; returns its height. `freeBottom`: nothing sits below it. */
    function drawVpc(v: VpcModel, top: number, freeBottom: boolean, parent: string, depth: number): number {
      const boundary = slotOf(`${v.id}#boundary`);
      const Z = v.zones.length;
      const span = Z ? slotOf(`${v.id}#span`) : [];
      const members = v.zones.map((z) => slotOf(`${z.id}#zone`));
      const lists: Record<string, string[]> = { ingress: slotOf(`${v.id}#ingress`), compute: Z ? [] : slotOf(`${v.id}#compute`), data: slotOf(`${v.id}#data`) };
      const kPrev = memoPrev?.w['k:' + v.id] ?? 2;
      const rows = [0, 0, 0];
      const caps = [2, 2, 2];
      // bottom-up, so each tier knows whether anything sits below it
      for (let t = 2; t >= 0; t--) {
        const name = TIERS[t];
        const key = `${v.id}#${name}`;
        const rPrev = memoPrev?.rows[key] ?? 0;
        if (name === 'compute' && Z) {
          rows[t] = Math.max(rPrev, 1, span.length + Math.max(0, ...members.map((m) => m.length)));
          caps[t] = Z;
          continue;
        }
        const n = lists[name].length;
        let cap = memoPrev?.cap[key] ?? Math.max(2, kPrev);
        if (n > cap * Math.max(rPrev, 1) && cap < G.kMax) {
          // more cards than the tier's rows hold: widen (the VPC grows left, into free space) or wrap (one more row,
          // which is free only for the lowest tier of the lowest VPC)
          const free = freeBottom && rows.slice(t + 1).every((x) => x === 0);
          if (!free || ask('tier:' + key, false)) cap = Math.min(G.kMax, Math.ceil(n / Math.max(rPrev, 1)));
        }
        caps[t] = cap;
        rows[t] = Math.max(rPrev, n ? Math.ceil(n / cap) : 0);
      }
      // empty tiers above the first used one keep a row, so a load balancer or app tier that arrives later moves nothing
      const first = rows.findIndex((x) => x > 0);
      for (let t = 0; t < first; t++) rows[t] = Math.max(rows[t], 1);
      TIERS.forEach((name, t) => {
        memo.rows[`${v.id}#${name}`] = rows[t];
        memo.cap[`${v.id}#${name}`] = caps[t];
      });
      const used = TIERS.map((name, t) => (name === 'compute' && Z ? Z : Math.min(caps[t], lists[name].length)));
      const K = Math.max(2, kPrev, Z, boundary.length, ...used);
      memo.w['k:' + v.id] = K;

      const tierTop = [0, 0, 0];
      let y = G.vpcHead;
      for (let t = 0; t < 3; t++) {
        if (t === 1 && Z) y += G.zoneHead;
        tierTop[t] = y;
        if (rows[t] === 0) {
          if (t === 1 && Z) y -= G.zoneHead;
          continue;
        }
        y += rowsH(rows[t]) + (t === 1 && Z ? G.zonePad : 0) + G.tierGap;
      }
      const any = rows.some((x) => x > 0);
      const h = any ? y - G.tierGap + G.padBottom : G.vpcHead + CH + G.padBottom;
      const right = R0 + G.pad;
      const left = colX(K - 1) - G.pad;
      const total = boundary.length + span.length + members.reduce((s, m) => s + m.length, 0) + TIERS.reduce((s, name) => s + lists[name].length, 0);
      frames[v.id] = { id: v.id, kind: 'vpc', label: v.label, parent, depth, implicit: v.implicit, empty: total === 0, x: left, y: top, w: right - left, h };
      boundary.forEach((id, i) => place(id, v.id, `${v.id}#boundary`, i, colX(i), top - CH / 2, { boundary: true }));
      TIERS.forEach((name, t) => {
        const list = lists[name];
        const cap = caps[t];
        for (let r = 0; r * cap < list.length; r++) {
          const row = list.slice(r * cap, (r + 1) * cap);
          row.forEach((id, i) => {
            const x = row.length === 1 ? -CW / 2 : colX(row.length - 1 - i);
            place(id, v.id, `${v.id}#${name}`, r * cap + i, x, top + tierTop[t] + r * ROW);
          });
        }
      });
      if (Z) {
        const zt = top + tierTop[1];
        const zx = (k: number): number => colX(Z - 1 - k) - G.zonePad;
        const zw = CW + 2 * G.zonePad;
        const zh = G.zoneHead + rowsH(rows[1]) + G.zonePad;
        v.zones.forEach((z, k) => {
          frames[z.id] = { id: z.id, kind: 'zone', label: z.label, parent: v.id, depth: depth + 1, implicit: false, empty: members[k].length === 0 && span.length === 0, zone: z.letter, x: zx(k), y: zt - G.zoneHead, w: zw, h: zh };
        });
        span.forEach((id, i) => {
          const want = itemById.get(id)?.zones;
          let ks = v.zones.map((z, k) => (want && want.length && !want.includes(z.letter) ? -1 : k)).filter((k) => k >= 0);
          if (!ks.length) ks = v.zones.map((_, k) => k);
          const xa = Math.min(...ks.map(zx));
          const xb = Math.max(...ks.map(zx)) + zw;
          place(id, v.id, `${v.id}#span`, i, Math.round((xa + xb) / 2 - CW / 2), zt + i * ROW, { span: { x0: xa, x1: xb } });
        });
        members.forEach((list, k) => list.forEach((id, j) => place(id, v.zones[k].id, `${v.zones[k].id}#zone`, j, colX(Z - 1 - k), zt + (span.length + j) * ROW)));
      }
      return h;
    }

    /**
     * One region with its top edge at `top`; returns its height. The VPCs stack downward on the left; the shelf
     * lanes fill up to three columns on the right. A lane keeps its column; a new lane joins the shortest column or
     * opens a new one, whichever fits the canvas better. In a region with another region below it, the region keeps
     * its height: lanes and tiers widen instead of wrapping.
     */
    function drawRegion(r: RegionModel, top: number, last: boolean): number {
      const contentTop = top + G.regionHead;
      const prevH = memoPrev?.rh[r.id];
      const room = last || prevH === undefined ? Infinity : prevH - G.regionHead - G.padBottom;

      // VPC column
      const vOrder = orderFrames(r.vpcs, prev?.order['vpcs:' + r.id]);
      order['vpcs:' + r.id] = vOrder;
      let vy = contentTop;
      let vpcLeft = Infinity;
      vOrder.forEach((id, i) => {
        const h = drawVpc(vpcs.get(id)!, vy, last && i === vOrder.length - 1, r.id, 1);
        vpcLeft = Math.min(vpcLeft, frames[id].x);
        vy += h + G.vpcGap;
      });
      const vpcH = vOrder.length ? vy - G.vpcGap - contentTop : 0;

      // shelf
      const laneFrame = (lane: string): string => `${r.id}~${lane}`;
      const present = SHELF_LANES.filter((l) => r.lanes.has(l)).map(laneFrame);
      const prevLanes = prev?.order['lanes:' + r.id] ?? [];
      const laneOrder = orderFrames([...prevLanes.filter((fid) => !present.includes(fid) && (memoPrev?.rows[fid] ?? 0) > 0), ...present], prevLanes);
      order['lanes:' + r.id] = laneOrder;
      const count = (fid: string): number => slotOf(`${fid}#stack`).length;
      const roomS = room - (G.vpcHead - G.laneHead); // the shelf starts that far below the content top
      const cols: string[][] = [];
      const widths: number[] = [];
      const fresh: string[] = [];
      for (const fid of laneOrder) {
        const c = memoPrev?.lane[fid];
        if (c === undefined) fresh.push(fid);
        else (cols[c] ??= []).push(fid);
      }
      for (let c = 0; c < cols.length; c++) {
        cols[c] ??= [];
        widths[c] = Math.max(1, memoPrev?.w[`scol:${r.id}:${c}`] ?? 1);
      }
      const gapRows = new Map<string, number>();
      const rPrevOf = (fid: string): number => gapRows.get(fid) ?? memoPrev?.rows[fid] ?? 0;
      const hOf = (n: number): number => (n ? G.laneHead + rowsH(n) : 0);
      const stackH = (hs: number[]): number => {
        const xs = hs.filter((h) => h > 0);
        return xs.length ? xs.reduce((s, h) => s + h, 0) + (xs.length - 1) * G.laneGap : 0;
      };
      // A lane that must grow but can neither widen in place nor wrap at the bottom of its column moves to the
      // bottom of the last column; its old place stays empty while `prev` is passed, so no other lane moves.
      cols.forEach((col, c) => {
        for (let j = 0; j < col.length; j++) {
          const fid = col[j];
          const n = count(fid);
          const r0 = Math.max(rPrevOf(fid), 1);
          const cap = memoPrev?.cap[fid] ?? widths[c];
          if (n <= cap * r0) continue;
          const want = Math.min(G.laneMax, Math.ceil(n / r0));
          if (want > cap && (want <= widths[c] || c === cols.length - 1)) continue; // widens in place
          if (col.slice(j + 1).every((x) => !count(x) && !rPrevOf(x))) continue; // wraps at the bottom
          const target = cols[cols.length - 1];
          if (roomS !== Infinity && stackH([...target.map((x) => hOf(rPrevOf(x))), hOf(Math.ceil(n / cap))]) > roomS && cols.length >= G.shelfCols) continue; // else the fresh-lane step below opens a new column
          let k = 1;
          while (laneOrder.includes(`${fid}~gap${k}`)) k++;
          const gap = `${fid}~gap${k}`;
          gapRows.set(gap, rPrevOf(fid));
          col[j] = gap;
          laneOrder.splice(laneOrder.indexOf(fid), 1, gap);
          laneOrder.push(fid);
          fresh.unshift(fid);
        }
      });
      const capOf = new Map<string, number>();
      const rowsOf = new Map<string, number>();
      const laneH = (fid: string): number => hOf(rowsOf.get(fid) ?? 0);
      /** Cards per row and rows of one lane in column c; `bottom`: no lane below it in that column. */
      const grow = (fid: string, c: number, bottom: boolean): void => {
        const n = count(fid);
        const rPrev = rPrevOf(fid);
        let cap = memoPrev?.cap[fid] ?? widths[c];
        if (n > cap * Math.max(rPrev, 1) && cap < G.laneMax) {
          const want = Math.min(G.laneMax, Math.ceil(n / Math.max(rPrev, 1)));
          const widenFree = want <= widths[c] || c === cols.length - 1;
          const others = cols[c].filter((x) => x !== fid).map(laneH);
          const wrapFree = bottom && (roomS === Infinity || stackH([...others, hOf(Math.ceil(n / cap))]) <= roomS);
          const widen = widenFree && (!wrapFree || ask('lane:' + fid, false));
          if (widen) {
            cap = want;
            widths[c] = Math.max(widths[c], want);
          }
        }
        capOf.set(fid, cap);
        rowsOf.set(fid, Math.max(rPrev, n ? Math.ceil(n / cap) : 0));
      };
      cols.forEach((col, c) => col.forEach((fid, j) => grow(fid, c, col.slice(j + 1).every((x) => count(x) === 0 && !rPrevOf(x)))));
      for (const fid of fresh) {
        if (!count(fid)) continue;
        // A new lane joins the bottom of the last column. Only a region with another region below it opens another
        // column, when the lane would make it taller: a lane in a column with another column to its right could
        // then grow only by moving.
        let c = 0;
        if (cols.length) {
          c = cols.length - 1;
          if (roomS !== Infinity && stackH([...cols[c].map(laneH), hOf(1)]) > roomS && cols.length < G.shelfCols) c = cols.length;
        }
        if (c === cols.length) {
          cols.push([]);
          widths.push(1);
        }
        cols[c].push(fid);
        grow(fid, c, true);
      }
      const shelfTop = contentTop + G.vpcHead - G.laneHead; // a lane's first row lines up with the VPC's first tier
      let sx = SHELF_X;
      let shelfRight = -Infinity;
      let shelfH = 0;
      cols.forEach((col, c) => {
        widths[c] = Math.max(widths[c], ...col.map((fid) => Math.min(capOf.get(fid) ?? 1, count(fid))));
        memo.w[`scol:${r.id}:${c}`] = widths[c];
        let ly = shelfTop;
        for (const fid of col) {
          memo.lane[fid] = c;
          memo.rows[fid] = rowsOf.get(fid) ?? 0;
          memo.cap[fid] = capOf.get(fid) ?? 1;
          const lh = laneH(fid);
          if (!lh) continue;
          const ids = slotOf(`${fid}#stack`);
          const cap = capOf.get(fid) ?? 1;
          if (ids.length) {
            const lane = fid.slice(r.id.length + 1);
            const fw = Math.min(cap, ids.length) * COL - G.gapX;
            frames[fid] = { id: fid, kind: 'lane', label: SHELF_TITLES[lane] ?? lane, parent: r.id, depth: 1, implicit: true, empty: false, lane, x: sx, y: ly, w: fw, h: lh };
            ids.forEach((id, i) => place(id, fid, `${fid}#stack`, i, sx + (i % cap) * COL, ly + G.laneHead + Math.floor(i / cap) * ROW));
          }
          ly += lh + G.laneGap;
        }
        if (col.some((fid) => laneH(fid) > 0)) {
          shelfRight = Math.max(shelfRight, sx + widths[c] * COL - G.gapX);
          shelfH = Math.max(shelfH, ly - G.laneGap - contentTop);
        }
        sx += widths[c] * COL;
      });
      shelves[r.id] = cols.map((col) => col.filter((fid) => present.includes(fid)));
      shelfKinds[r.id] = cols.map(() => 'data' as ShelfKind);

      const leftEdge = vOrder.length ? vpcLeft : shelfRight > -Infinity ? SHELF_X : -CW / 2 - G.pad;
      const rightEdge = shelfRight > -Infinity ? shelfRight : vOrder.length ? R0 + G.pad : CW / 2 + G.pad;
      const h = Math.max(prevH ?? 0, G.regionHead + Math.max(vpcH, shelfH, CH) + G.padBottom);
      memo.rh[r.id] = h;
      frames[r.id] = { id: r.id, kind: 'region', label: r.label, parent: null, depth: 0, implicit: r.implicit, empty: vOrder.length === 0 && shelfRight === -Infinity, x: leftEdge - G.pad, y: top, w: rightEdge - leftEdge + 2 * G.pad, h };
      return h;
    }

    // ----- solution map -----

    /** Team, SaaS, Model service and Cloud resources as rows, each centred on the path line, top to bottom. */
    function drawSolution(): void {
      const lists = SOLUTION_LANES.map((l) => slotOf(`~sol:${l.key}#row`));
      const cols = Math.max(2, Math.min(G.solutionCols, Math.max(0, ...lists.map((l) => l.length))));
      const w = Math.max(memoPrev?.w['~sol'] ?? 0, (cols - 1) * COL + CW + 2 * G.pad);
      memo.w['~sol'] = w;
      let y = 0;
      order['row:solution'] = SOLUTION_LANES.map((l) => '~sol:' + l.key);
      SOLUTION_LANES.forEach((l, k) => {
        const fid = '~sol:' + l.key;
        const list = lists[k];
        const rows = Math.max(memoPrev?.rows[fid] ?? 0, 1, Math.ceil(list.length / G.solutionCols));
        memo.rows[fid] = rows;
        const h = G.head + rowsH(rows) + G.padBottom;
        addFrame({ id: fid, kind: 'solution', label: l.label, implicit: true }, null, 0, -w / 2, y, w, h, list.length === 0, l.key);
        for (let r = 0; r * G.solutionCols < list.length; r++) {
          const row = list.slice(r * G.solutionCols, (r + 1) * G.solutionCols);
          const x0 = -(row.length * COL - G.gapX) / 2;
          row.forEach((id, i) => place(id, fid, `${fid}#row`, r * G.solutionCols + i, x0 + i * COL, y + G.head + r * ROW));
        }
        y += h + G.layerGap;
      });
    }
  }
}
