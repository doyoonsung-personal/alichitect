import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/landing.css';
import { App } from './app/App.tsx';
import { createController, type PendingAsk } from './app/controller.ts';
import { catalog } from './catalog/catalog.ts';
import { langFromTag, isLang } from './i18n/t.ts';
import type { Lang } from './i18n/t.ts';
import { loadFixture } from './replay/registry.ts';
import { TOOLS } from './app/tools.ts';
import { createInitialState } from './store/reducer.ts';
import { AppProvider } from './store/react.tsx';
import { createSessionStore } from './store/sessions.ts';
import { createStore } from './store/store.ts';

const LANG_KEY = 'ab.lang';

function storedLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (isLang(v)) return v;
  } catch {
    /* storage unavailable: use the browser language */
  }
  return langFromTag(navigator.language);
}

function setLanguage(lang: Lang): void {
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* the choice just does not persist */
  }
}

// The session this tab shows is remembered in sessionStorage, so a refresh returns to it and a new tab starts fresh.
const TAB_KEY = 'ab.tab.session';
function tabSession(): string | null {
  try {
    return sessionStorage.getItem(TAB_KEY);
  } catch {
    return null;
  }
}
const resumeId = TOOLS && new URLSearchParams(location.search).has('replay') ? null : tabSession();

// The ask of a turn that the end of the session cut off, kept in this tab across the trip to /login.
const ASK_KEY = 'ab.pending.ask';
const ASK_MODE_KEY = 'ab.pending.ask.mode';
function keepAsk(ask: PendingAsk): void {
  try {
    sessionStorage.setItem(ASK_KEY, Array.from(ask.text).slice(0, 20000).join(''));
    if (ask.mode) sessionStorage.setItem(ASK_MODE_KEY, ask.mode);
    else sessionStorage.removeItem(ASK_MODE_KEY);
  } catch {
    /* storage unavailable: the ask is lost, the diagram is not */
  }
}
function takeAsk(): PendingAsk | null {
  try {
    const text = sessionStorage.getItem(ASK_KEY);
    const mode = sessionStorage.getItem(ASK_MODE_KEY);
    sessionStorage.removeItem(ASK_KEY);
    sessionStorage.removeItem(ASK_MODE_KEY);
    return text ? { text, mode: mode === 'workflow' || mode === 'cloud' ? mode : undefined } : null;
  } catch {
    return null;
  }
}

// One trip to the same Worker page in 15 s. If the Worker sent the page straight back (it should never), the error
// stays on screen instead of the page looping between /login and the app.
const LEAVE_KEY = 'ab.auth.left';
function leave(to: string): boolean {
  try {
    const [at, where] = (sessionStorage.getItem(LEAVE_KEY) ?? '').split(' ');
    if (where === to && Date.now() - Number(at) < 15000) return false;
    sessionStorage.setItem(LEAVE_KEY, `${Date.now()} ${to}`);
  } catch {
    /* no storage: no guard either */
  }
  location.assign(to);
  return true;
}

// Sign out is a same-origin form POST (the Worker checks Origin), so the browser follows its redirect to /login.
function signOut(url: string): void {
  const f = document.createElement('form');
  f.method = 'post';
  f.action = url;
  f.hidden = true;
  document.body.appendChild(f);
  f.submit();
}

const lang = storedLang();
document.documentElement.lang = lang;

const sessions = createSessionStore();
const store = createStore(catalog, createInitialState({ lang, sessions: sessions.list(), id: crypto.randomUUID(), now: Date.now() }));
const controller = createController(store, {
  sessions,
  now: () => Date.now(),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (h) => window.clearTimeout(h as number),
  newId: () => crypto.randomUUID(),
  loadFixture,
  search: location.search,
  setLanguage,
  resumeId,
  leave,
  path: () => location.pathname + location.search,
  keepAsk,
  takeAsk,
  signOut,
});

store.subscribe(() => {
  const s = store.getState();
  if (s.replay) return;
  try {
    if (s.view === 'working' && s.session.revisions.length > 0) sessionStorage.setItem(TAB_KEY, s.session.id);
    else if (s.view === 'landing') sessionStorage.removeItem(TAB_KEY);
  } catch {
    /* storage unavailable: a refresh starts on the landing */
  }
});

// handles for headless checks and the builders' screenshots: window.__ab.store.getState(), window.__ab.controller.startReplay('ha').
// Not in the production build (src/app/tools.ts).
if (TOOLS) (window as unknown as { __ab: unknown }).__ab = { store, controller };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider store={store} controller={controller} catalog={catalog}>
      <App />
    </AppProvider>
  </StrictMode>,
);

void controller.boot();
