// Web Worker that owns one libavoid router for the canvas session and answers route requests.
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
  try {
    await ready;
    if (kind === 'reset') {
      if (state) disposeAvoidState(state);
      state = createAvoidState(AvoidLib.getInstance());
      (self as unknown as Worker).postMessage({ seq, ok: true });
      return;
    }
    const result = routeWithAvoid(state!, req!);
    (self as unknown as Worker).postMessage({ seq, ok: true, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ seq, ok: false, error: String((err as Error)?.message ?? err) });
  }
};
