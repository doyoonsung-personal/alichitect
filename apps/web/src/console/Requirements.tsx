// The pinned requirements block (spec 7.7): the architecture's contract with the customer, never scrolled away.
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import { REQ_COLLAPSED_ROWS, requirementMeta, stateView, visibleRequirements } from './logic.ts';
import type { RequirementView } from '../app/contracts.ts';
import type { ConsoleCtx } from './ctx.ts';

export function Requirements({ ctx }: { ctx: ConsoleCtx }): ReactElement {
  const { t, requirements } = ctx;
  const [expanded, setExpanded] = useState(false);
  const { shown, hidden } = visibleRequirements(requirements, expanded);

  // a requirement pinned past the fourth row opens the block, so the pin is seen when it lands
  const count = useRef(requirements.length);
  useEffect(() => {
    if (requirements.length > count.current && requirements.length > shown.length) setExpanded(true);
    count.current = requirements.length;
  }, [requirements.length, shown.length]);

  return (
    <section className="req" aria-labelledby="req-heading">
      <div className="req__head">
        <h2 id="req-heading" className="req__title">
          {t('req.heading')}
        </h2>
        {requirements.length ? <span className="req__count num">{requirements.length}</span> : null}
      </div>
      {requirements.length === 0 ? (
        <p className="req__empty prose">{t('req.empty')}</p>
      ) : (
        <ul className="req__list">
          {shown.map((r) => (
            <ReqRow key={r.text} ctx={ctx} r={r} />
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <button type="button" className="link-btn req__more" aria-expanded={false} onClick={() => setExpanded(true)}>
          {t('req.more', { n: hidden })}
        </button>
      ) : null}
      {expanded && requirements.length > REQ_COLLAPSED_ROWS ? (
        <button type="button" className="link-btn req__more" aria-expanded={true} onClick={() => setExpanded(false)}>
          {t('req.less')}
        </button>
      ) : null}
    </section>
  );
}

function ReqRow({ ctx, r }: { ctx: ConsoleCtx; r: RequirementView }): ReactElement {
  const { t, catalog, actions, turn } = ctx;
  // a requirement that lands while a turn is streaming enters (height, opacity, a soft blue ground); one that is already
  // there when the block mounts, or arrives with a restored session, does not
  const [entering, setEntering] = useState(r.isNew && turn.phase !== 'idle' && turn.phase !== 'error');
  const [flashing, setFlashing] = useState(entering);
  const view = stateView(r.state, t);
  const meta = requirementMeta(r, catalog, t);
  return (
    <li className="req__item" data-enter={entering || undefined} onAnimationEnd={(e) => e.target === e.currentTarget && setEntering(false)}>
      <div className="req__row" data-state={r.state} data-flash={flashing || undefined} onAnimationEnd={(e) => e.target === e.currentTarget && setFlashing(false)}>
        <span className="req__icon" data-tone={view.tone}>
          <Icon name={view.icon} />
        </span>
        <span className="req__text prose">{r.text}</span>
        <span className="req__state" data-tone={view.tone}>
          {view.label}
        </span>
        <button type="button" className="btn btn--ghost btn--icon req__unpin" aria-label={t('req.unpinLabel', { text: r.text })} title={t('req.unpin')} onClick={() => actions.unpin(r.text)}>
          <Icon name="unpin" />
        </button>
        {meta.length ? (
          <p className="req__meta">
            {meta.map((m, i) => (
              <span key={m.key} data-tone={m.tone}>
                {i > 0 ? <span aria-hidden="true"> {'·'} </span> : null}
                {m.text}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </li>
  );
}
