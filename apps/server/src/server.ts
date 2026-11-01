// The local turn server: node:http, no framework, bound to 127.0.0.1.
//   GET  /api/health  status, catalog version, whether a key and the Claude backup are configured (never a key)
//   POST /api/turn    TurnRequest JSON in, NDJSON out (application/x-ndjson, one event per line, flushed per line)
// Request checks, in order: Host header (DNS rebinding), Origin allowlist (a request without Origin is a local
// non-browser client), route and method, JSON content type, 512 KB body limit, JSON parse, TurnRequest shape and
// limits, key configured, one in-flight turn per session (409), at most maxInFlight turns overall (429). A rejection
// before streaming is an HTTP error whose JSON body is a ServerEvent fatal. Once streaming has started, every outcome
// is a line: commit or fatal. The upstream request is aborted when the client disconnects or the turn deadline
// passes. Errors never carry stack traces, and every outgoing line and log line passes through the key redactor, which
// knows both keys (Model Studio and, when the backup is configured, Anthropic).
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Catalog, ServerEvent } from '../../../packages/core/src/types.ts';
import { buildSystemPrompt } from '../../../packages/core/src/prompt.ts';
import { createCacheTracker } from '../../../packages/core/src/llm.ts';
import type { CacheTracker, ConstraintChecker, RunTurnOptions } from '../../../packages/core/src/llm.ts';
import { createClaudeBackup } from '../../../packages/core/src/claude.ts';
import type { ClaudeBackupOptions } from '../../../packages/core/src/claude.ts';
import type { ServerConfig } from './config.ts';
import { createTurnLog, makeRedactor, sessionTag } from './log.ts';
import type { TurnLog } from './log.ts';
import { fatalMessage, langOf } from './messages.ts';
import { LIMITS, checkTurnRequest } from './request.ts';
import { executeTurn } from './turn.ts';
import type { TurnOutcome, WireEvent } from './turn.ts';

export interface ServerDeps {
  config: ServerConfig;
  catalog: Catalog;
  /** From the environment only (main.ts). Undefined: the server runs, and turns answer 503 no-key. */
  apiKey: string | undefined;
  /**
   * The optional Claude backup (main.ts: ANTHROPIC_API_KEY and CLAUDE_BACKUP_MODEL). Undefined: no backup, and a turn
   * Model Studio's content filter stops ends as content-filtered, as before. fetchImpl defaults to the one below.
   */
  backup?: { apiKey: string; model?: string; fetchImpl?: typeof fetch; options?: Partial<ClaudeBackupOptions> };
  fetchImpl?: typeof fetch;
  checkConstraints?: ConstraintChecker;
  /** Extra runTurn options (watchdogs, retries, backoff). */
  turnOptions?: Partial<RunTurnOptions>;
  tracker?: CacheTracker;
  /** Default: createTurnLog(config.logFile). */
  log?: TurnLog;
  /** One metadata line per request (main.ts prints it); never content or the key. */
  onLine?: (line: string) => void;
}

export interface TurnServer {
  server: http.Server;
  /** Listens on 127.0.0.1 and resolves with the bound port. */
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
  inFlight(): { turns: number; sessions: string[] };
  log: TurnLog;
}

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const BASE_HEADERS: Record<string, string> = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
const JSON_RE = /^application\/json\s*(;.*)?$/i;

/** An oversized body is read and discarded up to this many bytes, so the client finishes sending and can read the 413; beyond it the socket is destroyed. */
const DRAIN_CAP = 8 * 1024 * 1024;

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    const tooLarge = (): HttpError => new HttpError(413, 'body-too-large', `body larger than ${limit} bytes`);
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const finish = (e: Error | null, b?: Buffer): void => {
      if (done) return;
      done = true;
      if (e) reject(e);
      else resolve(b!);
    };
    if (Number.isFinite(declared) && declared > limit) finish(tooLarge()); // answer at once; the rest is drained below
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (done) {
        if (size > DRAIN_CAP) req.destroy(); // discarding; cap the waste
        return;
      }
      if (size > limit) {
        finish(tooLarge()); // keep reading (and discarding) so the 413 reaches the client
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => finish(null, Buffer.concat(chunks)));
    req.on('error', () => finish(new HttpError(400, 'bad-request', 'request body could not be read')));
    req.on('close', () => finish(new HttpError(400, 'bad-request', 'request closed before the body was complete')));
  });
}

export function createTurnServer(deps: ServerDeps): TurnServer {
  const { config, catalog } = deps;
  const redact = makeRedactor(deps.apiKey, deps.backup?.apiKey);
  const fetchBackup = deps.backup?.fetchImpl ?? deps.fetchImpl;
  const backup = deps.backup ? createClaudeBackup({ ...deps.backup.options, apiKey: deps.backup.apiKey, model: deps.backup.model, ...(fetchBackup ? { fetchImpl: fetchBackup } : {}) }) : undefined;
  const log = deps.log ?? createTurnLog(config.logFile, redact);
  const system = buildSystemPrompt(catalog); // byte-stable; built once
  const tracker = deps.tracker ?? createCacheTracker();
  const sessions = new Set<string>();
  let turns = 0;
  const startedAt = Date.now();
  const line = (s: string): void => {
    if (deps.onLine) deps.onLine(redact(s));
  };

  const send = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void => {
    if (res.headersSent || res.destroyed) return;
    const text = redact(JSON.stringify(body));
    res.writeHead(status, { ...BASE_HEADERS, ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': String(Buffer.byteLength(text)) });
    res.end(text);
  };
  const fatalBody = (code: string, message: string, retryable: boolean): ServerEvent => ({ type: 'fatal', code, message, retryable });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const t0 = Date.now();
    const route = (req.url ?? '/').split('?')[0];
    const host = String(req.headers.host ?? '').toLowerCase();
    const originHeader = req.headers.origin;
    const origin = typeof originHeader === 'string' ? originHeader.toLowerCase() : undefined;
    const reject = (status: number, code: string, message: string, extra: Record<string, string> = {}, cors: Record<string, string> = {}): void => {
      send(res, status, fatalBody(code, message, status === 429 || status === 409 || status === 503), { ...cors, ...extra });
      // the path is the client's: bound it, so a loop of bad requests cannot grow the log by the size of its URLs
      const shown = route.length > 100 ? route.slice(0, 100) + '…' : route;
      log.write({ ts: new Date().toISOString(), outcome: 'rejected', route: shown, method: req.method, status, code, serverMs: Date.now() - t0 });
      line(`${req.method} ${shown} ${status} ${code}`);
    };
    if (!config.allowedHosts.includes(host)) return reject(403, 'bad-host', 'Host header not allowed');
    if (origin !== undefined && !config.allowedOrigins.includes(origin)) return reject(403, 'bad-origin', 'Origin not allowed');
    const cors: Record<string, string> = origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    if (route !== '/api/turn' && route !== '/api/health') return reject(404, 'not-found', 'no such route', {}, cors);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...BASE_HEADERS, ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
      res.end();
      return;
    }
    if (route === '/api/health') {
      if (req.method !== 'GET' && req.method !== 'HEAD') return reject(405, 'method-not-allowed', 'use GET', { Allow: 'GET, OPTIONS' }, cors);
      send(
        res,
        200,
        {
          ok: true,
          model: config.model,
          fallbackModel: config.fallbackModel,
          endpoint: new URL(config.baseUrl).host,
          catalog: { version: catalog.version, entries: catalog.entries.length },
          keyConfigured: !!deps.apiKey,
          backupConfigured: !!backup,
          inFlight: turns,
          maxInFlight: config.maxInFlight,
          limits: { askChars: LIMITS.askChars, turns: LIMITS.turns, nodes: LIMITS.nodes, requirements: LIMITS.requirements, bodyBytes: config.maxBodyBytes },
          uptimeS: Math.round((Date.now() - startedAt) / 1000),
        },
        cors,
      );
      return;
    }
    if (req.method !== 'POST') return reject(405, 'method-not-allowed', 'use POST', { Allow: 'POST, OPTIONS' }, cors);
    if (!JSON_RE.test(String(req.headers['content-type'] ?? ''))) return reject(415, 'unsupported-media-type', 'Content-Type must be application/json', {}, cors);
    let raw: Buffer;
    try {
      raw = await readBody(req, config.maxBodyBytes);
    } catch (e) {
      const h = e instanceof HttpError ? e : new HttpError(400, 'bad-request', 'request body could not be read');
      return reject(h.status, h.code, h.message, {}, cors);
    }
    let body: unknown;
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch {
      return reject(400, 'bad-json', 'body is not valid JSON', {}, cors);
    }
    const checked = checkTurnRequest(body);
    if (!checked.ok) return reject(400, checked.code, checked.message, {}, cors);
    const turnReq = checked.value;
    const lang = langOf(turnReq.ask);
    if (!deps.apiKey) return reject(503, 'no-key', fatalMessage('no-key', lang), {}, cors);
    if (sessions.has(turnReq.sessionId)) return reject(409, 'session-busy', fatalMessage('session-busy', lang), {}, cors);
    if (turns >= config.maxInFlight) return reject(429, 'server-busy', fatalMessage('server-busy', lang), { 'Retry-After': '2' }, cors);

    sessions.add(turnReq.sessionId);
    turns++;
    const ac = new AbortController();
    let clientGone = false;
    let deadlineHit = false;
    const onClose = (): void => {
      if (!res.writableEnded) {
        clientGone = true;
        ac.abort();
      }
    };
    res.on('close', onClose);
    const timer = setTimeout(() => {
      deadlineHit = true;
      ac.abort();
    }, config.turnDeadlineMs);
    let committed = false;
    const emit = (e: WireEvent): void => {
      if (res.writableEnded || res.destroyed) return;
      if (e.type === 'commit') committed = true;
      res.write(redact(JSON.stringify(e)) + '\n');
    };
    let outcome: TurnOutcome = { outcome: 'aborted', lang, statuses: [], summaryCostUsd: 0, backupLog: [] };
    let internal = false;
    try {
      res.writeHead(200, { ...BASE_HEADERS, ...cors, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      outcome = await executeTurn(
        turnReq,
        { apiKey: deps.apiKey, catalog, system, model: config.model, fallbackModel: config.fallbackModel, baseUrl: config.baseUrl, tracker, backup, msLeft: () => config.turnDeadlineMs - (Date.now() - t0), fetchImpl: deps.fetchImpl, checkConstraints: deps.checkConstraints, turnOptions: deps.turnOptions },
        emit,
        ac.signal,
      );
      if (outcome.outcome === 'aborted' && deadlineHit && !clientGone) {
        outcome.outcome = 'fatal';
        outcome.fatalCode = 'turn-timeout';
        emit({ type: 'fatal', code: 'turn-timeout', message: fatalMessage('turn-timeout', lang), retryable: true });
      }
    } catch {
      // Never a stack trace or an exception message on the wire: a generic, localized line instead. After a commit the
      // turn stands (only the summary failed), so no fatal follows it.
      internal = true;
      if (committed) outcome.outcome = 'commit';
      else {
        outcome.outcome = 'fatal';
        outcome.fatalCode = 'internal';
        emit({ type: 'fatal', code: 'internal', message: fatalMessage('internal', lang), retryable: true });
      }
    } finally {
      clearTimeout(timer);
      sessions.delete(turnReq.sessionId);
      turns--;
      if (!res.writableEnded && !res.destroyed) res.end();
    }
    log.write(turnLogEntry(turnReq.sessionId, turnReq.ask, outcome, { serverMs: Date.now() - t0, clientGone, deadlineHit, internal, content: config.logContent }));
    const s = outcome.stats;
    line(`POST /api/turn ${outcome.outcome}${outcome.fatalCode ? ' ' + outcome.fatalCode : ''} ${s ? `${s.model} first-op ${s.firstOpMs ?? '-'} ms, turn ${s.turnMs} ms, $${s.costUsd.toFixed(4)}` : ''}`.trim());
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) send(res, 500, fatalBody('internal', fatalMessage('internal', 'en'), true));
      else if (!res.writableEnded) res.end();
    });
  });
  server.headersTimeout = 20_000;
  server.requestTimeout = 60_000; // receiving the request; the streamed response is bounded by turnDeadlineMs

  return {
    server,
    log,
    listen: (port = config.port) =>
      new Promise((resolve, rej) => {
        const onError = (e: Error): void => rej(e);
        server.once('error', onError);
        server.listen(port, config.host, () => {
          server.off('error', onError);
          const a = server.address();
          resolve(typeof a === 'object' && a ? a.port : port);
        });
      }),
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }).then(() => log.flush()),
    inFlight: () => ({ turns, sessions: [...sessions] }),
  };
}

/** One metadata line for apps/server/logs/turns.jsonl. Content (ask, say lines) only when LOG_CONTENT=1. */
export function turnLogEntry(sessionId: string, ask: string, o: TurnOutcome, x: { serverMs: number; clientGone: boolean; deadlineHit: boolean; internal: boolean; content: boolean }): Record<string, unknown> {
  const s = o.stats;
  const codes: Record<string, number> = {};
  for (const w of s?.warningsAfter ?? []) codes[w.code] = (codes[w.code] ?? 0) + 1;
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    session: sessionTag(sessionId),
    outcome: o.outcome,
    fatal: o.fatalCode ?? null,
    lang: o.lang,
    askChars: [...ask].length,
    clientGone: x.clientGone,
    deadlineHit: x.deadlineHit,
    serverMs: x.serverMs,
    statuses: o.statuses,
  };
  if (s) {
    Object.assign(entry, {
      model: s.model,
      attempts: s.attempts.map((a) => ({ model: a.model, provider: a.provider, ...(a.servedModel ? { servedModel: a.servedModel } : {}), warm: a.warm, error: a.error?.code ?? null, ops: a.ops, ms: a.totalMs, hedged: a.hedged, costUsd: Number(a.costUsd.toFixed(6)) })),
      fallbackUsed: s.fallbackUsed,
      backupUsed: s.backupUsed,
      repair: s.repair ? { kind: s.repair.kind, model: s.repair.model, provider: s.repair.provider, findings: s.repair.findings.map((w) => w.code), ops: s.repair.ops.length, ms: s.repair.totalMs, error: s.repair.error?.code ?? null } : null,
      backupSkipped: s.backupSkipped ?? null,
      backupLog: o.backupLog,
      rescue: s.rescue ? { kind: s.rescue.kind, provider: s.rescue.provider, model: s.rescue.model, servedModel: s.rescue.servedModel ?? null, from: s.rescue.from, reason: s.rescue.reason, ok: s.rescue.ok, error: s.rescue.error?.code ?? null, ops: s.rescue.ops, firstOpMs: s.rescue.firstOpMs, ms: s.rescue.totalMs, costUsd: Number(s.rescue.costUsd.toFixed(6)) } : null,
      timings: { headersMs: s.headersMs, firstByteMs: s.firstByteMs, firstSayMs: s.firstSayMs, firstOpMs: s.firstOpMs, firstNodeMs: s.firstNodeMs, mainMs: s.totalMs, turnMs: s.turnMs, maxGapMs: s.maxGapMs },
      tokens: { prompt: s.promptTokens, cached: s.cachedTokens, created: s.cacheCreationTokens, completion: s.completionTokens },
      costUsd: Number(s.costUsd.toFixed(6)),
      costEstimated: s.costEstimated,
      summaryCostUsd: Number(o.summaryCostUsd.toFixed(6)),
      ops: s.ops,
      badLines: s.badLines,
      finalDone: s.finalDone,
      warnings: codes,
      fixes: s.fixes.length,
      nodes: o.nodes ?? null,
      summary: o.summary ?? null,
    });
  }
  if (x.content) {
    entry.ask = ask;
    entry.says = o.says ?? [];
  }
  return entry;
}
