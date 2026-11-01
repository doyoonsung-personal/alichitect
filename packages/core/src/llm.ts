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
//   a provider content-filter rejection (DataInspectionFailed) is never retried on Model Studio (qwen3.7-max sits behind
//   the same filter). Without a backup it ends the turn as content-filtered. With a backup (RunTurnOptions.backup, the
//   Claude provider of claude.ts) the backup finishes the turn: a continuation from the partial diagram when ops were
//   already applied, otherwise the whole turn; if the backup fails or refuses, what was drawn is committed with a
//   reply-incomplete warning (a turn with nothing drawn still ends as content-filtered). The rescue is gated: it starts
//   only with 60 s of the turn deadline left (msLeft) and when backupGate allows it (the caller's spending caps); a
//   blocked rescue behaves as no backup (stats.backupSkipped says why). The browser sees the backup's drawing events
//   only: its usage and error events go to onBackupDetail (logs), and onBackupCall books each call's cost as it ends.
// Every value is overridable through RunTurnOptions. onStatus tells callers when a fallback, retry, continuation,
// repair or summary starts.
// Browser-safe (fetch, TextDecoder, AbortController only); the Anthropic SDK is imported by claude.ts alone. The API key
// is only ever put in the Authorization header.
import type { ApplyResult, Catalog, Constraint, Graph, Op, Provider, ServerEvent, SessionMemory, Warning, WarningCode } from './types.ts';
import { createLineParser, completeLines } from './ndjson.ts';
import { checkLifecycle } from './catalog.ts';
import { cachedTokens, creationTokens, costOf, estimateCost, priceOf } from './pricing.ts';
import type { Price } from './pricing.ts';
import { applyOp, createCtx, endTurn } from './reducer.ts';
import type { ApplyCtx } from './reducer.ts';
import { checkGraph, constraintChecker, repairGraph, validateOp } from './validate.ts';
import { impliedLifts, mergeConstraintsDetailed } from './constraints.ts';
import { diffGraphs } from './diff.ts';
import { ASK_LIMITS, latestById, mergeAssumptions } from './asks.ts';
import type { Assumption, Question } from './asks.ts';
import {
  CONSTRAINT_CODES,
  DEFAULT_MAX_ASK_CHARS,
  DEFAULT_WINDOW,
  buildMessages,
  buildRepairMessages,
  buildSystemPrompt,
  compactChanges,
  dropRequirements,
  mergeRequirements,
  renderAssistantTurn,
} from './prompt.ts';
import type { CacheMode, ChatMessage } from './prompt.ts';

export { completeLines };

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

// Prices and cost functions live in pricing.ts (one table for the app, the eval ledger and tools/qwen/ask.ts).
export { PRICES, UNKNOWN_PRICE, priceOf, creationTokens, cachedTokens, costOf, estimateCost } from './pricing.ts';
export type { Price } from './pricing.ts';

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
  code: string; // http-<status>, rate-limited, server-error, content-filtered, auth, network, first-byte-timeout, idle-timeout, total-timeout, unexpected-reasoning, aborted, stream-error; Claude backup also: refusal, overloaded
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
  /** Who served the call: 'qwen' (streamTurn) or 'claude' (the claude.ts backup). */
  provider: Provider;
  /** The model that actually answered, when the provider reported a different one (a Claude server-side refusal fallback). */
  servedModel?: string;
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
  /** The assume ops of the stream, as validated (limits applied); the same id replaces. */
  assumptions: Assumption[];
  /** The ask ops of the stream, as validated (limits applied); the same id replaces. */
  questions: Question[];
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

/** What a token source reports while it streams (rawStream for Model Studio, claude.ts for the Claude backup). */
export interface RawStreamHandlers {
  onContent(delta: string, atMs: number): void;
  onReasoning?(delta: string): void;
  onUsage(u: Usage): void;
  onFinish(reason: string): void;
}

export interface RawStreamOutcome {
  timings: Pick<StreamTimings, 'headersMs' | 'firstByteMs' | 'totalMs' | 'maxGapMs' | 'hedgeAtMs'>;
  hedged: boolean;
  hedgeWon: boolean;
  error?: TurnError;
  /** The source priced the call itself (claude.ts prices each attempt of a server-side fallback at its own model); replaces costOf(model, usage). */
  costUsd?: number;
  /** costUsd is an upper bound, not a billed figure (claude.ts: the stream broke before its final usage record). */
  costEstimated?: boolean;
  /** The model that served the stream, when the provider reports one that differs from the requested model. */
  servedModel?: string;
}

/** One streamed model call: feeds the handlers as text arrives, applies its own watchdogs, resolves when the stream ends. */
export type RawSource = (h: RawStreamHandlers) => Promise<RawStreamOutcome>;

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
  // Progress is a token (content or reasoning) or a finish reason. Bytes alone, such as SSE comments (": ping") or a role
  // chunk with no content, keep the connection warm but are not progress: only progress resets the idle clock, and until
  // the first token the first-byte timeout keeps running.
  let lastProgress = t0;
  let sawProgress = false;
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
    if ((typeof d.content === 'string' && d.content) || (typeof d.reasoning_content === 'string' && d.reasoning_content) || (typeof ch.finish_reason === 'string' && ch.finish_reason)) {
      sawProgress = true;
      lastProgress = now();
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
    } else if (!sawProgress && t - t0 > fb) fail({ code: 'first-byte-timeout', message: `no token within ${fb} ms`, retryable: true });
    else if (sawProgress && t - lastProgress > idle) fail({ code: 'idle-timeout', message: `stream silent for more than ${idle} ms`, retryable: true });
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
  const dog = watchdogsFor(!!o.warm, o.watchdogs);
  return streamOps({ model, provider: 'qwen', messages: o.messages, catalog: o.catalog, graph: o.graph, ctx: o.ctx, onEvent: o.onEvent, prices: o.prices }, (h) =>
    rawStream(
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
      h,
    ),
  );
}

/** What streamOps needs besides its token source. */
export interface OpStreamOptions {
  model: string;
  provider: Provider;
  /** The request's messages; only their size is used here (the cost estimate when no usage record arrived). */
  messages: ChatMessage[];
  catalog: Catalog;
  graph?: Graph;
  ctx?: ApplyCtx;
  onEvent?: (e: TurnEvent) => void;
  prices?: Record<string, Price>;
}

/**
 * The provider-neutral half of a streamed turn: content deltas from `source` -> NDJSON line parser -> validateOp ->
 * applyOp, with say (partial and final), op, warn, usage, error and done events. streamTurn runs it over Model Studio's
 * SSE stream; claude.ts runs it over the Anthropic SDK's stream, so both providers draw through the same path.
 */
export async function streamOps(o: OpStreamOptions, source: RawSource): Promise<StreamResult> {
  const model = o.model;
  const emit = (e: TurnEvent): void => {
    if (!o.onEvent) return;
    try {
      o.onEvent(e);
    } catch {
      /* a listener error must not break the stream */
    }
  };
  const ctx = o.ctx ?? createCtx();
  const r: StreamResult = {
    model,
    provider: o.provider,
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
    assumptions: [],
    questions: [],
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
      if ((op.regions && op.regions.length) || (op.avoid && op.avoid.length) || (op.lifts && op.lifts.length)) {
        const c: Constraint = { text: op.text };
        if (op.regions && op.regions.length) c.regions = [...op.regions];
        if (op.avoid && op.avoid.length) c.avoid = [...op.avoid];
        if (op.lifts && op.lifts.length) c.lifts = [...op.lifts];
        r.constraints.push(c);
      }
    } else if (op.t === 'gap') r.gaps.push({ need: op.need, note: op.note });
    else if (op.t === 'assume') r.assumptions = latestById([...r.assumptions, op.alt ? { id: op.id, text: op.text, alt: op.alt } : { id: op.id, text: op.text }], ASK_LIMITS.assumePerTurn);
    else if (op.t === 'ask') r.questions = latestById([...r.questions, op.options ? { id: op.id, text: op.text, options: op.options } : { id: op.id, text: op.text }], ASK_LIMITS.askPerTurn);
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

  const outcome = await source({
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
  });
  parser.end();
  if (!r.doneSeen) warn(endTurn(r.graph, ctx).warnings);
  Object.assign(r.timings, outcome.timings);
  r.hedged = outcome.hedged;
  r.hedgeWon = outcome.hedgeWon;
  r.truncated = !r.doneSeen;
  if (outcome.servedModel) r.servedModel = outcome.servedModel;
  const promptChars = charsOf(o.messages);
  if (r.usage) {
    r.costUsd = outcome.costUsd ?? costOf(model, r.usage, o.prices);
    r.costEstimated = !!outcome.costEstimated;
    emit({ type: 'usage', usage: r.usage, costUsd: r.costUsd });
  } else if ((outcome.timings.headersMs !== null || r.content) && !(outcome.error && outcome.error.status !== undefined && !r.content)) {
    // Billed tokens are unknown (the stream broke before the usage record): book an upper bound. A request the provider
    // rejected with an HTTP error (content filter 400, 429, 500) generated nothing and books $0.
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
  /** Set to 'claude' on the statuses of a backup rescue (the next call goes to the Claude backup); absent for Qwen calls. */
  provider?: Provider;
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

/**
 * runTurn's default checker: validate.ts constraintChecker without region findings that rest only on client nodes
 * (users, devices; catalog lane 'clients'). Such a label ("Australian customers") says where the users are, not where
 * data or workloads go. Flagging it sent 6 of 351 turns of the Phase 1 eval to a needless repair turn and left 2 turns
 * with an error the model could not fix (ko-trap-08-sydney).
 */
export function defaultConstraintChecker(input: Parameters<ConstraintChecker>[0]): Warning[] {
  const nodes = input.graph.nodes ?? {};
  const client = (id: string): boolean => {
    const n = Object.prototype.hasOwnProperty.call(nodes, id) ? nodes[id] : undefined;
    return !!n && input.catalog.byId.get(n.product)?.lane === 'clients';
  };
  return constraintChecker(input).filter((w) => !(w.code === 'constraint-region' && w.ids.length > 0 && w.ids.every(client)));
}

/** What a backup provider's stream call takes: the same messages and graph a Model Studio call would get. */
export interface BackupStreamOptions {
  messages: ChatMessage[];
  catalog: Catalog;
  graph?: Graph;
  ctx?: ApplyCtx;
  signal?: AbortSignal;
  onEvent?: (e: TurnEvent) => void;
  prices?: Record<string, Price>;
}

/**
 * A second provider that finishes a turn Model Studio's content filter stopped (claude.ts createClaudeBackup). Its
 * stream goes through streamOps, so it draws through the same parser, validator and reducer as a Qwen stream. It holds
 * its own key; runTurn never sees it.
 */
export interface BackupProvider {
  provider: Provider;
  model: string;
  stream(o: BackupStreamOptions): Promise<StreamResult>;
}

/**
 * The answer of a backup gate (RunTurnOptions.backupGate), asked once per turn, just before the backup would run:
 * ok, or blocked because a spending cap is reached ('limit') or the gate could not decide ('unavailable', which fails closed).
 * `detail` is for the log only (which cap).
 */
export type BackupGateResult = { ok: true } | { ok: false; reason: 'limit' | 'unavailable'; detail?: string };

/** Why a rescue the content filter called for did not start: a cap, the gate failing, or too little of the turn deadline left. */
export interface BackupSkipped {
  reason: 'limit' | 'unavailable' | 'deadline';
  detail?: string;
}

/** The bookkeeping record of one finished backup call (RunTurnOptions.onBackupCall). */
export interface BackupCall {
  model: string;
  costUsd: number;
  /** costUsd is an upper bound (the stream broke before its final usage record). */
  estimated: boolean;
  usage: Usage | null;
  error?: string;
  /** The first backup call of this turn: the rescue itself, as opposed to its second call on its own reply. */
  first: boolean;
}

/** Least time left of the turn deadline for which a rescue still starts; a Claude call needs about 20 to 60 s. */
export const BACKUP_MIN_MS_LEFT = 60_000;

export interface RunTurnOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Finishes a turn that Model Studio's content filter stopped (claude.ts). Default none: a filtered turn ends as content-filtered. */
  backup?: BackupProvider | null;
  /**
   * Asked once per turn, lazily, right before the backup would run (after the content filter stopped the reply and
   * the deadline check). Blocked, it behaves exactly as if no backup were configured; the turn ends as content-filtered
   * and stats.backupSkipped says why. A gate that throws blocks too (fail closed). Default none: always allowed.
   */
  backupGate?: () => Promise<BackupGateResult> | BackupGateResult;
  /** Milliseconds left of the caller's turn deadline. With it, no rescue starts when less than backupMinMsLeft remain. */
  msLeft?: () => number;
  /** Default BACKUP_MIN_MS_LEFT (60 s). */
  backupMinMsLeft?: number;
  /** Awaited after each backup call finishes, with its cost: the caller books spending as it happens, not at the end of the turn. Errors are ignored. */
  onBackupCall?: (c: BackupCall) => Promise<void> | void;
  /**
   * The backup's usage and error events, which onEvent never receives (a browser must not see Claude's token counts,
   * error codes or fallback detail). For logs. The backup's say, op and warn events go to onEvent as usual.
   */
  onBackupDetail?: (e: TurnEvent & { phase: 'main' | 'repair' }) => void;
  /** Model for the next attempt after a stall (no first token, idle, unexpected reasoning, total). Default FALLBACK_MODEL (qwen3.7-max, thinking off); null or '' disables failover. */
  fallbackModel?: string | null;
  /** Wait before the fallback attempt. Default 0: fail over at once. */
  fallbackDelayMs?: number;
  /** Overrides of the warm and cold watchdog tables (WATCHDOG_WARM, WATCHDOG_COLD); the single-value options below win over these. */
  watchdogs?: { warm?: Partial<Watchdogs>; cold?: Partial<Watchdogs> };
  /** Called when a fallback, retry, continuation, repair or summary call starts. Listener errors are ignored. */
  onStatus?: (s: RunStatus) => void;
  /** Pinned-constraint checker. Default: defaultConstraintChecker (validate.ts constraintChecker minus client-node region findings); null turns the check off. */
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
  onCost?: (c: { model: string; provider?: Provider; phase: 'main' | 'repair' | 'summary'; costUsd: number; usage: Usage | null; estimated: boolean }) => void;
}

export interface AttemptInfo {
  model: string;
  /** Who served the call; runTurn always sets it (optional only for records written before the Claude backup existed). */
  provider?: Provider;
  /** The model that actually answered, when the provider reported a different one (a Claude server-side refusal fallback). */
  servedModel?: string;
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
  /** Who served the follow-up; runTurn always sets it (optional only for records written before the Claude backup existed). */
  provider?: Provider;
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

/** A turn Model Studio's content filter stopped, handed to the backup provider. */
export interface RescueInfo {
  /** turn: nothing was drawn, so the whole turn ran on the backup; continue: the backup continued the partial reply as the follow-up turn. */
  kind: 'turn' | 'continue';
  provider: Provider;
  model: string;
  servedModel?: string;
  /** The error that started the rescue (content-filtered) and the model it stopped. */
  reason: string;
  from: string;
  /** The backup finished the reply with a done op (in its call, or in the follow-up it ran on its own reply). */
  ok: boolean;
  /** The error of the backup's call (the first one, for kind 'turn'). */
  error?: TurnError;
  ops: number;
  /** Every backup call of the rescue. */
  costUsd: number;
  firstOpMs: number | null;
  totalMs: number;
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
  /** The backup provider (Claude) ran a call in this turn. */
  backupUsed: boolean;
  /** Set when Model Studio's content filter stopped the turn and the backup was asked to finish it. */
  rescue?: RescueInfo;
  /** Set when the content filter stopped the turn, a backup is configured, and the rescue did not start (a cap, the gate, or too little time left). */
  backupSkipped?: BackupSkipped;
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
  /** The assume ops of this turn (limits applied); memory.assumptions already holds them merged by id. */
  assumptions: Assumption[];
  /** The ask ops of this turn (limits applied); memory.questions holds exactly these, replacing the earlier ones. */
  questions: Question[];
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
    const lc = checkLifecycle(e, catalog.byId);
    if (lc.status) out.push({ ...lc.status, ids });
    if (lc.availability && lc.availability.severity !== 'info') out.push({ ...lc.availability, ids });
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

/** Why a stall moved the turn to the fallback model, as a status sentence. */
function stallText(model: string, e: TurnError, fallback: string): string {
  const what =
    e.code === 'first-byte-timeout' ? `no first token from ${model} in time (${e.message})`
    : e.code === 'idle-timeout' ? `${model} went silent mid-stream (${e.message})`
    : e.code === 'unexpected-reasoning' ? `${model} started reasoning although thinking is off`
    : `${model} took too long (${e.message})`;
  return `Model is slow: ${what}; switching to ${fallback}.`;
}

/** A content-filter rejection ends the turn on Model Studio; nothing is retried or continued there (a backup may finish it). */
const isFiltered = (e: TurnError | undefined): boolean => !!e && e.code === 'content-filtered';

/** The backup declined (Claude stop_reason refusal, after its own server-side fallback chain): final, never continued. */
const isRefusal = (e: TurnError | undefined): boolean => !!e && e.code === 'refusal';

/**
 * Runs one user turn against chat memory and returns the updated memory and the turn's stats. Memory is never
 * mutated. Failures that produced no op are retried: a stall (no first token in 8 s warm or 12 s cold, idle, unexpected
 * reasoning) fails over at once to the fallback model, other retryable failures back off exponentially. A stream that
 * breaks after some ops keeps them. A content-filter rejection is never retried on Model Studio. Without a backup it
 * leaves memory unchanged. With opts.backup (claude.ts) the backup finishes the turn after a 'fallback' status: it
 * continues from the partial diagram as the follow-up turn when ops were applied, or runs the whole turn when none
 * were; if it fails or refuses, the ops drawn so far are committed with a reply-incomplete warning, and a turn with
 * nothing drawn stays content-filtered. After deterministic repair and the pinned-constraint check, a stream that ended
 * without done and/or error-level findings get at most one follow-up turn, which is asked to fix the diagram and
 * correct its narration.
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
  const book = (s: { model: string; provider: Provider; usage: Usage | null; costUsd: number; costEstimated: boolean }, phase: 'main' | 'repair'): void => {
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
    if (opts.onCost) opts.onCost({ model: s.model, provider: s.provider, phase, costUsd: s.costUsd, usage: s.usage, estimated: s.costEstimated });
  };
  const isWarm = (m: string): boolean => opts.warm ?? tracker.warm(prefixKey(m, system));
  const touch = (m: string): void => tracker.touch(prefixKey(m, system));
  let fallbackUsed = false;
  const backup = opts.backup ?? undefined;
  let backupUsed = false;
  let rescue: RescueInfo | undefined;
  // What the browser may see of a backup call: its say, op and warn events (the drawing), and a done event without the
  // finish reason (Claude's stop reason is an operational detail). Its usage and error events (token counts, error codes) go to onBackupDetail, for logs.
  const backupEventsFor = (phase: 'main' | 'repair'): ((e: TurnEvent) => void) => (e) => {
    if (e.type === 'usage' || e.type === 'error') {
      if (opts.onBackupDetail) {
        try {
          opts.onBackupDetail({ ...e, phase });
        } catch {
          /* a listener error must not break the turn */
        }
      }
      return;
    }
    if (!opts.onEvent) return;
    opts.onEvent({ ...(e.type === 'done' ? { ...e, finishReason: null } : e), phase });
  };
  let backupCalls = 0;
  const onBackupStream = async (msgs: ChatMessage[], graph: Graph, phase: 'main' | 'repair'): Promise<StreamResult> => {
    backupUsed = true;
    const s = await backup!.stream({ messages: msgs, catalog, graph, ctx: createCtx(), signal: opts.signal, onEvent: backupEventsFor(phase), prices: opts.prices });
    backupCalls++;
    if (opts.onBackupCall) {
      try {
        await opts.onBackupCall({ model: s.servedModel ?? s.model, costUsd: s.costUsd, estimated: s.costEstimated, usage: s.usage, ...(s.error ? { error: s.error.code } : {}), first: backupCalls === 1 });
      } catch {
        /* bookkeeping must not break the turn */
      }
    }
    return s;
  };
  // The rescue starts only with enough of the turn deadline left, and only when the gate (spending caps) allows it. The
  // deadline is checked first: it is free, and a rescue that cannot finish must not use up a cap.
  const minLeft = opts.backupMinMsLeft ?? BACKUP_MIN_MS_LEFT;
  const timeLeft = (): boolean => {
    if (!opts.msLeft) return true;
    try {
      return opts.msLeft() >= minLeft;
    } catch {
      return true;
    }
  };
  let backupSkipped: BackupSkipped | undefined;
  const admitBackup = async (): Promise<boolean> => {
    if (!timeLeft()) {
      backupSkipped = { reason: 'deadline' };
      return false;
    }
    if (!opts.backupGate) return true;
    let g: BackupGateResult;
    try {
      g = await opts.backupGate();
    } catch {
      g = { ok: false, reason: 'unavailable', detail: 'gate-error' };
    }
    if (g.ok) return true;
    backupSkipped = { reason: g.reason, ...(g.detail ? { detail: g.detail } : {}) };
    return false;
  };
  const rescueOf = (kind: RescueInfo['kind'], from: StreamResult, s: StreamResult): RescueInfo => ({
    kind,
    provider: s.provider,
    model: s.model,
    ...(s.servedModel ? { servedModel: s.servedModel } : {}),
    reason: from.error?.code ?? 'content-filtered',
    from: from.model,
    ok: s.doneSeen,
    ...(s.error ? { error: s.error } : {}),
    ops: s.ops.length,
    costUsd: s.costUsd,
    firstOpMs: s.timings.firstOpMs,
    totalMs: s.timings.totalMs,
  });
  // RunStatus.text of a rescue status; the wire (apps/server/src/turn.ts) sends its own neutral line and never this one.
  const rescueText = (_from: string): string => 'Finishing the answer.';

  let main: StreamResult | undefined;
  let useModel = model;
  for (let attempt = 0; ; attempt++) {
    const warm = isWarm(useModel);
    const s = await streamTurn({ ...common, model: useModel, warm, messages, graph: memory.graph, ctx: createCtx(), onEvent: onEventFor('main') });
    book(s, 'main');
    attempts.push({ model: useModel, provider: s.provider, warm, error: s.error, ops: s.ops.length, costUsd: s.costUsd, totalMs: s.timings.totalMs, hedged: s.hedged });
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
  let m = main!;
  // Model Studio's content filter stopped the reply. A retry or qwen3.7-max meets the same filter, so a configured backup
  // finishes the turn: with ops already applied it continues from the partial diagram (the follow-up turn below); with
  // none it runs the whole turn here, and its reply becomes the turn's reply when it drew anything.
  const wantsRescue = !!backup && isFiltered(m.error) && m.provider !== backup.provider && !aborted();
  const rescuable = wantsRescue && (await admitBackup());
  if (rescuable && m.ops.length === 0) {
    status({ code: 'fallback', phase: 'main', provider: backup!.provider, model: backup!.model, reason: m.error!.code, attempt: attempts.length + 1, text: rescueText(m.model) });
    const s = await onBackupStream(messages, memory.graph, 'main');
    book(s, 'main');
    attempts.push({ model: s.model, provider: s.provider, ...(s.servedModel ? { servedModel: s.servedModel } : {}), warm: false, error: s.error, ops: s.ops.length, costUsd: s.costUsd, totalMs: s.timings.totalMs, hedged: false });
    rescue = rescueOf('turn', m, s);
    // The backup's reply becomes the turn's reply unless it drew nothing (auth, network) or it refused: refused output is
    // discarded, never committed. Then the turn stays content-filtered and memory unchanged.
    if (!s.error || (s.ops.length > 0 && !isRefusal(s.error))) m = s;
  }
  const rescueContinue = rescuable && m.ops.length > 0 && isFiltered(m.error);
  // A reply with no operation at all, not even a say line, is a failed turn: nothing to continue from, nothing to commit.
  // (A question is a say line and done, so it is a normal turn.) The user sees a retryable error and the diagram is unchanged.
  if (!m.error && m.ops.length === 0 && !aborted()) m.error = { code: 'empty-reply', message: 'the model returned no operations', retryable: true };
  const filtered = isFiltered(m.error) && !rescueContinue;
  const hardFail = (!!m.error && m.ops.length === 0) || filtered;
  const checker = opts.checkConstraints === undefined ? defaultConstraintChecker : opts.checkConstraints;
  const checkC = (g: Graph, says: readonly string[], pinned: readonly Constraint[]): Warning[] => {
    if (!checker || !pinned.length) return [];
    try {
      return checker({ graph: g, says, constraints: pinned, catalog });
    } catch {
      return []; // a checker bug must not fail the turn; the deterministic repairs still apply
    }
  };
  // Pinned constraints: a newer region requirement replaces the older region lists, and a req with lifts drops pins. What
  // went is reported as info warnings, and the texts of replaced or lifted requirements leave the pinned requirements.
  const pinNotes: Warning[] = [];
  const replacedTexts: string[] = [];
  const pin = (from: readonly Constraint[], added: Constraint[]): Constraint[] => {
    const r = mergeConstraintsDetailed(from, added);
    const keep = new Set(r.constraints.map((c) => c.text));
    for (const o of r.superseded) {
      const whole = !keep.has(o.text);
      if (whole) replacedTexts.push(o.text);
      pinNotes.push({ code: 'constraint-replaced', ids: [], msg: `the pinned requirement "${o.text}"${whole ? ' no longer applies' : ' lost its region list'}: a newer requirement replaced or lifted it`, severity: 'info', repaired: false });
    }
    for (const o of r.capped) {
      pinNotes.push({ code: 'constraint-replaced', ids: [], msg: `the oldest pinned constraint "${o.text}" is no longer checked: at most twelve are kept`, severity: 'info', repaired: false });
    }
    return r.constraints;
  };
  // A requirement that relaxes a pin in words only ("Kubernetes is fine now", no lifts) still lifts it: the model is not the only guard.
  const withImplied = (pinnedNow: readonly Constraint[], reqs: readonly string[], cs: readonly Constraint[]): Constraint[] => [
    ...cs,
    ...impliedLifts(pinnedNow, reqs.filter((t) => !cs.some((c) => c.text === t)), catalog).map((x): Constraint => ({ text: x.text, lifts: x.lifts })),
  ];
  let pinned = pin(memory.constraints ?? [], withImplied(memory.constraints ?? [], m.reqs, m.constraints));
  const warningsBefore = [...m.warnings, ...checkGraph(m.graph, catalog), ...checkC(m.graph, m.says, pinned)];
  const rep = repairGraph(m.graph, catalog, { constraints: pinned });
  let finalGraph = rep.graph;
  const fixes = rep.warnings.filter((w) => w.repaired);
  let warningsAfter = dedupe([...remaining(m.warnings, rep.warnings, finalGraph, catalog), ...checkC(finalGraph, m.says, pinned)]);
  let repairInfo: RepairInfo | undefined;
  let finalDone = m.doneSeen;
  const errors = warningsAfter.filter((w) => w.severity === 'error');
  // The rescue continuation runs even with repair off, since it is the only way to finish the reply.
  // The backup's second call, on its own reply (cut off or with findings), starts only with time left too.
  const backupOwnReply = !!backup && m.provider === backup.provider;
  if (!hardFail && !aborted() && (errors.length || m.truncated) && (rescueContinue || opts.repair !== false) && !(backupOwnReply && !timeLeft())) {
    const kind: RepairInfo['kind'] = errors.length && m.truncated ? 'both' : m.truncated ? 'continue' : 'repair';
    // A half-written last line is an artifact of the cut-off, and the model's own message below no longer contains it.
    const tail = m.truncated ? m.content.slice(m.content.lastIndexOf('\n') + 1).trim().slice(0, 60) : '';
    const findings = warningsAfter.filter((w) => w.severity !== 'info' && !(tail && w.code === 'bad-json' && w.msg.includes(tail)));
    const rmsgs = buildRepairMessages(messages, completeLines(m.content), finalGraph, findings, { truncated: m.truncated });
    // The follow-up stays on the provider and model that answered; after a stall it goes straight to the fallback. A reply
    // Model Studio's filter stopped is continued on the backup, and a backup reply stays there (Model Studio filtered it).
    const onBackup = !!backup && (rescueContinue || m.provider === backup.provider);
    let followModel = onBackup ? backup!.model : fallback && m.error && STALL_CODES.has(m.error.code) ? fallback : m.model;
    const nErr = findings.filter((w) => w.severity === 'error').length;
    const nConstraint = findings.filter((w) => CONSTRAINT_CODES.has(w.code)).length;
    const fixText = `${nErr} validator finding${nErr === 1 ? '' : 's'}${nConstraint ? ` (${nConstraint} against pinned requirements)` : ''}`;
    if (rescueContinue) status({ code: 'fallback', phase: 'repair', provider: backup!.provider, model: backup!.model, reason: m.error!.code, attempt: 1, text: rescueText(m.model) });
    status({
      code: kind === 'continue' ? 'continue' : 'repair',
      phase: 'repair',
      model: followModel,
      ...(onBackup ? { provider: backup!.provider } : {}),
      findings: findings.length,
      attempt: 1,
      text: (kind === 'continue' ? 'The reply was cut off; continuing from the diagram drawn so far.' : kind === 'both' ? `The reply was cut off; continuing and fixing ${fixText}.` : `Fixing ${fixText}.`),
    });
    if (followModel === fallback) fallbackUsed = true;
    let s = onBackup
      ? await onBackupStream(rmsgs, finalGraph, 'repair')
      : await streamTurn({ ...common, model: followModel, warm: isWarm(followModel), messages: rmsgs, graph: finalGraph, ctx: createCtx(), onEvent: onEventFor('repair') });
    book(s, 'repair');
    if (!onBackup && s.timings.firstByteMs !== null) touch(followModel);
    // A backup follow-up never falls back to qwen3.7-max: Model Studio filtered this reply.
    if (!onBackup && s.error && s.error.retryable && s.ops.length === 0 && fallback && followModel !== fallback && !aborted()) {
      status({ code: 'fallback', phase: 'repair', model: fallback, reason: s.error.code, attempt: 2, text: STALL_CODES.has(s.error.code) ? stallText(followModel, s.error, fallback) : `${followModel} failed (${s.error.code}); switching to ${fallback}.` });
      followModel = fallback;
      fallbackUsed = true;
      s = await streamTurn({ ...common, model: followModel, warm: isWarm(followModel), messages: rmsgs, graph: finalGraph, ctx: createCtx(), onEvent: onEventFor('repair') });
      book(s, 'repair');
      if (s.timings.firstByteMs !== null) touch(followModel);
    }
    finalDone = finalDone || s.doneSeen;
    repairInfo = { kind, model: followModel, provider: s.provider, findings, ops: s.ops, content: s.content, usage: s.usage, costUsd: s.costUsd, firstOpMs: s.timings.firstOpMs, totalMs: s.timings.totalMs, doneSeen: s.doneSeen, error: s.error };
    if (rescueContinue) rescue = rescueOf('continue', m, s);
    else if (rescue && onBackup) rescue = { ...rescue, ok: rescue.ok || s.doneSeen, costUsd: rescue.costUsd + s.costUsd }; // the backup continuing its own reply
    if (!isFiltered(s.error) && !isRefusal(s.error)) {
      // A filtered or refused follow-up is dropped whole: the main result stands.
      pinned = pin(pinned, withImplied(pinned, s.reqs, s.constraints));
      const rep2 = repairGraph(s.graph, catalog, { constraints: pinned });
      finalGraph = rep2.graph;
      fixes.push(...rep2.warnings.filter((w) => w.repaired));
      m.says.push(...s.says);
      m.reqs.push(...s.reqs);
      m.constraints.push(...s.constraints);
      m.gaps.push(...s.gaps);
      m.assumptions = latestById([...m.assumptions, ...s.assumptions], ASK_LIMITS.assumePerTurn); // the follow-up has its own reducer ctx, so the per-turn caps are applied again here
      m.questions = latestById([...m.questions, ...s.questions], ASK_LIMITS.askPerTurn);
      m.rawProducts.push(...s.rawProducts);
      // Say lines of the main reply that broke a constraint were reported and corrected; only an uncorrected reply is checked again.
      warningsAfter = dedupe([...remaining(s.warnings, rep2.warnings, finalGraph, catalog), ...checkC(finalGraph, s.says.length ? s.says : m.says, pinned)]);
    } else {
      repairInfo.ops = [];
    }
  }

  if (pinNotes.length) warningsAfter = [...warningsAfter, ...pinNotes];
  if (rescue && !finalDone && !hardFail) {
    // The backup could not finish a reply Model Studio's filter stopped: what was drawn is committed, and the user is told.
    warningsAfter = [
      ...warningsAfter,
      { code: 'reply-incomplete', ids: [], severity: 'warn', repaired: false, msg: 'The reply is incomplete. The diagram keeps what was drawn.' },
    ];
  }
  const diff = diffGraphs(memory.graph, finalGraph);
  const changes = compactChanges([diff]);
  const clippedAsk = Array.from(ask.trim()).slice(0, opts.maxAskChars ?? DEFAULT_MAX_ASK_CHARS).join('');
  let next: SessionMemory = memory;
  if (!hardFail) {
    next = {
      turns: [...memory.turns, { role: 'user', text: clippedAsk }, { role: 'assistant', text: m.says.join('\n'), changes }],
      requirements: dropRequirements(mergeRequirements(memory.requirements ?? [], m.reqs), replacedTexts),
      graph: finalGraph,
      tombstones: [...(memory.tombstones ?? []), ...diff.tombstones].slice(-80),
    };
    if (pinned.length) next.constraints = pinned;
    // Assumptions persist by id until a pinned requirement settles them; questions are replaced every assistant turn.
    const assumptions = mergeAssumptions(memory.assumptions ?? [], m.assumptions, next.requirements);
    if (assumptions.length) next.assumptions = assumptions;
    if (m.questions.length) next.questions = m.questions;
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
    backupUsed,
    ...(rescue ? { rescue } : {}),
    ...(backupSkipped ? { backupSkipped } : {}),
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
    assumptions: m.assumptions,
    questions: m.questions,
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
