// POST /api/turn on Workers: the port of apps/server's turn endpoint. The same checks in the same order (JSON content
// type, 512 KB body, JSON parse, TurnRequest shape and limits from apps/server/src/request.ts, key configured), then
// the per-user rules that replace the local server's per-session lock: the daily quota (TURNS_PER_DAY, admins
// unlimited) and one turn in flight per user (a D1 row). The turn itself is apps/server/src/turn.ts executeTurn over
// packages/core's runTurn, unchanged; its events go out as NDJSON through a TransformStream, one line per event.
// The upstream request is aborted when the browser disconnects (request.signal, or a failed write) or the turn
// deadline passes. Usage is recorded after every turn that started. The log holds metadata only, never the ask or the
// reply, and every outgoing line passes through the key redactor.
import type { Env, ExecutionContextLike } from './env.ts';
import { turnsPerDay } from './env.ts';
import type { Catalog, ServerEvent } from '../../../packages/core/src/types.ts';
import { DEFAULT_BASE_URL, DEFAULT_MODEL, FALLBACK_MODEL, createCacheTracker } from '../../../packages/core/src/llm.ts';
import type { CacheTracker, RunTurnOptions } from '../../../packages/core/src/llm.ts';
import { buildSystemPrompt } from '../../../packages/core/src/prompt.ts';
import { createCatalog } from '../../../packages/core/src/catalog.ts';
import type { CatalogFile } from '../../../packages/core/src/catalog.ts';
import products from '../../../packages/core/catalog/products.json' with { type: 'json' };
import offerings from '../../../packages/core/catalog/offerings.json' with { type: 'json' };
import { LIMITS, checkTurnRequest } from '../../server/src/request.ts';
import { fatalMessage, langOf } from '../../server/src/messages.ts';
import type { Lang } from '../../server/src/messages.ts';
import { executeTurn } from '../../server/src/turn.ts';
import type { TurnOutcome, WireEvent } from '../../server/src/turn.ts';
import * as db from './db.ts';
import type { UserRow } from './db.ts';
import { json, readBodyLimited } from './http.ts';
import { t } from './pages/i18n.ts';

export const MAX_BODY_BYTES = 512 * 1024;
const JSON_RE = /^application\/json\s*(;.*)?$/i;
const DEFAULT_DEADLINE_MS = 240_000;

/* ---------- the catalog and system prompt: built once per isolate, on first use ---------- */

let shared: { catalog: Catalog; system: string; tracker: CacheTracker } | null = null;

export function sharedTurnState(): { catalog: Catalog; system: string; tracker: CacheTracker } {
  if (!shared) {
    const catalog = createCatalog(products as unknown as CatalogFile, offerings as unknown as CatalogFile);
    shared = { catalog, system: buildSystemPrompt(catalog), tracker: createCacheTracker() };
  }
  return shared;
}

export interface TurnConfig {
  model: string;
  fallbackModel: string | null;
  baseUrl: string;
  deadlineMs: number;
}

export function turnConfig(env: Env): TurnConfig {
  const fb = env.QWEN_FALLBACK_MODEL;
  const base = env.QWEN_BASE_URL?.trim();
  const d = Number(env.TURN_DEADLINE_MS);
  return {
    model: env.QWEN_MODEL?.trim() || DEFAULT_MODEL,
    fallbackModel: fb === undefined ? FALLBACK_MODEL : fb.trim() === '' || fb.trim() === 'none' ? null : fb.trim(),
    baseUrl: base && /^https:\/\//.test(base) ? base : DEFAULT_BASE_URL,
    deadlineMs: Number.isInteger(d) && d >= 10_000 && d <= 900_000 ? d : DEFAULT_DEADLINE_MS,
  };
}

/** GET /api/health: the SPA's Health shape. No secrets: whether a key is set, never the key. */
export function health(env: Env): Response {
  const cfg = turnConfig(env);
  const { catalog } = sharedTurnState();
  return json(200, {
    ok: true,
    model: cfg.model,
    fallbackModel: cfg.fallbackModel,
    endpoint: new URL(cfg.baseUrl).host,
    catalog: { version: catalog.version, entries: catalog.entries.length },
    keyConfigured: !!env.DASHSCOPE_API_KEY,
    inFlight: 0,
    maxInFlight: 1, // per user
    limits: { askChars: LIMITS.askChars, turns: LIMITS.turns, nodes: LIMITS.nodes, requirements: LIMITS.requirements, bodyBytes: MAX_BODY_BYTES },
    uptimeS: 0,
  });
}

/* ---------- copy for the Worker's own fatal codes ---------- */

export type WorkerFatal = 'signed-out' | 'not-approved' | 'quota-exceeded' | 'user-busy';

export function workerFatalMessage(code: WorkerFatal, lang: Lang, vars?: Record<string, string | number>): string {
  return t(lang, `fatal.${code}`, vars);
}

const fatalBody = (code: string, message: string, retryable: boolean): ServerEvent => ({ type: 'fatal', code, message, retryable });

/** A rejection before streaming: an HTTP error whose body is a fatal ServerEvent, as apps/server sends. */
export function reject(status: number, code: string, message: string, extra: Record<string, string> = {}): Response {
  return json(status, fatalBody(code, message, status === 429 || status === 409 || status === 503), extra);
}

/* ---------- the key redactor (the same rules as apps/server/src/log.ts makeRedactor, which needs node:crypto) ---------- */

export function makeRedactor(secret: string | undefined): (s: string) => string {
  if (!secret || secret.length < 8) return (s) => s.replace(/\bsk-[A-Za-z0-9_-]{8,}/g, '[redacted]');
  const MARK = '[redacted]';
  const head = secret.slice(0, 6);
  return (s) => {
    let out = s.includes(secret) ? s.split(secret).join(MARK) : s;
    for (let at = out.indexOf(head); at >= 0; at = out.indexOf(head, at + MARK.length)) {
      let n = 6;
      while (n < secret.length && out[at + n] === secret[n]) n++;
      out = out.slice(0, at) + MARK + out.slice(at + n);
    }
    return out.replace(/\bsk-[A-Za-z0-9_-]{8,}/g, MARK);
  };
}

/* ---------- POST /api/turn ---------- */

export interface TurnHandlerDeps {
  fetchImpl?: typeof fetch;
  turnOptions?: Partial<RunTurnOptions>;
  now?: () => number;
  log?: (line: string) => void;
}

const secondsToUtcMidnight = (now: number): number => {
  const d = new Date(now);
  return Math.max(1, Math.ceil((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now) / 1000));
};

export async function handleTurn(request: Request, env: Env, ctx: ExecutionContextLike, user: UserRow, deps: TurnHandlerDeps = {}): Promise<Response> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((l: string) => console.log(l));
  const t0 = now();
  const logReject = (status: number, code: string): void => log(JSON.stringify({ evt: 'turn-rejected', user: user.id, status, code }));

  if (!JSON_RE.test(request.headers.get('content-type') ?? '')) {
    logReject(415, 'unsupported-media-type');
    return reject(415, 'unsupported-media-type', 'Content-Type must be application/json');
  }
  const raw = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!raw) {
    logReject(413, 'body-too-large');
    return reject(413, 'body-too-large', `body larger than ${MAX_BODY_BYTES} bytes`);
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    logReject(400, 'bad-json');
    return reject(400, 'bad-json', 'body is not valid JSON');
  }
  const checked = checkTurnRequest(body);
  if (!checked.ok) {
    logReject(400, checked.code);
    return reject(400, checked.code, checked.message);
  }
  const turnReq = checked.value;
  const lang = langOf(turnReq.ask);
  const apiKey = env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    logReject(503, 'no-key');
    return reject(503, 'no-key', fatalMessage('no-key', lang));
  }
  const isAdmin = user.role === 'admin';
  const limit = turnsPerDay(env);
  if (!isAdmin) {
    const used = await db.turnsToday(env.DB, user.id, t0);
    if (used >= limit) {
      logReject(429, 'quota-exceeded');
      return reject(429, 'quota-exceeded', workerFatalMessage('quota-exceeded', lang, { n: limit }), { 'Retry-After': String(secondsToUtcMidnight(t0)) });
    }
  }
  const cfg = turnConfig(env);
  const requestId = crypto.randomUUID();
  if (!(await db.acquireTurnSlot(env.DB, user.id, requestId, t0, cfg.deadlineMs + 60_000))) {
    logReject(409, 'user-busy');
    return reject(409, 'user-busy', workerFatalMessage('user-busy', lang));
  }

  const day = db.utcDay(t0);
  const redact = makeRedactor(apiKey);
  const { catalog, system, tracker } = sharedTurnState();
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const ac = new AbortController();
  let clientGone = false;
  let deadlineHit = false;
  let closed = false;
  let committed = false;
  const onClientAbort = (): void => {
    clientGone = true;
    ac.abort();
  };
  request.signal?.addEventListener('abort', onClientAbort);
  const timer = setTimeout(() => {
    deadlineHit = true;
    ac.abort();
  }, cfg.deadlineMs);
  const emit = (e: WireEvent): void => {
    if (closed) return;
    if (e.type === 'commit') committed = true;
    writer.write(enc.encode(redact(JSON.stringify(e)) + '\n')).catch(() => {
      // the browser went away: stop the model too
      if (!closed) onClientAbort();
    });
  };

  const run = async (): Promise<void> => {
    let outcome: TurnOutcome = { outcome: 'aborted', lang, statuses: [], summaryCostUsd: 0 };
    let internal = false;
    try {
      outcome = await executeTurn(
        turnReq,
        {
          apiKey,
          catalog,
          system,
          model: cfg.model,
          fallbackModel: cfg.fallbackModel,
          baseUrl: cfg.baseUrl,
          tracker,
          fetchImpl: deps.fetchImpl ?? ((u, i) => fetch(u, i)),
          turnOptions: deps.turnOptions,
        },
        emit,
        ac.signal,
      );
      if (outcome.outcome === 'aborted' && deadlineHit && !clientGone) {
        outcome.outcome = 'fatal';
        outcome.fatalCode = 'turn-timeout';
        emit({ type: 'fatal', code: 'turn-timeout', message: fatalMessage('turn-timeout', lang), retryable: true });
      }
    } catch {
      // never a stack trace or an exception message on the wire; after a commit the turn stands
      internal = true;
      if (committed) outcome.outcome = 'commit';
      else {
        outcome.outcome = 'fatal';
        outcome.fatalCode = 'internal';
        emit({ type: 'fatal', code: 'internal', message: fatalMessage('internal', lang), retryable: true });
      }
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', onClientAbort);
      closed = true;
      // Not awaited: close() waits until the browser has read every queued line, and a browser that went away never
      // will. The bookkeeping below must not wait on it; after a disconnect the stream is aborted instead.
      (clientGone ? writer.abort() : writer.close()).catch(() => undefined);
    }
    const s = outcome.stats;
    const cost = (s?.costUsd ?? 0) + outcome.summaryCostUsd;
    // In this order, one after the other: while the slot is held the same user's next turn is refused (409), so by the
    // time the slot is free the count it reads includes this turn. A failure of one must not skip the other.
    await db.recordUsage(env.DB, user.id, day, cost).catch(() => undefined);
    await db.releaseTurnSlot(env.DB, user.id, requestId).catch(() => undefined);
    log(
      JSON.stringify({
        evt: 'turn',
        user: user.id,
        outcome: outcome.outcome,
        fatal: outcome.fatalCode ?? null,
        lang,
        askChars: [...turnReq.ask].length,
        clientGone,
        deadlineHit,
        internal,
        serverMs: now() - t0,
        model: s?.model ?? null,
        fallbackUsed: s?.fallbackUsed ?? null,
        statuses: outcome.statuses.map((x) => x.code),
        timings: s ? { firstByteMs: s.firstByteMs, firstOpMs: s.firstOpMs, turnMs: s.turnMs } : null,
        tokens: s ? { prompt: s.promptTokens, cached: s.cachedTokens, completion: s.completionTokens } : null,
        costUsd: Number(cost.toFixed(6)),
        nodes: outcome.nodes ?? null,
      }),
    );
  };
  ctx.waitUntil(run());
  return new Response(readable, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}
