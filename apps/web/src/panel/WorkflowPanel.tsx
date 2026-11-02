import { useRef } from 'react';
import type { WorkflowPanelProps } from '../workflow/contracts.ts';
import { buildWorkflowPanelModel } from '../workflow/panel-model.ts';
import { models } from '../workflow/models.ts';
import { WorkflowCost } from './WorkflowCost.tsx';
import './workflow.css';
export function WorkflowPanel(p: WorkflowPanelProps) {
  const { t, actions } = p, handle = useRef<HTMLButtonElement>(null);
  const model = buildWorkflowPanelModel({ workflow: p.workflow, catalog: p.catalog, models, estimate: p.estimate, t });
  const show = (id: string) => { actions.setPanelOpen(false); actions.panTo([id]);
    actions.highlight({ view: 'workflow', source: 'panel', cards: [id], ghosts: [] }); handle.current?.focus(); };
  return <section id="products" className="pp wf-panel" data-open={p.open || undefined} aria-label={t('workflow.panel.title')}
    onKeyDown={(e) => { if (e.key === 'Escape') { actions.setPanelOpen(false); handle.current?.focus(); } }}>
    <button ref={handle} className="pp__handle" aria-expanded={p.open} aria-controls="products-body"
      aria-label={t(p.open ? 'panel.collapse' : 'panel.expand')} onClick={() => actions.setPanelOpen(!p.open)}>⌃</button>
    <div className="pp__bar" onClick={() => actions.setPanelOpen(!p.open)}>
      <h2 className="pp__title">{t('workflow.panel.title')}</h2><span>{t('workflow.panel.count', { n: model.rows.length })}</span>
    </div>
    <div id="products-body" className="pp__body" inert={!p.open}>
      <ol>{model.rows.map((row) => <li key={row.id}>
        <button onClick={() => show(row.id)} aria-label={t('workflow.show', { step: row.label })}>{row.label}</button>
        <p>{row.kind} · {row.task}{row.host && ' · ' + t('workflow.pop.attachedTo', { step: row.host })}</p>
        {row.model && <p>{row.model} · {t('workflow.model.candidate')}</p>}
        <p>{row.services}</p><p>{row.why}</p>
        {row.repeat && <p>{t('workflow.badge.repeat', { over: p.workflow.groups[row.repeat]?.over ?? row.repeat })}</p>}
      </li>)}</ol>
      <h3>{t('workflow.panel.mapping')}</h3>
      <table><thead><tr><th>{t('workflow.col.step')}</th><th>{t('workflow.col.runtime')}</th>
        <th>{t('workflow.col.services')}</th></tr></thead><tbody>{model.rows.map((row) => <tr key={row.id}>
          <th scope="row">{row.label}{row.host && <small>{t('workflow.pop.attachedTo', { step: row.host })}</small>}</th>
          <td>{row.runtime}</td><td>{row.services}</td></tr>)}</tbody></table>
      <WorkflowCost {...p} />
    </div>
  </section>;
}
