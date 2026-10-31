// A tiny store: state, dispatch through the pure reducer, subscribe. No framework, so the controller, the replay
// player and the tests all drive the same object the React hooks read.
import type { Catalog } from '@ali/core/types.ts';
import { reduce } from './reducer.ts';
import type { StoreDeps } from './reducer.ts';
import type { Action } from './reducer.ts';
import type { AppState } from './types.ts';

export interface Store {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: () => void): () => void;
}

export function createStore(catalog: Catalog, initial: AppState, deps: Omit<StoreDeps, 'catalog'> = {}): Store {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reduce(state, action, { catalog, ...deps });
      if (next === state) return;
      state = next;
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
