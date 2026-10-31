// React glue for the store: a provider, a selector hook and the translator. State is read with useSyncExternalStore;
// a selector must return a stable reference (a slice of state, or a memoised value), never a fresh object per call.
import { createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { Store } from './store.ts';
import type { AppState } from './types.ts';
import type { Controller } from '../app/controller.ts';
import { makeT } from '../i18n/t.ts';
import type { Lang, TFn } from '../i18n/t.ts';
import type { Catalog } from '@ali/core/types.ts';

interface Ctx {
  store: Store;
  controller: Controller;
  catalog: Catalog;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider(props: { store: Store; controller: Controller; catalog: Catalog; children: ReactNode }) {
  const value = useMemo(() => ({ store: props.store, controller: props.controller, catalog: props.catalog }), [props.store, props.controller, props.catalog]);
  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
}

function useCtx(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('AppProvider is missing');
  return c;
}

/** Reads a slice of state. Re-renders only when the selected value changes (Object.is, or `equal`). */
export function useAppState<T>(select: (s: AppState) => T, equal: (a: T, b: T) => boolean = Object.is): T {
  const { store } = useCtx();
  const last = useRef<{ v: T } | null>(null);
  const getSnapshot = useCallback((): T => {
    const v = select(store.getState());
    if (last.current && equal(last.current.v, v)) return last.current.v;
    last.current = { v };
    return v;
  }, [store, select, equal]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export function useController(): Controller {
  return useCtx().controller;
}

export function useCatalog(): Catalog {
  return useCtx().catalog;
}

export function useStore(): Store {
  return useCtx().store;
}

const selectLang = (s: AppState): Lang => s.lang;

/** The UI language and its translator. */
export function useT(): { lang: Lang; t: TFn } {
  const lang = useAppState(selectLang);
  return useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
}
