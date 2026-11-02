import { useEffect, useId, useState } from 'react';
import type { WorkflowCostProps } from '../workflow/contracts.ts';
import { applyEstimateEdit } from '../workflow/settings.ts';
import type { EstimateEdit } from '../workflow/settings.ts';
import type { StringKey } from '../i18n/t.ts';
import { usd, assumptionText, unpricedReason } from '../workflow/panel-model.ts';
export function WorkflowCost(p: WorkflowCostProps) {
  const { t, estimate: e } = p;
  const drivers: Array<{ label: string; edit: EstimateEdit; value?: number | boolean }> = [
    { label: t('workflow.cost.runs'), edit: { map: 'runsPerMonth' }, value: p.estimateSettings.runsPerMonth },
  ];
  const ranked = Object.values(p.workflow.nodes).sort((a, b) => {
    const cost = (id: string) => e.lines.filter((l) => l.id.startsWith(id + ':')).reduce((n, l) => n + l.typical, 0);
    return cost(b.id) - cost(a.id);
  });
  for (const n of ranked) {
    if (n.ai || n.kind === 'ai' || n.kind === 'agent') {
      for (const field of ['inTokens', 'outTokens', 'thinking', 'offline'] as const) drivers.push({
        label: n.label + ' ? ' + t('workflow.cost.' + field as 'workflow.cost.inTokens'),
        edit: { map: 'steps', id: n.id, field }, value: p.estimateSettings.steps?.[n.id]?.[field],
      });
    }
    if (n.kind === 'agent') for (const field of ['typical', 'upper', 'resultTokens', 'searchesPerRequest'] as const) {
      drivers.push({ label: n.label + ' ? ' + t(field === 'resultTokens' ? 'workflow.cost.resultTokens'
        : field === 'searchesPerRequest' ? 'workflow.cost.searches' : 'workflow.cost.requests') +
        (field === 'typical' || field === 'upper' ? ' ? ' + t('workflow.cost.' + field as 'workflow.cost.typical') : ''),
      edit: { map: 'agents', id: n.id, field }, value: p.estimateSettings.agents?.[n.id]?.[field] });
    }
    if (n.kind === 'guard') drivers.push({ label: n.label + ' ? ' + t('workflow.cost.guardTypes'),
      edit: { map: 'guardTypes', id: n.id }, value: p.estimateSettings.guardTypes?.[n.id] });
  }
  for (const g of Object.values(p.workflow.groups)) for (const field of ['typical', 'upper'] as const) drivers.push({
    label: g.over + ' ? ' + t('workflow.cost.items') + ' ? ' + t('workflow.cost.' + field as 'workflow.cost.typical'),
    edit: { map: 'items', id: g.id, field }, value: p.estimateSettings.items?.[g.id]?.[field],
  });
  for (const edge of Object.values(p.workflow.edges)) {
    if (edge.kind === 'branch') drivers.push({ label: (edge.label ?? edge.id) + ' ? ' + t('workflow.cost.share'),
      edit: { map: 'shares', id: edge.id }, value: p.estimateSettings.shares?.[edge.id] });
    if (edge.kind === 'loop') for (const field of ['typical', 'upper'] as const) drivers.push({
      label: edge.id + ' ? ' + t('workflow.cost.loops') + ' ? ' + t('workflow.cost.' + field as 'workflow.cost.typical'),
      edit: { map: 'loops', id: edge.id, field }, value: p.estimateSettings.loops?.[edge.id]?.[field],
    });
  }
  return <section className="wf-cost"><h3>{t('workflow.cost.title')}</h3>
    {p.streaming && <p>{t('workflow.cost.provisional')}</p>}
    <p>{t('workflow.cost.oneRun', { trigger: e.oneRun.map((id) => p.workflow.nodes[id])
      .filter((n) => n?.kind === 'trigger').map((n) => n.label).join(', ') || t('workflow.unspecified') })}</p>
    <p>{t('workflow.cost.runs')}: {e.runsPerMonth.toLocaleString(p.lang)}</p>
    <table><thead><tr><th></th><th>{t('workflow.cost.perRun')}</th><th>{t('workflow.cost.perMonth')}</th></tr></thead>
      <tbody>{(['typical', 'upper'] as const).map((s) => <tr key={s}>
        <th scope="row">{t('workflow.cost.' + s as 'workflow.cost.typical')}</th>
        <td>{usd(e[s].perRunUsd)}</td><td>{usd(e[s].monthlyUsd)}</td></tr>)}</tbody></table>
    <p>{t('workflow.cost.upperMonthly')}</p><p>{t('workflow.cost.scenarios')}</p>
    <h4>{t('workflow.cost.coverage')}</h4><p>{t('workflow.cost.coverageText')}</p>
    <table><thead><tr><th>{t('workflow.col.step')}</th><th>{t('workflow.cost.unit')}</th>
      <th>{t('workflow.cost.typical')}</th><th>{t('workflow.cost.upper')}</th></tr></thead>
      <tbody>{e.lines.map((l) => <tr key={l.id}><th scope="row">{l.label}<small>{l.source}</small></th>
        <td>{l.unit}</td><td>{usd(l.typical)}</td><td>{usd(l.upper)}</td></tr>)}</tbody></table>
    <h4>{t('workflow.cost.fixed')}</h4><ul>{e.fixed.map((l) => <li key={l.id}>
      {l.label} ? {l.unit}: {l.monthlyUsd === null ? t('workflow.cost.unpriced') : usd(l.monthlyUsd)}<small>{l.source}</small></li>)}</ul>
    <h4>{t('workflow.cost.unpriced')}</h4><ul>{e.unpriced.map((l) =>
      <li key={l.id}>{l.label} ? {l.unit}: {unpricedReason(l.why, t)}</li>)}</ul>
    <h4>{t('workflow.cost.assumptions')}</h4><ul>{e.assumptions.map((a) => <li key={a.key}>{assumptionText(a, p.workflow, t)}</li>)}</ul>
    {e.scope === 'global' && <p>{t('workflow.cost.globalNote')}</p>}
    <details><summary>{t('workflow.cost.drivers')}</summary>
      {drivers.map((d) => <Driver key={JSON.stringify(d.edit)} p={p} {...d} />)}
    </details>
    <p>{t('workflow.cost.path', { n: e.latency.modelStepsOnLongestPath })}</p>
    <h4>{t('workflow.cost.waits')}</h4><ul>{e.latency.humanWaits.map((w) => <li key={w}>{p.workflow.nodes[w]?.label ?? w}</li>)}</ul>
  </section>;
}
function Driver({ p, label, edit, value }: {
  p: WorkflowCostProps; label: string; edit: EstimateEdit; value?: number | boolean;
}) {
  const id = useId(), [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const [error, setError] = useState<StringKey | null>(null);
  useEffect(() => { setDraft(value === undefined ? '' : String(value)); }, [value]);
  const bool = edit.map === 'steps' && (edit.field === 'thinking' || edit.field === 'offline');
  const apply = (reset = false, nextDraft = draft) => {
    const input = reset || nextDraft === '' ? undefined : bool ? nextDraft === 'true' : Number(nextDraft);
    const result = applyEstimateEdit(p.estimateSettings, { ...edit, value: input } as EstimateEdit, p.workflow);
    if (!result.ok) { setError(result.key); return; }
    setError(null); p.actions.setWorkflowEstimate(result.value);
  };
  return <fieldset disabled={p.disabled} className="wf-driver"><legend>{label}</legend>
    {bool ? <select aria-label={label} value={draft} onChange={(e) => { setDraft(e.target.value); apply(false, e.target.value); }}>
      <option value="">{p.t('workflow.cost.reset')}</option><option value="true">{p.t('workflow.cost.enabled')}</option>
      <option value="false">{p.t('workflow.cost.disabled')}</option></select>
      : <input aria-label={label} aria-describedby={error ? id : undefined} aria-invalid={!!error} type="number"
        min="0" step={edit.map === 'shares' ? '0.01' : '1'} value={draft} placeholder={p.t('workflow.cost.reset')}
        onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (draft !== String(value ?? '')) apply(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); }
          if (e.key === 'Escape') { setDraft(value === undefined ? '' : String(value)); setError(null); } }} />}
    <button onClick={() => apply()}>{p.t('workflow.cost.apply')}</button>
    <button onMouseDown={(e) => e.preventDefault()} onClick={() => apply(true)}>{p.t('workflow.cost.reset')}</button>
    {error && <p id={id} role="alert">{p.t(error)}</p>}
  </fieldset>;
}
