// "Export proposal": a header control that opens a small dialog (title, customer) and downloads the PDF. The PDF is made
// in this tab; the heavy code (pdfkit, fonts, router) loads only when Download is pressed.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactElement } from 'react';
import { useAppState, useCatalog, useStore, useT } from '../store/react.tsx';
import { isStreaming, productCount } from '../store/selectors.ts';
import type { AppState } from '../store/types.ts';
import { defaultTitle } from './model.ts';
import { makeXT } from './strings.ts';
import './export.css';

// Same drawing rules as the UI icon set (16 px grid, 1.5 px stroke, square caps); the set has no download glyph yet.
function DownloadIcon(): ReactElement {
  return (
    <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <line x1="8" y1="2.5" x2="8" y2="10.5" />
      <polyline points="4.5,7.5 8,11 11.5,7.5" />
      <line x1="2.5" y1="13.5" x2="13.5" y2="13.5" />
    </svg>
  );
}

type Phase = 'idle' | 'working' | 'done' | 'failed';

const selSession = (s: AppState) => s.session.id;

export function ExportButton(): ReactElement {
  const { lang } = useT();
  const xt = useMemo(() => makeXT(lang), [lang]);
  const store = useStore();
  const catalog = useCatalog();
  const streaming = useAppState(isStreaming);
  const products = useAppState(productCount);
  const sessionId = useAppState(selSession);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const forSession = useRef(sessionId);

  const disabled = streaming || products === 0;
  const disabledTitle = streaming ? xt('dialog.disabledBusy') : products === 0 ? xt('dialog.disabledEmpty') : undefined;

  // a new session starts with a clean dialog
  useEffect(() => {
    if (forSession.current === sessionId) return;
    forSession.current = sessionId;
    setTitle('');
    setCustomer('');
    setPhase('idle');
    setNote('');
    setOpen(false);
  }, [sessionId]);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (root.current && !root.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  // a revision starts while the dialog is open: the dialog goes away with the button
  useEffect(() => {
    if (disabled && open && phase !== 'working') setOpen(false);
  }, [disabled, open, phase]);

  const toggle = (): void => {
    if (open) return close(false);
    // the title defaults to the first ask; the person can change it before downloading
    if (!title.trim()) setTitle(defaultTitle(store.getState().session, xt));
    setPhase('idle');
    setNote('');
    setOpen(true);
    queueMicrotask(() => {
      titleInput.current?.focus();
      titleInput.current?.select();
      // a long title is selected from its start, so the reader sees the start of it, not the end
      if (titleInput.current) titleInput.current.scrollLeft = 0;
    });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      close(true);
    }
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (phase === 'working') return;
    setPhase('working');
    setNote(xt('dialog.working'));
    try {
      const { exportProposalPdf, saveBytes } = await import('./browser.ts');
      const r = await exportProposalPdf({ state: store.getState(), catalog, title, customer });
      saveBytes(r.bytes, r.fileName);
      setPhase('done');
      setNote(xt('dialog.done', { file: r.fileName }));
    } catch (err) {
      console.error('Export proposal failed', err);
      setPhase('failed');
      setNote(xt('dialog.failed'));
    }
  };

  return (
    <div className="xp" ref={root} onKeyDown={onKey}>
      <button
        ref={trigger}
        type="button"
        className="btn btn--ghost"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={xt('dialog.open')}
        title={disabledTitle}
        disabled={disabled}
        onClick={toggle}
      >
        <DownloadIcon />
        <span>{xt('dialog.open')}</span>
      </button>
      {open ? (
        <form id={panelId} className="xp__panel" role="dialog" aria-label={xt('dialog.title')} aria-busy={phase === 'working'} onSubmit={(e) => void submit(e)}>
          {/* progress on the dialog's top edge: a sweep while the PDF is made in this tab, a fill when it is saved */}
          <span className="xp__bar" data-phase={phase} aria-hidden="true">
            <span />
          </span>
          <h2 className="xp__title">{xt('dialog.title')}</h2>
          <p className="xp__hint">{xt('dialog.hint')}</p>
          <label className="xp__field">
            <span className="xp__label">{xt('dialog.fieldTitle')}</span>
            <input ref={titleInput} className="xp__input" type="text" value={title} maxLength={160} autoComplete="off" spellCheck={false} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="xp__field">
            <span className="xp__label">{xt('dialog.fieldCustomer')}</span>
            <input className="xp__input" type="text" value={customer} maxLength={80} autoComplete="off" spellCheck={false} onChange={(e) => setCustomer(e.target.value)} />
          </label>
          <div className="xp__actions">
            <button type="submit" className="btn btn--primary" disabled={phase === 'working'}>
              <DownloadIcon />
              <span>{phase === 'working' ? xt('dialog.working') : xt('dialog.download')}</span>
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => close(true)}>
              {xt('dialog.close')}
            </button>
          </div>
          <p className="xp__note" role="status" data-phase={phase}>
            <span key={phase} className="xp__note-text">
              {note}
            </span>
          </p>
        </form>
      ) : null}
    </div>
  );
}
