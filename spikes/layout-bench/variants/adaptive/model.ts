// Classification for the adaptive layout: which slot (lane block) each card goes to, and the frame model (regions, VPCs,
// zones, simple frames). Adapted from placeArchitecture/placeSolution in packages/core/src/layout.ts; the differences are
// marked. Placement follows the catalog (scope, lane, pathRank); the model's groups only say which region, VPC or zone.
import { solutionLane, zoneLetter } from '../../../../packages/core/src/layout.ts';
import type { FrameKind } from '../../../../packages/core/src/layout.ts';
import type { Catalog, CatalogEntry, Graph, GraphGroup, GraphNode } from '../../../../packages/core/src/types.ts';

export type SortKey = [number, number, number]; // lane index, path rank, arrival

export interface Item {
  id: string;
  kind: 'node' | 'rec';
  product: string;
  key: SortKey;
  zones?: string[];
  fit?: 'primary' | 'complement';
}

/** Where a simple frame sits: the clients area, the edge column, the DNS block, the side bands, outside services. */
export type Area = 'external' | 'edge' | 'dns' | 'side' | 'outside' | 'solution';

export interface SimpleFrame {
  id: string;
  kind: FrameKind;
  label: string;
  implicit: boolean;
  area: Area;
  lane?: string;
}

export interface ZoneModel {
  id: string;
  label: string;
  letter: string;
}

export interface VpcModel {
  id: string;
  label: string;
  implicit: boolean;
  zones: ZoneModel[];
}

export interface RegionModel {
  id: string;
  label: string;
  implicit: boolean;
  vpcs: string[];
  lanes: string[]; // shelf lanes with at least one card, in SHELF_LANES order
}

export interface Model {
  mode: 'architecture' | 'solution';
  items: Map<string, Item[]>; // slot -> items
  simple: Map<string, SimpleFrame>;
  regions: Map<string, RegionModel>;
  vpcs: Map<string, VpcModel>;
  badgeOf: Map<string, GraphNode>;
  entry: (product: string) => CatalogEntry | undefined;
}

/** Data lanes inside a VPC, top to bottom; lanes of VPC-attached regional services follow. */
export const DATA_LANES: readonly string[] = ['cache', 'database', 'search', 'filestore', 'middleware', 'ai', 'analytics', 'storage', 'integration', 'ops', 'security', 'network', 'compute', 'ingress'];
const ZONE_LANES: readonly string[] = ['ingress', 'compute', ...DATA_LANES];
const FRONT_LANES: readonly string[] = ['ingress', 'compute'];
/** Shelf lane blocks in canonical order. */
export const SHELF_LANES: readonly string[] = ['compute', 'storage', 'ai', 'analytics', 'integration', 'ops', 'security', 'network'];
export const SHELF_TITLES: Record<string, string> = {
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
export const SOLUTION_LANES: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'team', label: 'Team' },
  { key: 'saas', label: 'SaaS' },
  { key: 'model', label: 'Model service' },
  { key: 'cloud', label: 'Cloud resources' },
];

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

/**
 * Builds the slot model. `dnsApart`: DNS and other resolvers get their own frame ('~dns') instead of the edge frame's
 * upper band (the stacked left column puts them above the clients; see layout.ts). `front`: in a VPC without zones,
 * load balancers and compute share one lane column ('<vpc>#front', ordered by lane, then path rank), as the narrow wrap
 * draws them.
 */
export function buildModel(graph: Graph, catalog: Catalog, dnsApart: boolean, front = false): Model {
  const nodes = Object.values(graph.nodes ?? {});
  const recs = graph.recs ?? [];
  const arrival = new Map<string, number>();
  nodes.forEach((n, i) => arrival.set(n.id, i));
  recs.forEach((r, i) => arrival.set('rec:' + r.product, nodes.length + i));
  const cache = new Map<string, CatalogEntry | undefined>();
  const entry = (product: string): CatalogEntry | undefined => {
    if (!cache.has(product)) cache.set(product, entryOf(catalog, product));
    return cache.get(product);
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
  const mode: Model['mode'] = recs.length > 0 && infra.length === 0 ? 'solution' : 'architecture';

  const items = new Map<string, Item[]>();
  const put = (slot: string, it: Item): void => {
    const l = items.get(slot);
    if (l) l.push(it);
    else items.set(slot, [it]);
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
  const model: Model = { mode, items, simple, regions, vpcs, badgeOf, entry };

  if (mode === 'solution') {
    for (const l of SOLUTION_LANES) addSimple({ id: '~sol:' + l.key, kind: 'solution', label: l.label, implicit: true, area: 'solution', lane: l.key });
    for (const n of cardNodes) put(`~sol:${solutionLane(entry(n.product))}#stack`, { id: n.id, kind: 'node', product: n.product, key: [0, 0, arrival.get(n.id) ?? 0] });
    for (const r of recs) {
      const id = 'rec:' + r.product;
      put(`~sol:${solutionLane(entry(r.product))}#stack`, { id, kind: 'rec', product: r.product, fit: r.fit, key: recKey(r.fit, id) });
    }
    return model;
  }

  const groups = Object.values(graph.groups ?? {});
  const zoneVpc = new Map<string, string>();
  const firstOf = (kinds: string[]): GraphGroup | undefined => groups.find((g) => kinds.includes(g.kind));
  const laneSets = new Map<string, Set<string>>();
  const ensureRegion = (id: string, label: string, implicit: boolean): RegionModel => {
    let r = regions.get(id);
    if (!r) {
      r = { id, label, implicit, vpcs: [], lanes: [] };
      regions.set(id, r);
      laneSets.set(id, new Set());
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
    if (g.kind === 'external' || g.kind === 'onprem') addSimple({ id: g.id, kind: g.kind, label: g.label, implicit: false, area: 'external' });
    else if (g.kind === 'edge') addSimple({ id: g.id, kind: 'edge', label: g.label, implicit: false, area: 'edge' });
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
    else if (front && !v.zones.length && (lane === 'ingress' || lane === 'compute')) put(`${v.id}#front`, { ...base, key: keyOf(n.id, e, FRONT_LANES) });
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
          addSimple({ id: '~outside', kind: 'outside', label: 'Outside services', implicit: true, area: 'outside' });
          put('~outside#stack', { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        const own = chain.find((g) => g.kind === 'external' || g.kind === 'onprem');
        const fallback = (lane === 'onprem' ? firstOf(['onprem']) : undefined) ?? firstOf(['external', 'onprem']);
        const fid = own ? own.id : fallback ? fallback.id : '~external';
        if (fid === '~external') addSimple({ id: fid, kind: 'external', label: 'Clients', implicit: true, area: 'external' });
        put(`${fid}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
        break;
      }
      case 'global':
      case 'edge': {
        // difference from core: with dnsApart, resolvers get their own frame above the clients
        if (lane === 'dns' && dnsApart) {
          addSimple({ id: '~dns', kind: 'edge', label: 'DNS', implicit: true, area: 'dns' });
          put('~dns#stack', { ...base, key: keyOf(n.id, e, ROOT_LANES) });
          break;
        }
        const own = chain.find((g) => g.kind === 'edge') ?? firstOf(['edge']);
        const fid = own ? own.id : '~edge';
        if (fid === '~edge') addSimple({ id: fid, kind: 'edge', label: 'Edge', implicit: true, area: 'edge' });
        put(lane === 'dns' ? `${fid}#upper` : `${fid}#stack`, { ...base, key: keyOf(n.id, e, ROOT_LANES) });
        break;
      }
      case 'account':
      case 'saas': {
        const fid = scope === 'account' ? '~account' : '~saas';
        addSimple({ id: fid, kind: scope, label: scope === 'account' ? 'Account' : 'SaaS', implicit: true, area: 'side' });
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
        const region = regionFor(chain);
        const inVpc = chain.some((g) => g.kind === 'vpc' || g.kind === 'zone' || g.kind === 'subnet');
        if (inVpc && e && e.vpcAttachable) {
          inVpcSlots(n, e, chain, vpcFor(chain, region), base);
          break;
        }
        const shelfLane = SHELF_LANES.includes(lane) ? lane : 'ops';
        laneSets.get(region.id)!.add(shelfLane);
        put(`${region.id}~${shelfLane}#stack`, { ...base, key: keyOf(n.id, e, [shelfLane]) });
      }
    }
  }
  for (const r of regions.values()) r.lanes = SHELF_LANES.filter((l) => laneSets.get(r.id)!.has(l));
  if (recs.length) {
    addSimple({ id: '~recs', kind: 'recs', label: 'Recommended', implicit: true, area: 'side' });
    for (const r of recs) {
      const id = 'rec:' + r.product;
      put('~recs#stack', { id, kind: 'rec', product: r.product, fit: r.fit, key: recKey(r.fit, id) });
    }
  }
  return model;
}

function cmpKey(a: SortKey, b: SortKey): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** Sticky order for one slot (core orderSlot): the previous order is kept; a new item goes after the last item that sorts before it. */
export function orderSlot(items: Item[], prevOrder: readonly string[] | undefined): string[] {
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
