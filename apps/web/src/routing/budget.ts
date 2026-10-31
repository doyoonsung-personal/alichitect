// The routing policy: libavoid in a worker gets a time budget per layout; when it is late (the first call loads the
// WASM) or fails, the channel router answers on the spot, so the diagram never waits for edges. A late libavoid answer
// is handed back so the caller can swap it in when it still matches what is on screen.
import type { RouteRequest, RouteResult } from './types.ts';

/** The libavoid worker as the budget sees it. `route` rejects when the worker cannot start or the call fails. */
export interface AvoidPort {
  route(req: RouteRequest): Promise<RouteResult | null>;
  /** Forget the incremental state (a new session). */
  reset(): Promise<void>;
  dispose(): void;
}

export type RouteSource = 'libavoid' | 'channel';

export interface Routed {
  result: RouteResult;
  source: RouteSource;
  /** Set when the channel router answered because libavoid was late: resolves with libavoid's result (null on failure). */
  late: Promise<RouteResult | null> | null;
  /** Why the channel router was used, for the dev log. */
  reason?: 'budget' | 'error' | 'unavailable';
}

export interface BudgetDeps {
  avoid: AvoidPort | null;
  channel(req: RouteRequest): RouteResult;
  /** Milliseconds libavoid gets. */
  budgetMs: number;
  /** Injected for tests; the default is setTimeout. */
  timer?: (fn: () => void, ms: number) => () => void;
}

export const ROUTE_BUDGET_MS = 50;

const defaultTimer = (fn: () => void, ms: number): (() => void) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

export async function routeWithBudget(req: RouteRequest, d: BudgetDeps): Promise<Routed> {
  const timer = d.timer ?? defaultTimer;
  if (!d.avoid) return { result: d.channel(req), source: 'channel', late: null, reason: 'unavailable' };
  const call = d.avoid.route(req).then(
    (r) => ({ ok: true as const, r }),
    () => ({ ok: false as const, r: null }),
  );
  let cancel: () => void = () => {};
  const tick = new Promise<'late'>((resolve) => {
    cancel = timer(() => resolve('late'), d.budgetMs);
  });
  const first = await Promise.race([call, tick]);
  cancel();
  if (first !== 'late') {
    if (first.ok && first.r) return { result: first.r, source: 'libavoid', late: null };
    return { result: d.channel(req), source: 'channel', late: null, reason: 'error' };
  }
  return { result: d.channel(req), source: 'channel', late: call.then((c) => (c.ok ? c.r : null)), reason: 'budget' };
}
