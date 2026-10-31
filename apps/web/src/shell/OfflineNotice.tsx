// The offline notice (spec 7.29): never a modal. Shown under the brief box on the landing and at the top of the record in
// the working view. Try again re-checks /api/health; Replay plays a recorded session through the same pipeline.
import type { ReactElement } from 'react';
import type { TFn } from '../i18n/t.ts';

export interface OfflineNoticeProps {
  t: TFn;
  /** The health check is running. */
  checking: boolean;
  onRetry(): void;
  onReplay(): void;
  className?: string;
}

export function OfflineNotice(p: OfflineNoticeProps): ReactElement {
  return (
    <section className={`notice ${p.className ?? ''}`} aria-label={p.t('offline.title')} role="status">
      <h2 className="notice__title">{p.t('offline.title')}</h2>
      <p className="notice__body">{p.t('offline.body')}</p>
      <div className="notice__actions">
        <button type="button" className="btn btn--secondary" onClick={p.onRetry} disabled={p.checking}>
          {p.checking ? p.t('offline.checking') : p.t('offline.retry')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={p.onReplay}>
          {p.t('offline.replay')}
        </button>
      </div>
    </section>
  );
}
