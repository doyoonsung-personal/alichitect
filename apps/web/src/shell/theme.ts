// The reader's theme: Light, Dark or System (the default: the device's prefers-color-scheme decides). The choice is one
// localStorage key, shared with the Worker's own pages on the same origin. public/theme.js applies a stored choice before
// the first paint (an external file: the CSP allows no inline script); this module reads it, changes it, and keeps tabs
// in step. Light and dark carry an attribute on <html>; System carries none, so tokens.css's media query decides and
// follows the device as it changes. The switch itself is one cross-fade of the page, and none under reduced motion.
import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
export const THEME_KEY = 'ab.theme';
export const THEME_CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system'];

/** Anything stored that is not light or dark is System. */
export const parseTheme = (v: unknown): ThemeChoice => (v === 'light' || v === 'dark' ? v : 'system');

/** The value of data-theme on <html>: the choice for light and dark, none for System. */
export const themeAttr = (c: ThemeChoice): 'light' | 'dark' | null => (c === 'system' ? null : c);

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readTheme(storage: Store | null): ThemeChoice {
  try {
    return parseTheme(storage?.getItem(THEME_KEY));
  } catch {
    return 'system'; // storage blocked: the device decides
  }
}

export function storeTheme(storage: Store | null, c: ThemeChoice): void {
  try {
    if (c === 'system') storage?.removeItem(THEME_KEY);
    else storage?.setItem(THEME_KEY, c);
  } catch {
    /* the choice holds for this page and does not persist */
  }
}

export interface ThemeDoc {
  root: Pick<HTMLElement, 'setAttribute' | 'removeAttribute' | 'getAttribute'>;
  reducedMotion(): boolean;
  /** document.startViewTransition, where the browser has it. */
  startViewTransition?: (update: () => void) => { finished: Promise<unknown> };
  nextFrame(fn: () => void): void;
}

/** Puts the choice on <html>. With motion allowed and view transitions available, the page cross-fades once; the
 * data-theme-switching attribute holds the components' own colour transitions off meanwhile (base.css). */
export function applyTheme(doc: ThemeDoc, c: ThemeChoice, o: { animate?: boolean } = {}): void {
  const attr = themeAttr(c);
  const current = doc.root.getAttribute('data-theme');
  if (current === attr) return;
  const set = (): void => {
    if (attr) doc.root.setAttribute('data-theme', attr);
    else doc.root.removeAttribute('data-theme');
  };
  doc.root.setAttribute('data-theme-switching', '');
  const done = (): void => doc.root.removeAttribute('data-theme-switching');
  if (o.animate && !doc.reducedMotion() && doc.startViewTransition) {
    const vt = doc.startViewTransition(set);
    vt.finished.then(done, done);
    return;
  }
  set();
  doc.nextFrame(() => doc.nextFrame(done));
}

function browserDoc(): ThemeDoc | null {
  if (typeof document === 'undefined') return null;
  const d = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<unknown> } };
  return {
    root: document.documentElement,
    reducedMotion: () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    startViewTransition: typeof d.startViewTransition === 'function' ? (cb) => d.startViewTransition!(cb) : undefined,
    nextFrame: (fn) => requestAnimationFrame(() => fn()),
  };
}

function browserStorage(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

// ---------- the live choice, for React ----------

let current: ThemeChoice = readTheme(browserStorage());
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((fn) => fn());

export function getTheme(): ThemeChoice {
  return current;
}

/** The reader picked a theme: store it, cross-fade to it, and tell the menus. */
export function setTheme(c: ThemeChoice): void {
  storeTheme(browserStorage(), c);
  current = c;
  const doc = browserDoc();
  if (doc) applyTheme(doc, c, { animate: true });
  emit();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Another tab (or the Worker's account page) changed the choice: follow it without a cross-fade.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== THEME_KEY && e.key !== null) return;
    const next = readTheme(browserStorage());
    if (next === current) return;
    current = next;
    const doc = browserDoc();
    if (doc) applyTheme(doc, next);
    emit();
  });
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(subscribe, getTheme, getTheme);
}
