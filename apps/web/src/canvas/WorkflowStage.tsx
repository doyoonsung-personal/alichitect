import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { WorkflowViewProps } from '../workflow/contracts.ts';
import { normalizeWorkflowLayout } from '../workflow/layout-adapter.ts';
import { buildWorkflowScene } from '../workflow/scene.ts';
import { planWorkflowEdges, drawWorkflowEdges, checkedWorkflowRoutes, workflowDrawingBounds } from '../workflow/edges.ts';
import { minimumWorkflowZoom, workflowInitialViewport, workflowFollowViewport } from '../workflow/camera.ts';
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
  const [focus, setFocus] = useState<string | null>(null), [open, setOpen] = useState<string | null>(null);
  const [, tick] = useState(0);
  const [routes, setRoutes] = useState<Record<string, Pt[]>>({});
  const layout = useMemo(() => normalizeWorkflowLayout(p.workflow, p.layout), [p.workflow, p.layout]);
  const measure = useMemo(() => makeMeasurer('sans-serif'), []);
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
    setRoutes({});
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
  const programmatic = useRef(0);
  const setView = (v: typeof viewport) => { const next = { ...v, zoom: Math.max(minZoom, v.zoom) };
        programmatic.current++;
    setViewport(next);
    void rf.setViewport(next).finally(() => { programmatic.current--; });
  };
  const fit = () => {
    const v = workflowInitialViewport(layout.source, { width: size.width, height: size.height - 130 });
    setView({ ...v, y: Math.max(120, v.y + 110) });
  };
  const started = useRef(false), newest = useRef(-1);
  useEffect(() => {
    if (!scene.cards.length) return;
    const column = Math.max(...scene.cards.map((c) => c.x));
    if (!started.current) { started.current = true; fit(); }
    else if (following && p.streaming && column > newest.current) {
      const card = scene.cards.find((c) => c.x === column)!;
      setView(workflowFollowViewport(rf.getViewport(), card, { x: 0, y: 100, w: size.width, h: size.height - 160 }));
    }
    newest.current = Math.max(column, newest.current);
  }, [p.version, size.width, size.height]);
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
    const occluded = p.open ? (document.getElementById('products')?.getBoundingClientRect().height ?? 0) : 48;
    const v = revealViewport(rf.getViewport(), { w: size.width, h: size.height }, card, 24, occluded);
    const next = v ?? rf.getViewport();
    if (card.y * next.zoom + next.y < 120) next.y = 120 - card.y * next.zoom;
    if (v || next.y !== rf.getViewport().y) setView(next);
  };
  useEffect(() => { if (p.panTo?.ids[0]) reveal(p.panTo.ids[0]); }, [p.panTo?.seq]);
  useEffect(() => { if (focus && !scene.byId.has(focus)) { setFocus(stop); if (stop) element(stop)?.focus(); hover.closeNow(); } },
    [p.version]);
  const close = () => { hover.escape(); if (open) element(open)?.focus(); hover.escape(); };
  const edges = drawWorkflowEdges({ plan, routes, measure: (s) => measure.body(s, 12) });
  const bounds = workflowDrawingBounds(plan, edges);
  const overviewLayout = { ...layout.source, bounds, width: bounds.w, height: bounds.h };
  const nodes: Node[] = [
    { id: 'wf-edges', type: 'workflowEdges', position: { x: 0, y: 0 }, data: { edges, t: p.t,
      width: bounds.w + 100, height: bounds.h + 100 }, selectable: false, focusable: false, zIndex: -1 },
    ...scene.brackets.map((b) => ({ id: b.id, type: 'workflowRepeat', position: { x: b.x, y: b.y },
      data: { bracket: b }, selectable: false, focusable: false })),
    ...[...scene.cards, ...ghosts].map((card) => ({ id: card.id, type: 'workflowCard', position: { x: card.x, y: card.y }, width: card.w, height: card.h,
      style: { transition: clock.current.moving(card.id, performance.now()) && !prefersReducedMotion() ? 'transform 450ms ease' : 'none' },
      data: { card, t: p.t, ghost: !scene.byId.has(card.id), tab: stop === card.id,
        highlighted: p.highlight?.cards.some((id) => id === card.id || card.hidden.includes(id)) ?? false,
        revision: p.tagged?.cards.includes(card.id) ? p.tagged.n : null,
        stamp: p.tagged?.cards.includes(card.id) ? clock.current.stamp(card.id, p.tagged.n, 0, performance.now()) : null,
        building: p.building.includes(card.id),
        delay: clock.current.enter(card.id, performance.now()),
        enter: () => hover.pointerEnter(card.id), leave: () => hover.pointerLeave(card.id),
        focus: () => { setFocus(card.id); reveal(card.id); hover.focus(card.id); }, blur: () => hover.blur(card.id),
        open: () => { hover.click(card.id); hover.holdForFocus();
          requestAnimationFrame(() => document.querySelector<HTMLElement>('#cv-pop button')?.focus()); },
        key: (e: React.KeyboardEvent) => {
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
  return <div className="wf-stage" ref={root}>
    <ReactFlow viewport={viewport} onViewportChange={setViewport} nodes={nodes} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false}
      elementsSelectable={false} nodesFocusable={false} edgesFocusable={false} minZoom={minZoom} maxZoom={1.5}
      panOnScroll zoomOnDoubleClick={false} onMoveStart={(event) => { if (event && !programmatic.current) pause(); }}
      onMove={(_, v) => setViewport(v)} proOptions={{ hideAttribution: true }} />
    {!scene.cards.length && <p className="wf-empty">{p.t('workflow.canvas.empty')}</p>}
    <WorkflowTools layout={overviewLayout} viewport={viewport} size={size} t={p.t} following={following} disabled={p.disabled}
      fit={fit} zoom={(delta) => {
        pause(); setView({ ...viewport, zoom: Math.max(minZoom, Math.min(1.5, viewport.zoom + delta)) });
      }}
      tidy={() => p.actions.tidyWorkflowView()} resume={() => { setFollowing(true); setStatus(p.t('workflow.live.resumed'));
        const last = ordered.at(-1); if (last) reveal(last.id); }}
      navigate={(x, y) => { pause(); setView({ ...viewport, x: 24 - x * viewport.zoom, y: 110 - y * viewport.zoom }); }} />
    <p id="workflow-keys" className="visually-hidden">{p.t('workflow.canvas.keys')}</p>
    <p className="visually-hidden" role="status">{status}</p>
    {anchor && card && <WorkflowPopover card={card} view={p} anchor={anchor} machine={hover} close={close} />}
  </div>;
}
