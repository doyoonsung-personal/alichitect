// The diagram canvas: turns a LayoutState and routed edges into React Flow nodes and edges, and animates only what
// changed (enter, move, exit for cards; move and resize for frames; draw-on for re-routed edges).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Background, BackgroundVariant, ReactFlow, useReactFlow } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import type { LayoutCard, LayoutDiff, LayoutFrame, LayoutState } from '../../../../packages/core/src/layout.ts';
import type { Catalog, CatalogEntry, Graph } from '../../../../packages/core/src/types.ts';
import type { PlannedEdge, Pt } from '../routing/types.ts';
import { CardNode, FrameNode, hueOf } from './nodes.tsx';
import type { BadgeView, CardData, FrameData } from './nodes.tsx';
import { RoutedEdge } from './edges.tsx';
import type { RoutedData } from './edges.tsx';

export const MOVE_MS = 300;
export const ENTER_MS = 240;
export const EXIT_MS = 160;

export interface ViewFrame {
  seq: number;
  layout: LayoutState;
  display: Graph;
  diff: LayoutDiff | null;
  animate: boolean;
  final: boolean;
}

export interface RoutedFrame {
  seq: number;
  edges: PlannedEdge[];
  routes: Record<string, Pt[]>;
}

const nodeTypes = { card: CardNode, frame: FrameNode };
const edgeTypes = { routed: RoutedEdge };

const FRAME_TITLE: Record<string, string> = { region: 'Region', vpc: 'VPC', zone: 'Zone' };
const PURCHASE: Record<string, string> = { 'saas-seat': 'Per-seat SaaS', 'subscription-plan': 'Subscription plan', 'cloud-payg': 'Pay as you go', 'open-source': 'Open source', 'contact-sales': 'Contact sales' };
const LANE: Record<string, string> = { clients: 'Clients', onprem: 'On-premises', thirdparty: 'Third party', dns: 'DNS', edge: 'Edge network', ingress: 'Load balancing', compute: 'Compute', middleware: 'Messaging', cache: 'Cache', database: 'Database', search: 'Search', filestore: 'File storage', boundary: 'VPC boundary', storage: 'Storage', ai: 'AI', analytics: 'Analytics', integration: 'Integration', ops: 'Operations', security: 'Security', network: 'Network', governance: 'Governance', saas: 'SaaS' };

function frameLabel(f: LayoutFrame): { label: string; caption?: string } {
  if (f.kind === 'region' || f.kind === 'vpc') return f.implicit ? { label: FRAME_TITLE[f.kind] } : { label: FRAME_TITLE[f.kind], caption: f.label };
  return { label: f.label };
}

function entryOf(catalog: Catalog, product: string): CatalogEntry | undefined {
  return catalog.byId.get(product) ?? catalog.resolve(product).entry;
}

function cardData(card: LayoutCard, layout: LayoutState, display: Graph, catalog: Catalog, pathIds: Set<string>): CardData {
  const e = entryOf(catalog, card.product);
  const node = display.nodes[card.id];
  const short = e?.short ?? card.product;
  const label = node?.label ?? (card.kind === 'rec' ? short : card.id);
  // second line: the product's short name, or its full name when the label already is the short name; never a repeat
  const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();
  const purchase = e?.purchase ? PURCHASE[e.purchase] : undefined;
  let secondary = same(label, short) ? (e?.name ?? short) : short;
  if (card.kind === 'rec') secondary = purchase ?? (e && !same(e.name, short) ? e.name : LANE[e?.lane ?? ''] ?? '');
  else if (same(secondary, label)) secondary = LANE[e?.lane ?? ''] ?? secondary;
  const badges: BadgeView[] = card.badges.map((bid) => {
    const b = layout.badges[bid];
    const be = entryOf(catalog, b.product);
    return { id: bid, as: b.as, dx: b.x - card.x, dy: b.y - card.y, w: b.w, h: b.h, icon: be?.icon ?? 'generic', short: be?.short ?? b.product, hue: hueOf(be) };
  });
  return { id: card.id, label: card.kind === 'rec' ? short : label, secondary, icon: e?.icon ?? 'generic', hue: hueOf(e), zones: card.zones, fit: card.fit, path: pathIds.has(card.id), badges };
}

export interface CanvasProps {
  frame: ViewFrame | null;
  routed: RoutedFrame | null;
  catalog: Catalog;
  hot: string | null;
  capture: boolean;
  onSettled?(seq: number): void;
}

export function Canvas({ frame, routed, catalog, hot, capture }: CanvasProps): JSX.Element {
  const rf = useReactFlow();
  const [tick, setTick] = useState(0);
  const moving = useRef<{ ids: Set<string>; until: number }>({ ids: new Set(), until: 0 });
  const entering = useRef<Map<string, { until: number; stagger: number }>>(new Map());
  const ghosts = useRef<Map<string, { card: LayoutCard; data: CardData; until: number }>>(new Map());
  const prevFrame = useRef<ViewFrame | null>(null);
  const stale = useRef<Set<string>>(new Set()); // card ids whose edges are hidden until the next routes land
  const drawn = useRef<Map<string, { key: string; rev: number; at: number }>>(new Map());
  const fitted = useRef<{ w: number; h: number; scenarioSeq: number } | null>(null);

  // ----- per-frame animation bookkeeping (runs before paint of the new frame) -----
  useMemo(() => {
    if (!frame || frame === prevFrame.current) return;
    const prev = prevFrame.current;
    prevFrame.current = frame;
    const now = performance.now();
    if (!frame.animate || !prev || !frame.diff) {
      moving.current = { ids: new Set(), until: 0 };
      entering.current.clear();
      ghosts.current.clear();
      stale.current.clear();
      return;
    }
    const d = frame.diff;
    const ids = new Set<string>([...d.moved, ...d.framesChanged.map((f) => 'f:' + f)]);
    // frames that appear or move also count: their cards are already listed in d.moved
    moving.current = { ids, until: now + MOVE_MS + 60 };
    d.entered.forEach((id, i) => entering.current.set(id, { until: now + ENTER_MS + 300, stagger: Math.min(i * 40, 200) }));
    for (const id of d.exited) {
      const c = prev.layout.cards[id];
      if (c) ghosts.current.set(id, { card: c, data: { ...cardData(c, prev.layout, prev.display, catalog, new Set()), anim: 'exit' }, until: now + EXIT_MS + 40 });
    }
    for (const id of [...d.moved, ...d.entered, ...d.exited]) stale.current.add(id);
    const timer = setTimeout(() => setTick((t) => t + 1), Math.max(MOVE_MS, ENTER_MS + 200, EXIT_MS) + 80);
    return () => clearTimeout(timer);
  }, [frame, catalog]);

  // ----- nodes -----
  const nodes = useMemo<Node[]>(() => {
    if (!frame) return [];
    const now = performance.now();
    const out: Node[] = [];
    const { layout, display } = frame;
    const pathIds = new Set<string>();
    if (routed) for (const e of routed.edges) if (e.path) {
      pathIds.add(e.from);
      pathIds.add(e.to);
    }
    const movingNow = moving.current.until > now ? moving.current.ids : null;
    for (const f of Object.values(layout.frames)) {
      const { label, caption } = frameLabel(f);
      const data: FrameData = { kind: f.kind, label, caption, w: f.w, h: f.h, empty: f.empty };
      out.push({ id: 'f:' + f.id, type: 'frame', position: { x: f.x, y: f.y }, width: f.w, height: f.h, data, zIndex: f.depth, draggable: false, selectable: false, focusable: false, className: movingNow?.has('f:' + f.id) ? 'is-moving' : undefined });
    }
    for (const c of Object.values(layout.cards)) {
      const data = cardData(c, layout, display, catalog, pathIds);
      const en = entering.current.get(c.id);
      if (en && en.until > now) {
        data.anim = 'enter';
        data.stagger = en.stagger;
      } else if (en) entering.current.delete(c.id);
      out.push({ id: c.id, type: 'card', position: { x: c.x, y: c.y }, width: c.w, height: c.h, data, zIndex: 20, draggable: false, selectable: false, focusable: false, className: movingNow?.has(c.id) ? 'is-moving' : undefined });
    }
    for (const [id, g] of ghosts.current) {
      if (g.until <= now || layout.cards[id]) {
        ghosts.current.delete(id);
        continue;
      }
      out.push({ id: 'ghost:' + id, type: 'card', position: { x: g.card.x, y: g.card.y }, width: g.card.w, height: g.card.h, data: g.data, zIndex: 19, draggable: false, selectable: false, focusable: false });
    }
    return out;
    // tick re-evaluates the time-based classes
  }, [frame, routed, catalog, tick]);

  // ----- edges -----
  const edges = useMemo<Edge[]>(() => {
    if (!frame || !routed) return [];
    const out: Edge[] = [];
    const isStale = (e: PlannedEdge): boolean => routed.seq < frame.seq && (stale.current.has(e.from) || stale.current.has(e.to) || (!!e.bar && [...stale.current].some((id) => frame.layout.cards[id]?.frame === e.bar!.frame)));
    const nodeIds = new Set([...Object.keys(frame.layout.cards), ...Object.keys(frame.layout.frames).map((f) => 'f:' + f)]);
    for (const e of routed.edges) {
      const pts = routed.routes[e.id];
      if (!pts || pts.length < 2) continue;
      const source = e.fromFrame && e.bar ? 'f:' + e.bar.frame : e.from;
      const target = e.toFrame && e.bar ? 'f:' + e.bar.frame : e.to;
      if (!nodeIds.has(source) || !nodeIds.has(target)) continue;
      const key = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const prev = drawn.current.get(e.id);
      let rev = prev?.rev ?? 0;
      let state: RoutedData['state'] = 'steady';
      const now = performance.now();
      if (isStale(e)) state = 'stale';
      else if (!prev || prev.key !== key) {
        rev = (prev?.rev ?? 0) + 1;
        state = frame.animate ? 'draw' : 'steady';
        drawn.current.set(e.id, { key, rev, at: frame.animate ? now : 0 });
      } else if (now - prev.at < 450) state = 'draw'; // keep the attribute while the draw-on runs
      const hotState = hot ? (e.from === hot || e.to === hot || e.edges.includes(hot) ? 'hot' : 'dim') : null;
      const data: RoutedData = { points: pts, kind: e.kind, path: e.path, state, rev, hot: hotState, bar: e.bar, count: e.edges.length };
      out.push({ id: e.id, source, target, type: 'routed', data, zIndex: 10, selectable: false, focusable: false });
    }
    if (routed.seq >= frame.seq) stale.current.clear();
    return out;
  }, [frame, routed, hot]);

  // ----- camera: fit on a new scenario, zoom out only while streaming, final fit at the end -----
  useEffect(() => {
    if (!frame) return;
    const { width, height } = frame.layout;
    const f = fitted.current;
    const first = !f || frame.seq === 1 || !frame.animate;
    const grew = !!f && (width > f.w + 1 || height > f.h + 1);
    if (!first && !grew && !frame.final) return;
    fitted.current = { w: width, h: height, scenarioSeq: frame.seq };
    const zoom = rf.getZoom();
    const id = requestAnimationFrame(() => {
      void rf.fitView({ padding: 0.06, duration: capture || first ? 0 : 320, maxZoom: frame.final || first ? 1.15 : Math.max(0.2, zoom) });
    });
    return () => cancelAnimationFrame(id);
  }, [frame, rf, capture]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      edgesFocusable={false}
      nodesFocusable={false}
      zoomOnDoubleClick={false}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: false }}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="var(--bg-dot)" />
    </ReactFlow>
  );
}
