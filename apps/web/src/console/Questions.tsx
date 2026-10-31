// The questions a revision asked (research/phase1-asks-and-scope.md section 1): a question in the revision's own body
// with its quick replies as buttons. An option sends itself as the next ask and the question shows that answer inline;
// typing a different reply in the composer closes every open question. Revisions are never edited: a question's state
// is read from the revision that follows it (store/asks.ts).
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import { askViews } from '../store/asks.ts';
import { canAnswer } from './logic.ts';
import { focusComposer } from './focus.ts';
import type { Revision } from '../app/contracts.ts';
import type { ConsoleCtx } from './ctx.ts';

export function Questions({ ctx, r }: { ctx: ConsoleCtx; r: Revision }): ReactElement | null {
  const { t, revisions, turn, replay, actions } = ctx;
  const index = revisions.findIndex((x) => x.n === r.n);
  const views = useMemo(() => askViews(revisions, index), [revisions, index]);
  if (!views.length) return null;
  const live = canAnswer(turn.phase, !!replay);
  const anyOpen = views.some((q) => q.state === 'open' && q.options.length > 0);
  return (
    <section className="asks" aria-label={t('ask.groupLabel', { n: r.n })}>
      {views.map((q) => (
        <div className="ask" key={q.id} data-state={q.state}>
          <p className="ask__text prose" lang={r.askLang}>
            {q.text}
          </p>
          {q.state === 'open' && q.options.length ? (
            <ul className="ask__opts" aria-label={t('ask.optionsLabel')}>
              {q.options.map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    className="btn btn--secondary ask__opt"
                    lang={r.askLang}
                    disabled={!live}
                    title={replay ? t('composer.replayReadOnly') : undefined}
                    onClick={() => {
                      if (actions.submit(o) === 'started') focusComposer();
                    }}
                  >
                    {o}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {q.state === 'answered' && q.answer ? (
            <p className="ask__answer prose" lang={r.askLang}>
              <Icon name="check" size={14} />
              <span>{t('ask.answer', { answer: q.answer })}</span>
            </p>
          ) : null}
          {q.state === 'replied' && q.closedIn !== null ? <p className="ask__answer ask__answer--quiet">{t('ask.replied', { n: q.closedIn })}</p> : null}
        </div>
      ))}
      {anyOpen && live ? <p className="ask__hint">{t('ask.hint')}</p> : null}
    </section>
  );
}
