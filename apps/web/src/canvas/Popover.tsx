// The "why it's here" popover (spec 7.27). Rendered in a portal on the body so the canvas never clips it; placed beside
// its card, never over it, and flipped to stay inside the canvas.
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { ProductIcon } from '../icons/ProductIcon.tsx';
import { Icon } from '../shell/Icon.tsx';
import type { TFn } from '../i18n/t.ts';
import type { PopContent } from './pop-model.ts';
import { placePopover } from './popover-pos.ts';

export const POP_W = 320;

export interface PopoverProps {
  id: string;
  content: PopContent;
  /** The card or badge the popover explains. */
  anchor: HTMLElement;
  /** The visible part of the canvas, in viewport px. */
  bounds: { x: number; y: number; w: number; h: number };
  t: TFn;
  onEnter(): void;
  onLeave(): void;
  onEscape(): void;
  onRevision(n: number): void;
  /** Focus moved into the popover with the keyboard (it must not close when the card blurs). */
  onFocusIn(): void;
  onFocusOut(): void;
  addedInRevision: number | null;
}

export function Popover(p: PopoverProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; side: string } | null>(null);
  const c = p.content;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = p.anchor.getBoundingClientRect();
    const next = placePopover({ x: r.left, y: r.top, w: r.width, h: r.height }, { w: POP_W, h: el.offsetHeight }, p.bounds);
    setPos(next);
  }, [p.anchor, p.bounds, c]);
  const hasLink = c.docs !== null || p.addedInRevision !== null;
  return createPortal(
    <div
      ref={ref}
      id={p.id}
      className="cv-pop"
      data-side={pos?.side}
      role={hasLink ? 'dialog' : 'tooltip'}
      aria-modal={hasLink ? 'false' : undefined}
      aria-label={hasLink ? c.title : undefined}
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, width: POP_W, visibility: pos ? 'visible' : 'hidden' }}
      onMouseEnter={p.onEnter}
      onMouseLeave={p.onLeave}
      onFocus={p.onFocusIn}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) p.onFocusOut();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          p.onEscape();
        }
      }}
    >
      <header className="cv-pop__head">
        <span className="cv-pop__icon">
          <ProductIcon product={c.product} size={20} />
        </span>
        <span className="cv-pop__titles">
          <span className="cv-pop__title">{c.title}</span>
          {c.meta ? <span className="cv-pop__meta">{c.meta}</span> : null}
        </span>
      </header>
      {c.attachedTo ? <p className="cv-pop__attached">{c.attachedTo}</p> : null}
      {c.why ? (
        <section className="cv-pop__sec">
          <h3 className="cv-pop__h">{p.t('pop.why')}</h3>
          <p className="cv-pop__why">{c.why}</p>
        </section>
      ) : null}
      {c.what ? (
        <section className="cv-pop__sec">
          <h3 className="cv-pop__h">{p.t('pop.what')}</h3>
          <p className="cv-pop__what">{c.what}</p>
        </section>
      ) : null}
      {c.note ? <p className="cv-pop__note">{c.note}</p> : null}
      {c.price ? <p className="cv-pop__price num">{c.price}</p> : null}
      {c.addedIn || c.docs ? (
        <footer className="cv-pop__foot">
          {c.addedIn ? (
            p.addedInRevision !== null ? (
              <button type="button" className="cv-pop__rev num" onClick={() => p.onRevision(p.addedInRevision!)}>
                {c.addedIn}
              </button>
            ) : (
              <span className="cv-pop__rev num">{c.addedIn}</span>
            )
          ) : (
            <span />
          )}
          {c.docs ? (
            <a className="cv-pop__link" href={c.docs} target="_blank" rel="noopener noreferrer">
              {p.t('pop.productPage')}
              <Icon name="external" size={12} />
            </a>
          ) : null}
        </footer>
      ) : null}
    </div>,
    document.body,
  );
}
