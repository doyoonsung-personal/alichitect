import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WorkflowViewProps } from '../workflow/contracts.ts';
import type { WorkflowCardView } from '../workflow/scene.ts';
import type { HoverMachine } from './hover.ts';
import { placePopover } from './popover-pos.ts';
export function WorkflowPopover(p: {
  card: WorkflowCardView; view: WorkflowViewProps; anchor: HTMLElement; machine: HoverMachine; close(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const { t, workflow } = p.view, n = p.card.node;
  useLayoutEffect(() => {
    const a = p.anchor.getBoundingClientRect();
    const stage = p.anchor.closest('.wf-stage')?.getBoundingClientRect();
    const panel = document.getElementById('products')?.getBoundingClientRect();
    const bounds = stage ? { x: stage.x + 8, y: stage.y + 8, w: stage.width - 16,
      h: Math.max(120, Math.min(stage.bottom, panel?.top ?? stage.bottom) - stage.y - 16) }
      : { x: 8, y: 8, w: window.innerWidth - 16, h: window.innerHeight - 16 };
    setPos(placePopover({ x: a.x, y: a.y, w: a.width, h: a.height },
      { w: 300, h: ref.current?.offsetHeight ?? 240 }, bounds));
  }, [p.anchor, p.card]);
  return createPortal(<div ref={ref} id="cv-pop" className="wf-pop" role="dialog" aria-label={n.label}
    style={{ left: pos.x, top: pos.y }} onPointerEnter={() => p.machine.popoverEnter()}
    onPointerLeave={() => p.machine.popoverLeave()} onFocus={() => p.machine.holdForFocus()}
    onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) p.machine.releaseHold(); }}
    onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); p.close(); } }}>
    <button onClick={p.close}>{t('panel.collapse')}</button><h3>{n.label}</h3>
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
      <li key={e.id}>{e.label ?? t('workflow.edge.' + (e.kind ?? 'next') as 'workflow.edge.next', { n: e.max ?? 0 })}
        {e.outcome && ' · ' + t('workflow.outcome.' + e.outcome as 'workflow.outcome.approve')}
        {' → ' + (workflow.nodes[e.to]?.label ?? e.to)}</li>)}</ul>
  </div>, document.body);
}
