// Test helpers: load recorded fixtures from disk and play them through the pure reducer, with no timers.
import { readFileSync } from 'node:fs';
import type { Catalog } from '@ali/core/types.ts';
import { loadCatalog } from '@ali/core/catalog-node.ts';
import type { Fixture } from '../replay/plan.ts';
import { createInitialState } from '../store/reducer.ts';
import { createStore } from '../store/store.ts';
import type { Store } from '../store/store.ts';

export const catalog: Catalog = loadCatalog();

export function loadFixtureFile(id: string): Fixture {
  return JSON.parse(readFileSync(new URL(`../replay/fixtures/${id}.json`, import.meta.url), 'utf8')) as Fixture;
}

export function newStore(canvas = { w: 1040, h: 800 }): Store {
  return createStore(catalog, createInitialState({ lang: 'en', canvas, id: 's1', now: 0 }));
}

export interface PlayOptions {
  /** Dispatch turn/flush after every N op events (the live controller flushes every 180 ms). 0: only the commit lays out. */
  flushEvery?: number;
  /** Stop after this many events of the last played turn (for mid-turn assertions). */
  stopAfter?: number;
  /** First turn to play, 0-based. */
  from?: number;
  /** Number of turns to play. */
  count?: number;
  /** Clock base for the first turn. */
  t0?: number;
}

/** Plays turns of a fixture. Returns the clock after the last event, so a caller can continue. */
export function play(store: Store, fx: Fixture, o: PlayOptions = {}): number {
  let base = o.t0 ?? 1_000;
  const from = o.from ?? 0;
  const turns = fx.turns.slice(from, o.count === undefined ? undefined : from + o.count);
  for (const turn of turns) {
    store.dispatch({ type: 'turn/start', ask: turn.ask, now: base });
    let ops = 0;
    let n = 0;
    for (const [t, event] of turn.ev) {
      if (o.stopAfter !== undefined && n >= o.stopAfter) break;
      store.dispatch({ type: 'turn/event', event, now: base + t });
      n++;
      if (event.type === 'op' && o.flushEvery && ++ops % o.flushEvery === 0) store.dispatch({ type: 'turn/flush', now: base + t });
    }
    base += (turn.ev[turn.ev.length - 1]?.[0] ?? 0) + 5_000;
  }
  return base;
}
