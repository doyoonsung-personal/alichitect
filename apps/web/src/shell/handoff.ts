// The landing-to-console handoff (spec section 10): the brief box travels to the composer slot, its text becomes
// revision 1's ask, the lockup shrinks into the header, and the canvas slides in. The landing captures where its box
// and lockup are, the working view plays the move once it has mounted. Transform and opacity only, on a ghost of the
// box and on the header lockup; the real composer fades in under the ghost. Reduced motion: a 120 ms cross-fade.
//
// Builders: put data-flip="composer" on the composer's box in the console, and data-flip="lockup" is on the header's
// lockup already.

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Pending {
  brief: RectLike;
  lockup: RectLike | null;
  text: string;
}

let pending: Pending | null = null;
let running = false;

const reduced = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rectOf = (el: Element | null): RectLike | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

/** Called by the landing at submit time, while its elements still exist. `commit()` arms the handoff for the next mount. */
export function captureHandoff(briefEl: Element | null, text: string): { commit(): void } {
  const brief = rectOf(briefEl);
  const lockup = rectOf(document.querySelector('.landing [data-flip="lockup"]'));
  return {
    commit() {
      pending = brief ? { brief, lockup, text } : null;
    },
  };
}

/** Called by the working view after it mounts. Returns true when a handoff was played. */
export function playHandoff(done: () => void): boolean {
  if (running) return true; // StrictMode runs effects twice in development
  const p = pending;
  pending = null;
  if (!p) return false;
  running = true;
  const finish = (): void => {
    running = false;
    done();
  };
  const composer = document.querySelector<HTMLElement>('[data-flip="composer"]');
  const lockup = document.querySelector<HTMLElement>('.header [data-flip="lockup"]');
  const duration = reduced() ? 120 : 420;
  const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'cubic-bezier(0.16, 1, 0.3, 1)';
  const animations: Animation[] = [];

  if (composer) {
    const to = rectOf(composer)!;
    const ghost = document.createElement('div');
    ghost.className = 'handoff-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    // console track: the box is scaled non-uniformly on its way, which would squash the words, so they fade out in the first third
    const words = document.createElement('span');
    words.textContent = p.text;
    ghost.appendChild(words);
    if (!reduced()) words.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * 0.3, easing: 'linear', fill: 'forwards' });
    Object.assign(ghost.style, { left: `${p.brief.left}px`, top: `${p.brief.top}px`, width: `${p.brief.width}px`, height: `${p.brief.height}px` });
    document.body.appendChild(ghost);
    const sx = to.width / p.brief.width;
    const sy = to.height / p.brief.height;
    const dx = to.left - p.brief.left;
    const dy = to.top - p.brief.top;
    const frames: Keyframe[] = reduced()
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ transform: 'translate(0,0) scale(1,1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 1, offset: 0.82 }, { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 0 }];
    const a = ghost.animate(frames, { duration, easing, fill: 'forwards' });
    animations.push(a);
    a.finished.then(() => ghost.remove(), () => ghost.remove());
    composer.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { duration, easing: 'linear' });
  }

  if (lockup && p.lockup && !reduced()) {
    const to = rectOf(lockup)!;
    const s = p.lockup.height / to.height;
    const a = lockup.animate(
      [{ transformOrigin: '0 0', transform: `translate(${p.lockup.left - to.left}px,${p.lockup.top - to.top}px) scale(${s})` }, { transformOrigin: '0 0', transform: 'none' }],
      { duration, easing },
    );
    animations.push(a);
  }

  if (!animations.length) {
    finish();
    return true;
  }
  Promise.allSettled(animations.map((a) => a.finished)).then(finish);
  return true;
}
