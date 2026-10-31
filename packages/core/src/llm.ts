// Streaming Chat Completions client for Model Studio (OpenAI-compatible endpoint) and the turn runner.
// streamTurn() posts one request with fetch, parses the SSE stream, feeds content deltas to the NDJSON line parser,
// validates each op against the catalog and applies it with the reducer, emitting say (partial and final), op, warn,
// usage, done and error events as they happen. runTurn() builds the messages from chat memory, retries retryable
// failures, repairs placement deterministically and, when the stream was cut short or error-level findings remain,
// runs at most one follow-up turn (continuation and/or repair).
//
// Watchdog policy, from the Phase 0 evidence (research/FEASIBILITY.md "Phase 0 outcomes"; spikes/REVIEW.md): during a
// real stall the same-model hedge won 0 of 6 times, while the qwen3.7-max fallback rescued 5 of 5 stalls. So:
//   no same-model hedge by default (hedgeAfterMs 0, warm and cold; still available when a caller opts in);
//   no first token within 8 s on a warm prefix or 12 s on a cold one: switch at once (no backoff) to the fallback
//   model (qwen3.7-max, enable_thinking:false);
//   10 s of silence after the first token aborts the stream; each stream is capped at 120 s;
//   any stream that ends without a done op is truncated and gets one continuation turn;
//   a provider content-filter rejection (DataInspectionFailed) is never retried and ends the turn as content-filtered.
// Every value is overridable through RunTurnOptions. onStatus tells callers when a fallback, retry, continuation,
// repair or summary starts.
// Browser-safe (fetch, TextDecoder, AbortController only). The API key is only ever put in the Authorization header.
import type { ApplyResult, Catalog, Constraint, Graph, Op, ServerEvent, SessionMemory, Warning, WarningCode } from './types.ts';
import { createLineParser } from './ndjson.ts';
import { applyOp, createCtx, endTurn } from './reducer.ts';
import type { ApplyCtx } from './reducer.ts';
import { checkGraph, constraintChecker, repairGraph, validateOp } from './validate.ts';
import { mergeConstraints } from './constraints.ts';
import {
  CONSTRAINT_CODES,
  DEFAULT_MAX_ASK_CHARS,
  DEFAULT_WINDOW,
  buildMessages,
  buildRepairMessages,
  buildSystemPrompt,
  compactChanges,
  diffGraphs,
  mergeRequirements,
  renderAssistantTurn,
} from './prompt.ts';
import type { CacheMode, ChatMessage } from './prompt.ts';

export const DEFAULT_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
export const DEFAULT_MODEL = 'qwen3.8-max';
/** Fallback for stalls: the alias (never a -preview or dated snapshot, which are thinking-only). qwen3.8-flash ends 2 of 3 diagram turns without done. */
export const FALLBACK_MODEL = 'qwen3.7-max';
export const SUMMARY_MODEL = 'qwen3.8-flash';

// ---------- usage and cost ----------

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_creation?: Record<string, number>;
    cache_type?: string;
    [k: string]: unknown;
  };
  completion_tokens_details?: { reasoning_tokens?: number; [k: string]: unknown };
  [k: string]: unknown;
}

/** USD per 1M tokens (Singapore list prices, 2026-10-31). */
export interface Price {
  in: number;
  out: number;
  implicitHit: number;
  explicitHit: number;
  explicitCreate: number;
}

export const PRICES: Record<string, Price> = {
  'qwen3.8-max': { in: 2, out: 6, implicitHit: 0.25, explicitHit: 0.17, explicitCreate: 2.5 },
  // Only the cache-hit price was given for flash; creation is assumed at 125% of input, as for max.
  'qwen3.8-flash': { in: 0.15, out: 0.47, implicitHit: 0.016, explicitHit: 0.016, explicitCreate: 0.1875 },
  // Fallback model. Its cache price was not researched, so hits are billed at the full input price (an overstatement).
  'qwen3.7-max': { in: 2.5, out: 7.5, implicitHit: 2.5, explicitHit: 2.5, explicitCreate: 3.125 },
};

/** Conservative price for models without a known price (third-party judges): no cache discount. */
export const UNKNOWN_PRICE: Price = { in: 3, out: 15, implicitHit: 3, explicitHit: 3, explicitCreate: 3.75 };

export function priceOf(model: string, table: Record<string, Price> = PRICES): Price {
  return table[model] ?? UNKNOWN_PRICE;
}

export function creationTokens(u: Usage | null | undefined): number {
  const d = u && u.prompt_tokens_details;
  if (!d) return 0;
  if (typeof d.cache_creation_input_tokens === 'number') return d.cache_creation_input_tokens;
  if (d.cache_creation && typeof d.cache_creation === 'object') {
    return Object.values(d.cache_creation).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  }
  return 0;
}

export function cachedTokens(u: Usage | null | undefined): number {
  return (u && u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
}

/** List-price cost of one call: plain input, explicit-cache creation, cache reads (explicit or implicit) and output. */
export function costOf(model: string, u: Usage | null | undefined, table: Record<string, Price> = PRICES): number {
  if (!u) return 0;
  const p = priceOf(model, table);
  const prompt = u.prompt_tokens ?? 0;
  const cached = cachedTokens(u);
  const created = creationTokens(u);
  const d = u.prompt_tokens_details;
  const explicit = !!d && (d.cache_type === 'ephemeral' || created > 0);
  const plain = Math.max(0, prompt - cached - created);
  const hit = explicit ? p.explicitHit : p.implicitHit;
  return (plain * p.in + created * p.explicitCreate + cached * hit + (u.completion_tokens ?? 0) * p.out) / 1e6;
}

/** Upper-bound cost when a stream ended without a usage record: every prompt character as an uncached token. */
export function estimateCost(model: string, promptChars: number, outputChars: number, table: Record<string, Price> = PRICES): number {
  const p = priceOf(model, table);
  return ((promptChars / 3) * Math.max(p.in, p.explicitCreate) + (outputChars / 2) * p.out) / 1e6;
}

// ---------- watchdogs and cache tracking ----------

export interface Watchdogs {
  /** Send one identical request after this long without a token; the first stream to deliver a token wins. 0: never hedge (the default). */
  hedgeAfterMs: number;
  /** Abort when no token has arrived by then (the server holds the response headers until the first token); runTurn then fails over. */
  firstByteTimeoutMs: number;
  /** Abort when the stream is silent this long after the first token. */
  idleTimeoutMs: number;
  /** Abort one stream after this long. */
  totalTimeoutMs: number;
}

/** Warm prefix: fail over after 8 s without a first token. No hedge: it won 0 of 6 real stalls in Phase 0. */
export const WATCHDOG_WARM: Watchdogs = { hedgeAfterMs: 0, firstByteTimeoutMs: 8000, idleTimeoutMs: 10000, totalTimeoutMs: 120000 };
/** Cold prefix: the prefill of a ~12k-token prompt takes longer, so fail over after 12 s. */
export const WATCHDOG_COLD: Watchdogs = { hedgeAfterMs: 0, firstByteTimeoutMs: 12000, idleTimeoutMs: 10000, totalTimeoutMs: 120000 };

/** Warm: the prefix is expected in the implicit cache (used within the last ~15 min). Cold: first call on a prefix, or after a long idle. */
export function watchdogsFor(warm: boolean, overrides?: { warm?: Partial<Watchdogs>; cold?: Partial<Watchdogs> }): Watchdogs {
  return warm ? { ...WATCHDOG_WARM, ...defined(overrides?.warm) } : { ...WATCHDOG_COLD, ...defined(overrides?.cold) };
}

/** The fields of a partial override that are set (an explicit undefined never replaces a default). */
function defined<T extends object>(o: Partial<T> | undefined): Partial<T> {
  const out: Partial<T> = {};
  if (!o) return out;
  for (const k of Object.keys(o) as Array<keyof T>) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

/** Remembers when each prefix (model + system prompt) was last used, to tell warm from cold. The implicit cache lasts 20-27 min idle. */
export interface CacheTracker {
  warm(key: string, at?: number): boolean;
  touch(key: string, at?: number): void;
}

export function createCacheTracker(ttlMs = 15 * 60_000): CacheTracker {
  const seen = new Map<string, number>();
  return {
    warm: (key, at = Date.now()) => {
      const t = seen.get(key);
      return t !== undefined && at - t < ttlMs;
    },
    touch: (key, at = Date.now()) => {
      seen.set(key, at);
    },
  };
}

export const defaultCacheTracker: CacheTracker = createCacheTracker();

/** Short stable key for a model and system prompt (FNV-1a over the UTF-16 code units, plus the length). */
export function prefixKey(model: string, system: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < system.length; i++) {
    h ^= system.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${model}:${h.toString(16)}:${system.length}`;
}

// ---------- SSE ----------

export interface SseMessage {
  event: string;
  data: string;
}

/** Minimal text/event-stream parser: data lines joined with \n, dispatched on a blank line; comments ignored. */
export function createSseParser(onMessage: (m: SseMessage) => void): { push(text: string): void; end(): void } {
  let buf = '';
  let data: string[] = [];
  let event = 'message';
  const dispatch = (): void => {
    if (data.length) onMessage({ event, data: data.join('\n') });
    data = [];
    event = 'message';
  };
  const line = (l: string): void => {
    if (l === '') return dispatch();
    if (l.charCodeAt(0) === 58) return; // ':' comment, e.g. a keep-alive ping
    const i = l.indexOf(':');
    const field = i < 0 ? l : l.slice(0, i);
    let value = i < 0 ? '' : l.slice(i + 1);
    if (value.charCodeAt(0) === 32) value = value.slice(1);
    if (field === 'data') data.push(value);
    else if (field === 'event') event = value || 'message';
  };
  return {
    push(text: string): void {
      buf += text;
      let start = 0;
      for (let i = 0; i < buf.length; i++) {
        const c = buf.charCodeAt(i);
        if (c !== 10 && c !== 13) continue;
        if (c === 13 && i + 1 >= buf.length) break; // a CR at the end may be the first half of CRLF
        line(buf.slice(start, i));
        if (c === 13 && buf.charCodeAt(i + 1) === 10) i++;
        start = i + 1;
      }
      buf = buf.slice(start);
    },
    end(): void {
      if (buf.length) line(buf.replace(/\r$/, ''));
      buf = '';
      dispatch();
    },
  };
}

// ---------- events ----------

export interface TurnError {
  code: string; // http-<status>, rate-limited, server-error, content-filtered, auth, network, first-byte-timeout, idle-timeout, total-timeout, unexpected-reasoning, aborted, stream-error
  message: string;
  retryable: boolean;
  status?: number;
}

/** The provider's content inspection rejected the input or the output (Model Studio: DataInspectionFailed / data_inspection_failed). */
export function isContentFilter(code: unknown, message: unknown): boolean {
  return /data_?inspection_?failed|inappropriate[ _-]?content/i.test(`${String(code ?? '')} ${String(message ?? '')}`);
}

export interface StreamTimings {
  headersMs: number | null;
  firstByteMs: number | null;
  firstContentMs: number | null;
  firstSayMs: number | null; // first visible say text (partial)
  firstOpMs: number | null; // first validated op of any type
  firstNodeMs: number | null; // first node or insert op
  lastOpMs: number | null;
  totalMs: number;
  maxGapMs: number; // longest silence between chunks after the first byte
  hedgeAtMs: number | null; // when the hedge request was sent, if it was
}

export type TurnEvent =
  | { type: 'say'; id: number; text: string; final: boolean }
  | { type: 'op'; seq: number; op: Op; added: string[]; updated: string[]; removed: string[] }
  | { type: 'warn'; warning: Warning }
  | { type: 'usage'; usage: Usage; costUsd: number }
  | { type: 'done'; summary: string; timings: StreamTimings; finishReason: string | null; truncated: boolean }
  | { type: 'error'; error: TurnError };

export interface StreamTurnOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  messages: ChatMessage[];
  catalog: Catalog;
  /** Graph the ops apply to (the current diagram). Default: empty. */
  graph?: Graph;
  /** Reducer state; one per session or turn. Default: a fresh ctx. */
  ctx?: ApplyCtx;
  signal?: AbortSignal;
  onEvent?: (e: TurnEvent) => void;
  /** The prefix is expected in the cache: picks the warm watchdogs (first token within 8 s) instead of the cold ones (12 s). Default false. */
  warm?: boolean;
  /** Overrides of the warm and cold watchdog tables; the single-value options below win over these. */
  watchdogs?: { warm?: Partial<Watchdogs>; cold?: Partial<Watchdogs> };
  firstByteTimeoutMs?: number; // default 12000 cold, 8000 warm
  hedgeAfterMs?: number; // default 0 (no hedge), warm and cold
  idleTimeoutMs?: number; // default 10000
  totalTimeoutMs?: number; // default 120000
  /** Abort when reasoning_content arrives although thinking is off (a silent multi-minute reasoning run is useless for live drawing). Default true. */
  abortOnReasoning?: boolean;
  maxTokens?: number; // default 4096
  temperature?: number;
  /** Extra top-level body fields. enable_thinking:false is always sent unless this overrides it. */
  extraBody?: Record<string, unknown>;
  prices?: Record<string, Price>;
  fetchImpl?: typeof fetch;
}

export interface StreamResult {
  model: string;
  graph: Graph; // after the streamed ops, before graph repair
  ctx: ApplyCtx;
  ops: Op[];
  raw: unknown[]; // parsed objects before validation
  rawProducts: string[]; // product strings exactly as the model wrote them (node, insert, rec, plan)
  results: ApplyResult[];
  warnings: Warning[]; // from validateOp, applyOp and endTurn
  badLines: string[];
  content: string;
  says: string[];
  reqs: string[];
  /** Machine-checkable form of the req ops that carried regions or avoid (as the validator sanitized them). */
  constraints: Constraint[];
  gaps: Array<{ need: string; note: string }>;
  summary: string | null;
  doneSeen: boolean;
  /** The stream ended without a done op: cut off by a watchdog or an error, or the model stopped on its own. */
  truncated: boolean;
  usage: Usage | null;
  costUsd: number;
  costEstimated: boolean;
  finishReason: string | null;
  reasoningChars: number;
  hedged: boolean;
  hedgeWon: boolean;
  timings: StreamTimings;
  error?: TurnError;
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function errorFromBody(status: number, text: string): TurnError {
  let code = '';
  let message = text.slice(0, 300);
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const e = isObj(j.error) ? j.error : j;
    code = String(e.code ?? e.type ?? '');
    message = String(e.message ?? message).slice(0, 300);
  } catch {
    /* not JSON */
  }
  if (isContentFilter(code, message)) return { code: 'content-filtered', message, retryable: false, status };
  if (status === 429) return { code: 'rate-limited', message, retryable: true, status };
  if (status === 401 || status === 403) return { code: 'auth', message, retryable: false, status };
  if (status >= 500) return { code: 'server-error', message, retryable: true, status };
  return { code: `http-${status}${code ? ':' + code : ''}`, message, retryable: false, status };
}

function requestBody(o: { model: string; messages: ChatMessage[]; maxTokens?: number; temperature?: number; extraBody?: Record<string, unknown> }): string {
  const body: Record<string, unknown> = {
    model: o.model,
    messages: o.messages,
    stream: true,
    stream_options: { include_usage: true },
    enable_thinking: false,
    max_completion_tokens: o.maxTokens ?? 4096,
  };
  if (typeof o.temperature === 'number') body.temperature = o.temperature;
  return JSON.stringify({ ...body, ...(o.extraBody ?? {}) });
}

interface RawStreamHandlers {
  onContent(delta: string, atMs: number): void;
  onReasoning?(delta: string): void;
  onUsage(u: Usage): void;
  onFinish(reason: string): void;
}

interface RawStreamOutcome {
  timings: Pick<StreamTimings, 'headersMs' | 'firstByteMs' | 'totalMs' | 'maxGapMs' | 'hedgeAtMs'>;
  hedged: boolean;
  hedgeWon: boolean;
  error?: TurnError;
}

interface RawStreamOptions {
  apiKey: string;
  baseUrl?: string;
  body: string;
  signal?: AbortSignal;
  firstByteTimeoutMs?: number;
  hedgeAfterMs?: number;
  idleTimeoutMs?: number;
  totalTimeoutMs?: number;
  abortOnReasoning?: boolean;
  fetchImpl?: typeof fetch;
}

interface Candidate {
  id: number;
  ctl: AbortController;
  finished: boolean;
  promise: Promise<void>;
  reader: ReadableStreamDefaultReader<Uint8Array> | null;
}

/**
 * One streamed POST with the watchdogs: first-byte (optionally hedged with a second identical request), idle and
 * total. Calls the handlers as SSE chunks arrive; with a hedge, only the stream that delivered a byte first is read.
 */
async function rawStream(o: RawStreamOptions, h: RawStreamHandlers): Promise<RawStreamOutcome> {
  const fetchFn = o.fetchImpl ?? globalThis.fetch;
  const t0 = now();
  const url = `${(o.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')}/chat/completions`;
  const fb = o.firstByteTimeoutMs ?? WATCHDOG_COLD.firstByteTimeoutMs;
  const idle = o.idleTimeoutMs ?? WATCHDOG_COLD.idleTimeoutMs;
  const total = o.totalTimeoutMs ?? WATCHDOG_COLD.totalTimeoutMs;
  const hedgeAfter = o.hedgeAfterMs ?? 0;
  const cands: Candidate[] = [];
  let failure: TurnError | undefined;
  let winner = -1;
  let firstByte: number | null = null;
  let lastByte = t0;
  let maxGap = 0;
  let headersMs: number | null = null;
  let hedgeAtMs: number | null = null;
  // A body that ignores the abort signal must not hang the turn: readers are cancelled too, and after a failure the
  // candidates get a short grace period to settle before the call returns anyway.
  let graceDone: () => void = () => undefined;
  const grace = new Promise<void>((res) => {
    graceDone = res;
  });
  const abortAll = (except = -1): void => {
    for (const c of cands) {
      if (c.id === except) continue;
      c.ctl.abort();
      if (c.reader) c.reader.cancel().catch(() => undefined);
    }
  };
  const fail = (e: TurnError): void => {
    if (failure) return;
    failure = e;
    abortAll();
    setTimeout(graceDone, 1500);
  };
  const onExternal = (): void => fail({ code: 'aborted', message: 'aborted by the caller', retryable: false });
  if (o.signal) {
    if (o.signal.aborted) onExternal();
    else o.signal.addEventListener('abort', onExternal, { once: true });
  }

  const sse = createSseParser((m) => {
    if (failure) return;
    const data = m.data.trim();
    if (!data || data === '[DONE]') return;
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }
    if (isObj(j.error) || (typeof j.code === 'string' && typeof j.message === 'string' && !j.choices)) {
      const e = isObj(j.error) ? j.error : j;
      const filtered = isContentFilter(e.code, e.message);
      fail({ code: filtered ? 'content-filtered' : 'stream-error', message: String(e.message ?? 'error event in stream').slice(0, 300), retryable: !filtered });
      return;
    }
    if (isObj(j.usage)) h.onUsage(j.usage as Usage);
    const choices = Array.isArray(j.choices) ? j.choices : [];
    const ch = isObj(choices[0]) ? choices[0] : null;
    if (!ch) return;
    const d = isObj(ch.delta) ? ch.delta : {};
    if (typeof d.reasoning_content === 'string' && d.reasoning_content) {
      if (o.abortOnReasoning) {
        fail({ code: 'unexpected-reasoning', message: 'reasoning_content arrived although thinking is off', retryable: true });
        return;
      }
      if (h.onReasoning) h.onReasoning(d.reasoning_content);
    }
    if (typeof d.content === 'string' && d.content) h.onContent(d.content, Math.round(now() - t0));
    if (typeof ch.finish_reason === 'string' && ch.finish_reason) {
      h.onFinish(ch.finish_reason);
      // OpenAI-compatible endpoints end a filtered output with finish_reason content_filter.
      if (ch.finish_reason === 'content_filter') fail({ code: 'content-filtered', message: 'the output was stopped by the content filter', retryable: false });
    }
  });

  const launch = (): void => {
    const c: Candidate = { id: cands.length, ctl: new AbortController(), finished: false, promise: Promise.resolve(), reader: null };
    cands.push(c);
    c.promise = (async () => {
      let error: TurnError | undefined;
      try {
        const res = await fetchFn(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${o.apiKey}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: o.body,
          signal: c.ctl.signal,
        });
        if (headersMs === null) headersMs = Math.round(now() - t0);
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          error = errorFromBody(res.status, text);
          return;
        }
        const reader = res.body.getReader();
        c.reader = reader;
        const dec = new TextDecoder();
        let ended = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) {
            ended = true;
            break;
          }
          if (failure) break;
          const t = now();
          if (winner < 0) {
            winner = c.id; // the first stream to deliver a byte wins; a hedge that lost is dropped
            firstByte = t;
            abortAll(c.id);
          } else if (winner !== c.id) break;
          else maxGap = Math.max(maxGap, t - lastByte);
          lastByte = t;
          sse.push(dec.decode(value, { stream: true }));
          if (failure) break;
        }
        if (ended && winner === c.id && !failure) {
          sse.push(dec.decode());
          sse.end();
        }
        if (!ended) reader.cancel().catch(() => undefined);
      } catch (e) {
        if (!c.ctl.signal.aborted) error = { code: 'network', message: String((e as Error)?.message ?? e).slice(0, 300), retryable: true };
      } finally {
        c.finished = true;
        if (error && !failure && (winner < 0 || winner === c.id)) {
          // A failed hedge candidate is ignored while the other one may still deliver.
          if (!(winner < 0 && cands.some((x) => x !== c && !x.finished))) fail(error);
        }
      }
    })();
  };

  const tick = Math.max(10, Math.min(250, Math.floor(Math.min(fb, idle, hedgeAfter > 0 ? hedgeAfter : Infinity) / 10)));
  const timer = setInterval(() => {
    if (failure) return;
    const t = now();
    if (winner < 0) {
      const waited = t - t0;
      if (waited > fb) fail({ code: 'first-byte-timeout', message: `no token within ${fb} ms`, retryable: true });
      else if (hedgeAfter > 0 && hedgeAfter < fb && waited > hedgeAfter && cands.length === 1 && !cands[0].finished) {
        hedgeAtMs = Math.round(waited);
        launch();
      }
    } else if (t - lastByte > idle) fail({ code: 'idle-timeout', message: `stream silent for more than ${idle} ms`, retryable: true });
    else if (t - t0 > total) fail({ code: 'total-timeout', message: `turn longer than ${total} ms`, retryable: true });
  }, tick);

  if (!failure) launch();
  try {
    for (let i = 0; i < cands.length; i++) await Promise.race([cands[i].promise, grace]);
  } finally {
    clearInterval(timer);
    if (o.signal) o.signal.removeEventListener('abort', onExternal);
  }
  return {
    timings: {
      headersMs,
      firstByteMs: firstByte === null ? null : Math.round(firstByte - t0),
      totalMs: Math.round(now() - t0),
      maxGapMs: Math.round(maxGap),
      hedgeAtMs,
    },
    hedged: hedgeAtMs !== null,
    hedgeWon: hedgeAtMs !== null && winner > 0,
    error: failure,
  };
}

const charsOf = (messages: ChatMessage[]): number =>
  messages.reduce((s, m) => s + (typeof m.content === 'string' ? m.content.length : m.content.reduce((a, p) => a + p.text.length, 0)), 0);

/**
 * Streams one model turn: SSE -> content deltas -> NDJSON lines -> validateOp -> applyOp. Emits events as they
 * happen and returns everything it saw. The graph is not repaired here (runTurn does that at the end of the turn).
 */
export async function streamTurn(o: StreamTurnOptions): Promise<StreamResult> {
  const model = o.model ?? DEFAULT_MODEL;
  const emit = (e: TurnEvent): void => {
    if (!o.onEvent) return;
    try {
      o.onEvent(e);
    } catch {
      /* a listener error must not break the stream */
    }
  };
  const ctx = o.ctx ?? createCtx();
  const dog = watchdogsFor(!!o.warm, o.watchdogs);
  const r: StreamResult = {
    model,
    graph: o.graph ?? { groups: {}, nodes: {}, edges: {}, recs: [] },
    ctx,
    ops: [],
    raw: [],
    rawProducts: [],
    results: [],
    warnings: [],
    badLines: [],
    content: '',
    says: [],
    reqs: [],
    constraints: [],
    gaps: [],
    summary: null,
    doneSeen: false,
    truncated: true,
    usage: null,
    costUsd: 0,
    costEstimated: false,
    finishReason: null,
    reasoningChars: 0,
    hedged: false,
    hedgeWon: false,
    timings: { headersMs: null, firstByteMs: null, firstContentMs: null, firstSayMs: null, firstOpMs: null, firstNodeMs: null, lastOpMs: null, totalMs: 0, maxGapMs: 0, hedgeAtMs: null },
  };
  const t0 = now();
  const at = (): number => Math.round(now() - t0);
  let sayId = 0;
  let lastPartial: string | null = null;

  const warn = (ws: readonly Warning[]): void => {
    for (const w of ws) {
      r.warnings.push(w);
      emit({ type: 'warn', warning: w });
    }
  };

  const handle = (raw: unknown): void => {
    r.raw.push(raw);
    if (isObj(raw)) {
      const t = String(raw.t ?? raw.type ?? '');
      if ((t === 'node' || t === 'insert' || t === 'rec') && typeof raw.product === 'string') r.rawProducts.push(raw.product);
      if (t === 'plan' && Array.isArray(raw.products)) for (const p of raw.products) if (typeof p === 'string') r.rawProducts.push(p);
    }
    const v = validateOp(raw, o.catalog, ctx);
    warn(v.warnings);
    const op = v.op;
    if (!op) return;
    r.ops.push(op);
    const ms = at();
    if (r.timings.firstOpMs === null) r.timings.firstOpMs = ms;
    if ((op.t === 'node' || op.t === 'insert') && r.timings.firstNodeMs === null) r.timings.firstNodeMs = ms;
    r.timings.lastOpMs = ms;
    const res = applyOp(r.graph, op, ctx);
    r.graph = res.graph;
    r.results.push(res);
    warn(res.warnings);
    if (op.t === 'say') {
      r.says.push(op.text);
      if (r.timings.firstSayMs === null) r.timings.firstSayMs = ms;
      emit({ type: 'say', id: sayId++, text: op.text, final: true });
      lastPartial = null;
    } else if (op.t === 'req') {
      r.reqs.push(op.text);
      // validateOp has already resolved regions to open region ids and avoid to catalog ids, dropping the rest.
      if ((op.regions && op.regions.length) || (op.avoid && op.avoid.length)) {
        const c: Constraint = { text: op.text };
        if (op.regions && op.regions.length) c.regions = [...op.regions];
        if (op.avoid && op.avoid.length) c.avoid = [...op.avoid];
        r.constraints.push(c);
      }
    } else if (op.t === 'gap') r.gaps.push({ need: op.need, note: op.note });
    else if (op.t === 'done') {
      r.summary = op.summary;
      r.doneSeen = true;
    }
    emit({ type: 'op', seq: r.ops.length, op, added: res.added, updated: res.updated, removed: res.removed });
  };

  const parser = createLineParser({
    onOp: (raw) => handle(raw),
    onBad: (line) => {
      r.badLines.push(line.slice(0, 500));
      warn([{ code: 'bad-json', ids: [], msg: `unparseable line: ${line.slice(0, 80)}`, severity: 'warn', repaired: false }]);
    },
  });

  const outcome = await rawStream(
    {
      apiKey: o.apiKey,
      baseUrl: o.baseUrl,
      signal: o.signal,
      fetchImpl: o.fetchImpl,
      body: requestBody({ model, messages: o.messages, maxTokens: o.maxTokens, temperature: o.temperature, extraBody: o.extraBody }),
      firstByteTimeoutMs: o.firstByteTimeoutMs ?? dog.firstByteTimeoutMs,
      hedgeAfterMs: o.hedgeAfterMs ?? dog.hedgeAfterMs,
      idleTimeoutMs: o.idleTimeoutMs ?? dog.idleTimeoutMs,
      totalTimeoutMs: o.totalTimeoutMs ?? dog.totalTimeoutMs,
      abortOnReasoning: o.abortOnReasoning !== false,
    },
    {
      onContent(delta: string, ms: number) {
        if (r.timings.firstContentMs === null) r.timings.firstContentMs = ms;
        r.content += delta;
        parser.push(delta);
        const p = parser.partialSay();
        if (p !== null && p !== lastPartial && p.length) {
          lastPartial = p;
          if (r.timings.firstSayMs === null) r.timings.firstSayMs = at();
          emit({ type: 'say', id: sayId, text: p, final: false });
        }
      },
      onReasoning(delta: string) {
        r.reasoningChars += delta.length;
      },
      onUsage(u: Usage) {
        r.usage = u;
      },
      onFinish(reason: string) {
        r.finishReason = reason;
      },
    },
  );
  parser.end();
  if (!r.doneSeen) warn(endTurn(r.graph, ctx).warnings);
  Object.assign(r.timings, outcome.timings);
  r.hedged = outcome.hedged;
  r.hedgeWon = outcome.hedgeWon;
  r.truncated = !r.doneSeen;
  const promptChars = charsOf(o.messages);
  if (r.usage) {
    r.costUsd = costOf(model, r.usage, o.prices);
    emit({ type: 'usage', usage: r.usage, costUsd: r.costUsd });
  } else if (outcome.timings.headersMs !== null || r.content) {
    // Billed tokens are unknown (the stream broke before the usage record): book an upper bound.
    r.costUsd = estimateCost(model, promptChars, r.content.length, o.prices);
    r.costEstimated = true;
  }
  if (outcome.hedged) {
    // The abandoned request may still have been billed for its prompt: book the prompt at the full input price.
    r.costUsd += (promptChars / 3.8) * priceOf(model, o.prices).in / 1e6;
    r.costEstimated = true;
  }
  if (outcome.error) {
    r.error = outcome.error;
    emit({ type: 'error', error: outcome.error });
  }
  emit({ type: 'done', summary: r.summary ?? '', timings: r.timings, finishReason: r.finishReason, truncated: r.truncated });
  return r;
}

// ---------- plain completion (judge, summaries) ----------

export interface CompleteOptions {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  extraBody?: Record<string, unknown>;
  signal?: AbortSignal;
  firstByteTimeoutMs?: number;
  idleTimeoutMs?: number;
  totalTimeoutMs?: number;
  prices?: Record<string, Price>;
  fetchImpl?: typeof fetch;
}

export interface CompleteResult {
  text: string;
  usage: Usage | null;
  costUsd: number;
  costEstimated: boolean;
  reasoningChars: number;
  finishReason: string | null;
  firstContentMs: number | null;
  totalMs: number;
  error?: TurnError;
}

/** One streamed completion collected into text (thinking off unless extraBody says otherwise). */
export async function complete(o: CompleteOptions): Promise<CompleteResult> {
  const out: CompleteResult = { text: '', usage: null, costUsd: 0, costEstimated: false, reasoningChars: 0, finishReason: null, firstContentMs: null, totalMs: 0 };
  const outcome = await rawStream(
    {
      apiKey: o.apiKey,
      baseUrl: o.baseUrl,
      signal: o.signal,
      fetchImpl: o.fetchImpl,
      body: requestBody({ model: o.model, messages: o.messages, maxTokens: o.maxTokens ?? 1500, temperature: o.temperature, extraBody: o.extraBody }),
      firstByteTimeoutMs: o.firstByteTimeoutMs ?? 60000,
      idleTimeoutMs: o.idleTimeoutMs ?? 60000,
      totalTimeoutMs: o.totalTimeoutMs ?? 240000,
      abortOnReasoning: false,
    },
    {
      onContent(delta: string, ms: number) {
        if (out.firstContentMs === null) out.firstContentMs = ms;
        out.text += delta;
      },
      onReasoning(delta: string) {
        out.reasoningChars += delta.length;
      },
      onUsage(u: Usage) {
        out.usage = u;
      },
      onFinish(reason: string) {
        out.finishReason = reason;
      },
    },
  );
  out.totalMs = outcome.timings.totalMs;
  if (out.usage) out.costUsd = costOf(o.model, out.usage, o.prices);
  else if (outcome.timings.headersMs !== null || out.text) {
    out.costUsd = estimateCost(o.model, charsOf(o.messages), out.text.length + out.reasoningChars, o.prices);
    out.costEstimated = true;
  }
  if (outcome.error) out.error = outcome.error;
  return out;
}

// ---------- turn runner ----------

/** Status codes a turn reports while it runs; the server forwards them as ServerEvent status lines. */
export type StatusCode = Extract<ServerEvent, { type: 'status' }>['code'];

/** A fallback, retry, continuation, repair or summary call is about to start. */
export interface RunStatus {
  code: StatusCode;
  /** One plain English sentence for a status line; a UI may localize by code instead. */
  text: string;
  phase: 'main' | 'repair' | 'summary';
  /** The model the next call goes to. */
  model?: string;
  /** The error code that caused a fallback or a retry. */
  reason?: string;
  /** Wait before the next call (retry backoff), in ms. */
  delayMs?: number;
  /** 1-based number of the call about to start within its phase. */
  attempt?: number;
  /** Findings handed to the repair turn. */
  findings?: number;
}

/**
 * Checks pinned constraints (memory.constraints plus the ones pinned this turn) against a graph and the turn's say
 * lines, returning constraint-region / constraint-avoid warnings. The implementation lives in validate.ts (core track);
 * runTurn calls it after deterministic repair, and error-level findings trigger the follow-up repair turn.
 */
export type ConstraintChecker = (input: { graph: Graph; says: readonly string[]; constraints: readonly Constraint[]; catalog: Catalog }) => Warning[];

export interface RunTurnOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Model for the next attempt after a stall (no first token, idle, unexpected reasoning, total). Default FALLBACK_MODEL (qwen3.7-max, thinking off); null or '' disables failover. */
  fallbackModel?: string | null;
  /** Wait before the fallback attempt. Default 0: fail over at once. */
  fallbackDelayMs?: number;
  /** Overrides of the warm and cold watchdog tables (WATCHDOG_WARM, WATCHDOG_COLD); the single-value options below win over these. */
  watchdogs?: { warm?: Partial<Watchdogs>; cold?: Partial<Watchdogs> };
  /** Called when a fallback, retry, continuation, repair or summary call starts. Listener errors are ignored. */
  onStatus?: (s: RunStatus) => void;
  /** Pinned-constraint checker. Default: validate.ts constraintChecker; null turns the check off. */
  checkConstraints?: ConstraintChecker | null;
  /** Prebuilt system prompt; default buildSystemPrompt(catalog). */
  system?: string;
  window?: number;
  maxAskChars?: number;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  onEvent?: (e: TurnEvent & { phase: 'main' | 'repair' }) => void;
  /** Explicit cache markers: 'none' (implicit caching, the v1 default), 'system' or 'two' (system block + newest history message). */
  cache?: CacheMode;
  /** true/false forces the warm or cold watchdogs; default: ask the tracker whether this prefix was used recently. */
  warm?: boolean;
  tracker?: CacheTracker;
  firstByteTimeoutMs?: number;
  hedgeAfterMs?: number;
  idleTimeoutMs?: number;
  totalTimeoutMs?: number;
  /** Retries of retryable failures that produced no op (429, 5xx, network, watchdogs). Default 2. A content-filter rejection is never retried. */
  retries?: number;
  /** Base backoff; doubles per attempt, with jitter, and doubles again on 429. Default 2000 ms. */
  backoffMs?: number;
  /** Run the single follow-up turn (continuation of a cut-off stream and/or repair of error-level findings). Default true. */
  repair?: boolean;
  /** Fold the exchange that leaves the history window into memory.summary with qwen3.8-flash. Default false. */
  summarize?: boolean | { model?: string };
  prices?: Record<string, Price>;
  fetchImpl?: typeof fetch;
  /** Called with each API call's cost as soon as it is known (budget ledgers). */
  onCost?: (c: { model: string; phase: 'main' | 'repair' | 'summary'; costUsd: number; usage: Usage | null; estimated: boolean }) => void;
}

export interface AttemptInfo {
  model: string;
  warm: boolean;
  error?: TurnError;
  ops: number;
  costUsd: number;
  totalMs: number;
  hedged: boolean;
}

export interface RepairInfo {
  /** repair: error-level findings; continue: the main stream ended without done; both: either. */
  kind: 'repair' | 'continue' | 'both';
  model: string;
  findings: Warning[];
  ops: Op[];
  content: string;
  usage: Usage | null;
  costUsd: number;
  firstOpMs: number | null;
  totalMs: number;
  doneSeen: boolean;
  error?: TurnError;
}

export interface TurnStats {
  model: string;
  attempts: AttemptInfo[];
  error?: TurnError;
  headersMs: number | null;
  firstByteMs: number | null;
  firstSayMs: number | null;
  firstOpMs: number | null;
  firstNodeMs: number | null;
  totalMs: number; // main stream
  turnMs: number; // whole runTurn: retries, backoff, follow-up turn
  maxGapMs: number;
  promptTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
  completionTokens: number;
  costUsd: number; // every call of the turn, failed attempts, hedges and the follow-up turn included
  costEstimated: boolean;
  ops: number;
  badLines: number;
  escapes: number; // \uXXXX escapes in the raw content (they cost about 3.6x the tokens of raw UTF-8)
  finishReason: string | null;
  /** The main stream ended with a done op. */
  doneSeen: boolean;
  /** The main stream ended without a done op (watchdog, error, or the model stopped early). */
  truncated: boolean;
  /** A done op arrived in the main stream or in the follow-up turn. */
  finalDone: boolean;
  hedged: boolean;
  hedgeWon: boolean;
  /** The fallback model ran a call in this turn (main attempt or follow-up). */
  fallbackUsed: boolean;
  /** Stream warnings (validate, apply, end of turn) plus checkGraph of the streamed graph, before any repair. */
  warningsBefore: Warning[];
  /** What is left at the end: unrepaired stream warnings, checkGraph after repair, lifecycle of the final graph. */
  warningsAfter: Warning[];
  /** Fixes applied by deterministic repair (repaired: true). */
  fixes: Warning[];
  repair?: RepairInfo;
}

export interface RunTurnResult {
  memory: SessionMemory;
  stats: TurnStats;
  messages: ChatMessage[];
  content: string;
  ops: Op[];
  says: string[];
  reqs: string[];
  /** Constraints pinned this turn (req ops with regions or avoid); memory.constraints already holds them merged. */
  constraints: Constraint[];
  gaps: Array<{ need: string; note: string }>;
  rawProducts: string[];
  /** Net change of the turn (memory.graph before -> after repair). */
  diff: ApplyResult;
  changes: string;
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((res) => {
    const t = setTimeout(res, Math.max(0, ms));
    if (signal) signal.addEventListener('abort', () => (clearTimeout(t), res()), { once: true });
  });

const LIFECYCLE_CODES: ReadonlySet<WarningCode> = new Set<WarningCode>(['retired-product', 'china-only', 'restricted']);

/** Lifecycle and availability of every product in a graph (the validator reports these per op, not per graph). */
export function lifecycleWarnings(graph: Graph, catalog: Catalog): Warning[] {
  const out: Warning[] = [];
  const check = (product: string, ids: string[]): void => {
    const e = catalog.byId.get(product);
    if (!e) return;
    if (e.status === 'retired') out.push({ code: 'retired-product', ids, msg: `'${e.id}' is retired`, severity: 'error', repaired: false });
    else if (e.status === 'legacy' || e.status === 'no-new-purchases') {
      const alt = e.successor ?? (e.alternatives ?? []).join(' or ');
      out.push({ code: 'retired-product', ids, msg: `'${e.id}' is ${e.status}${alt ? `; prefer ${alt}` : ''}`, severity: 'warn', repaired: false });
    }
    if (e.availability === 'china-only') out.push({ code: 'china-only', ids, msg: `'${e.id}' is sold only on the China site`, severity: 'warn', repaired: false });
    else if (e.availability === 'restricted') out.push({ code: 'restricted', ids, msg: `'${e.id}' is restricted for new international accounts`, severity: 'warn', repaired: false });
  };
  for (const n of Object.values(graph.nodes)) check(n.product, [n.id]);
  for (const r of graph.recs ?? []) check(r.product, [r.product]);
  return out;
}

function dedupe(ws: readonly Warning[]): Warning[] {
  const seen = new Set<string>();
  const out: Warning[] = [];
  for (const w of ws) {
    const k = `${w.code}|${w.severity}|${w.ids.join(',')}|${w.msg}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out;
}

/** Unrepaired stream warnings (warn/error, lifecycle re-derived from the graph), graph checks, lifecycle. */
function remaining(stream: readonly Warning[], repairWarnings: readonly Warning[], graph: Graph, catalog: Catalog): Warning[] {
  const keep = stream.filter((w) => !w.repaired && w.severity !== 'info' && !LIFECYCLE_CODES.has(w.code));
  const check = repairWarnings.filter((w) => !w.repaired);
  return dedupe([...keep, ...check, ...lifecycleWarnings(graph, catalog)]);
}

function backoff(base: number, attempt: number, e: TurnError | undefined): number {
  const mult = e && e.code === 'rate-limited' ? 2 : 1;
  return Math.min(60000, base * mult * 2 ** attempt * (1 + Math.random() * 0.25));
}

const ESCAPE_RE = /\\u[0-9a-fA-F]{4}/g;
const STALL_CODES: ReadonlySet<string> = new Set(['first-byte-timeout', 'idle-timeout', 'total-timeout', 'unexpected-reasoning']);

/** The streamed content up to its last complete line (a half-written last line is dropped unless it parses as JSON). */
export function completeLines(content: string): string {
  const text = content.replace(/\r\n/g, '\n');
  const i = text.lastIndexOf('\n');
  const tail = text.slice(i + 1).trim();
  const head = i >= 0 ? text.slice(0, i) : '';
  if (!tail) return head.trim();
  try {
    JSON.parse(tail);
    return (head ? head + '\n' : '') + tail;
  } catch {
    return head.trim();
  }
}

/** Why a stall moved the turn to the fallback model, as a status sentence. */
function stallText(model: string, e: TurnError, fallback: string): string {
  const what =
    e.code === 'first-byte-timeout' ? `no first token from ${model} in time (${e.message})`
    : e.code === 'idle-timeout' ? `${model} went silent mid-stream (${e.message})`
    : e.code === 'unexpected-reasoning' ? `${model} started reasoning although thinking is off`
    : `${model} took too long (${e.message})`;
  return `Model is slow: ${what}; switching to ${fallback}.`;
}

/** A content-filter rejection ends the turn; nothing is retried or continued. */
const isFiltered = (e: TurnError | undefined): boolean => !!e && e.code === 'content-filtered';

/**
 * Runs one user turn against chat memory and returns the updated memory and the turn's stats. Memory is never
 * mutated. Failures that produced no op are retried: a stall (no first token in 8 s warm or 12 s cold, idle, unexpected
 * reasoning) fails over at once to the fallback model, other retryable failures back off exponentially. A stream that
 * breaks after some ops keeps them. A content-filter rejection is never retried and leaves memory unchanged. After
 * deterministic repair and the pinned-constraint check, a stream that ended without done and/or error-level findings
 * get at most one follow-up turn, which is asked to fix the diagram and correct its narration.
 */
export async function runTurn(memory: SessionMemory, ask: string, catalog: Catalog, opts: RunTurnOptions): Promise<RunTurnResult> {
  const started = now();
  const system = opts.system ?? buildSystemPrompt(catalog);
  const window = opts.window ?? DEFAULT_WINDOW;
  const messages = buildMessages(memory, ask, { system, window, maxAskChars: opts.maxAskChars, cache: opts.cache });
  const model = opts.model ?? DEFAULT_MODEL;
  const fb = opts.fallbackModel === undefined ? FALLBACK_MODEL : opts.fallbackModel;
  const fallback = fb && fb !== model ? fb : undefined;
  const tracker = opts.tracker ?? defaultCacheTracker;
  const retries = Math.max(0, opts.retries ?? 2);
  const attempts: AttemptInfo[] = [];
  const aborted = (): boolean => !!(opts.signal && opts.signal.aborted);
  const status = (s: RunStatus): void => {
    if (!opts.onStatus) return;
    try {
      opts.onStatus(s);
    } catch {
      /* a listener error must not break the turn */
    }
  };
  const common = {
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
    catalog,
    signal: opts.signal,
    watchdogs: opts.watchdogs,
    firstByteTimeoutMs: opts.firstByteTimeoutMs,
    hedgeAfterMs: opts.hedgeAfterMs,
    idleTimeoutMs: opts.idleTimeoutMs,
    totalTimeoutMs: opts.totalTimeoutMs,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
    prices: opts.prices,
    fetchImpl: opts.fetchImpl,
  };
  const onEventFor = (phase: 'main' | 'repair'): ((e: TurnEvent) => void) | undefined => (opts.onEvent ? (e) => opts.onEvent!({ ...e, phase }) : undefined);
  let usageSum = { prompt: 0, cached: 0, created: 0, completion: 0 };
  let cost = 0;
  let estimated = false;
  const book = (s: { model: string; usage: Usage | null; costUsd: number; costEstimated: boolean }, phase: 'main' | 'repair'): void => {
    cost += s.costUsd;
    estimated = estimated || s.costEstimated;
    if (s.usage) {
      usageSum = {
        prompt: usageSum.prompt + (s.usage.prompt_tokens ?? 0),
        cached: usageSum.cached + cachedTokens(s.usage),
        created: usageSum.created + creationTokens(s.usage),
        completion: usageSum.completion + (s.usage.completion_tokens ?? 0),
      };
    }
    if (opts.onCost) opts.onCost({ model: s.model, phase, costUsd: s.costUsd, usage: s.usage, estimated: s.costEstimated });
  };
  const isWarm = (m: string): boolean => opts.warm ?? tracker.warm(prefixKey(m, system));
  const touch = (m: string): void => tracker.touch(prefixKey(m, system));
  let fallbackUsed = false;

  let main: StreamResult | undefined;
  let useModel = model;
  for (let attempt = 0; ; attempt++) {
    const warm = isWarm(useModel);
    const s = await streamTurn({ ...common, model: useModel, warm, messages, graph: memory.graph, ctx: createCtx(), onEvent: onEventFor('main') });
    book(s, 'main');
    attempts.push({ model: useModel, warm, error: s.error, ops: s.ops.length, costUsd: s.costUsd, totalMs: s.timings.totalMs, hedged: s.hedged });
    if (s.timings.firstByteMs !== null) touch(useModel);
    main = s;
    if (!s.error || !s.error.retryable || s.ops.length > 0 || attempt >= retries || aborted()) break;
    if (fallback && useModel !== fallback && STALL_CODES.has(s.error.code)) {
      // A stall: switch models at once (caches are per model, so the fallback starts cold).
      status({ code: 'fallback', phase: 'main', model: fallback, reason: s.error.code, attempt: attempt + 2, text: stallText(useModel, s.error, fallback) });
      useModel = fallback;
      fallbackUsed = true;
      if ((opts.fallbackDelayMs ?? 0) > 0) await sleep(opts.fallbackDelayMs ?? 0, opts.signal);
    } else {
      const delay = Math.round(backoff(opts.backoffMs ?? 2000, attempt, s.error));
      status({
        code: 'retry',
        phase: 'main',
        model: useModel,
        reason: s.error.code,
        delayMs: delay,
        attempt: attempt + 2,
        text: `${useModel} failed (${s.error.code}${s.error.status ? ' ' + s.error.status : ''}); retrying in ${(delay / 1000).toFixed(1)} s (attempt ${attempt + 2} of ${retries + 1}).`,
      });
      await sleep(delay, opts.signal);
    }
    if (aborted()) break;
  }
  const m = main!;
  const filtered = isFiltered(m.error);
  const hardFail = (!!m.error && m.ops.length === 0) || filtered;
  const checker = opts.checkConstraints === undefined ? constraintChecker : opts.checkConstraints;
  const checkC = (g: Graph, says: readonly string[], pinned: readonly Constraint[]): Warning[] => {
    if (!checker || !pinned.length) return [];
    try {
      return checker({ graph: g, says, constraints: pinned, catalog });
    } catch {
      return []; // a checker bug must not fail the turn; the deterministic repairs still apply
    }
  };
  let pinned = mergeConstraints(memory.constraints ?? [], m.constraints);
  const warningsBefore = [...m.warnings, ...checkGraph(m.graph, catalog), ...checkC(m.graph, m.says, pinned)];
  const rep = repairGraph(m.graph, catalog, { constraints: pinned });
  let finalGraph = rep.graph;
  const fixes = rep.warnings.filter((w) => w.repaired);
  let warningsAfter = dedupe([...remaining(m.warnings, rep.warnings, finalGraph, catalog), ...checkC(finalGraph, m.says, pinned)]);
  let repairInfo: RepairInfo | undefined;
  let finalDone = m.doneSeen;
  const errors = warningsAfter.filter((w) => w.severity === 'error');
  if (opts.repair !== false && !hardFail && !aborted() && (errors.length || m.truncated)) {
    const kind: RepairInfo['kind'] = errors.length && m.truncated ? 'both' : m.truncated ? 'continue' : 'repair';
    // A half-written last line is an artifact of the cut-off, and the model's own message below no longer contains it.
    const tail = m.truncated ? m.content.slice(m.content.lastIndexOf('\n') + 1).trim().slice(0, 60) : '';
    const findings = warningsAfter.filter((w) => w.severity !== 'info' && !(tail && w.code === 'bad-json' && w.msg.includes(tail)));
    const rmsgs = buildRepairMessages(messages, completeLines(m.content), finalGraph, findings, { truncated: m.truncated });
    // The follow-up stays on the model that answered; after a stall it goes straight to the fallback.
    let followModel = fallback && m.error && STALL_CODES.has(m.error.code) ? fallback : m.model;
    const nErr = findings.filter((w) => w.severity === 'error').length;
    const nConstraint = findings.filter((w) => CONSTRAINT_CODES.has(w.code)).length;
    const fixText = `${nErr} validator finding${nErr === 1 ? '' : 's'}${nConstraint ? ` (${nConstraint} against pinned requirements)` : ''}`;
    status({
      code: kind === 'continue' ? 'continue' : 'repair',
      phase: 'repair',
      model: followModel,
      findings: findings.length,
      attempt: 1,
      text: kind === 'continue' ? 'The reply was cut off; continuing from the diagram drawn so far.' : kind === 'both' ? `The reply was cut off; continuing and fixing ${fixText}.` : `Fixing ${fixText}.`,
    });
    if (followModel === fallback) fallbackUsed = true;
    let s = await streamTurn({ ...common, model: followModel, warm: isWarm(followModel), messages: rmsgs, graph: finalGraph, ctx: createCtx(), onEvent: onEventFor('repair') });
    book(s, 'repair');
    if (s.timings.firstByteMs !== null) touch(followModel);
    if (s.error && s.error.retryable && s.ops.length === 0 && fallback && followModel !== fallback && !aborted()) {
      status({ code: 'fallback', phase: 'repair', model: fallback, reason: s.error.code, attempt: 2, text: STALL_CODES.has(s.error.code) ? stallText(followModel, s.error, fallback) : `${followModel} failed (${s.error.code}); switching to ${fallback}.` });
      followModel = fallback;
      fallbackUsed = true;
      s = await streamTurn({ ...common, model: followModel, warm: isWarm(followModel), messages: rmsgs, graph: finalGraph, ctx: createCtx(), onEvent: onEventFor('repair') });
      book(s, 'repair');
      if (s.timings.firstByteMs !== null) touch(followModel);
    }
    finalDone = finalDone || s.doneSeen;
    repairInfo = { kind, model: followModel, findings, ops: s.ops, content: s.content, usage: s.usage, costUsd: s.costUsd, firstOpMs: s.timings.firstOpMs, totalMs: s.timings.totalMs, doneSeen: s.doneSeen, error: s.error };
    if (!isFiltered(s.error)) {
      // A filtered follow-up is dropped whole: the main result stands.
      pinned = mergeConstraints(pinned, s.constraints);
      const rep2 = repairGraph(s.graph, catalog, { constraints: pinned });
      finalGraph = rep2.graph;
      fixes.push(...rep2.warnings.filter((w) => w.repaired));
      m.says.push(...s.says);
      m.reqs.push(...s.reqs);
      m.constraints.push(...s.constraints);
      m.gaps.push(...s.gaps);
      m.rawProducts.push(...s.rawProducts);
      // Say lines of the main reply that broke a constraint were reported and corrected; only an uncorrected reply is checked again.
      warningsAfter = dedupe([...remaining(s.warnings, rep2.warnings, finalGraph, catalog), ...checkC(finalGraph, s.says.length ? s.says : m.says, pinned)]);
    } else {
      repairInfo.ops = [];
    }
  }

  const diff = diffGraphs(memory.graph, finalGraph);
  const changes = compactChanges([diff]);
  const clippedAsk = Array.from(ask.trim()).slice(0, opts.maxAskChars ?? DEFAULT_MAX_ASK_CHARS).join('');
  let next: SessionMemory = memory;
  if (!hardFail) {
    next = {
      turns: [...memory.turns, { role: 'user', text: clippedAsk }, { role: 'assistant', text: m.says.join('\n'), changes }],
      requirements: mergeRequirements(memory.requirements ?? [], m.reqs),
      graph: finalGraph,
      tombstones: [...(memory.tombstones ?? []), ...diff.tombstones].slice(-80),
    };
    if (pinned.length) next.constraints = pinned;
    if (memory.summary) next.summary = memory.summary;
    if (opts.summarize && !aborted()) next = await foldSummary(next, window, { ...opts, onStatus: status }, typeof opts.summarize === 'object' ? opts.summarize.model : undefined);
  }

  const stats: TurnStats = {
    model: attempts[attempts.length - 1].model,
    attempts,
    error: m.error,
    headersMs: m.timings.headersMs,
    firstByteMs: m.timings.firstByteMs,
    firstSayMs: m.timings.firstSayMs,
    firstOpMs: m.timings.firstOpMs,
    firstNodeMs: m.timings.firstNodeMs,
    totalMs: m.timings.totalMs,
    turnMs: Math.round(now() - started),
    maxGapMs: m.timings.maxGapMs,
    promptTokens: usageSum.prompt,
    cachedTokens: usageSum.cached,
    cacheCreationTokens: usageSum.created,
    completionTokens: usageSum.completion,
    costUsd: cost,
    costEstimated: estimated,
    ops: m.ops.length,
    badLines: m.badLines.length,
    escapes: (m.content.match(ESCAPE_RE) ?? []).length,
    finishReason: m.finishReason,
    doneSeen: m.doneSeen,
    truncated: m.truncated,
    finalDone,
    hedged: attempts.some((a) => a.hedged),
    hedgeWon: m.hedgeWon,
    fallbackUsed,
    warningsBefore,
    warningsAfter,
    fixes,
    repair: repairInfo,
  };
  return {
    memory: next,
    stats,
    messages,
    content: m.content,
    ops: repairInfo ? [...m.ops, ...repairInfo.ops] : m.ops,
    says: m.says,
    reqs: m.reqs,
    constraints: m.constraints,
    gaps: m.gaps,
    rawProducts: m.rawProducts,
    diff,
    changes,
  };
}

// ---------- rolling summary ----------

const SUMMARY_SYSTEM = [
  'You maintain the running summary of a conversation between a user and a cloud architecture assistant.',
  'Merge the earlier summary and the new exchange into one summary of at most 120 words: decisions, products chosen or removed and why, open questions.',
  'Requirements are kept elsewhere; do not restate them. Write plain text in the language of the conversation, with no preamble.',
].join('\n');

/** Watchdogs for the summary call: it runs after the commit, so it may wait, but never for minutes. */
export const SUMMARY_TIMEOUTS = { firstByteTimeoutMs: 15000, idleTimeoutMs: 10000, totalTimeoutMs: 45000 };

function exchangesOf(turns: SessionMemory['turns']): Array<SessionMemory['turns']> {
  const ex: Array<SessionMemory['turns']> = [];
  for (const t of turns) {
    if (t.role === 'user' || !ex.length) ex.push([t]);
    else ex[ex.length - 1].push(t);
  }
  return ex;
}

/** The history has more exchanges than the window, so foldSummary has an exchange to fold. */
export function historyOverflows(memory: SessionMemory, window = DEFAULT_WINDOW): boolean {
  return exchangesOf(memory.turns).length > window;
}

/**
 * When the history has more exchanges than the window, folds the exchange that just left the window into
 * memory.summary with a small model. Called after each turn, so each exchange is folded exactly once. Emits a
 * 'summary' status right before the call. On any failure the memory is returned unchanged.
 */
export async function foldSummary(
  memory: SessionMemory,
  window: number,
  opts: Pick<RunTurnOptions, 'apiKey' | 'baseUrl' | 'signal' | 'prices' | 'fetchImpl' | 'onCost' | 'onStatus'> & { timeouts?: Partial<typeof SUMMARY_TIMEOUTS> },
  model = SUMMARY_MODEL,
): Promise<SessionMemory> {
  const ex = exchangesOf(memory.turns);
  if (ex.length <= window) return memory;
  const leaving = ex[ex.length - window - 1];
  const text = leaving.map((t) => (t.role === 'user' ? `USER: ${t.text}` : `ASSISTANT:\n${renderAssistantTurn(t)}`)).join('\n');
  if (opts.onStatus) {
    try {
      opts.onStatus({ code: 'summary', phase: 'summary', model, attempt: 1, text: 'Summarizing older turns of the conversation.' });
    } catch {
      /* a listener error must not break the summary */
    }
  }
  const r = await complete({
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
    model,
    signal: opts.signal,
    prices: opts.prices,
    fetchImpl: opts.fetchImpl,
    maxTokens: 300,
    ...SUMMARY_TIMEOUTS,
    ...defined(opts.timeouts),
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM },
      { role: 'user', content: `EARLIER SUMMARY:\n${memory.summary || '(none)'}\n\nNEW EXCHANGE:\n${text}` },
    ],
  });
  if (opts.onCost) opts.onCost({ model, phase: 'summary', costUsd: r.costUsd, usage: r.usage, estimated: r.costEstimated });
  if (r.error || !r.text.trim()) return memory;
  return { ...memory, summary: r.text.trim().slice(0, 1500) };
}
