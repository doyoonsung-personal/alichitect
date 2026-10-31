// The browser side of the libavoid worker. Kept apart from budget.ts so the policy can be tested in Node.
import type { AvoidPort } from './budget.ts';
import type { RouteRequest, RouteResult } from './types.ts';

interface Reply {
  seq: number;
  ok: boolean;
  result?: RouteResult;
  error?: string;
}

/** Starts the worker, or returns null when workers or WASM are unavailable (the channel router then does all routing). */
export function createAvoidPort(): AvoidPort | null {
  if (typeof Worker === 'undefined') return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL('./avoid.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  let seq = 0;
  let dead = false;
  const waiting = new Map<number, { resolve(r: RouteResult | null): void; reject(e: Error): void }>();
  const fail = (e: Error): void => {
    dead = true;
    for (const w of waiting.values()) w.reject(e);
    waiting.clear();
  };
  worker.onmessage = (ev: MessageEvent<Reply>) => {
    const w = waiting.get(ev.data.seq);
    if (!w) return;
    waiting.delete(ev.data.seq);
    if (!ev.data.ok) w.reject(new Error(ev.data.error ?? 'libavoid worker failed'));
    else w.resolve(ev.data.result ?? null);
  };
  worker.onerror = () => fail(new Error('libavoid worker failed to start'));
  worker.onmessageerror = () => fail(new Error('libavoid worker message error'));
  const send = (kind: 'route' | 'reset', req?: RouteRequest): Promise<RouteResult | null> =>
    new Promise((resolve, reject) => {
      if (dead) return reject(new Error('libavoid worker is not running'));
      const s = ++seq;
      waiting.set(s, { resolve, reject });
      worker.postMessage({ seq: s, kind, req });
    });
  return {
    route: (req) => send('route', req),
    reset: async () => {
      await send('reset');
    },
    dispose: () => {
      fail(new Error('disposed'));
      worker.terminate();
    },
  };
}
