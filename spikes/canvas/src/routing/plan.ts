// Turns graph edges into drawable routes: resolves endpoints to cards (a badge's edges go to its host), merges
// duplicates, and aggregates a source that feeds every card of a lane block into one container-level edge.
import type { Catalog, CatalogEntry, EdgeKind, Graph } from '../../../../packages/core/src/types.ts';
import type { LayoutFrame, LayoutState, Rect } from '../../../../packages/core/src/layout.ts';
import { cardBounds, cardFor } from '../../../../packages/core/src/layout.ts';
import type { Obstacle, PlannedEdge, RouteRequest } from './types.ts';

const LABEL_CHAR = 6.6; // small-caps label advance at 10.5px with tracking, close enough for an obstacle box

function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  return catalog.byId.get(product) ?? catalog.resolve(product).entry;
}

/** The box a frame's small-caps label occupies; routes keep clear of it. */
export function labelBox(f: LayoutFrame): Rect | undefined {
  if (f.kind === 'lane') return { x: f.x, y: f.y + 2, w: Math.min(f.w, f.label.length * LABEL_CHAR + 8), h: 16 };
  if (f.kind === 'zone') return { x: f.x + 8, y: f.y + 6, w: Math.min(f.w - 16, f.label.length * LABEL_CHAR + 8), h: 16 };
  return { x: f.x + 12, y: f.y + 9, w: Math.min(f.w - 24, f.label.length * LABEL_CHAR + 10), h: 16 };
}

export interface PlanOptions {
  /** Aggregate a source that feeds every card of a lane block (2 or more) into one edge to the block. */
  aggregate?: boolean;
}

export function planEdges(graph: Graph, layout: LayoutState, catalog: Catalog, opts: PlanOptions = {}): RouteRequest {
  const aggregate = opts.aggregate ?? true;
  const isDns = (e: CatalogEntry | undefined): boolean => !!e && (e.lane === 'dns' || e.icon === 'dns');
  const rankOf = (cardId: string): number | undefined => {
    const c = layout.cards[cardId];
    const e = c ? entryOf(catalog, c.product) : undefined;
    return e && !isDns(e) ? e.pathRank : undefined;
  };
  interface Raw {
    id: string;
    from: string;
    to: string;
    kind: EdgeKind;
    label?: string;
  }
  const raws: Raw[] = [];
  const resolve = (id: string): string | undefined => {
    const c = cardFor(layout, id);
    if (c) return c.id;
    return undefined;
  };
  for (const e of Object.values(graph.edges)) {
    const from = resolve(e.from);
    const to = resolve(e.to);
    if (!from || !to || from === to) continue;
    raws.push({ id: e.id, from, to, kind: e.kind ?? 'data', label: e.label });
  }

  // merge duplicates (same endpoints and kind), e.g. two edges that repair re-pointed to one host
  const byKey = new Map<string, { raw: Raw; ids: string[] }>();
  for (const r of raws) {
    const k = `${r.from}\u0001${r.to}\u0001${r.kind}`;
    const cur = byKey.get(k);
    if (cur) cur.ids.push(r.id);
    else byKey.set(k, { raw: r, ids: [r.id] });
  }
  const merged = [...byKey.values()];

  // container-level edges: one source to every card of a lane block (or every card of a block to one target)
  const used = new Set<string>();
  const out: PlannedEdge[] = [];
  const rectOf = (id: string, frame: boolean): Rect => (frame ? layout.frames[id] : cardBounds(layout, id)!);
  const isPath = (from: string, to: string, kind: EdgeKind): boolean => kind === 'data' && rankOf(from) !== undefined && rankOf(to) !== undefined;
  if (aggregate) {
    const lanes = Object.values(layout.frames).filter((f) => f.kind === 'lane');
    for (const f of lanes) {
      const members = Object.values(layout.cards).filter((c) => c.frame === f.id).map((c) => c.id);
      if (members.length < 2) continue;
      for (const dir of ['in', 'out'] as const) {
        const groups = new Map<string, typeof merged>();
        for (const m of merged) {
          const k = `${m.raw.kind}`;
          if (dir === 'in' && members.includes(m.raw.to) && !members.includes(m.raw.from)) {
            const key = m.raw.from + '\u0001' + k;
            groups.set(key, [...(groups.get(key) ?? []), m]);
          }
          if (dir === 'out' && members.includes(m.raw.from) && !members.includes(m.raw.to)) {
            const key = m.raw.to + '\u0001' + k;
            groups.set(key, [...(groups.get(key) ?? []), m]);
          }
        }
        for (const [key, list] of groups) {
          const other = key.split('\u0001')[0];
          const covered = new Set(list.map((m) => (dir === 'in' ? m.raw.to : m.raw.from)));
          if (covered.size !== members.length || list.some((m) => used.has(m.raw.id))) continue;
          for (const m of list) used.add(m.raw.id);
          const kind = list[0].raw.kind;
          const from = dir === 'in' ? other : f.id;
          const to = dir === 'in' ? f.id : other;
          // the bracket bar sits in the channel beside the block, on the side that faces the other endpoint
          const o = cardBounds(layout, other)!;
          const left = o.x + o.w / 2 < f.x + f.w / 2;
          const ys = members.map((id) => layout.cards[id]);
          const y0 = Math.min(...ys.map((c) => c.y));
          const y1 = Math.max(...ys.map((c) => c.y + c.h));
          const bx = left ? f.x - 12 : f.x + f.w + 8;
          const barRect: Rect = { x: bx - 2, y: y0, w: 8, h: y1 - y0 };
          out.push({
            id: `agg:${from}:${to}`,
            edges: list.flatMap((m) => m.ids),
            from,
            to,
            fromFrame: dir === 'out',
            toFrame: dir === 'in',
            src: dir === 'out' ? barRect : rectOf(from, false),
            dst: dir === 'in' ? barRect : rectOf(to, false),
            kind,
            path: list.every((m) => isPath(m.raw.from, m.raw.to, kind)),
            bar: { x: bx + 2, y0, y1, frame: f.id },
          });
        }
      }
    }
  }
  for (const m of merged) {
    if (used.has(m.raw.id)) continue;
    const r = m.raw;
    out.push({ id: r.id, edges: m.ids, from: r.from, to: r.to, fromFrame: false, toFrame: false, src: rectOf(r.from, false), dst: rectOf(r.to, false), kind: r.kind, path: isPath(r.from, r.to, r.kind), label: r.label });
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const obstacles: Obstacle[] = [];
  for (const c of Object.values(layout.cards)) obstacles.push({ id: c.id, kind: 'card', ...cardBounds(layout, c.id)! });
  for (const f of Object.values(layout.frames)) {
    const b = labelBox(f);
    if (b && b.w > 0) obstacles.push({ id: 'label:' + f.id, kind: 'label', ...b });
  }
  return { edges: out, obstacles };
}
