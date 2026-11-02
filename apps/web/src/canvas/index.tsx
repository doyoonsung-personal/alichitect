import { WorkflowStage } from './WorkflowStage.tsx';
import type { WorkflowViewProps } from '../workflow/contracts.ts';
// The live diagram (spec 7.15 to 7.24, 10, 11). React Flow supplies the pan and zoom viewport; everything on it is ours:
// frames, cards, one edge layer, the popover. The layout comes from core (already computed by the store, with `prev`),
// the edges are routed off the main thread by libavoid with the channel router as the fallback, and only what changed
// between two layouts animates. State that must survive a render (hover, tab stop, routes) lives here; everything the
// rest of the app needs to know goes out through `actions`.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './canvas.css';
import { ARCH_X0, GEOMETRY, cardBounds, fitCamera } from '@ali/core/layout.ts';
import type { LayoutState, Rect } from '@ali/core/layout.ts';
import type { CanvasProps } from '../app/contracts.ts';
import { TOOLS } from '../app/tools.ts';
import { planEdges } from '../routing/plan.ts';
import { routeChannels } from '../routing/channel.ts';
import { routeWithBudget, ROUTE_BUDGET_MS } from '../routing/budget.ts';
import type { AvoidPort } from '../routing/budget.ts';
import { createAvoidPort } from '../routing/avoid-port.ts';
import type { Pt } from '../routing/types.ts';
import { panExtent, prefersReducedMotion, revealViewport, stickyCamera, unionRect, viewportOf, zoomAbout, zoomStep, ZOOM_MAX, ZOOM_MIN } from './camera.ts';
import type { Viewport } from './camera.ts';
import { drawEdges } from './edges-model.ts';
import { createHoverMachine } from './hover.ts';
import type { HoverMachine, OpenedBy } from './hover.ts';
import { label } from './labels.ts';
import { makeMeasurer } from './measure.ts';
import { STAGGER_MAX, STAGGER_MS, createMotionClock, litCards, pathOrder, planMotion } from './motion.ts';
import type { MotionClock } from './motion.ts';
import { nearest, readingOrder, rovingStop } from './nav.ts';
import type { NavDir, NavItem } from './nav.ts';
import { CardNode, EdgesNode, FrameNode, UiContext } from './nodes.tsx';
import type { CanvasUi, CardData, EdgesData, FrameData } from './nodes.tsx';
import type { EdgeDraw } from './edges.tsx';
import { Popover } from './Popover.tsx';
import { popContent } from './pop-model.ts';
import { buildScene } from './scene.ts';
import type { CardView, Scene } from './scene.ts';
import { Legend, PanHint, ZoomTools } from './Tools.tsx';

const nodeTypes = { frame: FrameNode, card: CardNode, edges: EdgesNode };
const POP_ID = 'cv-pop';
const FIT_MS = 300;
const HINT_MS = 6000;
const ease = (t: number): number => 1 - Math.pow(1 - t, 4);

export function Canvas(p: CanvasProps | WorkflowViewProps): ReactElement {
  if ('view' in p) return <WorkflowStage {...p} />;
  return (
    <ReactFlowProvider>
      <Stage {...p} />
    </ReactFlowProvider>
  );
}

// ---------- helpers ----------

interface Routed {
  version: number;
  routes: Record<string, Pt[]>;
  source: 'libavoid' | 'channel';
}

/** The box the camera fits: the layout's bounds, widened to the architecture width once Clients and Edge exist. */
export function fitBox(l: LayoutState): Rect {
  const b = l.bounds ?? { x: 0, y: 0, w: l.width, h: l.height };
  if (l.mode !== 'architecture' || l.version !== 2) return b;
  const x0 = Math.min(b.x, ARCH_X0);
  const x1 = Math.max(b.x + b.w, ARCH_X0 + GEOMETRY.archW);
  return { x: x0, y: b.y, w: x1 - x0, h: b.h };
}

function navItems(scene: Scene, layout: LayoutState): { items: NavItem[]; order: string[] } {
  const items: NavItem[] = scene.cards.map((c) => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h, frame: c.frame }));
  for (const c of scene.cards) for (const b of [...c.badges, ...c.attachments]) items.push({ id: b.id, x: c.x + b.x, y: c.y + b.y, w: b.w, h: b.h, frame: c.frame });
  const cardOrder = readingOrder(
    items.filter((i) => scene.byId.has(i.id)),
    (f) => {
      const fr = layout.frames[f];
      return fr ? { x: fr.x, y: fr.y } : { x: 0, y: 0 };
    },
  );
  const order: string[] = [];
  for (const id of cardOrder) {
    order.push(id);
    const c = scene.byId.get(id);
    if (c) for (const b of [...c.badges, ...c.attachments]) order.push(b.id);
  }
  return { items, order };
}

/** The last routing calls, for the dev console and the headless checks: window.__abCanvas.routing. */
interface RoutingNote {
  version: number;
  source: 'libavoid' | 'channel';
  reason?: string;
  wallMs: number;
  solveMs: number;
  edges: number;
}
function noteRouting(n: RoutingNote): void {
  if (!TOOLS) return;
  const w = window as unknown as { __abCanvas?: { routing: RoutingNote[] } };
  const log = (w.__abCanvas ??= { routing: [] }).routing;
  log.push(n);
  if (log.length > 60) log.shift();
}

const esc = (id: string): string => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&'));

// ---------- the stage ----------

function Stage(p: CanvasProps): ReactElement {
  const { display, catalog, lang, t, actions } = p;
  const rf = useReactFlow();
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false); // React Flow's pan and zoom is up: a viewport set before this is dropped
  const [fontEpoch, setFontEpoch] = useState(0);
  const layout = display.layout;
  const reduced = prefersReducedMotion();

  // ----- size: measured here, reported to the store once it settles (Focus diagram animates the width) -----
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let timer = 0;
    let first = true;
    const read = (): void => {
      const s = { w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) };
      setSize((cur) => (cur.w === s.w && cur.h === s.h ? cur : s));
      if (first) {
        first = false;
        actions.setSize(s);
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => actions.setSize(s), 140);
    };
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [actions]);

  // brand fonts that load after first paint change every measured width
  useEffect(() => {
    let live = true;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    void fonts?.ready.then(() => live && setFontEpoch((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);

  // ----- the scene: what is drawn -----
  const measure = useMemo(() => makeMeasurer(getComputedStyle(document.body).fontFamily), [lang, fontEpoch]);
  const scene = useMemo<Scene | null>(() => (layout ? buildScene({ layout, graph: display.graph, catalog, lang, t, measure }) : null), [layout, display.graph, catalog, lang, t, measure]);
  const motion = useMemo(() => planMotion(display.prev, layout, display.animate), [display.version]); // eslint-disable-line react-hooks/exhaustive-deps
  // The clock keeps what is running running when the next batch lands (every 180 ms while Qwen streams): an entrance,
  // a glide, a ghost or an edge draw started by one layout version finishes on its own schedule, and a new op retargets
  // a moving card from where it is. Nothing waits in a queue.
  const clockRef = useRef<MotionClock | null>(null);
  const clock = (clockRef.current ??= createMotionClock());
  // the scene before this layout version: the exiting cards are drawn from it
  const lastScene = useRef<Scene | null>(null);
  const applied = useRef(-1);
  const ghostViews = useRef(new Map<string, CardView>());
  if (applied.current !== display.version) {
    applied.current = display.version;
    clock.apply(motion, performance.now());
    for (const id of motion.exit) {
      const v = lastScene.current?.byId.get(id);
      if (v) ghostViews.current.set(id, v);
    }
  }
  useEffect(() => {
    lastScene.current = scene;
  }, [scene]);
  // bumped when a ghost or a leaving edge has finished, so it leaves the DOM
  const [tick, setTick] = useState(0);
  const ghosts: CardView[] = useMemo(() => {
    const now = performance.now();
    const live = new Set(clock.ghosts(now));
    const out: CardView[] = [];
    for (const [id, v] of ghostViews.current) {
      if (!live.has(id)) ghostViews.current.delete(id);
      else if (!(layout && Object.hasOwn(layout.cards, id))) out.push(v);
    }
    return out;
  }, [clock, layout, tick, display.version]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- routing: planned here, solved in a worker, the channel router answers when libavoid is late -----
  const port = useRef<AvoidPort | null>(null);
  useEffect(() => {
    port.current = createAvoidPort();
    return () => {
      port.current?.dispose();
      port.current = null;
    };
  }, []);
  const planned = useMemo(() => (layout ? planEdges(display.graph, layout, catalog) : null), [display.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const [routed, setRouted] = useState<Routed | null>(null);
  const routedVersion = useRef(0);
  useEffect(() => {
    if (!planned || !layout) {
      routedVersion.current = 0;
      setRouted(null);
      return;
    }
    const v = display.version;
    let live = true;
    const apply = (r: Routed): void => {
      if (r.version < routedVersion.current) return;
      routedVersion.current = r.version;
      setRouted(r);
    };
    const t0 = performance.now();
    void routeWithBudget(planned, { avoid: port.current, channel: routeChannels, budgetMs: ROUTE_BUDGET_MS }).then((r) => {
      noteRouting({ version: v, source: r.source, reason: r.reason, wallMs: Math.round(performance.now() - t0), solveMs: Math.round(r.result.ms), edges: planned.edges.length });
      if (!live) return;
      apply({ version: v, routes: r.result.routes, source: r.source });
      // libavoid was late: its answer replaces the fallback's once the layout is still the one it was solved for
      void r.late?.then((l) => {
        if (l) noteRouting({ version: v, source: 'libavoid', reason: 'late', wallMs: Math.round(performance.now() - t0), solveMs: Math.round(l.ms), edges: planned.edges.length });
        if (live && l && routedVersion.current <= v) apply({ version: v, routes: l.routes, source: 'libavoid' });
      });
    });
    return () => {
      live = false;
    };
  }, [planned]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- hover, focus and the popover -----
  const [pop, setPop] = useState<{ id: string; by: OpenedBy } | null>(null);
  const [hotId, setHotId] = useState<string | null>(null);
  const [stopId, setStopId] = useState<string | null>(null);
  const machine = useRef<HoverMachine | null>(null);
  const focusIntoPop = useRef(false);
  const lastPopId = useRef<string | null>(null);
  /** Escape returns focus to the card: that focus must not open the popover again. */
  const quiet = useRef<string | null>(null);
  if (!machine.current) {
    machine.current = createHoverMachine(
      (id, by) => {
        setPop(id && by ? { id, by } : null);
        if (id) lastPopId.current = id;
      },
      { set: (fn, ms) => window.setTimeout(fn, ms), clear: (id) => window.clearTimeout(id) },
    );
  }
  useEffect(() => () => machine.current?.dispose(), []);

  const nav = useMemo(() => (scene && layout ? navItems(scene, layout) : null), [scene, layout]);
  const stop = useMemo(() => (nav ? rovingStop(nav.order, stopId) : null), [nav, stopId]);
  const cardOfId = useCallback((id: string): string => scene?.badgeById.get(id)?.host ?? id, [scene]);

  const elementOf = useCallback((id: string): HTMLElement | null => root.current?.querySelector<HTMLElement>(`[data-nav-id="${esc(id)}"]`) ?? null, []);

  const occludedBottom = useCallback((): number => {
    const el = root.current;
    const panel = document.getElementById('products');
    if (!el || !panel) return 0;
    const r = el.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    return Math.max(0, r.bottom - pr.top);
  }, []);

  const setView = useCallback(
    (v: Viewport, ms: number): void => {
      void rf.setViewport(v, { duration: reduced ? 0 : ms, ease });
    },
    [rf, reduced],
  );

  // keep a card in view with the least movement (keyboard focus, a click on the record)
  const reveal = useCallback(
    (rect: Rect, ms = FIT_MS): void => {
      const v = revealViewport(rf.getViewport(), size, rect, 32, occludedBottom());
      if (v) setView(v, ms);
    },
    [rf, size, occludedBottom, setView],
  );

  const ui = useMemo<CanvasUi>(
    () => ({
      lang,
      t,
      pointerEnter: (id) => {
        machine.current?.pointerEnter(id);
        setHotId(id);
        actions.hoverCard(cardOfId(id));
      },
      pointerLeave: (id) => {
        machine.current?.pointerLeave(id);
        setHotId((cur) => (cur === id ? null : cur));
        actions.hoverCard(null);
      },
      focus: (id) => {
        if (quiet.current === id) quiet.current = null;
        else machine.current?.focus(id);
        setHotId(id);
        setStopId(id);
        actions.hoverCard(cardOfId(id));
        const el = elementOf(id);
        if (el && layout && el.matches(':focus-visible')) {
          const c = scene?.byId.get(cardOfId(id));
          const b = c ? cardBounds(layout, c.id) : undefined;
          if (b) reveal(b);
        }
      },
      blur: (id) => {
        machine.current?.blur(id);
        setHotId((cur) => (cur === id ? null : cur));
        actions.hoverCard(null);
      },
      click: (id) => machine.current?.click(id),
      tagEnter: (n) => {
        const cards = p.tagged?.n === n ? p.tagged.cards : [];
        actions.highlight({ source: 'card', cards, ghosts: [], revision: n });
      },
      tagLeave: () => actions.highlight(null),
      tagClick: (n) => actions.revealRevision(n),
      popId: pop?.id ?? null,
      popDomId: POP_ID,
    }),
    [lang, t, actions, cardOfId, elementOf, layout, scene, reveal, pop?.id, p.tagged],
  );

  // ----- highlight (record and panel to canvas) -----
  const lit = useMemo(() => litCards(p.highlight?.cards ?? [], layout), [p.highlight, layout]);
  const litBadgeIds = useMemo(() => (layout ? (p.highlight?.cards ?? []).filter((id) => Object.hasOwn(layout.badges, id)) : []), [p.highlight, layout]);
  const mark = useMemo(() => litCards(p.building, layout), [p.building, layout]);
  const tagSet = useMemo(() => litCards(p.tagged?.cards ?? [], layout), [p.tagged, layout]);
  // At commit the revision's tags stamp on in request-path order, 30 ms apart (at most 6 steps), as the BuildMarks
  // retract. A restored session's tags are simply there.
  const stamps = useMemo(() => {
    const out = new Map<string, number>();
    if (!layout || !display.animate || display.reason !== 'commit') return out;
    pathOrder([...tagSet], layout).forEach((id, i) => out.set(id, Math.min(i, STAGGER_MAX - 1) * STAGGER_MS));
    return out;
  }, [tagSet, layout, display.animate, display.reason]);

  // ----- edges -----
  const drawn = useRef<Set<string>>(new Set());
  const plannedIds = useRef<Set<string>>(new Set());
  const lastDraw = useRef(new Map<string, EdgeDraw>());
  const edgeData = useMemo<EdgesData>(() => {
    if (!planned || !routed || !layout) return { edges: [], dimming: false };
    const now = performance.now();
    // an edge that left the graph fades where it was (only in an animated change)
    const ids = new Set(planned.edges.map((e) => e.id));
    for (const id of plannedIds.current) if (!ids.has(id) && lastDraw.current.has(id) && display.animate) clock.leave(id, now);
    plannedIds.current = ids;
    const hot = new Set<string>();
    if (hotId) hot.add(cardOfId(hotId));
    const edges = drawEdges({
      planned: planned.edges,
      routes: routed.routes,
      routedVersion: routed.version,
      version: display.version,
      layout,
      motion,
      hot,
      lit,
      building: mark,
      streaming: p.streaming,
      drawn: drawn.current,
      measure: (s) => measure.body(s, 12),
      timing: (id, key, ends, returning) => clock.edge(id, key, now, clock.wait(ends, now), display.animate, returning),
    });
    for (const e of edges) lastDraw.current.set(e.id, e);
    const leaving: EdgeDraw[] = [];
    const going = new Set(clock.leaving(now));
    for (const [id, e] of lastDraw.current) {
      if (ids.has(id)) continue;
      if (going.has(id)) leaving.push({ ...e, leave: true, draw: null, appear: false, hot: false, dim: lit.size > 0 });
      else lastDraw.current.delete(id);
    }
    return { edges: [...leaving, ...edges], dimming: lit.size > 0 };
  }, [planned, routed, layout, display.version, motion, hotId, lit, mark, p.streaming, measure, cardOfId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // the next moment a ghost or a leaving edge is done: render then, so it leaves the DOM
  useEffect(() => {
    const now = performance.now();
    const at = clock.nextChange(now);
    if (at === null) return;
    const id = window.setTimeout(() => setTick((n) => n + 1), Math.max(16, at - now + 20));
    return () => window.clearTimeout(id);
  });

  useEffect(() => {
    drawn.current = new Set(edgeData.edges.map((e) => e.id));
  }, [edgeData]);

  // ----- nodes -----
  const nodes = useMemo<Node[]>(() => {
    if (!layout || !scene) return [];
    const now = performance.now();
    const out: Node[] = [];
    for (const f of scene.frames) {
      // a solution lane with nothing in it stays off the sheet; only 'Cloud resources' says so out loud (canvas.mapEmpty)
      if (f.empty && f.kind === 'solution' && f.lane !== 'cloud') continue;
      const data: FrameData = { view: f, emptyText: f.empty && f.kind === 'solution' && f.lane === 'cloud' ? t('canvas.mapEmpty') : null, enter: clock.frameEnter(f.id, now) };
      out.push({ id: 'f:' + f.id, type: 'frame', position: { x: f.x, y: f.y }, width: f.w, height: f.h, data, zIndex: f.depth, draggable: false, selectable: false, focusable: false, connectable: false, className: clock.moving('f:' + f.id, now) ? 'is-moving' : undefined });
    }
    out.push({ id: 'edges', type: 'edges', position: { x: 0, y: 0 }, width: 1, height: 1, data: edgeData, zIndex: 10, draggable: false, selectable: false, focusable: false, connectable: false });
    const dimming = lit.size > 0;
    const badgeHot = hotId ? cardOfId(hotId) : null;
    for (const c of scene.cards) {
      const data: CardData = {
        view: c,
        mark: mark.has(c.id),
        tag: tagSet.has(c.id) && p.tagged ? p.tagged.n : null,
        tagPressed: !!p.highlight && p.highlight.revision === p.tagged?.n && p.tagged !== null,
        lit: lit.has(c.id),
        dim: dimming && !lit.has(c.id),
        litBadges: litBadgeIds.filter((id) => scene.badgeById.get(id)?.host === c.id),
        hot: badgeHot === c.id || p.hoverCard === c.id,
        enter: clock.enter(c.id, now),
        moving: clock.moving(c.id, now),
        stop,
        stamp: tagSet.has(c.id) && p.tagged && stamps.has(c.id) ? clock.stamp(c.id, p.tagged.n, stamps.get(c.id) ?? 0, now) : null,
        snaps: [...c.badges, ...c.attachments]
          .flatMap((b) => {
            const d = clock.badge(b.id, now);
            return d === null ? [] : [`${b.id}:${d}`];
          })
          .join(','),
      };
      out.push({ id: c.id, type: 'card', position: { x: c.x, y: c.y }, width: c.w, height: c.h, data, zIndex: 20, draggable: false, selectable: false, focusable: false, connectable: false, className: data.moving ? 'is-moving' : undefined });
    }
    for (const g of ghosts) {
      const data: CardData = { view: g, mark: false, tag: null, tagPressed: false, lit: false, dim: false, litBadges: [], hot: false, enter: null, moving: false, stop: null, ghost: true };
      out.push({ id: 'ghost:' + g.id, type: 'card', position: { x: g.x, y: g.y }, width: g.w, height: g.h, data, zIndex: 19, draggable: false, selectable: false, focusable: false, connectable: false, className: 'is-ghost' });
    }
    return out;

  }, [layout, scene, motion, ghosts, edgeData, lit, litBadgeIds, mark, tagSet, stamps, hotId, stop, p.tagged, p.highlight, p.hoverCard, t, cardOfId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- the camera -----
  const fitted = useRef<{ version: number; w: number; h: number } | null>(null);
  const hasFit = useRef(false);
  const [hintUntil, setHintUntil] = useState(0);
  const [hintHover, setHintHover] = useState(false);
  const [now, setNow] = useState(0);
  const fit = useCallback(
    (animate: boolean): void => {
      if (!layout || size.w < 50 || size.h < 50) return;
      const sticky = hasFit.current ? stickyCamera(rf.getViewport()) : undefined;
      const cam = fitCamera(layout, size, sticky);
      hasFit.current = true;
      peeked.current = null;
      setView(viewportOf(cam), animate ? FIT_MS : 0);
      if (cam.pan) {
        setHintUntil(performance.now() + HINT_MS);
        setNow(performance.now());
      }
    },
    [layout, size, rf, setView],
  );
  const wantFit = useRef<{ animate: boolean } | null>(null);
  useEffect(() => {
    if (!layout) {
      hasFit.current = false;
      return;
    }
    // the store flags a refit once (first batch, commit, restore, resize); a canvas that mounts after the flag still fits once
    if (display.refit || !hasFit.current) wantFit.current = { animate: display.animate && hasFit.current };
    if (wantFit.current && size.w >= 50 && ready) {
      const a = wantFit.current.animate;
      wantFit.current = null;
      fit(a);
      fitted.current = { version: display.version, w: size.w, h: size.h };
    }
  }, [display.version, size.w, size.h, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // the pan hint fades after its time
  useEffect(() => {
    if (hintUntil <= now) return;
    const id = window.setTimeout(() => setNow(performance.now()), hintUntil - now + 20);
    return () => window.clearTimeout(id);
  }, [hintUntil, now]);

  // a click on a change line or a panel row asks the canvas to show the cards
  const lastPan = useRef(0);
  useEffect(() => {
    if (!p.panTo || p.panTo.seq === lastPan.current || !layout) return;
    lastPan.current = p.panTo.seq;
    const rects = [...litCards(p.panTo.ids, layout)].map((id) => cardBounds(layout, id)).filter((r): r is Rect => !!r);
    const u = unionRect(rects);
    if (!u) return;
    const v = rf.getViewport();
    const tgt = revealViewport(v, size, u, 48, occludedBottom());
    if (tgt) setView(tgt, FIT_MS);
  }, [p.panTo, layout, rf, size, occludedBottom, setView]);

  // A panel row points at a card the open panel may be covering. Spec 7.24 pans only on a click, but a highlight nobody can
  // see is no link: while such a row is hovered, the camera lifts the card clear of the panel and puts the view back after.
  const peeked = useRef<Viewport | null>(null);
  const unpeek = useRef<number | null>(null);
  useEffect(() => {
    if (!layout) return;
    if (unpeek.current !== null) {
      window.clearTimeout(unpeek.current);
      unpeek.current = null;
    }
    const h = p.highlight;
    if (h && h.source === 'panel' && lit.size) {
      const u = unionRect([...lit].map((id) => cardBounds(layout, id)).filter((r): r is Rect => !!r));
      if (!u) return;
      const rest = peeked.current ?? rf.getViewport();
      const tgt = revealViewport(rest, size, u, 48, occludedBottom());
      if (tgt) {
        peeked.current = rest;
        setView(tgt, FIT_MS);
      } else if (peeked.current) {
        const back = peeked.current;
        peeked.current = null;
        setView(back, FIT_MS);
      }
      return;
    }
    if (peeked.current) {
      unpeek.current = window.setTimeout(() => {
        unpeek.current = null;
        const back = peeked.current;
        peeked.current = null;
        if (back) setView(back, FIT_MS);
      }, 140);
    }
  }, [p.highlight, lit, layout, rf, size, occludedBottom, setView]);
  useEffect(() => () => { if (unpeek.current !== null) window.clearTimeout(unpeek.current); }, []);

  // ----- zoom tools -----
  const zoomTo = useCallback(
    (z: number): void => {
      const v = rf.getViewport();
      setView(zoomAbout(v, z, { x: size.w / 2, y: Math.max(0, size.h - occludedBottom()) / 2 }), 160);
    },
    [rf, size, occludedBottom, setView],
  );

  // ----- keyboard -----
  const focusNav = useCallback(
    (id: string): void => {
      const el = elementOf(id);
      if (!el) return;
      el.focus({ preventScroll: true });
    },
    [elementOf],
  );
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    const navEl = target.closest<HTMLElement>('[data-nav-id]');
    const id = navEl?.dataset.navId ?? null;
    const inPop = !!target.closest('.cv-pop');
    if (e.key === 'Escape') {
      if (machine.current?.open) {
        const back = lastPopId.current;
        machine.current.escape();
        e.preventDefault();
        if (back) {
          quiet.current = back;
          focusNav(back);
        }
      }
      return;
    }
    if (inPop) return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      fit(true);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomTo(zoomStep(rf.getViewport().zoom, 1));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomTo(zoomStep(rf.getViewport().zoom, -1));
    } else if (id && nav && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const dir: NavDir = e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowUp' ? 'up' : 'down';
      const next = nearest(nav.items, id, dir);
      if (next) focusNav(next);
    } else if (id && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      focusIntoPop.current = true;
      machine.current?.click(id);
    }
  };

  // Enter moves focus into the popover so its link is reachable; the card must not close it by blurring
  const popTarget = pop ? (scene?.byId.get(pop.id) ?? scene?.badgeById.get(pop.id) ?? null) : null;
  const anchor = pop ? elementOf(pop.id) : null;
  const popBounds = useMemo(() => {
    const r = root.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    return { x: r.left, y: r.top, w: r.width, h: Math.max(80, r.height - occludedBottom()) };
  }, [pop, size, occludedBottom]); // eslint-disable-line react-hooks/exhaustive-deps
  const content = useMemo(() => (popTarget ? popContent(popTarget, 'host' in popTarget ? (scene?.byId.get(popTarget.host)?.label ?? null) : null, catalog, p.provenance, lang, t) : null), [popTarget, scene, catalog, p.provenance, lang, t]);
  useEffect(() => {
    if (!pop || !focusIntoPop.current) return;
    const el = document.getElementById(POP_ID);
    const first = el?.querySelector<HTMLElement>('a, button');
    focusIntoPop.current = false;
    if (first) {
      machine.current?.holdForFocus();
      first.focus();
    }
  }, [pop]);

  // the viewport moved under an open popover: close it
  const onMoveStart = useCallback((e: unknown) => {
    machine.current?.closeNow();
    if (e) peeked.current = null; // the viewer took the camera: nothing to put back
  }, []);
  const onMove = useCallback((_e: unknown, v: Viewport) => setZoom(v.zoom), []);
  const extent = useMemo(() => (layout ? panExtent(fitBox(layout)) : undefined), [layout]);

  const hintShown = now < hintUntil || hintHover;
  const empty = !layout;

  return (
    <UiContext.Provider value={ui}>
      <div
        ref={root}
        className="cv"
        data-mode={p.mode}
        data-router={routed?.source}
        data-empty={empty || undefined}
        data-streaming={p.streaming || undefined}
        data-nodes={scene?.cards.length ?? 0}
        data-zoom={zoom.toFixed(3)}
        onKeyDown={onKeyDown}
      >
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={ZOOM_MIN}
          maxZoom={ZOOM_MAX}
          translateExtent={extent}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          selectionOnDrag={false}
          disableKeyboardA11y
          panOnDrag
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          zoomOnDoubleClick={false}
          zoomActivationKeyCode={['Control', 'Meta']}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: false }}
          onMoveStart={onMoveStart}
          onMove={onMove}
          onInit={(inst) => {
            setZoom(inst.getZoom());
            setReady(true);
          }}
        />
        {empty && p.reading ? (
          <p className="cv-reading">
            {t(p.finishing ? 'rec.finishing' : 'canvas.reading')}
            <i className="cv-cursor" aria-hidden="true" />
          </p>
        ) : null}
        {empty && p.blank ? <p className="cv-reading">{t('canvas.blank')}</p> : null}
        {!empty ? (
          <ZoomTools
            t={t}
            lang={lang}
            zoom={zoom}
            onOut={() => zoomTo(zoomStep(rf.getViewport().zoom, -1))}
            onIn={() => zoomTo(zoomStep(rf.getViewport().zoom, 1))}
            onFit={() => fit(true)}
            onValueHover={setHintHover}
          />
        ) : null}
        {!empty && p.mode === 'architecture' ? <Legend t={t} lang={lang} /> : null}
        {!empty ? <PanHint t={t} show={hintShown} /> : null}
        <p id="cv-keys" className="visually-hidden">
          {label(lang, 'canvas.keys')}
        </p>
      </div>
      {pop && content && anchor ? (
        <Popover
          id={POP_ID}
          content={content}
          anchor={anchor}
          bounds={popBounds}
          t={t}
          addedInRevision={p.provenance[pop.id]?.addedIn ?? (popTarget && 'host' in popTarget ? (p.provenance[popTarget.host]?.addedIn ?? null) : null)}
          onEnter={() => machine.current?.popoverEnter()}
          onLeave={() => machine.current?.popoverLeave()}
          onEscape={() => {
            const back = lastPopId.current;
            machine.current?.escape();
            if (back) {
              quiet.current = back;
              focusNav(back);
            }
          }}
          onRevision={(n) => actions.revealRevision(n)}
          onFocusIn={() => machine.current?.holdForFocus()}
          onFocusOut={() => {
            machine.current?.releaseHold();
            machine.current?.closeNow();
          }}
        />
      ) : null}
    </UiContext.Provider>
  );
}

