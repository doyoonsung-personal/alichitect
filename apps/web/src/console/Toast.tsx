// The toast (spec 7.30): bottom-left of the console, above the composer. One action, gone after 6 s, paused while the
// pointer or focus is on it. Used for Unpin's Undo and for a restored session.
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { ConsoleCtx } from './ctx.ts';

export const TOAST_MS = 6000;

export function Toast({ ctx }: { ctx: ConsoleCtx }): ReactElement | null {
  const { t, toast, actions } = ctx;
  const [paused, setPaused] = useState(false);
  const left = useRef(TOAST_MS);
  const id = toast?.id;

  useEffect(() => {
    left.current = TOAST_MS;
    setPaused(false);
  }, [id]);

  useEffect(() => {
    if (id === undefined || paused) return;
    const started = Date.now();
    const h = window.setTimeout(actions.clearToast, left.current);
    return () => {
      window.clearTimeout(h);
      left.current = Math.max(0, left.current - (Date.now() - started));
    };
  }, [id, paused, actions.clearToast]);

  if (!toast) return null;
  const text = toast.kind === 'unpinned' ? t('req.unpinned') : t('session.restored', { date: toast.date ?? '' });
  return (
    <div className="toast" role="status" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <span className="toast__text">{text}</span>
      {toast.kind === 'unpinned' ? (
        <button type="button" className="toast__action" onClick={actions.undoUnpin}>
          {t('req.undo')}
        </button>
      ) : null}
    </div>
  );
}
