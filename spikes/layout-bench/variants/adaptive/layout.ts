// Aspect-adaptive lane grid. Pure and deterministic: no DOM, no Node APIs, no clocks.
//
// The lane-grid model of packages/core/src/layout.ts, folded to fit the canvas beside the chat console. Coordinates
// are absolute and anchored, never normalised: the request-path row is y = 0 and the left column starts at x = 0, so a
// block that grows upward or a column that appears later moves nothing else.
//
//   wrap 'narrow' (canvas aspect < 1.35, the 880x720 and 1040x800 panes): two VPC card columns (load balancers and compute
//       share the first), as the 'stacked' wrap below otherwise.
//   wrap 'stacked' (aspect 1.35 to 1.8, the 1520x940 pane): three VPC card columns, a left column of frames.
//       left column, top to bottom: DNS (grows up) | Clients (grows up) | Edge (first card on the path row, grows
//                                   down) | side bands: Account, SaaS, Recommended, Outside services (grow down)
//       first region:               shelf of managed services in lane blocks over the VPC's three columns (each lane
//                                   block grows up) | boundary cards (NAT, VPN, Cloud Firewall) straddling the VPC's
//                                   top edge over the compute column | VPC: ingress | compute (zones inside the
//                                   column) | data, each growing down
//       further regions:            below everything, full width: their shelf is a column on the left (under the left
//                                   column), their VPC under the first region's VPC; both grow down
//   wrap 'wide' (aspect >= 1.8, 1920x1000 and wider): Clients and side bands | Edge (DNS band above) | regions as above.
//   Solution map (recs only):     Team | SaaS | Model service | Cloud resources.
//
// The wrap is chosen once, from the canvas aspect at the session's first layout, and read back from `prev` after that,
// so neither a new card nor a resize reshuffles the diagram.
//
// Stability: every block either sits on a frontier (nothing beyond it in its growth direction) or is a unit of a
// reserved stack (stack.ts): when a unit is appended after it, it gets spare rows (one for most blocks, two in compact
// blocks, VPCs and regions, three for the Account band), its reservation never shrinks, and removed units keep their space. Further regions keep a sticky top that never moves up.
//
// Compact cards (36 px: icon and a one-line title, details in the hover popover): when the fitted title would render
// below TITLE_FLOOR px and compact cards would raise it, the session enters compact mode. A fresh layout (no `prev`)
// compacts every block at once; with `prev`, a block turns compact only in a batch that already changes it (a card
// enters, leaves or changes block), so the switch never moves a card of an untouched block. Compact is sticky.
import { blockOf } from '../../../../packages/core/src/layout.ts';
import type { LayoutBadge, LayoutCard, LayoutFrame, LayoutState, ShelfKind } from '../../../../packages/core/src/layout.ts';
import type { Catalog, Graph } from '../../../../packages/core/src/types.ts';
import { buildModel, orderSlot, SHELF_LANES, SHELF_TITLES, SOLUTION_LANES } from './model.ts';
import type { Item, Model, RegionModel, SimpleFrame, VpcModel } from './model.ts';
import { stackUnits } from './stack.ts';
import type { StackItem, StackMemory } from './stack.ts';

export type Wrap = 'narrow' | 'stacked' | 'wide';

export interface AdaptiveMemory {
  wrap: Wrap;
  /** Compact mode is on (sticky). Which blocks are compact is kept in `res` as 'cpt|<block>' keys. */
  compact: boolean;
  /** Reserved extents per stack unit (stack.ts), sticky region tops, and sticky flags. */
  res: Record<string, number>;
}

export interface AdaptiveState extends LayoutState {
  adaptive: AdaptiveMemory;
}

export interface Canvas {
  w: number;
  h: number;
}

/** Fixed geometry, px at zoom 1. */
export const AG = {
  cardW: 188,
  cardH: 48,
  compactH: 36,
  gapX: 28, // between columns inside a frame: a vertical routing channel
  gapY: 24, // between stacked cards: a horizontal routing channel
  compactGapY: 16,
  rootGap: 32, // between the left column(s) and the regions
  padX: 16, // card to frame border: a route that hugs a card (8 px clearance) stays 8 px off the border
  regionPad: 26, // VPC border to region border
  vpcPad: 26, // card to VPC border: wider, because most routes enter a VPC through this channel and run beside the border
  padTop: 4,
  padBottom: 12,
  head: 30, // frame label band
  vpcHead: 40, // VPC label band, deep enough to clear the lower half of boundary cards
  zoneLift: 20, // extra VPC head once the VPC has zone frames (their label band starts below the boundary cards)
  boundaryRise: 34, // room above a VPC for the upper half of its boundary cards (cardH / 2 + 8)
  secondaryTop: 38, // a further region's top border to its first VPC's top border
  shelfGap: 12,
  laneHead: 20,
  laneGap: 14,
  frameGap: 16,
  vpcGap: 46, // between stacked VPCs (room for the next VPC's boundary row)
  regionGap: 24,
  zonePad: 10,
  zoneHead: 26,
  zoneGap: 8,
  solGap: 16,
  badge: 22,
  badgeStep: 26,
  attachW: 104,
  attachH: 20,
} as const;

/** Rendered title size below which the layout tries compact cards, and the fit rule it assumes (the bench's). */
export const TITLE_FLOOR = 12;
const TITLE_PX = 12.5;
const FIT_PAD = 24;
const MAX_ZOOM = 1.25;
/** Canvas aspect below which load balancers and compute share a VPC column (three card columns in all). */
export const NARROW_ASPECT = 1.35;
/** Canvas aspect at or above which the clients get their own column. */
export const WIDE_ASPECT = 1.8;
/** Shelf column each lane prefers: over the VPC column it serves most (0 ingress, 1 compute, 2 data; narrow: 0 front, 1 data). */
const SHELF_PREF: Record<string, number> = { storage: 0, compute: 1, ops: 1, security: 1, network: 1, ai: 2, analytics: 2, integration: 2 };
const SHELF_PREF_NARROW: Record<string, number> = { storage: 0, compute: 0, ops: 0, security: 0, network: 0, ai: 1, analytics: 1, integration: 1 };
const FULL_PITCH = AG.cardH + AG.gapY;

export function chooseWrap(c: Canvas): Wrap {
  const a = c.h > 0 ? c.w / c.h : 1;
  return a >= WIDE_ASPECT ? 'wide' : a >= NARROW_ASPECT ? 'stacked' : 'narrow';
}

const has = (r: object, k: string): boolean => Object.prototype.hasOwnProperty.call(r, k);

export function layoutAdaptive(graph: Graph, catalog: Catalog, prev: LayoutState | undefined, canvas: Canvas): AdaptiveState {
  const pm = prev && has(prev, 'adaptive') ? (prev as AdaptiveState).adaptive : undefined;
  const wrap = pm?.wrap ?? chooseWrap(canvas);
  const m = buildModel(graph, catalog, wrap !== 'wide', wrap === 'narrow');
  const keyOf = blockKeyFn(m);
  const all = new Set([...m.items.keys()].map(keyOf));
  if (!prev || !pm) {
    const full = compose(m, undefined, undefined, wrap, new Set(), false);
    if (titleAt(full, canvas) >= TITLE_FLOOR) return full;
    const c = compose(m, undefined, undefined, wrap, all, true);
    return titleAt(c, canvas) > titleAt(full, canvas) + 0.25 ? c : full;
  }
  const mem: StackMemory = { order: prev.order, res: pm.res };
  const had = new Set(Object.keys(pm.res).filter((k) => k.startsWith('cpt|')).map((k) => k.slice(4)));
  if (pm.compact) return compose(m, prev, mem, wrap, union(had, touchedBlocks(m, prev, keyOf)), true);
  const out = compose(m, prev, mem, wrap, had, false);
  if (titleAt(out, canvas) >= TITLE_FLOOR) return out;
  // would compact cards help at all? (a fresh all-compact layout bounds the gain)
  if (titleAt(compose(m, undefined, undefined, wrap, all, true), canvas) <= titleAt(out, canvas) + 0.25) return out;
  return compose(m, prev, mem, wrap, touchedBlocks(m, prev, keyOf), true);
}

const union = <T>(a: Set<T>, b: Set<T>): Set<T> => new Set([...a, ...b]);

/** Block key of a slot, the same grouping as core blockOf: zone stacks and multi-zone cards share their VPC's zones block. */
function blockKeyFn(m: Model): (slot: string) => string {
  const zoneVpc = new Map<string, string>();
  for (const v of m.vpcs.values()) for (const z of v.zones) zoneVpc.set(z.id, v.id);
  return (slot) => {
    if (slot.endsWith('#span')) return slot.slice(0, -'#span'.length) + '#zones';
    if (slot.endsWith('#zone')) {
      const z = slot.slice(0, -'#zone'.length);
      return (zoneVpc.get(z) ?? z) + '#zones';
    }
    return slot;
  };
}

/** Blocks whose card set differs from the previous layout's: a card entered, left, or changed block. */
function touchedBlocks(m: Model, prev: LayoutState, keyOf: (slot: string) => string): Set<string> {
  const before = new Map<string, Set<string>>();
  for (const id of Object.keys(prev.cards)) {
    const b = blockOf(prev, id);
    const s = before.get(b);
    if (s) s.add(id);
    else before.set(b, new Set([id]));
  }
  const after = new Map<string, Set<string>>();
  for (const [slot, items] of m.items) {
    const b = keyOf(slot);
    const s = after.get(b) ?? new Set<string>();
    for (const it of items) s.add(it.id);
    after.set(b, s);
  }
  const out = new Set<string>();
  for (const b of new Set([...before.keys(), ...after.keys()])) {
    const x = before.get(b);
    const y = after.get(b);
    if (!x || !y || x.size !== y.size || [...x].some((id) => !y.has(id))) out.add(b);
  }
  return out;
}

/** Rendered title px when the state is fitted into the canvas (24 px padding, zoom capped at 1.25). */
export function titleAt(l: LayoutState, canvas: Canvas): number {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of [...Object.values(l.frames), ...Object.values(l.cards), ...Object.values(l.badges)]) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  if (!Number.isFinite(x0)) return TITLE_PX * MAX_ZOOM;
  const z = Math.min((canvas.w - 2 * FIT_PAD) / (x1 - x0), (canvas.h - 2 * FIT_PAD) / (y1 - y0), MAX_ZOOM);
  return TITLE_PX * z;
}

function compose(m: Model, prev: LayoutState | undefined, mem: StackMemory | undefined, wrap: Wrap, compactBlocks: ReadonlySet<string>, compactMode: boolean): AdaptiveState {
  const G = AG;
  const keyOf = blockKeyFn(m);
  const isC = (slot: string): boolean => compactBlocks.has(keyOf(slot));
  const hOf = (slot: string): number => (isC(slot) ? G.compactH : G.cardH);
  const pitchOf = (slot: string): number => (isC(slot) ? G.compactH + G.compactGapY : G.cardH + G.gapY);
  const rowsOf = (slot: string, n: number): number => (n <= 0 ? 0 : n * hOf(slot) + (n - 1) * (pitchOf(slot) - hOf(slot)));
  const frameH = (slot: string, n: number): number => G.head + G.padTop + rowsOf(slot, Math.max(1, n)) + G.padBottom;
  const PHANTOM = G.head + G.padTop + G.cardH + G.padBottom; // a one-card frame: the least a reserved frame keeps
  const colW = G.cardW + 2 * G.padX; // a simple frame
  const colPitch = colW + G.rootGap;
  const next: StackMemory = { order: {}, res: {} };
  for (const b of compactBlocks) next.res['cpt|' + b] = 1;
  const narrow = wrap === 'narrow';
  const vcols = narrow ? 2 : 3; // VPC card columns, and shelf columns over them
  /** Any ghost (a unit absent from this layout) may hand its place to a new unit of the same stack. */
  const anyGhost = (): boolean => true;

  /**
   * A sticky far end: the reservation never shrinks; it takes one spare row when a unit is appended beyond it, and
   * again when it is outgrown while units lie beyond it (the push takes the headroom with it).
   */
  const reserveEnd = (key: string, live: number, beyond: boolean, appended: boolean): number => {
    const was = mem?.res[key];
    let r = was === undefined ? live : Math.max(was, live);
    if (beyond && was !== undefined && live > was) r = live + 2 * FULL_PITCH;
    if (appended) r = Math.max(r, live + 2 * FULL_PITCH);
    next.res[key] = r;
    return r;
  };

  // ----- sticky slot order -----
  const slots: Record<string, string[]> = {};
  const itemById = new Map<string, Item>();
  for (const [slot, items] of m.items) {
    slots[slot] = orderSlot(items, prev?.slots[slot]);
    for (const it of items) itemById.set(it.id, it);
  }
  const slotOf = (k: string): string[] => slots[k] ?? [];

  const frames: Record<string, LayoutFrame> = {};
  const cards: Record<string, LayoutCard> = {};
  const badges: Record<string, LayoutBadge> = {};
  const shelves: Record<string, string[][]> = {};
  const shelfKinds: Record<string, ShelfKind[]> = {};

  const put = (id: string, frame: string, slot: string, index: number, x: number, y: number, extra?: Partial<LayoutCard>): void => {
    const it = itemById.get(id);
    if (!it) return;
    const c: LayoutCard = { id, kind: it.kind, product: it.product, frame, slot, index, x, y, w: G.cardW, h: hOf(slot), badges: [] };
    if (it.zones) c.zones = it.zones;
    if (it.fit) c.fit = it.fit;
    cards[id] = extra ? Object.assign(c, extra) : c;
  };
  const frame = (f: SimpleFrame, x: number, y: number, h: number, empty: boolean): void => {
    const fr: LayoutFrame = { id: f.id, kind: f.kind, label: f.label, parent: null, depth: 0, implicit: f.implicit, empty, x, y, w: colW, h };
    if (f.lane) fr.lane = f.lane;
    frames[f.id] = fr;
  };
  const simpleH = (f: SimpleFrame): number => frameH(`${f.id}#stack`, slotOf(`${f.id}#stack`).length);
  /** A simple frame whose cards run down from its top. */
  const drawDown = (f: SimpleFrame, x: number, top: number): void => {
    const slot = `${f.id}#stack`;
    const ids = slotOf(slot);
    frame(f, x, top, simpleH(f), ids.length === 0);
    ids.forEach((id, i) => put(id, f.id, slot, i, x + G.padX, top + G.head + G.padTop + i * pitchOf(slot)));
  };
  /** A simple frame that grows upward from its bottom; card 0 sits nearest the bottom. */
  const drawUp = (f: SimpleFrame, x: number, bottom: number): void => {
    const slot = `${f.id}#stack`;
    const ids = slotOf(slot);
    const h = simpleH(f);
    frame(f, x, bottom - h, h, ids.length === 0);
    ids.forEach((id, i) => put(id, f.id, slot, i, x + G.padX, bottom - G.padBottom - hOf(slot) - i * pitchOf(slot)));
  };
  const simpleIn = (area: string): SimpleFrame[] => [...m.simple.values()].filter((f) => f.area === area);
  const SIDE_ORDER = ['~account', '~saas', '~recs', '~outside'];
  const sideFrames = (): SimpleFrame[] => SIDE_ORDER.map((id) => m.simple.get(id)).filter((f): f is SimpleFrame => !!f);

  /** A stack of simple frames from `anchor` in direction `dir` (1 down, -1 up); returns the stack's live extent. */
  const frameStack = (key: string, list: SimpleFrame[], x: number, anchor: number, dir: 1 | -1, drawIt: boolean, replaceable?: (id: string) => boolean): number => {
    const items: StackItem[] = list.map((f) => ({ id: f.id, live: simpleH(f), spare: 0 }));
    const s = stackUnits(key, items, G.frameGap, mem, next, replaceable);
    if (drawIt)
      for (const f of list) {
        const off = s.at.get(f.id)!;
        if (dir === 1) drawDown(f, x, anchor + off);
        else drawUp(f, x, anchor - off);
      }
    return s.end;
  };

  if (m.mode === 'solution') {
    SOLUTION_LANES.forEach((l, k) => drawDown(m.simple.get('~sol:' + l.key)!, k * (colW + G.solGap), -(G.head + G.padTop)));
  } else {
    const top0 = -(G.head + G.padTop); // top of a frame whose first card is on the path row
    let regionX: number;
    let leftX: number;
    let leftBottom: number; // live bottom of the column left of the regions, relative to the path row
    if (wrap !== 'wide') {
      // left column, downward from the path row: the edge frames (an absent edge keeps a one-card place, so a later
      // CDN moves nothing); further regions start below them
      const edgeEnd = frameStack('c1:edge', simpleIn('edge'), 0, top0, 1, true, anyGhost);
      leftBottom = top0 + Math.max(edgeEnd, PHANTOM);
      // left column, upward from the edge frame's top: clients, DNS, then the side bands, each a unit that keeps a
      // spare row once another unit lies beyond it
      const base = top0 - G.frameGap;
      const ext = simpleIn('external');
      const extEnd = frameStack('c1:ext', ext, 0, base, -1, false, anyGhost);
      const dns = m.simple.get('~dns');
      const side = sideFrames();
      const up: StackItem[] = [{ id: 'ext', live: Math.max(extEnd, PHANTOM), spare: 0 }];
      if (dns) up.push({ id: 'dns', live: simpleH(dns), spare: 0 });
      for (const f of side) up.push({ id: f.id, live: simpleH(f), spare: f.id === '~account' ? 3 * FULL_PITCH : 0 });
      const u = stackUnits('c1:up', up, G.frameGap, mem, next);
      frameStack('c1:ext', ext, 0, base - u.at.get('ext')!, -1, true, anyGhost);
      if (dns) drawUp(dns, 0, base - u.at.get('dns')!);
      for (const f of side) drawUp(f, 0, base - u.at.get(f.id)!);
      leftX = 0;
      regionX = colPitch;
    } else {
      // column 0: clients from the path row down, then the side bands
      const ext = simpleIn('external');
      const extEnd = frameStack('c0:ext', ext, 0, top0, 1, false, anyGhost);
      const side = sideFrames();
      const down: StackItem[] = [{ id: 'ext', live: Math.max(extEnd, PHANTOM), spare: 0 }];
      for (const f of side) down.push({ id: f.id, live: simpleH(f), spare: f.id === '~account' ? 3 * FULL_PITCH : 0 });
      const d = stackUnits('c0:down', down, G.frameGap, mem, next);
      frameStack('c0:ext', ext, 0, top0 + d.at.get('ext')!, 1, true, anyGhost);
      for (const f of side) drawDown(f, 0, top0 + d.at.get(f.id)!);
      // column 1: edge frames, each with its resolvers in a band above its stack
      leftBottom = edgeColumn(simpleIn('edge'), colPitch, top0);
      leftX = colPitch;
      regionX = 2 * colPitch;
    }
    regionsColumn(regionX, leftX, leftBottom);
  }

  // ----- badges and attachments on their host cards -----
  for (const n of m.badgeOf.values()) {
    const host = cards[n.attachTo!];
    if (!host) continue;
    const e = m.entry(n.product);
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
  return { version: 1, mode: m.mode, width, height, pathY: 0, cards, frames, badges, slots, shelves, shelfKinds, order: next.order, adaptive: { wrap, compact: compactMode, res: next.res } };

  // ---------- wide-mode edge column ----------

  /** Draws the edge frames; returns the column's live bottom, relative to the path row. */
  function edgeColumn(list: SimpleFrame[], x: number, top0: number): number {
    const upperH = (f: SimpleFrame): number => {
      const n = slotOf(`${f.id}#upper`).length;
      return n ? n * pitchOf(`${f.id}#upper`) : 0;
    };
    const bodyH = (f: SimpleFrame): number => G.head + G.padTop + rowsOf(`${f.id}#stack`, Math.max(1, slotOf(`${f.id}#stack`).length)) + G.padBottom;
    // the first frame keeps its stack top on the path row and grows its resolver band upward
    const items: StackItem[] = list.map((f, i) => ({ id: f.id, live: (i === 0 ? 0 : upperH(f)) + bodyH(f), spare: FULL_PITCH }));
    const s = stackUnits('c1:edge', items, G.frameGap, mem, next, anyGhost);
    const first = s.order.find((id) => list.some((f) => f.id === id));
    for (const f of list) {
      const at = top0 + s.at.get(f.id)!;
      const upper = slotOf(`${f.id}#upper`);
      const stack = slotOf(`${f.id}#stack`);
      const uh = upperH(f);
      const stackTop = (f.id === first ? at : at + uh) + G.head + G.padTop;
      frame(f, x, stackTop - G.head - G.padTop - uh, uh + bodyH(f), upper.length + stack.length === 0);
      upper.forEach((id, j) => put(id, f.id, `${f.id}#upper`, j, x + G.padX, stackTop - (j + 1) * pitchOf(`${f.id}#upper`)));
      stack.forEach((id, j) => put(id, f.id, `${f.id}#stack`, j, x + G.padX, stackTop + j * pitchOf(`${f.id}#stack`)));
    }
    return list.length ? top0 + s.end : top0 + PHANTOM;
  }

  // ---------- regions ----------

  function regionsColumn(x: number, leftX: number, leftBottom: number): void {
    // The first region keeps its first VPC row on the path row. Further regions follow below everything, each with a
    // sticky top. A removed region keeps its space, and a new region takes over the place of the first such ghost (an
    // implicit '~region' or a repair-made region that the model's own group replaced).
    const key = 'regions';
    const prevOrder = mem?.order[key] ?? [];
    const known = new Set(prevOrder);
    const order = prevOrder.slice();
    const inherited = new Map<string, string>();
    for (const id of m.regions.keys()) {
      if (known.has(id)) continue;
      const g = order.findIndex((o) => !m.regions.has(o) && !inherited.has(o));
      if (g >= 0) {
        inherited.set(id, order[g]);
        order[g] = id;
      } else order.push(id);
    }
    next.order[key] = order;
    const old = (id: string): boolean => known.has(id) || inherited.has(id);
    const resKey = (k: string, id: string): string => k + (inherited.get(id) ?? id);
    const appendedAfter = (i: number): boolean => i + 1 < order.length && !old(order[i + 1]);
    const regionW = G.regionPad + vpcWidth() + G.regionPad;
    let cursor = 0; // reserved bottom of everything placed so far, relative to the path row
    order.forEach((id, i) => {
      const r = m.regions.get(id);
      if (i === 0) {
        const geo = r ? primaryGeometry(r, x, regionW) : null;
        const rb = reserveEnd(resKey('regb|', id), geo ? geo.below : 0, order.length > 1, appendedAfter(0));
        // further regions span the left column too, so they also clear its reserved bottom
        const lb = order.length > 1 ? reserveEnd('leftb', leftBottom, true, appendedAfter(0)) : leftBottom;
        if (geo) geo.draw();
        cursor = Math.max(rb, order.length > 1 ? lb : rb);
        return;
      }
      const geo = r ? secondaryGeometry(r, leftX, x + regionW) : null;
      const need = cursor + G.regionGap;
      const wasTop = mem?.res[resKey('regt|', id)];
      const top = wasTop === undefined ? need : Math.max(wasTop, need);
      next.res[resKey('regt|', id)] = top;
      const rh = reserveEnd(resKey('regh|', id), geo ? geo.h : 0, i + 1 < order.length, appendedAfter(i));
      if (geo) geo.draw(top);
      cursor = top + rh;
    });
  }

  function vpcWidth(): number {
    return G.vpcPad + vcols * G.cardW + (vcols - 1) * G.gapX + G.vpcPad;
  }

  function headOf(vpcId: string): number {
    const v = m.vpcs.get(vpcId);
    const flag = (mem?.res['zr|' + vpcId] ?? 0) > 0 || (!!v && v.zones.length > 0);
    return G.vpcHead + (flag ? G.zoneLift : 0);
  }

  /** The VPCs of a region, stacked down from `vpcTop0`; returns the live bottom and a draw function. */
  function vpcStack(r: RegionModel): { firstHead: number; bottom: (vpcTop0: number) => number; draw: (vx: number, vpcTop0: number, w: number) => void } {
    const geos = r.vpcs.map((id) => vpcGeometry(m.vpcs.get(id)!));
    const items: StackItem[] = geos.map((g) => ({ id: g.id, live: g.h, spare: 2 * FULL_PITCH }));
    const vs = stackUnits('vpcs:' + r.id, items, G.vpcGap, mem, next, anyGhost);
    const firstHead = vs.order.length ? headOf(vs.order[0]) : G.vpcHead;
    return {
      firstHead,
      bottom: (vpcTop0) => (geos.length ? Math.max(...geos.map((g) => vpcTop0 + vs.at.get(g.id)! + g.h)) : -Infinity),
      draw: (vx, vpcTop0, w) => geos.forEach((g) => g.draw(vx, vpcTop0 + vs.at.get(g.id)!, r.id, w)),
    };
  }

  /** The first region: shelf over the VPC, first VPC row on the path row (y = 0). */
  function primaryGeometry(r: RegionModel, x: number, regionW: number): { below: number; draw(): void } {
    const vx = x + G.regionPad;
    const innerX = vx + G.vpcPad;
    const colX = (k: number): number => innerX + k * (G.cardW + G.gapX);
    const vpcs = vpcStack(r);
    const vpcTop0 = -vpcs.firstHead; // the first VPC's row 0 is the region's anchor (y = 0)
    const contentTop = vpcTop0 - G.boundaryRise;
    const shelfBase = contentTop - G.shelfGap; // lane blocks grow up from here
    const laneFid = (lane: string): string => `${r.id}~${lane}`;
    const laneSlot = (lane: string): string => `${laneFid(lane)}#stack`;
    const laneH = (lane: string): number => (r.lanes.includes(lane) ? G.laneHead + rowsOf(laneSlot(lane), slotOf(laneSlot(lane)).length) : 0);
    // lane blocks assigned to shelf columns (sticky), each column a reserved stack growing up
    const assignKey = 'shelfcol:' + r.id;
    const prevAssign = mem?.order[assignKey] ?? [];
    const assign = new Map<string, number>(prevAssign.map((s) => [s.slice(0, s.lastIndexOf('@')), Number(s.slice(s.lastIndexOf('@') + 1))]));
    const colUsed = (c: number): number => {
      let sum = 0;
      for (const [lane, k] of assign) if (k === c) sum += Math.max(mem?.res[`shelf:${r.id}:${c}|${laneFid(lane)}`] ?? 0, laneH(lane)) + G.laneGap;
      return sum;
    };
    const colIds = Array.from({ length: vcols }, (_, k) => k);
    for (const lane of r.lanes) {
      if (assign.has(lane)) continue;
      const pref = (narrow ? SHELF_PREF_NARROW : SHELF_PREF)[lane] ?? 0;
      const used = new Set(assign.values());
      const empty = colIds.filter((c) => !used.has(c)).sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref) || a - b);
      const c = empty.length ? empty[0] : colIds.slice().sort((a, b) => colUsed(a) - colUsed(b) || Math.abs(a - pref) - Math.abs(b - pref) || a - b)[0];
      assign.set(lane, c);
    }
    next.order[assignKey] = [...assign].map(([lane, c]) => `${lane}@${c}`);
    const placed: Array<{ lane: string; c: number; off: number }> = [];
    const cols: string[][] = [];
    let shelfTop = Infinity;
    for (let c = 0; c < vcols; c++) {
      const lanes = [...assign].filter(([, k]) => k === c).map(([lane]) => lane);
      lanes.sort((a, b) => SHELF_LANES.indexOf(a) - SHELF_LANES.indexOf(b));
      const items: StackItem[] = lanes.filter((l) => r.lanes.includes(l)).map((l) => ({ id: laneFid(l), live: laneH(l), spare: isC(laneSlot(l)) ? 2 * pitchOf(laneSlot(l)) : FULL_PITCH }));
      const s = stackUnits(`shelf:${r.id}:${c}`, items, G.laneGap, mem, next);
      cols.push(s.order.slice());
      for (const it of items) {
        const lane = it.id.slice(r.id.length + 1);
        const off = s.at.get(it.id)!;
        placed.push({ lane, c, off });
        shelfTop = Math.min(shelfTop, shelfBase - off - laneH(lane));
      }
    }
    shelves[r.id] = cols;
    shelfKinds[r.id] = cols.map((): ShelfKind => 'data');
    const lastVpc = vpcs.bottom(vpcTop0);
    const top = Math.min(contentTop, Number.isFinite(shelfTop) ? shelfTop - G.padTop : Infinity) - G.head;
    const contentBottom = Math.max(lastVpc, r.vpcs.length || placed.length ? -Infinity : G.cardH);
    const bottom = (Number.isFinite(contentBottom) ? contentBottom : shelfBase) + G.padBottom;
    return {
      below: bottom,
      draw() {
        frames[r.id] = { id: r.id, kind: 'region', label: r.label, parent: null, depth: 0, implicit: r.implicit, empty: r.vpcs.length === 0 && placed.length === 0, x, y: top, w: regionW, h: bottom - top };
        vpcs.draw(vx, vpcTop0, regionW - 2 * G.regionPad);
        for (const p of placed) {
          const fid = laneFid(p.lane);
          const slot = laneSlot(p.lane);
          const ids = slotOf(slot);
          const bx = colX(p.c);
          const bh = laneH(p.lane);
          const bottomY = shelfBase - p.off;
          frames[fid] = { id: fid, kind: 'lane', label: SHELF_TITLES[p.lane] ?? p.lane, parent: r.id, depth: 1, implicit: true, empty: ids.length === 0, lane: p.lane, x: bx, y: bottomY - bh, w: G.cardW, h: bh };
          ids.forEach((id, i) => put(id, fid, slot, i, bx, bottomY - hOf(slot) - i * pitchOf(slot)));
        }
      },
    };
  }

  /**
   * A further region, drawn below everything at full width: its shelf is a column of lane blocks on the left (under
   * the left column), its VPCs sit under the first region's VPC. Both grow down from the first VPC row.
   */
  function secondaryGeometry(r: RegionModel, leftX: number, right: number): { h: number; draw(top: number): void } {
    const vx = right - G.regionPad - vpcWidth();
    const vpcs = vpcStack(r);
    const vpcTop0 = G.secondaryTop; // relative to the region's top border
    const row0 = vpcTop0 + vpcs.firstHead;
    const laneFid = (lane: string): string => `${r.id}~${lane}`;
    const laneSlot = (lane: string): string => `${laneFid(lane)}#stack`;
    const laneH = (lane: string): number => G.laneHead + rowsOf(laneSlot(lane), slotOf(laneSlot(lane)).length);
    const items: StackItem[] = r.lanes.map((l) => ({ id: laneFid(l), live: laneH(l), spare: pitchOf(laneSlot(l)) }));
    const s = stackUnits('shelf:' + r.id + ':left', items, G.laneGap, mem, next);
    shelves[r.id] = [s.order.slice()];
    shelfKinds[r.id] = ['data'];
    const shelfTop = row0 - G.laneHead;
    const shelfEnd = items.length ? shelfTop + s.end : -Infinity;
    const contentBottom = Math.max(vpcs.bottom(vpcTop0), shelfEnd, r.vpcs.length || items.length ? -Infinity : row0 + G.cardH);
    const h = (Number.isFinite(contentBottom) ? contentBottom : row0 + G.cardH) + G.padBottom;
    return {
      h,
      draw(top) {
        frames[r.id] = { id: r.id, kind: 'region', label: r.label, parent: null, depth: 0, implicit: r.implicit, empty: r.vpcs.length === 0 && items.length === 0, x: leftX, y: top, w: right - leftX, h };
        vpcs.draw(vx, top + vpcTop0, vpcWidth());
        for (const it of items) {
          const lane = it.id.slice(r.id.length + 1);
          const slot = laneSlot(lane);
          const ids = slotOf(slot);
          const by = top + shelfTop + s.at.get(it.id)!;
          const bx = leftX + G.padX;
          frames[it.id] = { id: it.id, kind: 'lane', label: SHELF_TITLES[lane] ?? lane, parent: r.id, depth: 1, implicit: true, empty: ids.length === 0, lane, x: bx, y: by, w: G.cardW, h: it.live };
          ids.forEach((id, i) => put(id, it.id, slot, i, bx, by + G.laneHead + i * pitchOf(slot)));
        }
      },
    };
  }

  function vpcGeometry(v: VpcModel): { id: string; h: number; draw(vx: number, vtop: number, parent: string, w: number): void } {
    const zoneFlag = (mem?.res['zr|' + v.id] ?? 0) > 0 || v.zones.length > 0;
    if (zoneFlag) next.res['zr|' + v.id] = 1;
    // three columns: zones sit in the compute column under the boundary cards, so their label band lowers row 0;
    // two columns (narrow): the zones block starts below the load balancers, clear of the boundary cards
    const head = G.vpcHead + (zoneFlag && !narrow ? G.zoneLift : 0);
    const S = {
      ingress: `${v.id}#ingress`,
      data: `${v.id}#data`,
      compute: `${v.id}#compute`,
      front: `${v.id}#front`,
      boundary: `${v.id}#boundary`,
      span: `${v.id}#span`,
    };
    const computeCol = narrow ? 0 : 1;
    const dataCol = narrow ? 1 : 2;
    const ingress = slotOf(S.ingress);
    const data = slotOf(S.data);
    const boundary = slotOf(S.boundary);
    const front = narrow && !v.zones.length ? slotOf(S.front) : [];
    const span = v.zones.length ? slotOf(S.span) : [];
    const compute = v.zones.length ? [] : slotOf(S.compute);
    const members = v.zones.map((z) => slotOf(`${z.id}#zone`));
    const anyMembers = members.some((l) => l.length > 0);
    const zp = pitchOf(S.span); // the zones block shares one card size
    const zrows = (n: number): number => rowsOf(S.span, n);
    // narrow: the zones block starts below a reserved load-balancer row and the zone label band
    const zoneOff = narrow && v.zones.length ? rowsOf(S.ingress, Math.max(1, ingress.length)) + G.zoneHead + 8 : 0;
    // compute column extent below row 0
    let computeExt = narrow ? Math.max(rowsOf(S.front, front.length), v.zones.length ? rowsOf(S.ingress, Math.max(1, ingress.length)) : 0) : rowsOf(S.compute, compute.length);
    const zoneRects: Array<{ y: number; h: number; x: number; w: number }> = [];
    if (v.zones.length && !anyMembers) {
      // zones side by side behind the multi-zone cards, only as tall as those cards
      const total = G.cardW + 2 * G.zonePad;
      const zw = (total - (v.zones.length - 1) * G.zoneGap) / v.zones.length;
      const h = G.zoneHead + zrows(Math.max(1, span.length)) + G.zonePad;
      v.zones.forEach((_, k) => zoneRects.push({ x: -G.zonePad + k * (zw + G.zoneGap), y: zoneOff - G.zoneHead, w: zw, h }));
      computeExt = zoneOff + h - G.zoneHead;
    } else if (v.zones.length) {
      // zones stacked in the compute column, each as tall as its members; multi-zone cards above them
      let y = zoneOff + (span.length ? zrows(span.length) + 12 : -G.zoneHead);
      members.forEach((list) => {
        const h = list.length ? G.zoneHead + zrows(list.length) + G.zonePad : G.zoneHead + 10;
        zoneRects.push({ x: -G.zonePad, y, w: G.cardW + 2 * G.zonePad, h });
        y += h + G.zoneGap;
      });
      computeExt = y - G.zoneGap;
    }
    const ingressExt = narrow ? 0 : rowsOf(S.ingress, Math.max(1, ingress.length));
    const contentH = Math.max(ingressExt, rowsOf(S.data, data.length), computeExt, G.cardH);
    const h = head + contentH + G.padBottom;
    return {
      id: v.id,
      h,
      draw(vx, vtop, parent, w) {
        const cx = (k: number): number => vx + G.vpcPad + k * (G.cardW + G.gapX);
        const row0 = vtop + head;
        const empty = ingress.length + data.length + boundary.length + span.length + compute.length + front.length + members.reduce((s, l) => s + l.length, 0) === 0;
        frames[v.id] = { id: v.id, kind: 'vpc', label: v.label, parent, depth: 1, implicit: v.implicit, empty, x: vx, y: vtop, w, h };
        ingress.forEach((id, i) => put(id, v.id, S.ingress, i, cx(0), row0 + i * pitchOf(S.ingress)));
        front.forEach((id, i) => put(id, v.id, S.front, i, cx(0), row0 + i * pitchOf(S.front)));
        data.forEach((id, i) => put(id, v.id, S.data, i, cx(dataCol), row0 + i * pitchOf(S.data)));
        compute.forEach((id, i) => put(id, v.id, S.compute, i, cx(computeCol), row0 + i * pitchOf(S.compute)));
        // boundary cards straddle the VPC's top edge from the second column on (the VPC label owns the first)
        boundary.forEach((id, i) => put(id, v.id, S.boundary, i, cx(1 + i), vtop - hOf(S.boundary) / 2, { boundary: true }));
        const zc = cx(computeCol);
        v.zones.forEach((z, k) => {
          const zr = zoneRects[k];
          frames[z.id] = { id: z.id, kind: 'zone', label: z.label, parent: v.id, depth: 2, implicit: false, empty: members[k].length === 0 && (anyMembers || span.length === 0), zone: z.letter, x: zc + zr.x, y: row0 + zr.y, w: zr.w, h: zr.h };
        });
        const zx0 = zc - G.zonePad;
        span.forEach((id, i) => {
          const want = itemById.get(id)?.zones;
          let ks = v.zones.map((z, k) => (want && want.length && !want.includes(z.letter) ? -1 : k)).filter((k) => k >= 0);
          if (!ks.length) ks = v.zones.map((_, k) => k);
          const sx0 = anyMembers ? zx0 : zc + Math.min(...ks.map((k) => zoneRects[k].x));
          const sx1 = anyMembers ? zx0 + G.cardW + 2 * G.zonePad : zc + Math.max(...ks.map((k) => zoneRects[k].x + zoneRects[k].w));
          put(id, v.id, S.span, i, zc, row0 + zoneOff + i * zp, { span: { x0: sx0, x1: sx1 } });
        });
        members.forEach((list, k) => list.forEach((id, j) => put(id, v.zones[k].id, `${v.zones[k].id}#zone`, j, zc, row0 + zoneRects[k].y + G.zoneHead + j * zp)));
      },
    };
  }
}
