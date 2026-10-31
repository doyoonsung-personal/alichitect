// The words the user typed fly to where the record keeps them: the landing brief into revision 1's ask (inside the
// handoff), and every follow-up from the composer into its new revision. A copy of the ask, set exactly as the record
// sets it, starts over the words at their typed size and lands on the ask, which fades in under it. Transform and
// opacity only, on one fixed element. With reduced motion there is no flight: the ask fades in where it is.

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TypedText {
  /** The text box's content area (its rect inset by its padding). */
  rect: RectLike;
  /** The font size the words were typed at. */
  fontPx: number;
}

export const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const easeOut = (): string => (typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() : '') || 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Where the words sit inside a textarea, read while it still holds them. */
export function typedText(field: HTMLElement | null): TypedText | null {
  if (!field) return null;
  const r = field.getBoundingClientRect();
  const cs = getComputedStyle(field);
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pt = parseFloat(cs.paddingTop) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  return { rect: { left: r.left + pl, top: r.top + pt - field.scrollTop, width: Math.max(1, r.width - pl - pr), height: r.height }, fontPx: parseFloat(cs.fontSize) || 16 };
}

/**
 * Flies a copy of `target` from the typed words to `target`, which stays hidden until the copy lands. Returns the
 * animations (empty when there was nothing to do, or with reduced motion, where the target just fades in).
 */
export function flyText(from: TypedText, target: HTMLElement, duration: number, opts: { fadeInFirst?: number } = {}): Animation[] {
  if (typeof target.animate !== 'function') return [];
  if (reducedMotion() || duration <= 0) return [target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'linear' })];
  const to = target.getBoundingClientRect();
  if (!to.width || !to.height) return [];
  const toPx = parseFloat(getComputedStyle(target).fontSize) || 14;
  const s = from.fontPx / toPx;
  const ghost = target.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.classList.add('flight');
  Object.assign(ghost.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
  document.body.appendChild(ghost);
  const dx = from.rect.left - to.left;
  const dy = from.rect.top - to.top;
  const fadeIn = opts.fadeInFirst ?? 0.12;
  // the travel eases out over the first 80 %; the copy then hands over to the ask in a cross-fade that keeps the
  // words at full ink (the ask is in before the copy goes)
  const flight = ghost.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: fadeIn ? 0 : 1, offset: 0, easing: easeOut() },
      { opacity: 1, offset: fadeIn || 0.01 },
      { transform: 'none', opacity: 1, offset: 0.8 },
      { transform: 'none', opacity: 1, offset: 0.9 },
      { transform: 'none', opacity: 0, offset: 1 },
    ],
    { duration, easing: 'linear', fill: 'forwards' },
  );
  const land = target.animate([{ opacity: 0 }, { opacity: 0, offset: 0.72 }, { opacity: 1, offset: 0.88 }, { opacity: 1 }], { duration, easing: 'linear' });
  const done = (): void => ghost.remove();
  flight.finished.then(done, done);
  return [flight, land];
}

// ---------- a follow-up's words, between the composer and the record ----------

let armed: { from: TypedText; at: number } | null = null;

/** The composer calls this as it sends, while the field still holds the words. */
export function armFlight(field: HTMLElement | null): void {
  const from = typedText(field);
  armed = from ? { from, at: Date.now() } : null;
}

export function disarmFlight(): void {
  armed = null;
}

/** The record calls this once the new revision is on screen. Plays only for a send armed a moment ago. */
export function playFlight(target: HTMLElement | null, duration: number): boolean {
  const a = armed;
  armed = null;
  if (!a || !target || Date.now() - a.at > 1500) return false;
  return flyText(a.from, target, duration).length > 0;
}

/** A duration token in ms (motion.css), read from the document. */
export function tokenMs(name: string, fallback: number): number {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? (v.endsWith('s') && !v.endsWith('ms') ? n * 1000 : n) : fallback;
}
