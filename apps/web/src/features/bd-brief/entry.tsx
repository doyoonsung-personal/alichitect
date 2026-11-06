// The optional BD meeting brief entry (plan §5): a small capability gate and lazy-loading
// boundary. It renders NOTHING unless /api/me advertised features.bdBrief — no dialog, no
// timers, no BD requests and no dynamic import. The full UI loads only when the BD opens it,
// inside a local error boundary so a load or render failure can never crash the header or the
// design screen. Removing the feature removes this file and its single Header import.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, RefObject } from 'react';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useAppState } from '../../store/react.tsx';
import { useT } from '../../store/react.tsx';
import type { AppState } from '../../store/types.ts';
import type { BriefContext } from './controller.ts';
import { makeBT } from './strings.ts';
import { isStreaming } from '../../store/selectors.ts';

/** The dialog module, loaded on first open (repo convention: dynamic import in the handler, not React.lazy). */
type DialogModule = typeof import('./BriefDialog.tsx');

interface BoundaryProps {
  children: ReactNode;
  retry(): void;
  message: string;
}
interface BoundaryState {
  failed: boolean;
}

/** Renders nothing on any child load/render failure: the surrounding design screen stays usable (plan §5). */
class BdBriefBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // module-local logging only; never rethrow into the host tree
    console.error('bd-brief dialog failed', error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.failed ? <button className="btn btn--ghost" type="button" role="alert" onClick={this.props.retry}>{this.props.message}</button> : this.props.children;
  }
}

const selSessionId = (s: AppState): string => s.session.id;
const selAccount = (s: AppState): AppState['account'] => s.account;

export function BdBriefEntry(): JSX.Element | null {
  const account = useAppState(selAccount);
  const enabled = account?.features?.bdBrief === true;

  // Every hook runs before the early return so the hook order is stable whether or not the
  // feature is enabled; nothing below issues a request or a timer until `open` is set.
  const { lang } = useT();
  const bt = useMemo(() => makeBT(lang), [lang]);
  const sessionId = useAppState(selSessionId);
  const blocked = useAppState(s => !!s.replay || isStreaming(s) || s.pricingStatus === 'working');
  const trigger = useRef<HTMLButtonElement>(null);
  const [mod, setMod] = useState<DialogModule | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const current = useRef({ sessionId, enabled, email: account?.email });
  current.current = { sessionId, enabled, email: account?.email };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setOpen(false); }, [sessionId, enabled, account?.email]);

  const onOpen = useCallback(() => {
    setFailed(false);
    if (mod) { setOpen(true); return; }
    setLoading(true);
    const gate = current.current;
    // load the heavy UI only on first open; a failure is caught by the boundary, not the header
    void import('./BriefDialog.tsx')
      .then((m) => {
        if (!mounted.current) return;
        setMod(() => m);
        if (current.current.enabled && current.current.sessionId === gate.sessionId && current.current.email === gate.email) setOpen(true);
      })
      .catch((err: unknown) => {
        console.error('bd-brief load failed', err);
        if (mounted.current) { setFailed(true); setOpen(false); }
      }).finally(() => { if (mounted.current) setLoading(false); });
  }, [mod]);

  const onClose = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  if (!enabled) return null;

  const ctx: BriefContext = { sessionId, lang, accountEmail: account?.email ?? null };
  const Dialog = mod?.BriefDialog;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="btn btn--ghost bd-brief-entry"
        disabled={blocked || loading}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? 'bdb-dialog' : undefined}
        aria-label={bt('bdb.entry.aria')}
        onClick={onOpen}
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 3h12v11H9l-5 3V3Z"/><path d="M7 6h6M7 9h5"/></svg>
        <span>{bt('bdb.entry.trigger')}</span>
      </button>
      {failed && <span role="alert">{bt('bdb.error.generic')}</span>}
      {open && Dialog ? (
        <BdBriefBoundary key={`${sessionId}:${account?.email}:${attempt}`} message={bt('bdb.error.retry')} retry={() => setAttempt(value => value + 1)}>
          <Dialog id="bdb-dialog" ctx={ctx} returnFocus={trigger as RefObject<HTMLElement | null>} onClose={onClose} />
        </BdBriefBoundary>
      ) : null}
    </>
  );
}
