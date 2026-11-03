import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { WorkflowCostProps } from '../workflow/contracts.ts';
import { applyEstimateEdit, estimateEditRange } from '../workflow/settings.ts';
import type { EstimateEdit } from '../workflow/settings.ts';
import type { StringKey } from '../i18n/t.ts';
import { usd, monthlyUsd, workflowCostDrivers, unitText, costLineLabel, assumptionText, unpricedReason } from '../workflow/panel-model.ts';
import type { CostDriver } from '../workflow/panel-model.ts';
export function WorkflowCost(p: WorkflowCostProps) {
  const { t, estimate: e } = p;
  const drivers = workflowCostDrivers(p.workflow, p.estimateSettings, e, t);
  const source = (value: string) => /^https:\/\//.test(value) ? <small><a href={value}>{t('workflow.cost.source')}</a></small> : null;
  return <section className="wf-cost"><h3>{t('workflow.cost.title')}</h3>
    {p.streaming && <p>{t('workflow.cost.provisional')}</p>}
    <p>{t('workflow.cost.oneRun', { trigger: e.oneRun.map((id) => p.workflow.nodes[id])
      .filter((n) => n?.kind === 'trigger').map((n) => n.label).join(', ') || t('workflow.unspecified') })}</p>
    <p>{t('workflow.cost.runsValue', { value: e.runsPerMonth.toLocaleString(p.lang) })}</p>
    <table><thead><tr><th></th><th>{t('workflow.cost.perRun')}</th><th>{t('workflow.cost.perMonth')}</th></tr></thead>
      <tbody>{(['typical', 'upper'] as const).map((s) => <tr key={s}>
        <th scope="row">{t('workflow.cost.' + s as 'workflow.cost.typical')}</th>
        <td>{usd(e[s].perRunUsd, p.lang)}</td><td>{monthlyUsd(e[s].monthlyUsd, p.lang)}</td></tr>)}</tbody></table>
    <p>{t('workflow.cost.upperMonthly')}</p><p>{t('workflow.cost.scenarios')}</p>
    <h4>{t('workflow.cost.coverage')}</h4><p>{t('workflow.cost.coverageText')}</p>
    <table><thead><tr><th>{t('workflow.col.step')}</th><th>{t('workflow.cost.unit')}</th>
      <th>{t('workflow.cost.typical')}</th><th>{t('workflow.cost.upper')}</th></tr></thead>
      <tbody>{e.lines.map((l) => <tr key={l.id}><th scope="row">{l.label}{source(l.source)}</th>
        <td>{unitText(l.unit, t)}</td><td>{usd(l.typical, p.lang)}</td><td>{usd(l.upper, p.lang)}</td></tr>)}</tbody></table>
    <h4>{t('workflow.cost.fixed')}</h4><ul>{e.fixed.map((l) => <li key={l.id}>
      {t('workflow.cost.labelValue', { label: l.label + ' · ' + unitText(l.unit, t),
        value: l.monthlyUsd === null ? t('workflow.cost.unpriced') : monthlyUsd(l.monthlyUsd, p.lang) })}{source(l.source)}</li>)}</ul>
    <h4>{t('workflow.cost.unpriced')}</h4><ul>{e.unpriced.map((l) =>
      <li key={l.id}>{t('workflow.cost.labelValue', { label: costLineLabel(l, p.workflow, t) + ' · ' + unitText(l.unit, t),
        value: l.id.endsWith(':tool') && p.workflow.nodes[l.id.slice(0, -5)]?.tool === 'mcp'
          ? t('workflow.cost.reason.mcp') : unpricedReason(l.why, t) })}</li>)}</ul>
    <h4>{t('workflow.cost.assumptions')}</h4><ul>{e.assumptions.map((a) => <li key={a.key}>{assumptionText(a, p.workflow, t)}</li>)}</ul>
    <details><summary>{t('workflow.cost.drivers')}</summary>
      {drivers.map((d) => <Driver key={JSON.stringify(d.edit)} p={p} {...d} />)}
    </details>
    <p>{t('workflow.cost.path', { n: e.latency.modelStepsOnLongestPath })}</p>
    <h4>{t('workflow.cost.waits')}</h4><ul>{e.latency.humanWaits.map((w) => <li key={w}>{p.workflow.nodes[w]?.label ?? w}</li>)}</ul>
  </section>;
}
function Driver({ p, label, edit, value, options }: CostDriver & { p: WorkflowCostProps }) {
  const id = useId(), [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const [error, setError] = useState<StringKey | null>(null);
  const inputRef = useRef<HTMLInputElement>(null), skipBlur = useRef(false);
  const stored = value === undefined ? '' : String(value);
  const restore = (text: string) => {
    if (inputRef.current) inputRef.current.value = text;
    setDraft(text); setError(null);
  };
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = stored;
    setDraft(stored); setError(null);
  }, [stored]);
  const range = estimateEditRange(edit, p.workflow);
  const bool = edit.map === 'steps' && (edit.field === 'thinking' || edit.field === 'offline');
  const apply = (reset = false, nextDraft = draft) => {
    if (!reset && inputRef.current?.validity.badInput) { setError('workflow.cost.invalid'); return; }
    const input = reset || nextDraft === '' ? undefined : bool ? nextDraft === 'true' : Number(nextDraft);
    const result = applyEstimateEdit(p.estimateSettings, { ...edit, value: input } as EstimateEdit, p.workflow);
    if (!result.ok) { setError(result.key); return; }
    setError(null);
    if (input === undefined) restore('');
    p.actions.setWorkflowEstimate(result.value);
  };
  const commitOnBlur = () => {
    if (skipBlur.current) { skipBlur.current = false; return; }
    if (inputRef.current?.validity.badInput || draft !== stored) apply();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); apply(); }
    if (e.key === 'Escape' && (draft !== stored || error || inputRef.current?.validity.badInput)) {
      e.preventDefault(); e.stopPropagation(); skipBlur.current = true; restore(stored);
    }
  };
  return <fieldset disabled={p.disabled} className="wf-driver"><legend>{label}</legend>
    {bool ? <select aria-label={label} value={draft} onChange={(e) => { setDraft(e.target.value); apply(false, e.target.value); }}>
      <option value="">{p.t('workflow.cost.reset')}</option><option value="true">{p.t('workflow.cost.enabled')}</option>
      <option value="false">{p.t('workflow.cost.disabled')}</option></select>
      : options ? <select aria-label={label} aria-describedby={error ? id : undefined} aria-invalid={!!error} value={draft}
        onChange={(e) => { skipBlur.current = false; setDraft(e.target.value); }} onBlur={commitOnBlur} onKeyDown={onKeyDown}>
        <option value="">{p.t('workflow.cost.reset')}</option>
        {options.map((r) => <option key={r} value={r}>{r}P</option>)}</select>
      : <input ref={inputRef} aria-label={label} aria-describedby={error ? id : undefined} aria-invalid={!!error} type="number"
        min={range.min} max={range.max} step={edit.map === 'shares' ? 'any' : '1'} value={draft} placeholder={p.t('workflow.cost.reset')}
        onChange={(e) => { skipBlur.current = false; setDraft(e.target.value); }} onBlur={commitOnBlur} onKeyDown={onKeyDown} />}
    <button onClick={() => apply()}>{p.t('workflow.cost.apply')}</button>
    <button onMouseDown={(e) => e.preventDefault()} onClick={() => apply(true)}>{p.t('workflow.cost.reset')}</button>
    {error && <p id={id} role="alert">{p.t(error)}</p>}
  </fieldset>;
}
