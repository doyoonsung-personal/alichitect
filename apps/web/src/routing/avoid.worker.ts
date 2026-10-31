// Web Worker that owns one libavoid router for the canvas session and answers route requests. libavoid keeps its shapes
// and connectors between calls, so a request after the first only reroutes what changed.
import { AvoidLib } from 'libavoid-js';
import wasmUrl from '../../node_modules/libavoid-js/dist/libavoid.wasm?url';
import { createAvoidState, disposeAvoidState, routeWithAvoid } from './avoid.ts';
import type { AvoidState } from './avoid.ts';
import type { RouteRequest } from './types.ts';

let state: AvoidState | null = null;
const ready: Promise<void> = AvoidLib.load(wasmUrl).then(() => {
  state = createAvoidState(AvoidLib.getInstance());
});

self.onmessage = async (ev: MessageEvent<{ seq: number; kind: 'route' | 'reset'; req?: RouteRequest }>) => {
  const { seq, kind, req } = ev.data;
  const reply = (m: { seq: number; ok: boolean; result?: unknown; error?: string }): void => (self as unknown as Worker).postMessage(m);
  try {
    await ready;
    if (kind === 'reset') {
      if (state) disposeAvoidState(state);
      state = createAvoidState(AvoidLib.getInstance());
      reply({ seq, ok: true });
      return;
    }
    reply({ seq, ok: true, result: routeWithAvoid(state!, req!) });
  } catch (err) {
    reply({ seq, ok: false, error: String((err as Error)?.message ?? err) });
  }
};
