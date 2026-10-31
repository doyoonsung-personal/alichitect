import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/motion.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/landing.css';
import { App } from './app/App.tsx';
import { createController } from './app/controller.ts';
import { catalog } from './catalog/catalog.ts';
import { langFromTag, isLang } from './i18n/t.ts';
import type { Lang } from './i18n/t.ts';
import { loadFixture } from './replay/registry.ts';
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
const resumeId = new URLSearchParams(location.search).has('replay') ? null : tabSession();

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

// handles for headless checks and the builders' screenshots: window.__ab.store.getState(), window.__ab.controller.startReplay('ha')
(window as unknown as { __ab: unknown }).__ab = { store, controller };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider store={store} controller={controller} catalog={catalog}>
      <App />
    </AppProvider>
  </StrictMode>,
);

void controller.boot();
