import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { WorkflowViewProps } from '../workflow/contracts.ts';
import { normalizeWorkflowLayout } from '../workflow/layout-adapter.ts';
import { buildWorkflowScene } from '../workflow/scene.ts';
import { planWorkflowEdges, drawWorkflowEdges, checkedWorkflowRoutes, workflowDrawingBounds } from '../workflow/edges.ts';
import { newestWorkflowStep, zoomWorkflowViewport, minimumWorkflowZoom, workflowInitialViewport, workflowFollowViewport } from '../workflow/camera.ts';
import { models } from '../workflow/models.ts';
import { makeMeasurer } from './measure.ts';
import type { AvoidPort } from '../routing/budget.ts';
import { routeWithBudget, ROUTE_BUDGET_MS } from '../routing/budget.ts';
import { createAvoidPort } from '../routing/avoid-port.ts';
import { routeChannels } from '../routing/channel.ts';
import type { Pt, RouteResult } from '../routing/types.ts';
import { WorkflowCardNode, WorkflowRepeatNode, WorkflowEdgeNode } from './WorkflowNodes.tsx';
import { WorkflowTools } from './WorkflowTools.tsx';
import { WorkflowPopover } from './WorkflowPopover.tsx';
import { createHoverMachine } from './hover.ts';
import { nearest, rovingStop } from './nav.ts';
import type { NavDir } from './nav.ts';
import { revealViewport, prefersReducedMotion } from './camera.ts';
import { planMotion, createMotionClock } from './motion.ts';
import './workflow.css';
const nodeTypes = { workflowCard: WorkflowCardNode, workflowRepeat: WorkflowRepeatNode, workflowEdges: WorkflowEdgeNode };
export function WorkflowStage(p: WorkflowViewProps) {
  return <ReactFlowProvider><Stage {...p} /></ReactFlowProvider>;
}
function Stage(p: WorkflowViewProps) {
  const root = useRef<HTMLDivElement>(null), rf = useReactFlow();
  const [size, setSize] = useState({ width: 640, height: 600 });
  const [viewport, setViewport] = useState({ x: 24, y: 24, zoom: 1 });
  const [following, setFollowing] = useState(true);
  const [status, setStatus] = useState('');
  const [unfolded, setUnfolded] = useState<string | null>(null);
  const popoverFold = useRef<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null), [open, setOpen] = useState<string | null>(null);
  const [, tick] = useState(0);
  const [routes, setRoutes] = useState<Record<string, Pt[]>>({});
  const measure = useMemo(() => makeMeasurer('Arial, sans-serif'), []);
  const layout = useMemo(() => normalizeWorkflowLayout(p.workflow, p.layout, { measure: measure.title, settings: p.settings }),
    [p.workflow, p.layout, measure, p.settings]);
  const scene = useMemo(() => buildWorkflowScene({ workflow: p.workflow, layout, catalog: p.catalog,
    models, settings: p.settings, lang: p.lang, t: p.t, measure }), [p.workflow, layout, p.catalog, p.settings, p.lang, p.t, measure]);
  const plan = useMemo(() => planWorkflowEdges({ workflow: p.workflow, scene, layout }), [p.workflow, scene, layout]);
  const minZoom = minimumWorkflowZoom(scene.cards.map((c) => c.titlePx));
  const ordered = [...scene.cards].sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id));
  const stop = rovingStop(ordered.map((c) => c.id), focus);
  const clock = useRef(createMotionClock()), previous = useRef<typeof layout.motion | null>(null);
  const previousVersion = useRef(-1);
  if (previousVersion.current !== p.version) {
    clock.current.apply(planMotion(previous.current, layout.motion, !prefersReducedMotion()), performance.now());
    previous.current = layout.motion; previousVersion.current = p.version;
  }
  const cached = useRef(new Map<string, typeof scene.cards[number]>());
  for (const card of scene.cards) cached.current.set(card.id, card);
  const ghosts = clock.current.ghosts(performance.now()).flatMap((id) =>
    !scene.byId.has(id) && cached.current.has(id) ? [cached.current.get(id)!] : []);
  useEffect(() => {
    const next = clock.current.nextChange(performance.now());
    if (next === null) return;
    const timer = window.setTimeout(() => tick((n) => n + 1), Math.max(1, next - performance.now() + 5));
    return () => clearTimeout(timer);
  });
  const hover = useMemo(() => createHoverMachine((id) => setOpen(id),
    { set: (fn, ms) => window.setTimeout(fn, ms), clear: (id) => window.clearTimeout(id) }), []);
  useEffect(() => () => hover.dispose(), [hover]);
  useLayoutEffect(() => {
    if (!root.current) return;
    let frame = 0;
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize((prev) =>
        prev.width === entry.contentRect.width && prev.height === entry.contentRect.height ? prev
          : { width: entry.contentRect.width, height: entry.contentRect.height }));
    });
    ro.observe(root.current); return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, []);
  const [port, setPort] = useState<AvoidPort | null>(null);
  useEffect(() => { const next = createAvoidPort(); setPort(next); return () => next?.dispose(); }, []);
  useEffect(() => {
    let active = true;
    setRoutes(checkedWorkflowRoutes(plan, {}));
    const accept = (result: RouteResult) => {
      if (!active) return;
      // An emergency elbow is not verified geometry. Keep it out of the drawing.
      setRoutes(checkedWorkflowRoutes(plan, result.routes, result.failed));
    };
    void routeWithBudget(plan.request, { avoid: port, channel: routeChannels, budgetMs: ROUTE_BUDGET_MS }).then((answer) => {
      accept(answer.result); void answer.late?.then((late) => { if (late) accept(late); });
    });
    return () => { active = false; };
  }, [plan, port]);
  const edges = drawWorkflowEdges({ plan, routes, measure: (s) => measure.body(s, 12) });
  const bounds = workflowDrawingBounds(plan, edges);
  const overviewLayout = { ...layout.source, bounds, width: bounds.w, height: bounds.h,
    cards: Object.fromEntries(scene.cards.map((c) => [c.id, { ...layout.source.cards[c.id], h: c.h,
      title: { lines: c.titleLines, px: c.titlePx } }])) };
  const programmatic = useRef(0);
  const activeFocus = useRef<string | null>(null);
  const moveStart = useRef<typeof viewport | null>(null);
  const currentView = useRef(viewport);
  const previousWorkflow = useRef(p.workflow), newest = useRef<string | null>(null);
  const target = newestWorkflowStep(previousWorkflow.current, p.workflow, newest.current);
  useEffect(() => { previousWorkflow.current = p.workflow; newest.current = target; }, [p.workflow, target]);
  const [occluded, setOccluded] = useState(50);
  useLayoutEffect(() => {
    const stage = root.current, panel = document.getElementById('products');
    if (!stage || !panel) return;
    const update = () => {
      const bottom = stage.getBoundingClientRect().bottom;
      const slotBottom = panel.parentElement?.getBoundingClientRect().bottom ?? bottom;
      setOccluded(p.open ? Math.max(50, bottom - slotBottom + panel.offsetHeight) : 50);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage); observer.observe(panel);
    return () => observer.disconnect();
  }, [p.open, size.width, size.height]);
  const visible = { x: 0, y: 110, w: size.width, h: Math.max(0, size.height - 110 - occluded) };
  const setView = (v: typeof viewport) => { const next = { ...v, zoom: Math.max(minZoom, v.zoom) };
    programmatic.current++;
    currentView.current = next;
    setViewport(next);
    void rf.setViewport(next).finally(() => { programmatic.current--; });
  };
  const fittedView = () => {
    const v = workflowInitialViewport(overviewLayout, { width: size.width, height: visible.h });
    return { ...v, y: v.y + 110 };
  };
  const fit = () => setView(fittedView());
  const started = useRef(false);
  const targetCard = () => {
    let id = target;
    const visited = new Set<string>();
    while (id && !scene.byId.has(id) && !visited.has(id)) {
      visited.add(id); id = layout.attachmentOwners[id];
    }
    return id ? scene.byId.get(id) : undefined;
  };
  const followView = (reset = false) => {
    const v = reset || !started.current || !p.streaming ? fittedView() : rf.getViewport();
    const card = targetCard();
    return p.streaming && card ? workflowFollowViewport({ ...v, zoom: Math.max(minZoom, v.zoom) }, card, visible) : v;
  };
  useEffect(() => {
    if (!scene.cards.length) return;
    if (!started.current || following) {
      setView(followView()); started.current = true;
    }
  }, [p.version, p.streaming, following, size.width, size.height, occluded,
    p.streaming ? 0 : bounds.x, p.streaming ? 0 : bounds.y, p.streaming ? 0 : bounds.w, p.streaming ? 0 : bounds.h]);
  const pause = () => { if (following) { setFollowing(false); setStatus(p.t('workflow.live.paused')); } };
  const element = (id: string) => Array.from(root.current?.querySelectorAll<HTMLElement>('[data-wf-card]') ?? [])
    .find((el) => el.dataset.wfCard === id);
  const reveal = (id: string) => {
    let card = scene.byId.get(id);
    const visited = new Set<string>();
    while (!card && layout.attachmentOwners[id] && !visited.has(id)) {
      visited.add(id); id = layout.attachmentOwners[id]; card = scene.byId.get(id);
    }
    if (!card) return;
    const v = revealViewport(rf.getViewport(), { w: size.width, h: size.height }, card, 24, occluded);
    const next = v ?? rf.getViewport();
    if (card.y * next.zoom + next.y < 120) next.y = 120 - card.y * next.zoom;
    if (v || next.y !== rf.getViewport().y) setView(next);
  };
  useEffect(() => { if (p.panTo?.ids[0]) reveal(p.panTo.ids[0]); }, [p.panTo?.seq]);
  useEffect(() => {
    if (focus && !scene.byId.has(focus)) {
      const active = document.activeElement;
      const restore = activeFocus.current === focus && (active === document.body || root.current?.contains(active));
      setFocus(stop); activeFocus.current = null; hover.closeNow();
      if (stop && restore) element(stop)?.focus();
    }
  }, [p.version]);
  const foldButton = (id: string) => Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-wf-fold]') ?? [])
    .find((button) => button.dataset.wfFold === id);
  const closeFold = () => {
    setUnfolded(null);
    if (unfolded) (foldButton(unfolded) ?? root.current?.querySelector<HTMLButtonElement>('.wf-tools button'))?.focus({ preventScroll: true });
    hover.closeNow();
  };
  useEffect(() => {
    if (!unfolded) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-wf-shell]')?.getAttribute('data-wf-shell') !== unfolded) closeFold();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeFold(); }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape, true);
    };
  }, [unfolded]);
  useEffect(() => {
    if (!unfolded) return;
    const card = scene.byId.get(unfolded);
    if (!card || card.x * viewport.zoom + viewport.x >= visible.w
      || (card.x + card.w) * viewport.zoom + viewport.x <= 0
      || card.y * viewport.zoom + viewport.y >= visible.y + visible.h
      || (card.y + card.h) * viewport.zoom + viewport.y <= visible.y) closeFold();
  }, [unfolded, scene, viewport.x, viewport.y, viewport.zoom, visible.w, visible.h]);
  const close = () => {
    hover.escape();
    if (open) {
      if (popoverFold.current === open) foldButton(open)?.focus({ preventScroll: true });
      else element(open)?.focus();
    }
    popoverFold.current = null; hover.escape();
  };
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') hover.closeNow(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, hover]);
  // Only observe live moves: React Flow delays move-end callbacks, whose viewport may already be stale.
  const observeMove = (v: typeof viewport) => {
    const start = moveStart.current;
    if (start && (Math.abs(v.x - start.x) > 1 || Math.abs(v.y - start.y) > 1 || Math.abs(v.zoom - start.zoom) > .001)) {
      moveStart.current = null; pause();
    }
    currentView.current = v; setViewport(v);
  };
  const nodes: Node[] = [
    { id: 'wf:edges', type: 'workflowEdges', position: { x: 0, y: 0 }, data: { edges, t: p.t,
      width: bounds.w + 100, height: bounds.h + 100 }, selectable: false, focusable: false, zIndex: -1 },
    ...scene.brackets.map((b) => ({ id: b.id, type: 'workflowRepeat', position: { x: b.x, y: b.y },
      data: { bracket: b }, selectable: false, focusable: false })),
    ...[...scene.cards, ...ghosts].map((card) => ({ id: card.id, type: 'workflowCard', position: { x: card.x, y: card.y }, width: card.w, height: card.h,
      style: { transition: clock.current.moving(card.id, performance.now()) && !prefersReducedMotion() ? 'transform 450ms ease' : 'none' },
      zIndex: unfolded === card.id ? 20 : 0,
      data: { card, t: p.t, unfolded: unfolded === card.id,
        toggleFold: () => { hover.closeNow(); if (unfolded === card.id) closeFold(); else setUnfolded(card.id); },
        suppressPopover: () => hover.closeNow(), ghost: !scene.byId.has(card.id), tab: stop === card.id,
        highlighted: p.highlight?.cards.some((id) => id === card.id || card.hidden.includes(id)) ?? false,
        revision: p.tagged?.cards.includes(card.id) ? p.tagged.n : null,
        stamp: p.tagged?.cards.includes(card.id) ? clock.current.stamp(card.id, p.tagged.n, 0, performance.now()) : null,
        building: p.building.includes(card.id),
        delay: clock.current.enter(card.id, performance.now()),
        enter: () => { if (!unfolded) hover.pointerEnter(card.id); }, leave: () => hover.pointerLeave(card.id),
        focus: () => { activeFocus.current = card.id; setFocus(card.id); reveal(card.id); if (!unfolded) hover.focus(card.id); },
        blur: () => hover.blur(card.id),
        open: (fromFold = false) => {
          setUnfolded(null); popoverFold.current = fromFold ? card.id : null;
          hover.click(card.id); hover.holdForFocus();
          requestAnimationFrame(() => document.querySelector<HTMLElement>('#cv-pop button')?.focus()); },
        key: (e: React.KeyboardEvent) => {
          if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
          const dirs: Record<string, NavDir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
          if (dirs[e.key]) { e.preventDefault(); pause();
            const next = nearest(scene.cards.map((c) => ({ ...c, frame: '' })), card.id, dirs[e.key]);
            if (next) { setFocus(next); reveal(next); element(next)?.focus(); }
          }
          if (e.key === 'Escape') { e.preventDefault(); close(); }
          if (e.key.toLowerCase() === 'f') { e.preventDefault(); fit(); }
        },
      }, selectable: false, focusable: false, draggable: false })),
  ];
  const anchor = open ? element(open) : undefined, card = open ? scene.byId.get(open) : undefined;
  return <div className="wf-stage" ref={root}
    onBlurCapture={(e) => {
      const target = e.relatedTarget;
      if (!(target instanceof Element) || !target.closest('[data-wf-card], .wf-pop')) activeFocus.current = null;
    }}
    onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); close(); } }}>
    <ReactFlow viewport={viewport} onViewportChange={setViewport} nodes={nodes} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false}
      elementsSelectable={false} nodesFocusable={false} edgesFocusable={false} minZoom={minZoom} maxZoom={1.5}
      panOnScroll zoomOnDoubleClick={false}
      onMoveStart={(event, v) => {
        moveStart.current = event?.isTrusted && !programmatic.current ? currentView.current : null;
        observeMove(v);
      }}
      onMove={(_, v) => observeMove(v)} proOptions={{ hideAttribution: true }} />
    {!scene.cards.length && <p className="wf-empty">{p.t('workflow.canvas.empty')}</p>}
    {anchor && card && <WorkflowPopover card={card} view={p} anchor={anchor} machine={hover} close={close}
      viewport={viewport} visible={visible} edgeLabels={scene.edgeLabels} />}
    <WorkflowTools layout={overviewLayout} viewport={viewport} size={size} t={p.t} following={following} disabled={p.disabled}
      fit={fit} zoom={(delta) => {
        pause(); setView(zoomWorkflowViewport(viewport, Math.max(minZoom, Math.min(1.5, viewport.zoom + delta)), visible));
      }}
      tidy={() => p.actions.tidyWorkflowView()} resume={() => {
        if (following) { pause(); return; }
        setFollowing(true); setStatus(p.t('workflow.live.resumed')); setView(followView(true)); }}
      navigate={(x, y) => { pause(); setView({ ...viewport, x: 24 - x * viewport.zoom, y: 110 - y * viewport.zoom }); }} />
    <p id="workflow-keys" className="visually-hidden">{p.t('workflow.canvas.keys')}</p>
    <p className="visually-hidden" role="status">{status}</p>
  </div>;
}
