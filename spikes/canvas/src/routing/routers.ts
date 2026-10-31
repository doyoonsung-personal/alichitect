// Router factories for the canvas: libavoid-js in a Web Worker, or our own channel router on the main thread.
import { routeChannels } from './channel.ts';
import type { EdgeRouter, RouteRequest, RouteResult } from './types.ts';

const now = (): number => performance.now();

export function createAvoidRouter(): EdgeRouter & { reset(): Promise<void> } {
  const worker = new Worker(new URL('./avoid.worker.ts', import.meta.url), { type: 'module' });
  let seq = 0;
  const waiting = new Map<number, { resolve(r: RouteResult | null): void; reject(e: Error): void; t0: number }>();
  worker.onmessage = (ev: MessageEvent<{ seq: number; ok: boolean; result?: RouteResult; error?: string }>) => {
    const w = waiting.get(ev.data.seq);
    if (!w) return;
    waiting.delete(ev.data.seq);
    if (!ev.data.ok) w.reject(new Error(ev.data.error ?? 'libavoid worker failed'));
    else if (ev.data.result) w.resolve({ ...ev.data.result, roundTripMs: now() - w.t0 });
    else w.resolve(null);
  };
  const send = (kind: 'route' | 'reset', req?: RouteRequest): Promise<RouteResult | null> =>
    new Promise((resolve, reject) => {
      const s = ++seq;
      waiting.set(s, { resolve, reject, t0: now() });
      worker.postMessage({ seq: s, kind, req });
    });
  return {
    name: 'libavoid',
    route: async (req) => (await send('route', req))!,
    reset: async () => {
      await send('reset');
    },
    dispose: () => worker.terminate(),
  };
}

export function createChannelRouter(): EdgeRouter & { reset(): Promise<void> } {
  return {
    name: 'channel',
    route: async (req) => {
      const t0 = now();
      const r = routeChannels(req);
      return { ...r, roundTripMs: now() - t0 };
    },
    reset: async () => {},
  };
}
