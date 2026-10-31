// The browser side of POST /api/turn: an incremental NDJSON reader that copes with a line split across chunks and a
// multi-byte UTF-8 character split across chunks, and the fetch wrapper that turns every way a turn can end into one
// result. It aborts on a new turn or on unmount through the caller's AbortSignal.
import type { TurnRequest } from '@ali/core/types.ts';
import { isHealth, parseWireEvent } from './events.ts';
import type { Health, WireEvent } from './events.ts';

export interface LineDecoder {
  push(chunk: Uint8Array): void;
  /** Flushes a final line that had no newline, and any bytes the UTF-8 decoder was holding. */
  end(): void;
}

/** Splits a byte stream into lines. A TextDecoder in streaming mode keeps a split multi-byte character until its tail arrives. */
export function createLineDecoder(onLine: (line: string) => void): LineDecoder {
  const dec = new TextDecoder('utf-8');
  let buf = '';
  const emit = (line: string): void => {
    const s = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (s.trim()) onLine(s);
  };
  return {
    push(chunk) {
      buf += dec.decode(chunk, { stream: true });
      let i = buf.indexOf('\n');
      while (i >= 0) {
        emit(buf.slice(0, i));
        buf = buf.slice(i + 1);
        i = buf.indexOf('\n');
      }
    },
    end() {
      buf += dec.decode();
      if (buf) emit(buf);
      buf = '';
    },
  };
}

/** How a turn request ended. 'commit' and 'fatal' arrive as events; the rest the client has to report itself. */
export type TurnEnd =
  | { kind: 'commit' }
  | { kind: 'fatal' }
  | { kind: 'aborted' }
  /** The request failed before any event (fetch threw), or the stream ended or errored without commit or fatal. */
  | { kind: 'network'; reason: string };

export interface PostTurnOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  signal: AbortSignal;
  onEvent(ev: WireEvent): void;
}

const isAbort = (e: unknown): boolean => e instanceof Error && e.name === 'AbortError';

/**
 * POSTs a TurnRequest and dispatches every event of the response. An HTTP error with a JSON fatal body (the server
 * rejects before streaming with `{ type: 'fatal', ... }`) is dispatched as that fatal. Any other failure resolves to
 * a TurnEnd for the caller to turn into a client-side error state; this function never throws.
 */
export async function postTurn(req: TurnRequest, o: PostTurnOptions): Promise<TurnEnd> {
  const f = o.fetchImpl ?? fetch;
  let end: TurnEnd | null = null;
  const dispatch = (ev: WireEvent): void => {
    if (ev.type === 'commit' && !end) end = { kind: 'commit' };
    else if (ev.type === 'fatal' && !end) end = { kind: 'fatal' };
    o.onEvent(ev);
  };
  let res: Response;
  try {
    res = await f(o.url ?? '/api/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), signal: o.signal });
  } catch (e) {
    return isAbort(e) || o.signal.aborted ? { kind: 'aborted' } : { kind: 'network', reason: String((e as Error)?.message ?? e) };
  }
  if (!res.ok) {
    let ev: WireEvent | null = null;
    try {
      ev = parseWireEvent(await res.text());
    } catch {
      ev = null;
    }
    if (ev && ev.type === 'fatal') {
      dispatch(ev);
      return { kind: 'fatal' };
    }
    // No usable body: the app shows its own message for this code.
    dispatch({ type: 'fatal', code: `http-${res.status}`, message: '', retryable: res.status >= 500 || res.status === 429 });
    return { kind: 'fatal' };
  }
  if (!res.body) return { kind: 'network', reason: 'no response body' };
  const reader = res.body.getReader();
  const decoder = createLineDecoder((line) => {
    const ev = parseWireEvent(line);
    if (ev) dispatch(ev);
  });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) decoder.push(value);
    }
    decoder.end();
  } catch (e) {
    if (isAbort(e) || o.signal.aborted) return { kind: 'aborted' };
    return end ?? { kind: 'network', reason: String((e as Error)?.message ?? e) };
  }
  if (o.signal.aborted) return { kind: 'aborted' };
  return end ?? { kind: 'network', reason: 'stream ended without commit or fatal' };
}

export interface HealthProbe {
  health: Health | null;
  /**
   * The hosted Worker answered `{ ok: true }` and nothing else: it is up, but it does not know this browser as a signed-in,
   * approved person (anonymous callers learn nothing more). The local turn server never answers that way.
   */
  anonymous: boolean;
}

/** GET /api/health with a short timeout. Resolves to health: null when the server is unreachable or answers something else. */
export async function probeHealth(o: { url?: string; fetchImpl?: typeof fetch; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<HealthProbe> {
  const f = o.fetchImpl ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), o.timeoutMs ?? 3000);
  const onAbort = (): void => ac.abort();
  o.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const res = await f(o.url ?? '/api/health', { signal: ac.signal, cache: 'no-store' });
    if (!res.ok) return { health: null, anonymous: false };
    const body: unknown = await res.json();
    if (isHealth(body)) return { health: body, anonymous: false };
    const keys = typeof body === 'object' && body !== null ? Object.keys(body) : [];
    return { health: null, anonymous: keys.length === 1 && keys[0] === 'ok' && (body as { ok: unknown }).ok === true };
  } catch {
    return { health: null, anonymous: false };
  } finally {
    clearTimeout(timer);
    o.signal?.removeEventListener('abort', onAbort);
  }
}

/** GET /api/health with a short timeout. Resolves to null when the server is unreachable or answers something else. */
export async function fetchHealth(o: { url?: string; fetchImpl?: typeof fetch; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<Health | null> {
  return (await probeHealth(o)).health;
}
