// The proposal overlay: a modal sheet over the workspace while the proposal is written. It lists the
// steps as the sections arrive, the elapsed time and the latest written line, and always offers Stop. On a failure it
// says what happened and offers the basic version, Try again and Close. Escape never stops the work: an accidental key
// must not throw away a minute of writing. The state lives in draft-flow.ts; this file only draws it.
import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactElement, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../shell/Icon.tsx';
import { DownloadIcon } from './DownloadIcon.tsx';
import type { Lang } from '../i18n/t.ts';
import { activeStep, formatElapsed, stepsOf } from './draft-flow.ts';
import type { FlowError, FlowState, StepId } from './draft-flow.ts';
import type { ExportKey, XT } from './strings.ts';
import './overlay.css';

export interface DraftOverlayProps {
  flow: FlowState;
  xt: XT;
  lang: Lang;
  onStop(): void;
  onBasic(): void;
  onRetry(): void;
  onClose(): void;
  /** Where focus returns when the overlay closes: the dialog's Download button. */
  returnFocus: RefObject<HTMLElement | null>;
}

const STEP_LABEL: Record<StepId, ExportKey> = {
  read: 'overlay.step.read',
  exec: 'overlay.step.exec',
  needs: 'overlay.step.needs',
  outcomes: 'overlay.step.outcomes',
  why: 'overlay.step.why',
  close: 'overlay.step.close',
  layout: 'overlay.step.layout',
};

/**
 * Fatal codes whose message the server writes for people, in the request's language (apps/server messages.ts, the
 * Worker's proposal copy). Any other code (bad-json, body-too-large, a validator path ...) carries developer English,
 * so ours is shown instead.
 */
const SERVER_WORDS: ReadonlySet<string> = new Set(['quota-exceeded', 'user-busy', 'server-busy', 'signed-out', 'not-approved', 'no-key', 'content-filtered', 'draft-timeout', 'draft-failed', 'internal']);

/** The words for a failure: the server's own message for the codes it localises, else ours for the kind of failure. */
export function errorMessage(e: FlowError, xt: XT): string {
  if (e.kind === 'fatal') {
    if (e.message && SERVER_WORDS.has(e.code)) return e.message;
    if (e.code === 'signed-out' || e.code === 'http-401') return xt('overlay.error.signedOut');
    return xt('overlay.error.generic', { code: e.code });
  }
  if (e.kind === 'network') return xt('overlay.error.network');
  if (e.kind === 'incomplete') return xt('overlay.error.incomplete');
  if (e.kind === 'layout') return xt('overlay.error.layout');
  return xt('overlay.unavailable');
}

export function DraftOverlay(p: DraftOverlayProps): ReactElement {
  const { flow, xt } = p;
  const titleId = useId();
  const hintId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const firstAction = useRef<HTMLButtonElement>(null);
  const stopButton = useRef<HTMLButtonElement>(null);
  const { phase, basic } = flow;
  const working = phase === 'drafting' || phase === 'layout';
  const failed = phase === 'failed' || phase === 'unavailable';

  // the workspace behind goes inert (no pointer, no Tab, hidden from screen readers) while the overlay is up
  useEffect(() => {
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    const back = p.returnFocus;
    panel.current?.focus();
    return () => {
      root?.removeAttribute('inert');
      back.current?.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop goes away with a failure: focus moves to the first way forward instead of falling to the page. On any other
  // change of phase (Try again, the basic version, done) the button that had focus may have gone: focus returns to Stop
  // when it is there, else to the sheet, so keyboard and screen-reader users keep their place and Escape still reaches it.
  useEffect(() => {
    if (failed) {
      firstAction.current?.focus();
      return;
    }
    const at = document.activeElement;
    if (!panel.current || (at && panel.current.contains(at) && at !== document.body)) return;
    (stopButton.current ?? panel.current).focus();
  }, [failed, phase]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Escape') return;
    // never reaches the export dialog behind; on a failure it closes, while writing it does nothing
    e.preventDefault();
    e.stopPropagation();
    if (failed) p.onClose();
  };

  const title = phase === 'done' ? xt('overlay.ready') : phase === 'failed' ? xt('overlay.failedTitle') : phase === 'unavailable' ? xt('overlay.unavailableTitle') : basic ? xt('overlay.basicTitle') : xt('overlay.title');
  const hint = phase === 'done' ? xt('overlay.readyHint') : failed ? errorMessage(flow.error!, xt) : basic ? xt('overlay.basicOffer') : xt('overlay.hint');
  const steps = basic || failed ? [] : stepsOf(flow);
  const active = activeStep(flow);
  const live = phase === 'done' ? xt('overlay.live.done') : active && !basic ? xt(STEP_LABEL[active]) : '';

  return createPortal(
    <div className="dov" data-phase={phase}>
      <div className="dov__scrim" aria-hidden="true" />
      <div
        ref={panel}
        className="dov__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        tabIndex={-1}
        onKeyDown={onKey}
      >
        {/* progress on the sheet's top edge: a sweep while the proposal is written and laid out, a fill when it is saved */}
        <span className="dov__bar" data-phase={phase} aria-hidden="true">
          <span />
        </span>
        <div className="dov__head">
          <h2 id={titleId} className="dov__title">
            {title}
          </h2>
          {working ? (
            <span className="dov__time" role="timer" aria-label={`${xt('overlay.elapsed')} ${formatElapsed(flow.now - flow.startedAt)}`}>
              {formatElapsed(flow.now - flow.startedAt)}
            </span>
          ) : null}
        </div>
        {/* a failure is an alert; no server to write with is a plain statement of how things are */}
        <p id={hintId} className="dov__hint" data-tone={phase === 'failed' ? 'error' : phase === 'unavailable' ? 'plain' : undefined} role={phase === 'failed' ? 'alert' : phase === 'unavailable' ? 'status' : undefined}>
          {hint}
        </p>
        {failed ? <p className="dov__hint">{xt('overlay.basicOffer')}</p> : null}

        {steps.length ? (
          <ol className="dov__steps">
            {steps.map((s) => (
              <li key={s.id} className="dov__step" data-status={s.status} aria-current={s.status === 'active' ? 'step' : undefined}>
                <span className="dov__mark" aria-hidden="true">
                  {s.status === 'done' ? <Icon name="check" /> : s.status === 'active' ? <Icon name="spinner" /> : <span className="dov__pending" />}
                </span>
                <span className="dov__label">{xt(STEP_LABEL[s.id])}</span>
                <span className="dov__count">{s.count ? (s.count.n !== undefined ? xt('overlay.count', { k: s.count.k, n: s.count.n }) : String(s.count.k)) : ''}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {phase === 'drafting' ? (
          <div className="dov__latest" aria-hidden="true">
            <span className="dov__latest-label">{xt('overlay.latest')}</span>
            {flow.preview ? (
              <p key={flow.preview.seq} className="dov__line" lang={p.lang}>
                {flow.preview.text}
              </p>
            ) : (
              <p className="dov__line dov__line--empty">…</p>
            )}
          </div>
        ) : null}
        {flow.slow && phase === 'drafting' ? <p className="dov__slow">{xt('overlay.slow')}</p> : null}

        <div className="dov__actions">
          {working ? (
            <button ref={stopButton} type="button" className="btn btn--secondary" onClick={p.onStop}>
              <Icon name="stop" />
              <span>{xt('overlay.stop')}</span>
            </button>
          ) : null}
          {failed ? (
            <>
              <button ref={firstAction} type="button" className="btn btn--primary" onClick={p.onBasic}>
                <DownloadIcon />
                <span>{xt('overlay.basic')}</span>
              </button>
              {phase === 'failed' && flow.error?.retryable ? (
                <button type="button" className="btn btn--secondary" onClick={p.onRetry}>
                  <Icon name="retry" />
                  <span>{xt('overlay.retry')}</span>
                </button>
              ) : null}
              <button type="button" className="btn btn--ghost" onClick={p.onClose}>
                {xt('overlay.close')}
              </button>
            </>
          ) : null}
        </div>
        <p className="visually-hidden" aria-live="polite">
          {live}
        </p>
      </div>
    </div>,
    document.body,
  );
}
