import { createElement, useRef } from 'react';
import type { WorkflowPanelProps } from '../workflow/contracts.ts';
import { buildWorkflowPanelModel } from '../workflow/panel-model.ts';
import { models } from '../workflow/models.ts';
import { workflowGlyph } from '../workflow/glyphs.ts';
import type { IconGeometry, IconNode } from '../icons/types.ts';
import { Icon } from '../shell/Icon.tsx';
import { WorkflowCost } from './WorkflowCost.tsx';
import './panel.css';
import './workflow.css';

// Match the canvas glyph renderer, including SVG stroke attributes.
function Glyph({ geometry }: { geometry: IconGeometry }) {
  const draw = (n: IconNode, key: number): React.ReactElement => createElement(n.el, {
    key, ...Object.fromEntries(Object.entries(n.a).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v])),
  }, ...(n.c ?? []).map(draw));
  return <svg className="wf-panel__glyph" viewBox={geometry.viewBox} fill="currentColor" width="22" height="22"
    aria-hidden="true">{geometry.nodes.map(draw)}</svg>;
}

export function WorkflowPanel(p: WorkflowPanelProps) {
  const { t, actions } = p, handle = useRef<HTMLButtonElement>(null);
  const model = buildWorkflowPanelModel({ workflow: p.workflow, layout: p.layout, catalog: p.catalog, models, estimate: p.estimate, t });
  const show = (id: string) => {
    actions.setPanelOpen(false); actions.panTo([id]);
    actions.highlight({ view: 'workflow', source: 'panel', cards: [id], ghosts: [] }); handle.current?.focus();
  };
  return <section id="products" className="pp wf-panel" data-open={p.open || undefined} aria-label={t('workflow.panel.title')}
    onKeyDown={(e) => {
      if (e.key === 'Escape' && p.open) { e.stopPropagation(); actions.setPanelOpen(false); handle.current?.focus(); }
    }}>
    <button ref={handle} className="pp__handle" aria-expanded={p.open} aria-controls="products-body"
      aria-label={t(p.open ? 'workflow.panel.collapse' : 'workflow.panel.expand')} onClick={() => actions.setPanelOpen(!p.open)}>
      <Icon name="chevronUp" />
    </button>
    <div className="pp__bar" onClick={() => actions.setPanelOpen(!p.open)}>
      <h2 className="pp__title">{t('workflow.panel.title')}</h2>
      <span className="pp__count">{t('workflow.panel.count', { n: model.rows.length })}</span>
    </div>
    <div id="products-body" className="pp__body" inert={!p.open}>
      <ol className="wf-panel__steps">{model.rows.map((row) => <li key={row.id} className="wf-panel__step"
        data-step={row.id} aria-labelledby={'wf-panel-step-' + row.id}>
        <div className="pp-prod">
          <Glyph geometry={workflowGlyph(row.glyph)} />
          <div className="pp-prod__text">
            <div className="wf-panel__heading">
              <h3 id={'wf-panel-step-' + row.id} className="pp-prod__name">{row.label}</h3>
              {row.compact && <span className="pp-prod__label">{' · ' + row.kind}</span>}
            </div>
            {!row.compact && <div className="pp-notes" data-compact>
              <p className="pp-prod__label">{[row.kind, row.task,
                row.host ? t('workflow.pop.attachedTo', { step: row.host }) : ''].filter(Boolean).join(' · ')}</p>
              {row.model && <p><span className="wf-card__model">{row.model + ' · ' + t('workflow.model.candidate')}</span></p>}
              {row.services && <p className="pp-note">{row.services}</p>}
              {row.why && <p className="pp-why__text">{row.why}</p>}
              {row.repeat && <p className="pp-muted">
                {t('workflow.badge.repeat', { over: p.workflow.groups[row.repeat]?.over ?? row.repeat })}</p>}
            </div>}
          </div>
          <button className="pp-show" onClick={() => show(row.id)} aria-label={t('workflow.show', { step: row.label })}
            title={t('workflow.show', { step: row.label })}><Icon name="fit" /></button>
        </div>
      </li>)}</ol>
      <h3 className="wf-panel__section">{t('workflow.panel.mapping')}</h3>
      <table className="pp-table" aria-label={t('workflow.panel.mapping')}>
        <thead><tr><th scope="col">{t('workflow.col.step')}</th><th scope="col">{t('workflow.col.runtime')}</th>
          <th scope="col">{t('workflow.col.services')}</th></tr></thead>
        <tbody>{model.rows.map((row) => <tr key={row.id} className="pp-row">
          <th scope="row"><span className="pp-prod__name">{row.label}</span>
            {row.host && <small className="pp-prod__label">{t('workflow.pop.attachedTo', { step: row.host })}</small>}</th>
          <td className="pp-cell-where">{row.runtime}</td><td className="pp-note">{row.services}</td>
        </tr>)}</tbody>
      </table>
      <WorkflowCost {...p} />
    </div>
  </section>;
}
