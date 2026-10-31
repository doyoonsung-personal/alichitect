// A collapsed revision (spec 7.9): 48 px, the outline tag, the ask on one line, and "+3 -0 · 7.3 s". The whole row is a
// button that opens the revision in place; hovering it points at the revision's cards on the canvas.
import type { ReactElement } from 'react';
import { revisionCards, revisionState, rowMeta } from './logic.ts';
import type { Revision } from '../app/contracts.ts';
import type { ConsoleCtx } from './ctx.ts';

export function RevisionRow({ ctx, r, onOpen }: { ctx: ConsoleCtx; r: Revision; onOpen: () => void }): ReactElement {
  const { t, actions, latestCommitted } = ctx;
  const state = revisionState(r);
  const { cards, ghosts } = revisionCards(r);
  const on = (): void => {
    if (cards.length || ghosts.length) actions.highlight({ source: 'row', cards, ghosts, revision: r.n });
  };
  const tone = state === 'broken' || state === 'failed' ? 'danger' : state === 'atRisk' || state === 'fixed' ? 'warn' : undefined;
  return (
    <button type="button" className="row" aria-expanded={false} onClick={onOpen} onMouseEnter={on} onMouseLeave={() => actions.highlight(null)} onFocus={on} onBlur={() => actions.highlight(null)}>
      <span className={`tag tag--static${latestCommitted === r.n ? ' tag--latest' : ''}`} aria-hidden="true">
        <span className="num">{r.n}</span>
      </span>
      <span className="row__text">
        <span className="row__ask" lang={r.askLang}>
          <span className="visually-hidden">{t('rec.revision', { n: r.n })}: </span>
          {r.ask}
        </span>
        <span className="row__meta num" data-tone={tone}>
          {rowMeta(r, t)}
        </span>
      </span>
    </button>
  );
}
