import { useLayoutEffect, useRef, useState } from 'react';
import type { Viewport } from '../workflow/camera.ts';
import type { Box } from './popover-pos.ts';
import type { WorkflowViewProps } from '../workflow/contracts.ts';
import type { WorkflowCardView } from '../workflow/scene.ts';
import type { HoverMachine } from './hover.ts';
import { placePopover } from './popover-pos.ts';
export function WorkflowPopover(p: {
  viewport: Viewport; visible: Box; edgeLabels: Record<string, string>;
  card: WorkflowCardView; view: WorkflowViewProps; anchor: HTMLElement; machine: HoverMachine; close(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const { t, workflow } = p.view, n = p.card.node;
  useLayoutEffect(() => {
    const stage = p.anchor.closest('.wf-stage');
    if (!stage) return;
    let frame = 0;
    const update = () => {
      const s = stage.getBoundingClientRect(), v = p.viewport, c = p.card;
      const a = { x: s.x + c.x * v.zoom + v.x, y: s.y + c.y * v.zoom + v.y, w: c.w * v.zoom, h: c.h * v.zoom };
      const bounds = { x: s.x + p.visible.x, y: s.y + p.visible.y, w: p.visible.w, h: p.visible.h };
      if (a.x + a.w <= bounds.x || a.x >= bounds.x + bounds.w || a.y + a.h <= bounds.y || a.y >= bounds.y + bounds.h) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const actual = p.anchor.getBoundingClientRect();
          if (actual.right > bounds.x && actual.left < bounds.x + bounds.w
            && actual.bottom > bounds.y && actual.top < bounds.y + bounds.h) return;
          if (ref.current?.contains(document.activeElement)) stage.querySelector<HTMLElement>('.wf-tools button')?.focus();
          p.machine.closeNow();
        });
        return;
      }
      if (ref.current) ref.current.style.maxHeight = Math.max(40, bounds.h - 16) + 'px';
      setPos(placePopover(a, { w: 300, h: ref.current?.offsetHeight ?? 240 }, bounds));
    };
    update();
    const observer = new ResizeObserver(update);
    if (ref.current) observer.observe(ref.current);
    observer.observe(stage);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [p.anchor, p.card, p.viewport.x, p.viewport.y, p.viewport.zoom, p.visible.w, p.visible.h]);
  return <div ref={ref} id="cv-pop" className="wf-pop" role="dialog" aria-label={n.label}
    style={{ left: pos.x, top: pos.y }} onPointerEnter={() => p.machine.popoverEnter()}
    onPointerLeave={() => p.machine.popoverLeave()} onFocus={() => p.machine.holdForFocus()}
    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { p.machine.releaseHold(); p.machine.closeNow(); } }}
    onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); p.close(); } }}>
    <button type="button" onClick={p.close}>{t('workflow.pop.close')}</button><h3>{n.label}</h3>
    <p>{t('workflow.kind.' + n.kind as 'workflow.kind.ai')}{n.task && ' · ' + t('workflow.task.' + n.task as 'workflow.task.generate')}</p>
    {n.why && <p>{n.why}</p>}
    {n.on && <p>{t('workflow.pop.attachedTo', { step: workflow.nodes[n.on]?.label ?? n.on })}</p>}
    {n.subject && <p>{t('workflow.pop.subject', { step: workflow.nodes[n.subject]?.label ?? n.subject })}</p>}
    {p.card.model && <p>{p.card.model} · {t('workflow.model.candidate')}</p>}
    {p.card.badges.map((b) => <p key={b}>{b}</p>)}
    {n.approval && <p>{t('workflow.pop.approval')}: {t(n.approval === 'required' ? 'workflow.badge.approval' : 'workflow.badge.waived')}</p>}
    {!!p.card.hidden.length && <section><h4>{t('workflow.attachments.title', { step: n.label })}</h4>
      <ul>{p.card.hidden.map((id) => <li key={id} tabIndex={0}>
        {workflow.nodes[id].label}<p>{workflow.nodes[id].why}</p>
      </li>)}</ul></section>}
    <ul>{Object.values(workflow.edges).filter((e) => e.from === n.id).map((e) =>
      <li key={e.id}>{p.edgeLabels[e.id] || t('workflow.edge.next')}
        {' → ' + (workflow.nodes[e.to]?.label ?? e.to)}</li>)}</ul>
  </div>;
}
