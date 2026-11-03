import type { Node, NodeProps } from '@xyflow/react';
import type { KeyboardEvent } from 'react';
import { createElement, useId } from 'react';
import type { IconNode, IconGeometry } from '../icons/types.ts';
function Glyph({ geometry }: { geometry: IconGeometry }) {
  const draw = (n: IconNode, key: number): React.ReactElement => createElement(n.el, {
    key, ...Object.fromEntries(Object.entries(n.a).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v])),
  }, ...(n.c ?? []).map(draw));
  return <svg viewBox={geometry.viewBox} fill="currentColor" width="22" height="22" aria-hidden="true">{geometry.nodes.map(draw)}</svg>;
}
import { workflowGlyph } from '../workflow/glyphs.ts';
import { workflowCardDetails } from '../workflow/scene.ts';
import type { WorkflowCardView, WorkflowScene } from '../workflow/scene.ts';
import type { WorkflowEdgeDrawing } from '../workflow/edges.ts';
import type { TFn } from '../i18n/t.ts';
export type WorkflowCardNodeType = Node<{
  card: WorkflowCardView; t: TFn; tab: boolean; highlighted: boolean; ghost?: boolean; delay: number | null;
  revision: number | null; stamp: number | null; building: boolean;
  unfolded: boolean; toggleFold(): void; suppressPopover(): void;
  enter(): void; leave(): void; focus(): void; blur(): void; open(fromFold?: boolean): void; key(e: KeyboardEvent): void;
}, 'workflowCard'>;
export function WorkflowCardNode({ data: d }: NodeProps<WorkflowCardNodeType>) {
  const c = d.card, details = workflowCardDetails(c, d.t), overlayId = useId();
  const effect = c.node.effect;
  const effects: Record<string, string> = {
    send: 'M2 2 14 8 2 14 4 8Z M4 8h10', publish: 'M8 11V2 M4 6l4-4 4 4 M2 10v4h12v-4',
    pay: 'M11 4H6a3 3 0 0 0 0 6h4a2 2 0 0 1 0 4H4 M8 1v14',
    delete: 'M3 4h10 M6 4V2h4v2 M4 4l1 10h6l1-10 M7 6v6 M9 6v6',
    admin: 'M8 1 14 4v4c0 4-6 7-6 7S2 12 2 8V4Z M5 8l2 2 4-4',
  };
  return <div className="wf-card-shell nodrag nopan" data-wf-shell={c.id} style={{ width: c.w, height: c.h }}>
    <button className="wf-card nodrag nopan" data-wf-card={c.id} data-lit={d.highlighted || undefined}
      data-ghost={d.ghost || undefined} data-enter={d.delay !== null || undefined}
      style={{ width: c.w, height: c.h, animationDelay: (d.delay ?? 0) + 'ms' }}
      tabIndex={d.tab && !d.ghost ? 0 : -1} aria-describedby="workflow-keys"
      aria-label={[c.label, d.t('workflow.kind.' + c.kind as 'workflow.kind.ai'), ...c.badges].join('. ')}
      onPointerEnter={d.enter} onPointerLeave={d.leave} onFocus={d.focus} onBlur={d.blur} onClick={() => d.open()} onKeyDown={d.key}>
      <span className="wf-card__heading">
        {d.revision !== null && <span className="wf-revision" style={{ animationDelay: (d.stamp ?? 0) + 'ms' }}>{d.revision}</span>}
        {d.building && <span className="wf-building" aria-hidden="true">…</span>}<Glyph geometry={workflowGlyph(c.kind)} />
        <strong style={{ fontSize: c.titlePx }}>{c.titleLines.map((line, i) => <span key={i}>{line}</span>)}</strong>
      </span>
      {details.meta && <span className={details.usesModel ? 'wf-card__model' : 'wf-card__service'}>{details.meta}</span>}
      <span className="wf-card__signals">
        {c.approval && <svg data-signal="approval" width="12" height="14" viewBox="0 0 12 14" role="img"
          aria-label={d.t('workflow.badge.approval')}><title>{d.t('workflow.badge.approval')}</title>
          <path d="M3 6V4a3 3 0 0 1 6 0v2M1 6h10v7H1Z" fill="none" stroke="currentColor" /></svg>}
        {c.kind === 'human' && <svg data-signal="wait" width="14" height="14" viewBox="0 0 16 16" role="img"
          aria-label={d.t('workflow.badge.wait')}><title>{d.t('workflow.badge.wait')}</title>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" /><path d="M8 4v4h3" fill="none" stroke="currentColor" /></svg>}
        {effect && effects[effect] && <svg data-signal={effect} width="14" height="14" viewBox="0 0 16 16" role="img"
          aria-label={d.t('workflow.effect.' + effect as 'workflow.effect.send')}>
          <title>{d.t('workflow.effect.' + effect as 'workflow.effect.send')}</title>
          <path d={effects[effect]} fill="none" stroke="currentColor" /></svg>}
      </span>
    </button>
    {details.expandable && !d.ghost && <button type="button" className="wf-card__fold nodrag nopan" data-wf-fold={c.id}
      aria-expanded={d.unfolded} aria-controls={overlayId} aria-label={d.t(d.unfolded ? 'workflow.card.fold' : 'workflow.card.unfold')}
      onPointerEnter={(e) => { e.stopPropagation(); d.suppressPopover(); }} onFocus={d.suppressPopover}
      onPointerDown={(e) => { e.stopPropagation(); d.suppressPopover(); }}
      onPointerUp={(e) => { e.stopPropagation(); d.suppressPopover(); }}
      onClick={(e) => { e.stopPropagation(); d.suppressPopover(); d.toggleFold(); }}>
      <span aria-hidden="true">{d.unfolded ? '\u2303' : '\u2304'}</span>
    </button>}
    {details.expandable && <div id={overlayId} className="wf-card__details nodrag nopan" data-wf-details={c.id}
      hidden={!d.unfolded} onPointerEnter={d.suppressPopover} onPointerDown={(e) => e.stopPropagation()}>
      {details.lines.map((line, i) => <p key={i}>{line}</p>)}
      {!!c.hidden.length && <button type="button" className="wf-card__attachments" onClick={(e) => { e.stopPropagation(); d.open(true); }}>
        {d.t('workflow.card.attachments', { n: c.hidden.length })}
      </button>}
    </div>}
  </div>;
}
export type WorkflowRepeatNodeType = Node<{ bracket: WorkflowScene['brackets'][number] }, 'workflowRepeat'>;
export function WorkflowRepeatNode({ data: { bracket: b } }: NodeProps<WorkflowRepeatNodeType>) {
  return <div className="wf-bracket" title={b.label} style={{ width: b.w, height: b.h }} aria-hidden="true">{b.label}</div>;
}
export type WorkflowEdgeNodeType = Node<{ edges: WorkflowEdgeDrawing[]; width: number; height: number; t: TFn }, 'workflowEdges'>;
export function WorkflowEdgeNode({ data: d }: NodeProps<WorkflowEdgeNodeType>) {
  return <svg className="wf-edges" width={d.width} height={d.height} aria-hidden="true">
    <defs><marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 10 5 0 10Z" fill="context-stroke" /></marker></defs>
    {d.edges.map((e) => {
      const label = e.label;
      return <g key={e.id} style={{ color: e.warning ? 'var(--warn)' : 'var(--ink-3)' }}>
        <path d={e.path} fill="none" stroke="currentColor" strokeWidth="1.5"
          strokeDasharray={e.attached ? '5 4' : undefined} markerEnd={e.attached ? undefined : 'url(#wf-arrow)'} />
        {label && <text x={e.labelBox.x + e.labelBox.w / 2} y={e.labelBox.y + 14} textAnchor="middle">{label}</text>}
      </g>;
    })}
  </svg>;
}
