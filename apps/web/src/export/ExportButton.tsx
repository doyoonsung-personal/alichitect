// "Export proposal": a header control that opens a small dialog (title, customer). Download writes the proposal's
// narrative on the server (POST /api/proposal) under a modal overlay with live steps and Stop, then lays
// out the PDF in this tab with it. The heavy code (pdfkit, fonts, router) loads while the narrative is being written.
// When no narrative can be written, the overlay offers the basic version: the same PDF without it.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactElement } from 'react';
import type { ProposalAudience, ProposalDraft } from '@ali/core/types.ts';
import { useAppState, useCatalog, useController, useStore, useT } from '../store/react.tsx';
import { canExport, isStreaming } from '../store/selectors.ts';
import type { AppState } from '../store/types.ts';
import { entryFor } from '../canvas/scene.ts';
import { DownloadIcon } from './DownloadIcon.tsx';
import { DraftOverlay } from './DraftOverlay.tsx';
import { DraftError, buildProposalRequest, requestDraft } from './draft-client.ts';
import { DONE_HOLD_MS, designProducts, reduceFlow, startFlow } from './draft-flow.ts';
import type { FlowEvent, FlowState } from './draft-flow.ts';
import { defaultTitle } from './model.ts';
import { makeXT } from './strings.ts';
import './export.css';

/** 'stopped': Stop, or the overlay was closed after a failure; nothing was downloaded. */
type Phase = 'idle' | 'working' | 'done' | 'failed' | 'stopped';

const selSession = (s: AppState) => s.session.id;
const TICK_MS = 500;

export function ExportButton(): ReactElement {
  const { lang } = useT();
  const xt = useMemo(() => makeXT(lang), [lang]);
  const store = useStore();
  const catalog = useCatalog();
  const controller = useController();
  const busy = useAppState((s) => isStreaming(s) || s.pricingStatus === 'working');
  const exportable = useAppState(canExport);
  const sessionId = useAppState(selSession);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [customer, setCustomer] = useState('');
  const [audience, setAudience] = useState<ProposalAudience>('client');
  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState('');
  const [flow, setFlow] = useState<FlowState | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const download = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const forSession = useRef(sessionId);
  // one run at a time: Stop, Close or a new run bumps the counter, and anything the old run finishes later is dropped
  const run = useRef(0);
  const ac = useRef<AbortController | null>(null);
  const drafted = useRef<ProposalDraft | null>(null);
  const snapshot = useRef<AppState | null>(null);
  const overlayUp = useRef(false);
  overlayUp.current = flow !== null;

  const nameOf = useCallback((id: string): string => entryFor(catalog, id)?.name ?? id, [catalog]);
  const send = useCallback((ev: FlowEvent) => setFlow((f) => (f ? reduceFlow(f, ev, nameOf) : f)), [nameOf]);

  const disabled = busy || !exportable;
  const disabledTitle = busy ? xt('dialog.disabledBusy') : !exportable ? xt('dialog.disabledEmpty') : undefined;

  // a new session starts with a clean dialog; a draft still being written for the old one is dropped
  useEffect(() => {
    if (forSession.current === sessionId) return;
    forSession.current = sessionId;
    run.current++;
    ac.current?.abort();
    setFlow(null);
    setTitle('');
    setCustomer('');
    setAudience('client');
    setPhase('idle');
    setNote('');
    setOpen(false);
  }, [sessionId]);

  // leaving the page mid-draft aborts the request
  useEffect(() => () => ac.current?.abort(), []);

  // the overlay's clock: elapsed time, and the latest line's turn to change
  const ticking = flow?.phase === 'drafting' || flow?.phase === 'layout';
  useEffect(() => {
    if (!ticking) return;
    const h = setInterval(() => send({ type: 'tick', now: Date.now() }), TICK_MS);
    return () => clearInterval(h);
  }, [ticking, send]);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      // the overlay sits outside this dialog's box: a click on it must not close the dialog underneath
      if (overlayUp.current) return;
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

  /** The overlay is done with: it goes, focus returns to Download, and the dialog says what happened. */
  const finish = (p: Phase, text: string): void => {
    setFlow(null);
    setPhase(p);
    setNote(text);
  };

  /** Lays out the PDF, with the narrative or without it (the basic version), and downloads it. */
  const layOut = async (draft: ProposalDraft | null, mine: number): Promise<void> => {
    send({ type: draft ? 'drafted' : 'basic', now: Date.now() });
    try {
      const { exportProposalPdf, saveBytes } = await import('./browser.ts');
      const r = await exportProposalPdf({ state: snapshot.current ?? store.getState(), catalog, title, customer, audience, draft });
      if (run.current !== mine) return;
      saveBytes(r.bytes, r.fileName);
      send({ type: 'saved', now: Date.now() });
      setTimeout(() => {
        if (run.current === mine) finish('done', xt(draft ? 'dialog.done' : 'dialog.doneBasic', { file: r.fileName }));
      }, DONE_HOLD_MS);
    } catch (err) {
      console.error('Export proposal failed', err);
      if (run.current === mine) send({ type: 'failed', error: { kind: 'layout', code: 'layout', message: '', retryable: true }, now: Date.now() });
    }
  };

  const startDraft = (): void => {
    const st = store.getState();
    if (isStreaming(st) || st.pricingStatus === 'working') return;
    snapshot.current = st;
    const mine = ++run.current;
    ac.current?.abort();
    drafted.current = null;
    const workflow = st.session.memory.workflow;
    const workflowOnly = !!Object.keys(workflow?.nodes ?? {}).length
      && Object.keys(st.display.graph.nodes).length === 0 && st.display.graph.recs.length === 0;
    const productIds = designProducts(st.display.graph, (id) => {
      const e = entryFor(catalog, id);
      return !!e && e.kind !== 'construct';
    }, workflow);
    setFlow(startFlow(Date.now(), productIds, workflow, workflowOnly, true));
    setPhase('working');
    setNote('');
    // a replay or an offline session has no server to write with: say so, and offer the basic version
    if (st.replay || st.conn.mode === 'offline') {
      send({ type: 'failed', error: { kind: 'unavailable', code: st.replay ? 'replay' : 'offline', message: '', retryable: false }, now: Date.now() });
      return;
    }
    // the PDF code loads while the narrative is written, so laying it out is quick
    void import('./browser.ts').catch(() => {});
    const mineAc = new AbortController();
    ac.current = mineAc;
    requestDraft(buildProposalRequest(st, title, customer, audience), {
      signal: mineAc.signal,
      onSection: (section) => {
        if (run.current === mine) send({ type: 'section', section, now: Date.now() });
      },
      onStatus: () => {
        if (run.current === mine) send({ type: 'status', now: Date.now() });
      },
    })
      .then(
        (draft) => {
          if (run.current !== mine) return;
          drafted.current = draft;
          void layOut(draft, mine);
        },
        (err: unknown) => {
          if (run.current !== mine) return;
          const e = err instanceof DraftError ? err : new DraftError('network', 'network', String(err), true);
          if (e.kind === 'aborted') return;
          send({ type: 'failed', error: { kind: e.kind, code: e.code, message: e.kind === 'fatal' ? e.message : '', retryable: e.retryable }, now: Date.now() });
        },
      )
      // a draft counts against the day's turns: the account menu's count follows
      .finally(() => {
        if (store.getState().account) void controller.loadAccount();
      });
  };

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (phase === 'working' || flow) return;
    startDraft();
  };

  const stop = (): void => {
    run.current++;
    ac.current?.abort();
    ac.current = null;
    finish('stopped', xt('dialog.stopped'));
  };

  const basic = (): void => {
    void layOut(null, ++run.current);
  };

  // A PDF that failed to lay out is laid out again as it was asked for: the basic version again after a failed basic
  // layout (no new draft, no turn spent), else with the narrative already written. Anything else writes it again.
  const retry = (): void => {
    if (flow?.error?.kind === 'layout' && flow.basic) void layOut(null, ++run.current);
    else if (flow?.error?.kind === 'layout' && drafted.current) void layOut(drafted.current, ++run.current);
    else startDraft();
  };

  const closeOverlay = (): void => {
    run.current++;
    finish('stopped', xt('dialog.closed'));
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
        <form id={panelId} className="xp__panel" role="dialog" aria-label={xt('dialog.title')} aria-busy={phase === 'working'} onSubmit={submit}>
          {/* progress on the dialog's top edge: a sweep while the proposal is made, a fill when it is saved */}
          <span className="xp__bar" data-phase={phase} aria-hidden="true">
            <span />
          </span>
          <h2 className="xp__title">{xt('dialog.title')}</h2>
          <p className="xp__hint">{xt('dialog.hint')}</p>
          <fieldset className="xp__audience" disabled={phase === 'working'}>
            <legend className="xp__label">{xt('dialog.audience')}</legend>
            {(['client', 'alibaba'] as const).map(value => <label key={value} className="xp__choice">
              <input type="radio" name={`${panelId}-audience`} value={value} checked={audience === value} onChange={() => setAudience(value)} />
              <span><strong>{xt(`dialog.audience.${value}`)}</strong><small>{xt(`dialog.audience.${value}.hint`)}</small></span>
            </label>)}
          </fieldset>
          <label className="xp__field">
            <span className="xp__label">{xt('dialog.fieldTitle')}</span>
            <input ref={titleInput} className="xp__input" type="text" value={title} maxLength={160} autoComplete="off" spellCheck={false} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="xp__field">
            <span className="xp__label">{xt('dialog.fieldCustomer')}</span>
            <input className="xp__input" type="text" value={customer} maxLength={80} autoComplete="off" spellCheck={false} onChange={(e) => setCustomer(e.target.value)} />
          </label>
          <div className="xp__actions">
            <button ref={download} type="submit" className="btn btn--primary" disabled={phase === 'working'}>
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
      {flow ? <DraftOverlay
        flow={flow}
        xt={(key, vars) => xt(key === 'overlay.step.why' && flow.authored ? 'overlay.step.sections' : key === 'overlay.step.why' && flow.stepIds.length ? 'overlay.step.workflow' : key, vars)}
        lang={lang} onStop={stop} onBasic={basic} onRetry={retry} onClose={closeOverlay} returnFocus={download}
      /> : null}
    </div>
  );
}
