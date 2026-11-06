// A module-owned library: no architecture session, store mutation or paid call on open/create.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { BriefRecord, ListDiscoveryBriefsResponse } from '@ali/bd-brief/types.ts';
import { LIMITS } from '@ali/bd-brief/types.ts';
import { useT } from '../../store/react.tsx';
import { Icon } from '../../shell/Icon.tsx';
import { BriefDialog } from './BriefDialog.tsx';
import type { BriefDialogProps } from './BriefDialog.tsx';
import { createBdBriefApi, BdBriefApiError } from './api.ts';
import { discoverySnapshot } from './discovery.ts';
import { makeBT } from './strings.ts';
import './styles.css';

export function DiscoveryDialog(props: BriefDialogProps): JSX.Element {
  const { lang } = useT(), bt = useMemo(() => makeBT(lang), [lang]);
  const api = useMemo(() => createBdBriefApi(), []);
  const [records, setRecords] = useState<ListDiscoveryBriefsResponse['briefs']>([]);
  const [active, setActive] = useState<BriefRecord | null>(null);
  const [title, setTitle] = useState(''), [context, setContext] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState<'limit' | 'generic' | null>(null);
  const panel = useRef<HTMLDivElement>(null), abort = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  // A network retry creates the same logical meeting even if the first response was lost.
  const sourceKey = useRef<string | null>(null);
  const start = (): { signal: AbortSignal; seq: number } => {
    abort.current?.abort();abort.current = new AbortController();
    setBusy(true);setError(null);
    return { signal: abort.current.signal, seq: ++sequence.current };
  };
  const failed = (e: unknown, seq: number): void => {
    if (seq !== sequence.current || abort.current?.signal.aborted) return;
    setError(e instanceof BdBriefApiError && e.code === 'limit-exceeded' ? 'limit' : 'generic');
  };
  const load = async (): Promise<void> => {
    const { signal, seq } = start();
    try { const result = await api.listDiscoveryBriefs({ signal });if (seq === sequence.current) setRecords(result.briefs); }
    catch (e) { failed(e, seq); }
    finally { if (seq === sequence.current) setBusy(false); }
  };
  useEffect(() => {
    if (!active) void load();
    return () => { ++sequence.current;abort.current?.abort(); };
  }, [active, props.ctx.accountEmail, lang]); // context changes unmount the lazy entry as well

  useEffect(() => {
    if (active) return;
    const root = document.getElementById('root');root?.setAttribute('inert', '');panel.current?.focus();
    const focus = (e: FocusEvent): void => { if (panel.current && !panel.current.contains(e.target as Node)) panel.current.focus(); };
    document.addEventListener('focusin', focus);
    return () => { document.removeEventListener('focusin', focus);root?.removeAttribute('inert');props.returnFocus.current?.focus(); };
  }, [active]);

  const open = async (id: string): Promise<void> => {
    const { signal, seq } = start();
    try {
      const result = await api.getBrief(id, { signal });
      if (seq === sequence.current) {
        if (!result.brief.discovery) throw new Error('Missing discovery source');
        setActive(result.brief);
      }
    } catch (e) { failed(e, seq); }
    finally { if (seq === sequence.current) setBusy(false); }
  };
  const create = async (): Promise<void> => {
    const { signal, seq } = start();
    sourceKey.current ??= `discovery-${crypto.randomUUID()}`;
    const snapshot = discoverySnapshot(sourceKey.current, lang, context, Date.now());
    try {
      const result = await api.createBrief({ sourceKey: snapshot.sourceKey, lang, snapshot, title: title.trim() || bt('bdb.discovery.defaultTitle') }, { signal });
      if (seq === sequence.current) { sourceKey.current = null;setTitle('');setContext('');setActive(result.brief); }
    } catch (e) { failed(e, seq); }
    finally { if (seq === sequence.current) setBusy(false); }
  };
  const keyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') { e.preventDefault();props.onClose();return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const controls = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,a[href]')].filter(e => e.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault();last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault();first?.focus(); }
  };
  if (active?.discovery) return <BriefDialog {...props} ctx={{ ...props.ctx, sessionId: active.sourceKey, lang }} discovery={active.discovery} onClose={() => setActive(null)} />;
  return createPortal(<div className="bdb bdb-discovery">
    <div className="bdb__scrim" onClick={props.onClose} />
    <div className="bdb__panel" id={props.id} ref={panel} role="dialog" aria-modal="true" aria-labelledby="bdb-discovery-title" tabIndex={-1} onKeyDown={keyDown}>
      <header className="bdb__head"><div className="bdb__head-titles"><h2 className="bdb__title" id="bdb-discovery-title">{bt('bdb.discovery.title')}</h2><p className="bdb__hint">{bt('bdb.discovery.intro')}</p></div><button className="btn btn--ghost" type="button" onClick={props.onClose} aria-label={bt('bdb.dialog.close')}><Icon name="close" /></button></header>
      {error ? <div className="bdb__banner bdb__banner--error" role="alert">{bt(error === 'limit' ? 'bdb.discovery.limit' : 'bdb.error.generic')}<button className="btn btn--ghost" onClick={() => void load()}>{bt('bdb.error.retry')}</button></div> : null}
      <div className="bdb-discovery__columns">
        <form className="bdb__prep" onSubmit={e => { e.preventDefault();void create(); }}>
          <h3 className="bdb__sec-h">{bt('bdb.discovery.new')}</h3>
          <label className="bdb__field"><span className="bdb__label">{bt('bdb.discovery.label')}</span><input className="bdb__input" value={title} disabled={busy} maxLength={LIMITS.discoveryTitleChars} placeholder={bt('bdb.discovery.defaultTitle')} onChange={e => { setTitle(e.target.value);sourceKey.current = null; }} /></label>
          <label className="bdb__field"><span className="bdb__label">{bt('bdb.discovery.context')}</span><textarea className="bdb__textarea" value={context} disabled={busy} rows={5} maxLength={LIMITS.statementChars} placeholder={bt('bdb.discovery.contextHint')} onChange={e => { setContext(e.target.value);sourceKey.current = null; }} /></label>
          <button className="btn btn--primary" type="submit" disabled={busy || records.length >= LIMITS.discoveryBriefs}>{bt('bdb.discovery.create')}<Icon name="arrowRight" /></button>
          <p className="bdb__hint">{bt('bdb.discovery.prep')}</p>
        </form>
        <section className="bdb-discovery__saved" aria-labelledby="bdb-saved-meetings"><h3 className="bdb__sec-h" id="bdb-saved-meetings">{bt('bdb.discovery.saved')}</h3>
          {busy ? <p className="bdb__working" role="status">{bt('bdb.discovery.loading')}</p> : null}
          {!busy && !records.length ? <p className="bdb__hint">{bt('bdb.discovery.empty')}</p> : null}
          <ul className="bdb-discovery__list">{records.map(record => <li key={record.id}><button type="button" disabled={busy} onClick={() => void open(record.id)}><strong>{record.title}</strong><span>{new Date(record.updatedAt).toLocaleDateString(lang)} · {bt('bdb.brief.version', { version: record.version })}</span><span>{bt('bdb.discovery.open')} →</span></button></li>)}</ul>
          <p className="bdb__hint">{bt('bdb.discovery.limit')}</p>
        </section>
      </div>
    </div>
  </div>, document.body);
}
