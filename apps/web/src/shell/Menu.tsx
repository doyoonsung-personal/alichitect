// A small menu button: a trigger and a list of items in a popover. Closes on Escape, outside click and selection;
// arrow keys move between items; focus returns to the trigger. Used for Sessions, the language menu, the theme menu
// (a choice of one: its items are menuitemradio with a check on the one in force) and the account menu.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';

export interface MenuItem {
  key: string;
  label: ReactNode;
  /** Plain text for the accessible name when `label` is rich. */
  text?: string;
  meta?: ReactNode;
  current?: boolean;
  /** Set on every item of a choice-of-one menu: the item is a menuitemradio, checked when true. */
  checked?: boolean;
  lang?: string;
  /** A link to another page of the site: rendered as an anchor, so it opens like any link. */
  href?: string;
  onSelect(): void;
}

export interface MenuProps {
  trigger: ReactNode;
  triggerLabel: string;
  /** A tooltip for an icon-only trigger. */
  triggerTitle?: string;
  /** The open menu's name, when the trigger's label also carries the current value ("Theme: Dark" opens "Theme"). */
  menuLabel?: string;
  triggerClassName?: string;
  items: MenuItem[];
  /** Shown when there are no items. */
  empty?: string;
  disabled?: boolean;
  disabledTitle?: string;
  align?: 'start' | 'end';
  /** A fixed row at the end of the list (for example New session), separated by a rule. */
  footer?: MenuItem;
  /** Read-only lines above the items (who is signed in, today's usage), set off by a rule. */
  head?: ReactNode;
  className?: string;
}

export function Menu(p: MenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trig = useRef<HTMLButtonElement>(null);
  const id = useId();

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trig.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (root.current && !root.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  // focus lands on the choice in force in a choice-of-one menu, else on the first item
  useEffect(() => {
    if (open) (root.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? root.current?.querySelector<HTMLElement>('[role^="menuitem"]'))?.focus();
  }, [open]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next].focus();
  };

  const row = (it: MenuItem): ReactElement =>
    it.href ? (
      <a key={it.key} role="menuitem" className="menu__item" href={it.href} lang={it.lang}>
        <span className="menu__label">{it.label}</span>
        {it.meta ? <span className="menu__meta">{it.meta}</span> : null}
      </a>
    ) : (
    <button
      key={it.key}
      type="button"
      role={it.checked === undefined ? 'menuitem' : 'menuitemradio'}
      className="menu__item"
      aria-current={it.current ? 'true' : undefined}
      aria-checked={it.checked}
      lang={it.lang}
      onClick={() => {
        close(true);
        it.onSelect();
      }}
    >
      <span className="menu__label">{it.label}</span>
      {it.meta ? <span className="menu__meta">{it.meta}</span> : null}
    </button>
    );

  return (
    <div className={`menu ${p.className ?? ''}`} ref={root} onKeyDown={onKey}>
      <button
        ref={trig}
        type="button"
        className={p.triggerClassName ?? 'btn btn--ghost'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={p.triggerLabel}
        title={p.disabled ? p.disabledTitle : p.triggerTitle}
        disabled={p.disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {p.trigger}
      </button>
      {open ? (
        <div id={id} role="menu" aria-label={p.menuLabel ?? p.triggerLabel} className={`menu__list menu__list--${p.align ?? 'end'}`}>
          {p.head ? (
            <>
              <div className="menu__head" role="group" aria-label={p.triggerLabel}>
                {p.head}
              </div>
              <div className="menu__rule" role="separator" />
            </>
          ) : null}
          {p.items.length ? p.items.map(row) : <p className="menu__empty">{p.empty}</p>}
          {p.footer ? (
            <>
              <div className="menu__rule" role="separator" />
              {row(p.footer)}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
