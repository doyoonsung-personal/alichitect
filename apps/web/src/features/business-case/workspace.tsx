import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useAppState, useT } from '../../store/react.tsx';
import { calculateBusinessCase, defaultInputs, validateDocument } from '../../../../../packages/business-case/src/engine.ts';
import type { BusinessCaseDocument, BusinessCaseExplanation, BusinessCaseInputs, BusinessCaseLang, BusinessCaseRecord, BusinessCaseSource, ScenarioResult } from '../../../../../packages/business-case/src/types.ts';
import { BusinessCaseError, deleteVersion, explainCase, listAllVersions, listVersions, saveVersion } from './api.ts';
import type { BusinessCaseVersionSummary } from './api.ts';
import { captureSource, refreshSource, sourceChanged } from './source.ts';
import { fieldText, formatNumber, makeText } from './strings.ts';
import type { BCText } from './strings.ts';
import { printBusinessCase } from './print.ts';
import './business-case.css';

export interface WorkspaceProps { open: boolean; onClose(): void }
type NumericKey = { [K in keyof BusinessCaseInputs]: BusinessCaseInputs[K] extends number | null ? K : never }[keyof BusinessCaseInputs];

function NumericField({ name, label, value, onChange, max = 1e9, step = 'any' }: {
  name: string; label: string; value: number | null; onChange(value: number | null): void; max?: number; step?: string;
}): ReactElement {
  return <label className="bc-field"><span>{label}</span><input data-field={name} type="number" min="0" max={max} step={step}
    value={value ?? ''} onChange={event => onChange(event.currentTarget.value === '' ? null : Number(event.currentTarget.value))} /></label>;
}

const resultRows: Array<{ key: keyof ScenarioResult; money?: boolean }> = [
  { key: 'hoursReleasedMonthly' }, { key: 'capacityValueMonthlyUsd', money: true }, { key: 'laborCashMonthlyUsd', money: true },
  { key: 'totalCashBenefitMonthlyUsd', money: true }, { key: 'netMonthlyCashUsd', money: true }, { key: 'horizonNetCashUsd', money: true },
  { key: 'paybackMonths' }, { key: 'roiPct' }, { key: 'breakEvenEfficiencyPct' },
];

function errorText(error: unknown, t: BCText): string {
  if (error instanceof BusinessCaseError) {
    if (error.status === 401 || error.status === 403) return t('signedOut');
    if (error.status === 404) return t('unavailable');
    if (error.status === 429) return t('limited');
    if (error.status === 409) return t('historyFull');
    if (error.status === 413) return t('tooLarge');
  }
  return t('error');
}

export default function BusinessCaseWorkspace({ open, onClose }: WorkspaceProps): ReactElement {
  const { lang: hostLang } = useT();
  const session = useAppState(state => state.session);
  const [lang, setLang] = useState<BusinessCaseLang>(hostLang);
  const t = useMemo(() => makeText(lang), [lang]);
  const [document, setDocument] = useState<BusinessCaseDocument | null>(null);
  const [current, setCurrent] = useState<BusinessCaseSource | null>(null);
  const [records, setRecords] = useState<BusinessCaseRecord[]>([]);
  const [allVersions, setAllVersions] = useState<BusinessCaseVersionSummary[] | null>(null);
  const [savedKey, setSavedKey] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'load' | 'save' | 'explain' | 'delete' | 'versions' | null>('load');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [explanation, setExplanation] = useState<BusinessCaseExplanation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteArea, setDeleteArea] = useState<'session' | 'all'>('session');
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const action = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const firstSession = useRef(session);
  const firstLang = useRef(hostLang);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  useEffect(() => () => { action.current?.abort(); requestVersion.current++; }, []);
  useEffect(() => {
    const ac = new AbortController();
    let alive = true;
    setBusy('load'); setError('');
    void Promise.allSettled([captureSource(firstSession.current), listVersions(firstSession.current.id, { signal: ac.signal })]).then(([sourceResult, historyResult]) => {
      if (!alive) return;
      if (sourceResult.status !== 'fulfilled') { setError('loadingFailed'); setBusy(null); return; }
      const source = sourceResult.value;
      setCurrent(previous => previous ?? source);
      const versions = historyResult.status === 'fulfilled' ? historyResult.value : [];
      setRecords(versions);
      const draft = versions[0]?.document ?? { schemaVersion: 1 as const, source, inputs: defaultInputs() };
      setDocument(draft);
      setSavedKey(versions[0] ? JSON.stringify(draft) : '');
      setSavedId(versions[0]?.id ?? null);
      if (historyResult.status !== 'fulfilled') setError(errorText(historyResult.reason, makeText(firstLang.current)));
      setBusy(null);
    });
    return () => { alive = false; ac.abort(); };
  }, [retry]);
  // Fingerprint current facts separately. Saved assumptions change only through an explicit refresh.
  useEffect(() => {
    let alive = true;
    void captureSource(session).then(source => { if (alive) setCurrent(source); }).catch(() => {});
    return () => { alive = false; };
  }, [session]);

  const checked = useMemo(() => document ? validateDocument(document) : null, [document]);
  const calculation = useMemo(() => checked?.ok ? calculateBusinessCase(checked.value) : null, [checked]);
  const changed = !!(document && current && sourceChanged(document.source, current));
  const dirty = !!document && JSON.stringify(document) !== savedKey;
  const number = (value: number | null, money = false) => formatNumber(value, lang, t('notAvailable'), money);
  const amount = (value: number | null) => formatNumber(value, lang, t('unknown'), true);
  const date = (value: number) => Number.isFinite(new Date(value).getTime())
    ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(value) : t('unknown');
  function edit(next: BusinessCaseDocument) { setDocument(next); setExplanation(null); setNotice(''); setError(''); }
  function input(key: NumericKey, value: number | null) {
    if (!document) return;
    edit({ ...document, inputs: { ...document.inputs, [key]: value } });
  }
  function field(key: NumericKey, max?: number, step?: string) {
    return document && <NumericField name={key} key={key} label={t(key)} value={document.inputs[key]} onChange={value => input(key, value)} max={max} step={step} />;
  }
  async function run(kind: 'save' | 'explain' | 'delete' | 'versions') {
    if (!document || busy || ((kind === 'save' || kind === 'explain') && !checked?.ok) || (kind === 'explain' && changed)) return;
    const ac = new AbortController();
    action.current?.abort(); action.current = ac;
    const version = ++requestVersion.current;
    const currentRequest = () => version === requestVersion.current && !ac.signal.aborted;
    setBusy(kind); setError(''); setNotice('');
    try {
      if (kind === 'save') {
        const record = await saveVersion(document, { signal: ac.signal });
        if (!currentRequest()) return;
        setRecords(previous => [record, ...previous].slice(0, 20));
        setAllVersions(previous => previous ? [{ id: record.id, sessionId: record.document.source.sessionId, title: record.document.source.title, createdAt: record.createdAt }, ...previous].slice(0, 200) : null);
        setDocument(record.document); setSavedKey(JSON.stringify(record.document)); setSavedId(record.id); setNotice('saved');
      } else if (kind === 'explain') {
        const response = await explainCase(document, lang, { signal: ac.signal });
        if (currentRequest()) setExplanation(response);
      } else if (kind === 'versions') {
        const versions = await listAllVersions({ signal: ac.signal });
        if (currentRequest()) { setAllVersions(versions); setDeleteId(null); }
      } else if (deleteId) {
        await deleteVersion(deleteId, { signal: ac.signal });
        if (currentRequest()) {
          setRecords(previous => previous.filter(record => record.id !== deleteId));
          setAllVersions(previous => previous?.filter(record => record.id !== deleteId) ?? null);
          if (deleteId === savedId) { setSavedKey(''); setSavedId(null); }
          setDeleteId(null); setNotice('versionDeleted');
        }
      }
    } catch (e) { if (currentRequest()) setError(errorText(e, t)); }
    finally { if (currentRequest()) setBusy(null); }
  }
  function cancelAction() { action.current?.abort(); requestVersion.current++; setBusy(null); }
  function close() { cancelAction(); dialog.current?.close(); onClose(); }
  function openVersion(record: BusinessCaseRecord) {
    setDocument(structuredClone(record.document)); setSavedKey(JSON.stringify(record.document)); setSavedId(record.id); setExplanation(null); setNotice('versionLoaded'); setError('');
  }
  const overrideMissing = document && (document.inputs.monthlyCostOverrideUsd !== null || document.inputs.oneTimeCostOverrideUsd !== null) && !document.inputs.costOverrideReason.trim();

  return <dialog ref={dialog} className="bc-dialog" aria-labelledby="bc-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="bc-topbar">
      <div><p className="bc-eyebrow">{t('subtitle')}</p><h1 id="bc-title">{t('title')}</h1></div>
      <div className="bc-topbar-actions"><select aria-label="Language" value={lang} onChange={event => { setLang(event.target.value as BusinessCaseLang); setExplanation(null); }} disabled={!!busy}>
        <option value="en">English</option><option value="ko">한국어</option><option value="zh">中文</option>
      </select><button type="button" className="btn btn--ghost" onClick={close} aria-label={t('close')}>×</button></div>
    </div>
    <div className="bc-scroll">
      <p className="bc-intro">{t('intro')}</p>
      {error && <p className="bc-message bc-message--error" role="alert">{t(error)} {!document && <button type="button" onClick={() => setRetry(value => value + 1)}>{t('retry')}</button>}</p>}
      {notice && <p className="bc-message" role="status">{t(notice)}</p>}
      {busy === 'load' && <p role="status">{t('loading')}</p>}
      {document && <>
        <section className="bc-source" aria-labelledby="bc-source-heading">
          <div className="bc-section-heading"><div><h2 id="bc-source-heading">{t('source')}</h2><p>{document.source.title}</p></div>
            <button className="btn btn--secondary" type="button" disabled={!!busy || !current} onClick={() => {
              if (current) { edit(refreshSource(document, current)); setNotice('sourceRefreshDone'); }
            }}>{t('refresh')}</button></div>
          {changed && <p className="bc-message bc-message--warn" role="status">{t('changed')}</p>}
          <p className="bc-meta">{t(document.source.estimateStatus)} · {t('captured')} {date(document.source.capturedAt)}</p>
          <dl className="bc-source-totals"><div><dt>{t('sourceMonthly')}</dt><dd>{amount(document.source.monthlyUsd)}</dd></div><div><dt>{t('sourceOnce')}</dt><dd>{amount(document.source.oneTimeUsd)}</dd></div></dl>
          {!!document.source.caveats.length && <details><summary>{t('caveats')}</summary><ul>{document.source.caveats.map((text, index) => <li key={index}>{text}</li>)}</ul></details>}
          {!!document.source.context && <details><summary>{t('context')}</summary><p className="bc-preserve">{document.source.context}</p></details>}
        </section>
        <div className="bc-layout">
          <fieldset className="bc-inputs" disabled={!!busy}>
            <legend className="visually-hidden">{t('title')}</legend>
            <section className="bc-panel"><h2>{t('baseline')}</h2><p>{t('blank')}</p><div className="bc-fields">
              {field('baselineMonthlyCostUsd')}{field('retiredMonthlyCostUsd')}{field('manualHoursMonthly', 1e6)}{field('loadedHourlyCostUsd', 1e5)}
            </div><p className="bc-hint">{t('baselineHint')}</p></section>
            <section className="bc-panel"><h2>{t('investment')}</h2><div className="bc-fields">
              {field('additionalRecurringMonthlyUsd')}{field('additionalImplementationUsd')}{field('horizonMonths', 60, '1')}
            </div><details open={document.inputs.monthlyCostOverrideUsd !== null || document.inputs.oneTimeCostOverrideUsd !== null || undefined}>
              <summary>{t('overrides')}</summary><p>{t('overrideHint')}</p><div className="bc-fields">{field('monthlyCostOverrideUsd')}{field('oneTimeCostOverrideUsd')}</div>
              <label className="bc-field"><span>{t('costOverrideReason')}</span><textarea data-field="costOverrideReason" rows={2} maxLength={1000} value={document.inputs.costOverrideReason}
                onChange={event => edit({ ...document, inputs: { ...document.inputs, costOverrideReason: event.target.value } })} /></label>
            </details></section>
            <section className="bc-panel"><h2>{t('scenarios')}</h2><p>{t('illustrative')}</p><div className="bc-scenarios">
              {document.inputs.scenarios.map(scenario => <section key={scenario.id} className="bc-scenario"><h3>{t(scenario.id)}</h3>
                {(['efficiencyPct', 'cashRealizationPct', 'additionalBenefitMonthlyUsd'] as const).map(key => <NumericField key={key} name={`${scenario.id}.${key}`}
                  label={t(key)} value={scenario[key]} max={key === 'additionalBenefitMonthlyUsd' ? 1e9 : 100} onChange={value => edit({ ...document, inputs: { ...document.inputs,
                    scenarios: document.inputs.scenarios.map(item => item.id === scenario.id ? { ...item, [key]: value } : item),
                  } })} />)}
              </section>)}
            </div><p className="bc-hint">{t('cashHint')}</p></section>
            <section className="bc-panel"><label className="bc-field"><span>{t('evidence')}</span><textarea data-field="evidence" rows={4} maxLength={4000} value={document.inputs.evidence}
              onChange={event => edit({ ...document, inputs: { ...document.inputs, evidence: event.target.value } })} /></label><p className="bc-hint">{t('evidenceHint')}</p></section>
          </fieldset>
          <div className="bc-results">
            <section className="bc-panel"><h2>{t('results')}</h2>
              {!calculation ? <p className="bc-message bc-message--warn">{t(overrideMissing ? 'overrideRequired' : 'invalid')}</p> : <>
                <dl className="bc-result-totals"><div><dt>{t('baselineTotal')}</dt><dd>{amount(calculation.baselineMonthlyUsd)}</dd></div><div><dt>{t('solutionTotal')}</dt><dd>{amount(calculation.solutionMonthlyUsd)}</dd></div><div><dt>{t('investmentTotal')}</dt><dd>{amount(calculation.investmentUsd)}</dd></div></dl>
                <div className="bc-table-wrap" role="region" aria-label={t('results')} tabIndex={0}><table className="bc-table"><thead><tr><th scope="col">{t('scenarios')}</th>{calculation.scenarios.map(item => <th scope="col" key={item.id}>{t(item.id)}</th>)}</tr></thead>
                  <tbody>{resultRows.map(row => <tr key={row.key} className={['netMonthlyCashUsd', 'horizonNetCashUsd'].includes(row.key) ? 'bc-table-highlight' : undefined}><th scope="row">{t(row.key)}</th>
                    {calculation.scenarios.map(item => <td key={item.id}>{number(item[row.key] as number | null, row.money)}</td>)}</tr>)}</tbody></table></div>
                <p className="bc-hint">{t('formula')}</p><details><summary>{t('formulaDetails')}</summary><p>{t('roiFormula')}</p></details>
                {!!calculation.missingInputs.length && <div className="bc-missing"><h3>{t('missingInputs')}</h3><ul>{calculation.missingInputs.map(key => <li key={key}>{fieldText(key, t)}</li>)}</ul></div>}
                <details><summary>{t('warnings')}</summary><ul>{calculation.warnings.map(key => <li key={key}>{t(key)}</li>)}</ul></details>
              </>}
            </section>
            {calculation && <section className="bc-panel"><h2>{t('sensitivity')}</h2><p>{t('sensitivityHint')}</p><dl className="bc-sensitivity">{calculation.sensitivity.map(item => <div key={item.id}><dt>{t(item.id)}</dt><dd>{number(item.monthlyImpactUsd, true)}</dd></div>)}</dl></section>}
            <section className="bc-panel"><h2>{t('poc')}</h2><p>{t('pocHint')}</p>
              <button type="button" className="btn btn--secondary" disabled={!!busy || !checked?.ok || changed} title={changed ? t('changed') : undefined} onClick={() => void run('explain')}>{t(busy === 'explain' ? 'explaining' : 'explain')}</button>
              {busy === 'explain' && <button type="button" className="btn btn--ghost" onClick={cancelAction}>{t('cancel')}</button>}
              {explanation && !changed && <div className="bc-explanation"><p className="bc-meta">{t('aiLabel')}</p><p>{explanation.summary}</p><h3>{t('questions')}</h3><ul>{explanation.questions.map((text, index) => <li key={index}>{text}</li>)}</ul><h3>{t('validation')}</h3><ul>{explanation.validationSteps.map((text, index) => <li key={index}>{text}</li>)}</ul></div>}
            </section>
          </div>
        </div>
        <section className="bc-history"><h2>{t('history')}</h2><p>{t('versionNotice')}</p>
          {records.length === 0 ? <p className="bc-meta">{t('noHistory')}</p> : <ul>{records.map(record => <li key={record.id}>
            <span>{date(record.createdAt)}</span><button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => openVersion(record)}>{t('load')}</button>
            <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => { setDeleteId(record.id); setDeleteArea('session'); }}>{t('delete')}</button>
            {deleteId === record.id && deleteArea === 'session' && <span className="bc-delete-confirm"><span>{t('confirmDelete')}</span><button type="button" className="btn btn--secondary" disabled={!!busy} onClick={() => void run('delete')}>{t('yesDelete')}</button><button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => setDeleteId(null)}>{t('cancel')}</button></span>}
          </li>)}</ul>}
          <details className="bc-all-versions"><summary>{t('manageAllVersions')}</summary><p>{t('manageAllHint')}</p>
            <button type="button" className="btn btn--secondary" disabled={!!busy} onClick={() => void run('versions')}>{t(busy === 'versions' ? 'loadingVersions' : allVersions ? 'refreshVersions' : 'loadAllVersions')}</button>
            {allVersions && (allVersions.length === 0 ? <p className="bc-meta">{t('noHistory')}</p> : <ul>{allVersions.map(record => <li key={record.id}>
              <span className="bc-version-meta"><strong>{record.title || t('title')}</strong><span>{date(record.createdAt)}</span></span>
              <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => { setDeleteId(record.id); setDeleteArea('all'); }}>{t('delete')}</button>
              {deleteId === record.id && deleteArea === 'all' && <span className="bc-delete-confirm"><span>{t('confirmDelete')}</span><button type="button" className="btn btn--secondary" disabled={!!busy} onClick={() => void run('delete')}>{t('yesDelete')}</button><button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => setDeleteId(null)}>{t('cancel')}</button></span>}
            </li>)}</ul>)}
          </details>
        </section>
      </>}
    </div>
    <footer className="bc-footer"><span role="status">{document ? t(dirty ? 'unsaved' : 'savedVersion') : ''}</span><div>
      <button type="button" className="btn btn--secondary" disabled={!!busy || !document || !calculation} onClick={() => {
        if (document && calculation) { printBusinessCase(document, calculation, changed ? null : explanation, lang, changed); setNotice('printHint'); }
      }}>{t('print')}</button>
      <button type="button" className="btn btn--primary" disabled={!!busy || !checked?.ok || !dirty} onClick={() => void run('save')}>{t(busy === 'save' ? 'saving' : 'save')}</button>
    </div></footer>
  </dialog>;
}
