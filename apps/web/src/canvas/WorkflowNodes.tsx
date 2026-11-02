import type { Node, NodeProps } from '@xyflow/react';
import type { KeyboardEvent } from 'react';
import { createElement } from 'react';
import type { IconNode, IconGeometry } from '../icons/types.ts';
function Glyph({ geometry }: { geometry: IconGeometry }) {
  const draw = (n: IconNode, key: number): React.ReactElement => createElement(n.el, {
    key, ...Object.fromEntries(Object.entries(n.a).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v])),
  }, ...(n.c ?? []).map(draw));
  return <svg viewBox={geometry.viewBox} fill="currentColor" width="22" height="22" aria-hidden="true">{geometry.nodes.map(draw)}</svg>;
}
import { workflowGlyph } from '../workflow/glyphs.ts';
import type { WorkflowCardView, WorkflowScene } from '../workflow/scene.ts';
import type { WorkflowEdgeDrawing } from '../workflow/edges.ts';
import type { TFn } from '../i18n/t.ts';
export type WorkflowCardNodeType = Node<{
  card: WorkflowCardView; t: TFn; tab: boolean; highlighted: boolean; ghost?: boolean; delay: number | null;
  revision: number | null; stamp: number | null; building: boolean;
  enter(): void; leave(): void; focus(): void; blur(): void; open(): void; key(e: KeyboardEvent): void;
}, 'workflowCard'>;
export function WorkflowCardNode({ data: d }: NodeProps<WorkflowCardNodeType>) {
  const c = d.card;
  return <button className="wf-card nodrag" data-wf-card={c.id} data-lit={d.highlighted || undefined}
    data-ghost={d.ghost || undefined} data-enter={d.delay !== null || undefined}
    style={{ width: c.w, height: c.h, animationDelay: (d.delay ?? 0) + 'ms' }}
    tabIndex={d.tab && !d.ghost ? 0 : -1} aria-describedby="workflow-keys"
    aria-label={[c.label, d.t('workflow.kind.' + c.kind as 'workflow.kind.ai'), ...c.badges].join('. ')}
    onPointerEnter={d.enter} onPointerLeave={d.leave} onFocus={d.focus} onBlur={d.blur} onClick={d.open} onKeyDown={d.key}>
    <span className="wf-card__heading">
      {d.revision !== null && <span className="wf-revision" style={{ animationDelay: (d.stamp ?? 0) + 'ms' }}>
        {d.revision}</span>}
      {d.building && <span className="wf-building" aria-hidden="true">•</span>}<Glyph geometry={workflowGlyph(c.kind)} />
      <strong style={{ fontSize: c.titlePx }}>{c.titleLines.map((line, i) => <span key={i}>{line}</span>)}</strong></span>
    {c.product && <span className="wf-card__service">{c.product}</span>}
    {c.model && <span className="wf-card__model" title={c.model + ' · ' + d.t('workflow.model.candidate')}>
      {c.model} · {d.t('workflow.model.candidate')}</span>}
    {!!c.badges.length && <span className="wf-card__badges">{c.approval && <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <path d="M3 6V4a3 3 0 0 1 6 0v2M1 6h10v7H1Z" fill="none" stroke="currentColor" /></svg>}
      {c.badges.map((b) => <span key={b}>{b}</span>)}</span>}
    {!!c.hidden.length && <span className="wf-card__count">{d.t('workflow.attachments.count', { n: c.hidden.length })}</span>}
  </button>;
}
export type WorkflowRepeatNodeType = Node<{ bracket: WorkflowScene['brackets'][number] }, 'workflowRepeat'>;
export function WorkflowRepeatNode({ data: { bracket: b } }: NodeProps<WorkflowRepeatNodeType>) {
  return <div className="wf-bracket" style={{ width: b.w, height: b.h }} aria-hidden="true">{b.label}</div>;
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
