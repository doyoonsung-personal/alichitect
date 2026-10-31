// A revision's change set (spec 7.10): one line per change, each a button that points at its cards on the canvas.
// Arrow keys move within the list (roving tab stop); hover and focus highlight, click or Enter pans.
import { Fragment, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { Icon } from '../shell/Icon.tsx';
import type { UiIconName } from '../shell/Icon.tsx';
import { isLinked, lineView, visibleLines } from './logic.ts';
import type { ChangeLine } from '../app/contracts.ts';
import type { LineMark } from './logic.ts';
import type { ConsoleCtx } from './ctx.ts';

const MARK: Record<LineMark, UiIconName> = { plus: 'plus', minus: 'minus', arrow: 'arrowRight', ring: 'dottedRing', info: 'infoCircle' };

export function ChangeList({ ctx, lines, label }: { ctx: ConsoleCtx; lines: readonly ChangeLine[]; label?: string }): ReactElement | null {
  const { t, actions } = ctx;
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const { shown, hidden } = visibleLines(lines, expanded);
  if (!lines.length) return null;
  const firstLinked = shown.find(isLinked)?.key;
  const stop = shown.some((l) => l.key === active && isLinked(l)) ? active : firstLinked;

  const onKey = (e: KeyboardEvent<HTMLUListElement>): void => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const items = [...(list.current?.querySelectorAll<HTMLButtonElement>('button.chg') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : Math.min(items.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
    items[next]?.focus();
  };

  return (
    <div className="chgs">
      <ul className="chgs__list" ref={list} aria-label={label ?? t('rec.changesLabel')} onKeyDown={onKey}>
        {shown.map((l) => {
          const v = lineView(l, t);
          const body = (
            <>
              <span className="chg__mark" data-mark={v.mark} data-warn={v.warn || undefined}>
                <Icon name={MARK[v.mark]} />
              </span>
              <span className="chg__text" data-struck={v.struck || undefined} data-muted={v.muted || undefined} data-warn={v.warn || undefined}>
                {v.from ? (
                  <>
                    <span className="chg__from">{v.from}</span>
                    <Icon name="arrowRight" size={12} className="chg__arrow" />
                  </>
                ) : null}
                <span className="chg__name">{v.name}</span>
                {v.label ? <span className="chg__label">{v.label}</span> : null}
                {v.detail.length ? (
                  <span className="chg__detail">
                    <span aria-hidden="true"> {'·'} </span>
                    {v.detail.map((d, i) => (
                      <Fragment key={i}>{'text' in d ? d.text : <Icon name="arrowRight" size={12} className="chg__arrow" />}</Fragment>
                    ))}
                  </span>
                ) : null}
              </span>
            </>
          );
          if (!isLinked(l)) {
            return (
              <li key={l.key}>
                <div className="chg chg--static">{body}</div>
              </li>
            );
          }
          const hl = (): void => actions.highlight({ source: 'line', cards: l.cards, ghosts: l.ghosts });
          return (
            <li key={l.key}>
              <button
                type="button"
                className="chg"
                tabIndex={l.key === stop ? 0 : -1}
                title={v.text}
                onMouseEnter={hl}
                onMouseLeave={() => actions.highlight(null)}
                onFocus={() => {
                  setActive(l.key);
                  hl();
                }}
                onBlur={() => actions.highlight(null)}
                onClick={() => l.cards.length && actions.panTo(l.cards)}
              >
                {body}
              </button>
            </li>
          );
        })}
      </ul>
      {hidden > 0 || (expanded && lines.length > 8) ? (
        <button type="button" className="link-btn chgs__more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? t('rec.fewer') : t('rec.more', { n: hidden })}
        </button>
      ) : null}
    </div>
  );
}
