// The Claude backup: finishes a turn that Model Studio's content filter stopped (llm.ts runTurn, opts.backup). Each call
// is one streamed request through the official Anthropic TypeScript SDK (@anthropic-ai/sdk, pinned exactly in
// package.json) on the beta Messages endpoint, whose text deltas go through llm.ts streamOps: the same NDJSON line
// parser, validateOp, applyOp and events as a Qwen stream. The request, per the claude-api skill:
//   model claude-opus-5-5 (CLAUDE_BACKUP_MODEL overrides it in apps/server and apps/worker);
//   no thinking param (Claude Opus 5.5 always thinks; disabling it is a 400) and output_config.effort 'low', for latency;
//   server-side refusal fallback: fallbacks 'default' with the server-side-fallback-2026-07-01 beta header. A refusal
//   that survives the fallback chain (stop_reason 'refusal') becomes the 'refusal' error, which runTurn never continues;
//   prompt caching: an explicit breakpoint on the system prompt (about 24k tokens with Claude's tokenizer, the same for
//   every session) plus top-level automatic caching, so a follow-up call within the turn reads the turn's prefix from
//   the cache. Measured live 2026-11-01: a cold call wrote ~24.5k tokens ($0.14 in all), warm calls read 24k ($0.03-0.04);
//   max_tokens 20000 (thinking counts toward it) and an output budget of 40000 characters: a rescue is paid from the
//   owner's Anthropic credit, so one call is bounded in money, not only in time. Live (eval/results/claude-format): the
//   longest visible reply of 30 conversations was 6.6k characters (about 2.5k tokens), so 20000 tokens leaves 8x room
//   for it plus low-effort thinking; a call that fills it costs at most $0.40 of output ($20 per MTok). The 40000
//   characters (about 13k to 20k tokens, Korean being the dense case) stop a stream that keeps writing within
//   max_tokens, whatever the API does. A cut-off reply still gets one continuation call, so a rescue is two calls at most.
// Cost: a call that ends without its final usage record (watchdog, abort, broken stream) is booked at an upper bound,
// never at the 1 output token message_start reports: the input tokens reported there plus one output token per two
// characters streamed (costEstimated). Watchdogs: no stream event within 20 s, 30 s without an event, or 150 s in all abort the stream (any event counts:
// with thinking on, text starts only after the thinking block). The caller's AbortSignal (the client disconnect)
// aborts it too. Errors map to refusal, overloaded, rate-limited, auth, network, server-error, http-<status>,
// stream-error and the watchdog codes, from the SDK's typed errors, never from message text.
// The key is passed to the SDK client only (it sends it in a request header to api.anthropic.com); it is never put in
// an error message, an event or a log line, and the SDK's own logging is off. Workers-compatible: the SDK maps its
// Node-only module to a browser stub, nothing here imports a Node built-in, and a live call ran in workerd (2026-11-01).
import type { TurnMode } from './types.ts';
import Anthropic from '@anthropic-ai/sdk';
import { streamOps } from './llm.ts';
import type { BackupCompleteOptions, BackupCompleteResult, BackupProvider, BackupStreamOptions, RawStreamHandlers, RawStreamOutcome, StreamResult, TurnError, Usage } from './llm.ts';
import { costOf, isClaudeModelId } from './pricing.ts';
import type { Price } from './pricing.ts';
import type { ChatMessage } from './prompt.ts';

export const CLAUDE_BACKUP_MODEL = 'claude-opus-5-5';
export const CLAUDE_BASE_URL = 'https://api.anthropic.com';
/** The beta header of the "default" scalar form of server-side fallback (the array form uses -2026-06-01; mixing them is a 400). */
export const CLAUDE_FALLBACK_BETA = 'server-side-fallback-2026-07-01';
export const CLAUDE_MAX_TOKENS = 20000;
/** Characters of streamed text and thinking one call may produce before it is aborted with the 'output-budget' error. */
export const CLAUDE_MAX_OUTPUT_CHARS = 40000;
export type ClaudeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ClaudeWatchdogs {
  /** Abort when no stream event (message_start) has arrived by then. */
  firstByteTimeoutMs: number;
  /** Abort when the stream is silent this long after its first event. */
  idleTimeoutMs: number;
  /** Abort one call after this long. */
  totalTimeoutMs: number;
}

export const CLAUDE_WATCHDOGS: ClaudeWatchdogs = { firstByteTimeoutMs: 20000, idleTimeoutMs: 30000, totalTimeoutMs: 150000 };

export interface ClaudeBackupOptions {
  apiKey: string;
  /** Default CLAUDE_BACKUP_MODEL (claude-opus-5-5). */
  model?: string;
  /** Default https://api.anthropic.com. Explicit, so an ANTHROPIC_BASE_URL in the environment never redirects the key. */
  baseUrl?: string;
  /** output_config.effort. Default 'low': a live drawing needs the first op fast. */
  effort?: ClaudeEffort;
  maxTokens?: number;
  /** Default CLAUDE_MAX_OUTPUT_CHARS. */
  maxOutputChars?: number;
  watchdogs?: Partial<ClaudeWatchdogs>;
  /** SDK retries of connection errors, 408, 409, 429 and 5xx before the stream starts. Default 1. */
  maxRetries?: number;
  /** Injected fetch (tests; the Worker passes its global fetch). */
  fetchImpl?: typeof fetch;
}

type ClaudeUsage = Anthropic.Beta.BetaUsage;
type ClaudeRequest = Anthropic.Beta.Messages.MessageCreateParamsStreaming;

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * The model to use for the backup: CLAUDE_BACKUP_MODEL when it is set to a Claude model id, else claude-opus-5-5.
 * Returns undefined (no backup) when there is no key. Reads only the two names it is given.
 */
export function claudeBackupConfig(env: { ANTHROPIC_API_KEY?: string; CLAUDE_BACKUP_MODEL?: string }): { apiKey: string; model: string } | undefined {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return undefined;
  return { apiKey, model: claudeModelOf(env.CLAUDE_BACKUP_MODEL) };
}

/**
 * CLAUDE_BACKUP_MODEL, when it names a Claude model of the PRICES table (pricing.ts); otherwise the default. A model the
 * table does not know would be booked at the generic UNKNOWN_PRICE, which understates what an Opus-class call costs, and
 * the daily Claude budget would then not hold. Safe to log.
 */
export function claudeModelOf(v: string | undefined): string {
  const m = v?.trim();
  return isClaudeModelId(m) ? m : CLAUDE_BACKUP_MODEL;
}

/**
 * Chat Completions messages (prompt.ts) as an Anthropic request: system messages become the top-level system prompt,
 * the rest keep their order. Text parts are joined and their Model Studio cache markers dropped (caching is set on the
 * request instead). Empty content becomes a placeholder, since the API rejects an empty text block.
 */
export function toClaudeMessages(messages: readonly ChatMessage[]): { system: string; messages: Anthropic.Beta.BetaMessageParam[] } {
  const text = (m: ChatMessage): string => (typeof m.content === 'string' ? m.content : m.content.map((p) => p.text).join(''));
  const system = messages.filter((m) => m.role === 'system').map(text).join('\n\n');
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const t = text(m);
    out.push({ role: m.role, content: t.trim() ? t : '(empty)' });
  }
  if (!out.length || out[0].role !== 'user') out.unshift({ role: 'user', content: '(conversation continues)' });
  return { system, messages: out };
}

/**
 * Appended to the system prompt of every backup call. The product speaks in one voice: a reply never says which model or
 * company wrote it, or that another model began it. (The wire carries no provider or model field either.)
 */
export const BACKUP_VOICE_NOTE = 'Write as the same assistant that began this answer. In say lines and summaries never name an AI model, a model family or a company behind it, and never mention that another model started or stopped the answer.';

/** BACKUP_VOICE_NOTE for a plain-text call (complete()): a document such as the drafted proposal, in one voice. */
export const BACKUP_TEXT_VOICE_NOTE = 'Write as the same writer who began this text. Never name an AI model, a model family or a company behind the writing, never say that the text was generated, and never mention that another writer started it.';

/** Workflow designs may name their step models, but never the writer or its vendor. */
export const BACKUP_WORKFLOW_VOICE_NOTE = [
  'Write as the same assistant that began this answer. You may name the Qwen models used by the workflow steps.',
  'Never identify yourself, your model, model family or vendor, or mention that another writer started or stopped the answer.',
].join(' ');

/** The request body of one backup call. `voice` replaces BACKUP_VOICE_NOTE at the end of the system prompt. */
export function claudeRequest(model: string, messages: readonly ChatMessage[], o: { effort?: ClaudeEffort; maxTokens?: number; voice?: string } = {}): ClaudeRequest {
  const c = toClaudeMessages(messages);
  return {
    model,
    max_tokens: o.maxTokens ?? CLAUDE_MAX_TOKENS,
    stream: true,
    // The system prompt is the same for every session: an explicit breakpoint on it gives every turn a cache read point.
    system: [{ type: 'text', text: `${c.system}

${o.voice ?? BACKUP_VOICE_NOTE}`, cache_control: { type: 'ephemeral' } }],
    messages: c.messages,
    // Top-level automatic caching: a breakpoint on the last block, so the follow-up call of the same turn hits the cache.
    cache_control: { type: 'ephemeral' },
    // No thinking param: Claude Opus 5.5 always thinks, and effort is its only control.
    output_config: { effort: o.effort ?? 'low' },
    fallbacks: 'default',
    betas: [CLAUDE_FALLBACK_BETA],
  };
}

/** Anthropic usage (one attempt) as the OpenAI-style usage record llm.ts and pricing.ts read. */
function usageOf(u: { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }): Usage {
  const input = u.input_tokens ?? 0;
  const read = u.cache_read_input_tokens ?? 0;
  const created = u.cache_creation_input_tokens ?? 0;
  const out = u.output_tokens ?? 0;
  return {
    prompt_tokens: input + read + created,
    completion_tokens: out,
    total_tokens: input + read + created + out,
    prompt_tokens_details: { cached_tokens: read, cache_creation_input_tokens: created, cache_type: 'ephemeral' },
  };
}

/** The model attempts that ran in this call (a server-side fallback reports one entry per attempt), else none. */
function attemptsOf(u: ClaudeUsage): Array<{ model: string | null; input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }> {
  const out: Array<{ model: string | null; input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }> = [];
  for (const it of u.iterations ?? []) if (it.type === 'message' || it.type === 'fallback_message') out.push(it);
  return out;
}

/** Usage summed over the attempts of a fallback chain (top-level usage covers only the attempt that served the reply). */
export function claudeUsage(u: ClaudeUsage): Usage {
  const its = attemptsOf(u);
  if (!its.length) return usageOf(u);
  const sum = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  for (const it of its) {
    sum.input_tokens += it.input_tokens;
    sum.output_tokens += it.output_tokens;
    sum.cache_read_input_tokens += it.cache_read_input_tokens;
    sum.cache_creation_input_tokens += it.cache_creation_input_tokens;
  }
  return usageOf(sum);
}

/** List-price cost of one call: each attempt at its own model's price (pricing.ts), or the whole usage at `model`'s. */
export function claudeCost(model: string, u: ClaudeUsage, prices?: Record<string, Price>): number {
  const its = attemptsOf(u);
  if (!its.length) return costOf(model, usageOf(u), prices);
  return its.reduce((s, it) => s + costOf(it.model || model, usageOf(it), prices), 0);
}

/** The SDK's typed errors as a TurnError. Messages are built from the status and error type, never from response text. */
export function claudeError(e: unknown): TurnError {
  if (e instanceof Anthropic.APIUserAbortError) return { code: 'aborted', message: 'aborted', retryable: false };
  if (e instanceof Anthropic.APIConnectionTimeoutError) return { code: 'network', message: 'Claude: request timed out', retryable: true };
  if (e instanceof Anthropic.APIConnectionError) return { code: 'network', message: 'Claude: could not connect', retryable: true };
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { code: 'auth', message: `Claude: key rejected (HTTP ${e.status})`, retryable: false, status: e.status };
  if (e instanceof Anthropic.RateLimitError) return { code: 'rate-limited', message: 'Claude: rate limited (HTTP 429)', retryable: true, status: 429 };
  if (e instanceof Anthropic.APIError) {
    const type = typeof e.type === 'string' ? e.type : '';
    const status = typeof e.status === 'number' ? e.status : undefined;
    // An overload arrives as HTTP 529 before the stream, or as an overloaded_error event inside it (no status).
    if (type === 'overloaded_error' || status === 529) return { code: 'overloaded', message: 'Claude: overloaded', retryable: true, ...(status ? { status } : {}) };
    if (type === 'rate_limit_error') return { code: 'rate-limited', message: 'Claude: rate limited', retryable: true, ...(status ? { status } : {}) };
    if (type === 'authentication_error' || type === 'permission_error') return { code: 'auth', message: 'Claude: key rejected', retryable: false, ...(status ? { status } : {}) };
    if (status !== undefined && status >= 500) return { code: 'server-error', message: `Claude: server error (HTTP ${status})`, retryable: true, status };
    if (status !== undefined) return { code: `http-${status}${type ? ':' + type : ''}`, message: `Claude: request rejected (HTTP ${status}${type ? ' ' + type : ''})`, retryable: false, status };
    if (type === 'api_error') return { code: 'server-error', message: 'Claude: server error in the stream', retryable: true };
    return { code: 'stream-error', message: `Claude: error in the stream${type ? ' (' + type + ')' : ''}`, retryable: true };
  }
  return { code: 'stream-error', message: 'Claude: the stream failed', retryable: true };
}

/**
 * One streamed backup call: feeds text deltas to the handlers, applies the watchdogs and the caller's signal, and
 * reports usage, cost (each fallback attempt at its own price), the model that served it and the error, if any.
 */
async function claudeSource(client: Anthropic, req: ClaudeRequest, signal: AbortSignal | undefined, dog: ClaudeWatchdogs, maxOutputChars: number, prices: Record<string, Price> | undefined, h: RawStreamHandlers): Promise<RawStreamOutcome> {
  const t0 = now();
  const ctl = new AbortController();
  let failure: TurnError | undefined;
  let streamError: unknown;
  let headersMs: number | null = null;
  let firstEvent: number | null = null;
  let lastEvent = t0;
  let maxGap = 0;
  let usage: ClaudeUsage | null = null;
  let servedModel: string | undefined;
  let stopReason: string | null = null;
  let stopCategory: string | null = null;
  // Characters streamed so far (text and thinking): the output budget, and the basis of the cost upper bound.
  let outChars = 0;
  // The final usage record (message_delta) arrived. Without it the usage is message_start's: all the input, 1 output token.
  let finalUsage = false;
  // A body that ignores the abort signal must not hang the turn: after a failure the call returns within 1.5 s anyway.
  let graceDone: () => void = () => undefined;
  const grace = new Promise<void>((res) => {
    graceDone = res;
  });
  const fail = (e: TurnError): void => {
    if (failure) return;
    failure = e;
    ctl.abort();
    setTimeout(graceDone, 1500);
  };
  const onExternal = (): void => fail({ code: 'aborted', message: 'aborted by the caller', retryable: false });
  if (signal) {
    if (signal.aborted) onExternal();
    else signal.addEventListener('abort', onExternal, { once: true });
  }
  const tick = Math.max(10, Math.min(250, Math.floor(Math.min(dog.firstByteTimeoutMs, dog.idleTimeoutMs) / 10)));
  const timer = setInterval(() => {
    if (failure) return;
    const t = now();
    if (firstEvent === null && t - t0 > dog.firstByteTimeoutMs) fail({ code: 'first-byte-timeout', message: `no event from Claude within ${dog.firstByteTimeoutMs} ms`, retryable: true });
    else if (firstEvent !== null && t - lastEvent > dog.idleTimeoutMs) fail({ code: 'idle-timeout', message: `Claude stream silent for more than ${dog.idleTimeoutMs} ms`, retryable: true });
    else if (t - t0 > dog.totalTimeoutMs) fail({ code: 'total-timeout', message: `Claude call longer than ${dog.totalTimeoutMs} ms`, retryable: true });
  }, tick);

  const run = async (): Promise<void> => {
    if (failure) return;
    const stream = client.beta.messages.stream(req, { signal: ctl.signal });
    // Listeners keep the SDK from raising an unhandled rejection, and catch an error that lands between two reads (the
    // async iterator then just ends).
    stream.on('error', (e) => {
      streamError ??= e;
    });
    stream.on('abort', (e) => {
      streamError ??= e;
    });
    stream.on('connect', () => {
      headersMs ??= Math.round(now() - t0);
    });
    try {
      for await (const ev of stream) {
        if (failure) break;
        const t = now();
        if (firstEvent === null) firstEvent = t;
        else maxGap = Math.max(maxGap, t - lastEvent);
        lastEvent = t;
        if (ev.type === 'message_start') {
          usage = { ...ev.message.usage };
          if (ev.message.model && ev.message.model !== req.model) servedModel = ev.message.model;
        } else if (ev.type === 'content_block_start') {
          // A server-side fallback hop: the next text comes from `to.model`, continuing the partial text.
          if (ev.content_block.type === 'fallback') servedModel = ev.content_block.to.model;
        } else if (ev.type === 'content_block_delta') {
          const piece = ev.delta.type === 'text_delta' ? ev.delta.text : ev.delta.type === 'thinking_delta' ? ev.delta.thinking : '';
          if (piece) {
            outChars += piece.length;
            if (outChars > maxOutputChars) {
              fail({ code: 'output-budget', message: `Claude output passed the budget of ${maxOutputChars} characters`, retryable: false });
              break;
            }
            if (ev.delta.type === 'text_delta') h.onContent(piece, Math.round(t - t0));
          }
        } else if (ev.type === 'message_delta') {
          finalUsage = true;
          stopReason = ev.delta.stop_reason ?? stopReason;
          stopCategory = ev.delta.stop_details?.category ?? null;
          if (usage) {
            // Cumulative totals: overwrite when present, never add (as the SDK's own accumulator does).
            usage.output_tokens = ev.usage.output_tokens;
            if (ev.usage.input_tokens != null) usage.input_tokens = ev.usage.input_tokens;
            if (ev.usage.cache_creation_input_tokens != null) usage.cache_creation_input_tokens = ev.usage.cache_creation_input_tokens;
            if (ev.usage.cache_read_input_tokens != null) usage.cache_read_input_tokens = ev.usage.cache_read_input_tokens;
            if (ev.usage.iterations != null) usage.iterations = ev.usage.iterations;
          }
        }
      }
    } catch (e) {
      streamError ??= e;
    }
  };

  try {
    await Promise.race([run(), grace]);
  } finally {
    clearInterval(timer);
    if (signal) signal.removeEventListener('abort', onExternal);
  }
  if (!failure && streamError !== undefined) failure = claudeError(streamError);
  if (!failure && stopReason === 'refusal') failure = { code: 'refusal', message: `Claude declined${stopCategory ? ` (category ${stopCategory})` : ''}`, retryable: false };
  if (!failure && stopReason === null) failure = { code: 'stream-error', message: 'Claude: the stream ended without a stop reason', retryable: true };
  if (stopReason) h.onFinish(stopReason);
  const priced = servedModel ?? req.model;
  let costUsd: number | undefined;
  let costEstimated = false;
  // `usage` is assigned inside the stream loop (a closure), which TypeScript's flow analysis does not see.
  const usageSeen = usage as ClaudeUsage | null;
  if (usageSeen) {
    if (finalUsage) {
      costUsd = claudeCost(priced, usageSeen, prices);
    } else {
      // The stream broke before its final usage record, but the API bills what it generated until the request ended.
      // Upper bound: every input token message_start reported, plus one output token per two characters streamed (the
      // densest text there is is about two characters per token). After a server-side fallback hop both models ran the
      // input, so both are charged in full.
      usageSeen.output_tokens = Math.max(usageSeen.output_tokens ?? 0, Math.ceil(outChars / 2));
      costUsd = claudeCost(req.model, usageSeen, prices);
      if (priced !== req.model) costUsd += claudeCost(priced, usageSeen, prices);
      costEstimated = true;
    }
    h.onUsage(claudeUsage(usageSeen));
  }
  return {
    timings: { headersMs, firstByteMs: firstEvent === null ? null : Math.round(firstEvent - t0), totalMs: Math.round(now() - t0), maxGapMs: Math.round(maxGap), hedgeAtMs: null },
    hedged: false,
    hedgeWon: false,
    ...(failure ? { error: failure } : {}),
    ...(costUsd !== undefined ? { costUsd, ...(costEstimated ? { costEstimated } : {}) } : {}),
    ...(servedModel ? { servedModel } : {}),
  };
}

/**
 * The Claude backup for runTurn (opts.backup). One SDK client per backup; each stream() call is one request whose
 * text goes through streamOps, and each complete() call one request collected as text (proposal.ts), with the same
 * watchdogs, output budget and pricing. The key stays inside the SDK client.
 */
export function createClaudeBackup(o: ClaudeBackupOptions): BackupProvider {
  const apiKey = o.apiKey.trim();
  if (!apiKey) throw new Error('createClaudeBackup needs an API key');
  const model = claudeModelOf(o.model);
  const maxOutputChars = o.maxOutputChars ?? CLAUDE_MAX_OUTPUT_CHARS;
  const dog: ClaudeWatchdogs = { ...CLAUDE_WATCHDOGS };
  for (const k of Object.keys(o.watchdogs ?? {}) as Array<keyof ClaudeWatchdogs>) {
    const v = o.watchdogs?.[k];
    if (typeof v === 'number') dog[k] = v;
  }
  const client = new Anthropic({
    apiKey,
    baseURL: o.baseUrl ?? CLAUDE_BASE_URL,
    maxRetries: o.maxRetries ?? 1,
    timeout: dog.totalTimeoutMs,
    logLevel: 'off',
    openTelemetry: false,
    ...(o.fetchImpl ? { fetch: o.fetchImpl } : {}),
  });
  return {
    provider: 'claude',
    model,
    stream<M extends TurnMode = 'cloud'>(input: BackupStreamOptions<M>): Promise<StreamResult> {
      const so = input as unknown as BackupStreamOptions<TurnMode>;
      const req = claudeRequest(model, so.messages, {
        effort: o.effort, maxTokens: o.maxTokens, ...(so.mode === 'workflow' ? { voice: BACKUP_WORKFLOW_VOICE_NOTE } : {}),
      });
      return streamOps({
        mode: so.mode, models: so.models, workflow: so.workflow, model, provider: 'claude',
        messages: so.messages, catalog: so.catalog, graph: so.graph, ctx: so.ctx, onEvent: so.onEvent, prices: so.prices,
      }, (h) => claudeSource(client, req, so.signal, dog, maxOutputChars, so.prices, h));
    },
    async complete(co: BackupCompleteOptions): Promise<BackupCompleteResult> {
      const req = claudeRequest(model, co.messages, {
        effort: o.effort, maxTokens: co.maxTokens ?? o.maxTokens,
        voice: co.mode === 'workflow' ? BACKUP_WORKFLOW_VOICE_NOTE : BACKUP_TEXT_VOICE_NOTE,
      });
      let text = '';
      let usage: Usage | null = null;
      let finishReason: string | null = null;
      const out = await claudeSource(client, req, co.signal, dog, maxOutputChars, co.prices, {
        onContent(delta: string) {
          text += delta;
          if (co.onText) {
            try {
              co.onText(delta);
            } catch {
              /* a listener error must not break the stream */
            }
          }
        },
        onUsage(u: Usage) {
          usage = u;
        },
        onFinish(reason: string) {
          finishReason = reason;
        },
      });
      // claudeSource prices every call that reported usage; a call with no event at all books nothing.
      return {
        text,
        usage,
        costUsd: out.costUsd ?? 0,
        costEstimated: !!out.costEstimated,
        finishReason,
        ...(out.servedModel ? { servedModel: out.servedModel } : {}),
        ...(out.error ? { error: out.error } : {}),
      };
    },
  };
}
