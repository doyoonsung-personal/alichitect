// The replay banner (spec 7.29): a recorded session plays through the same pipeline as a live one. Speed, restart, leave.
import type { ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import type { ReplaySpeed } from '../app/contracts.ts';
import type { ConsoleCtx } from './ctx.ts';

const SPEEDS: readonly ReplaySpeed[] = ['1x', '4x', 'instant'];

export function ReplayBanner({ ctx }: { ctx: ConsoleCtx }): ReactElement | null {
  const { t, replay, actions } = ctx;
  if (!replay) return null;
  return (
    <section className="rb" aria-label={t('header.replay')}>
      <p className="rb__text">{t('replay.banner', { date: replay.recordedAt })}</p>
      <div className="rb__row">
        <div className="rb__speed" role="group" aria-label={t('replay.speed')}>
          {SPEEDS.map((s) => (
            <button key={s} type="button" className="rb__speed-btn" aria-pressed={replay.speed === s} onClick={() => actions.setReplaySpeed(s)}>
              {s === 'instant' ? t('replay.instant') : s}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--ghost btn--icon rb__btn" aria-label={t('replay.restart')} title={t('replay.restart')} onClick={actions.restartReplay}>
          <Icon name="retry" />
        </button>
        <button type="button" className="btn btn--ghost rb__btn rb__exit" onClick={actions.exitReplay}>
          {t('replay.exit')}
        </button>
      </div>
    </section>
  );
}
