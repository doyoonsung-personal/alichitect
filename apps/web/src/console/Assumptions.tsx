// The assumption chips (research/phase1-asks-and-scope.md section 1), beside the pinned requirements:
// "Assumed: Public-facing · Change". Change sends a follow-up ("Change: Internal only instead of Public-facing"); the
// requirement that follows settles the assumption and the chip goes. Chips and Change are plain buttons: Tab reaches
// them, Enter or Space presses them, the focus ring is the global one.
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ASM_COLLAPSED, canAnswer, changeAsk, visibleAssumptions } from './logic.ts';
import { focusComposer } from './focus.ts';
import type { AssumptionView } from '../app/contracts.ts';
import type { ConsoleCtx } from './ctx.ts';

export function Assumptions({ ctx }: { ctx: ConsoleCtx }): ReactElement | null {
  const { t, assumptions } = ctx;
  const [expanded, setExpanded] = useState(false);
  if (!assumptions.length) return null;
  const { shown, hidden } = visibleAssumptions(assumptions, expanded);
  return (
    <div className="asm">
      <ul className="asm__list" aria-label={t('asm.listLabel')}>
        {shown.map((a) => (
          <Chip key={a.id} ctx={ctx} a={a} />
        ))}
      </ul>
      {hidden > 0 ? (
        <button type="button" className="link-btn asm__more" aria-expanded={false} onClick={() => setExpanded(true)}>
          {t('req.more', { n: hidden })}
        </button>
      ) : null}
      {expanded && assumptions.length > ASM_COLLAPSED ? (
        <button type="button" className="link-btn asm__more" aria-expanded={true} onClick={() => setExpanded(false)}>
          {t('req.less')}
        </button>
      ) : null}
    </div>
  );
}

function Chip({ ctx, a }: { ctx: ConsoleCtx; a: AssumptionView }): ReactElement {
  const { t, turn, replay, actions } = ctx;
  // a chip that lands while a turn streams enters; one that is there when the block mounts does not
  const [entering, setEntering] = useState(turn.phase !== 'idle' && turn.phase !== 'error');
  const ask = changeAsk(a, t);
  const live = canAnswer(turn.phase, !!replay);
  return (
    <li className="asm__chip" data-enter={entering || undefined} onAnimationEnd={(e) => e.target === e.currentTarget && setEntering(false)}>
      <span className="asm__text prose">
        <span className="asm__label">{t('asm.label')}</span>
        {ctx.lang === 'zh' ? '' : ' '}
        <span className="asm__what">{a.text}</span>
      </span>
      {ask ? (
        <>
          <span className="asm__sep" aria-hidden="true">
            {'·'}
          </span>
          <button
            type="button"
            className="asm__change"
            disabled={!live}
            aria-label={t('asm.changeLabel', { text: a.text })}
            title={replay ? t('composer.replayReadOnly') : undefined}
            onClick={() => {
              if (actions.submit(ask) === 'started') focusComposer();
            }}
          >
            {t('asm.change')}
          </button>
        </>
      ) : null}
    </li>
  );
}
