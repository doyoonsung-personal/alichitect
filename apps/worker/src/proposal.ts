// POST /api/proposal on Workers: drafts the exported PDF's business narrative (packages/core/src/proposal.ts
// draftProposal) and streams it back as NDJSON, one ProposalEvent per line, ending with 'done' or 'fatal'. A sibling of
// turn.ts handleTurn with the same checks in the same order (JSON content type, 512 KB body, JSON parse, ProposalRequest
// shape and limits from apps/server/src/request.ts, key configured) and the same per-user rules: a draft counts as one
// turn against TURNS_PER_DAY (two when the backup ran), and it takes the same one-in-flight D1 slot as a turn, so a
// running turn refuses a draft (409) and a running draft refuses a turn. The Claude backup, its spending caps and its
// booking are wired exactly as for turns. The wire never says who wrote a line: sections, 'retry' / 'finish' statuses
// with neutral copy, the draft, or a neutral fatal; never a provider, model, upstream text or stack. The upstream calls
// are aborted when the browser disconnects (request.signal, or a failed write) or the draft deadline passes
// (PROPOSAL_DEADLINE_MS, default 360 s). Usage is recorded after every draft that started; the log holds metadata only,
// never the session or any drafted text, and every outgoing line passes through the key redactor (both keys).
import type { Env, ExecutionContextLike } from './env.ts';
import { DEFAULT_PROPOSAL_DEADLINE_MS, claudeBudgetUsdPerDay, dailyTurnLimit, proposalDeadlineMs, rescuesPerDay } from './env.ts';
import type { ProposalEvent } from '../../../packages/core/src/types.ts';
import type { BackupCall, BackupGateResult } from '../../../packages/core/src/llm.ts';
import { QWEN_HIGH_REASONING } from '../../../packages/core/src/llm.ts';
import { claudeBackupConfig, createClaudeBackup } from '../../../packages/core/src/claude.ts';
import type { ClaudeBackupOptions } from '../../../packages/core/src/claude.ts';
import { draftProposal } from '../../../packages/core/src/proposal.ts';
import type { DraftProposalResult } from '../../../packages/core/src/proposal.ts';
import { checkProposalRequest } from '../../server/src/request.ts';
import { decodeDesignBody, PRICING_ATTACHMENT_BYTES } from '../../server/src/pricing-envelope.ts';
import { fatalMessage, proposalEndEvent, proposalFatalEvent, proposalStatusEvent } from '../../server/src/messages.ts';
import * as db from './db.ts';
import type { UserRow } from './db.ts';
import { json, readBodyLimited } from './http.ts';
import { MAX_BODY_BYTES, makeRedactor, reject, sharedTurnState, turnConfig } from './turn.ts';
import { t } from './pages/i18n.ts';

const JSON_RE = /^application\/json\s*(;.*)?$/i;
export { DEFAULT_PROPOSAL_DEADLINE_MS, proposalDeadlineMs };

export interface ProposalHandlerDeps {
  /** The drafting engine (tests inject a fake); default draftProposal. */
  draft?: typeof draftProposal;
  fetchImpl?: typeof fetch;
  /** The Claude backup's fetch (tests); default fetchImpl, then the global fetch. */
  backupFetchImpl?: typeof fetch;
  backupOptions?: Partial<ClaudeBackupOptions>;
  /** Overrides the deadline (tests: PROPOSAL_DEADLINE_MS cannot go below 30 s). */
  deadlineMs?: number;
  now?: () => number;
  log?: (line: string) => void;
}

const secondsToUtcMidnight = (now: number): number => {
  const d = new Date(now);
  return Math.max(1, Math.ceil((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now) / 1000));
};

export async function handleProposal(request: Request, env: Env, ctx: ExecutionContextLike, user: UserRow, deps: ProposalHandlerDeps = {}): Promise<Response> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((l: string) => console.log(l));
  const t0 = now();
  const logReject = (status: number, code: string): void => log(JSON.stringify({ evt: 'proposal-rejected', user: user.id, status, code }));

  if (!JSON_RE.test(request.headers.get('content-type') ?? '')) {
    logReject(415, 'unsupported-media-type');
    return reject(415, 'unsupported-media-type', 'Content-Type must be application/json');
  }
  const raw = await readBodyLimited(request, MAX_BODY_BYTES + PRICING_ATTACHMENT_BYTES);
  if (!raw) {
    logReject(413, 'body-too-large');
    return reject(413, 'body-too-large', 'Request is too large');
  }
  const envelope = decodeDesignBody(raw, MAX_BODY_BYTES, true);
  if (!envelope.ok) {
    logReject(envelope.status, envelope.code);
    return reject(envelope.status, envelope.code, envelope.message);
  }
  const checked = checkProposalRequest(envelope.body);
  if (!checked.ok) {
    logReject(400, checked.code);
    return reject(400, checked.code, checked.message);
  }
  const propReq = checked.value;
  const lang = propReq.lang;
  const apiKey = env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    logReject(503, 'no-key');
    return reject(503, 'no-key', fatalMessage('no-key', lang));
  }
  const isAdmin = user.role === 'admin';
  const limit = dailyTurnLimit(env, user.role);
  if (limit !== null) {
    const used = await db.turnsToday(env.DB, user.id, t0);
    if (used >= limit) {
      logReject(429, 'quota-exceeded');
      // Not retryable, unlike the shared reject() of a 429: trying again cannot help before midnight UTC, so the
      // overlay offers only the basic version and Close.
      const body: ProposalEvent = { type: 'fatal', code: 'quota-exceeded', message: t(lang, 'fatal.proposal-quota-exceeded', { n: limit }), retryable: false };
      return json(429, body, { 'Retry-After': String(secondsToUtcMidnight(t0)) });
    }
  }
  const cfg = turnConfig(env);
  const deadlineMs = deps.deadlineMs ?? proposalDeadlineMs(env);
  const requestId = crypto.randomUUID();
  // The slot is shared with turns; a slot older than the longer of the two deadlines (plus slack) is a dead request's.
  if (!(await db.acquireTurnSlot(env.DB, user.id, requestId, t0, Math.max(cfg.deadlineMs, deadlineMs) + 60_000))) {
    logReject(409, 'user-busy');
    return reject(409, 'user-busy', t(lang, 'fatal.proposal-user-busy'));
  }

  const day = db.utcDay(t0);
  const backupCfg = claudeBackupConfig(env);
  const redact = makeRedactor(apiKey, backupCfg?.apiKey);
  const backup = backupCfg
    ? createClaudeBackup({ ...deps.backupOptions, apiKey: backupCfg.apiKey, model: backupCfg.model, fetchImpl: deps.backupFetchImpl ?? deps.fetchImpl ?? ((u, i) => fetch(u, i)) })
    : undefined;
  const { catalog } = sharedTurnState();
  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const ac = new AbortController();
  let clientGone = false;
  let deadlineHit = false;
  let closed = false;
  const onClientAbort = (): void => {
    clientGone = true;
    ac.abort();
  };
  request.signal?.addEventListener('abort', onClientAbort);
  const timer = setTimeout(() => {
    deadlineHit = true;
    ac.abort();
  }, deadlineMs);
  const emit = (e: ProposalEvent): void => {
    if (closed) return;
    writer.write(enc.encode(redact(JSON.stringify(e)) + '\n')).catch(() => {
      // the browser went away: stop the writer too
      if (!closed) onClientAbort();
    });
  };

  // The backup's spending caps, exactly as handleTurn: asked once, right before the backup would run; each backup call
  // is booked as it ends.
  const userCap = rescuesPerDay(env, isAdmin);
  const budgetUsd = claudeBudgetUsdPerDay(env);
  let rescueRan = false;
  const backupGate = async (): Promise<BackupGateResult> => {
    const u = await db.rescueUsage(env.DB, user.id, day);
    if (u.userRescues >= userCap) return { ok: false, reason: 'limit', detail: 'user-cap' };
    if (u.globalCostUsd >= budgetUsd) return { ok: false, reason: 'limit', detail: 'global-cap' };
    return { ok: true };
  };
  const onBackupCall = async (c: BackupCall): Promise<void> => {
    if (c.first) rescueRan = true;
    await db.bookRescue(env.DB, user.id, day, c.costUsd, c.first);
  };

  const run = async (): Promise<void> => {
    let result: DraftProposalResult | null = null;
    let fatal: string | null = null;
    let internal = false;
    try {
      result = await (deps.draft ?? draftProposal)(propReq, catalog, {
        apiKey,
        baseUrl: cfg.baseUrl,
        model: QWEN_HIGH_REASONING.model,
        fallbackModel: cfg.fallbackModel ? QWEN_HIGH_REASONING.model : null,
        backup,
        ...(backup ? { backupGate, onBackupCall } : {}),
        msLeft: () => deadlineMs - (now() - t0),
        signal: ac.signal,
        onSection: (section) => emit({ type: 'section', section }),
        onStatus: (code) => emit(proposalStatusEvent(code, lang)),
        fetchImpl: deps.fetchImpl ?? ((u, i) => fetch(u, i)),
      });
      const end = proposalEndEvent(result, { deadlineHit, clientGone }, lang);
      if (end) {
        if (end.type === 'fatal') fatal = end.code;
        emit(end);
      }
    } catch {
      // never a stack trace or an exception message on the wire
      internal = true;
      fatal = 'internal';
      emit(proposalFatalEvent('internal', lang));
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', onClientAbort);
      closed = true;
      // Not awaited, as in handleTurn: a browser that went away never reads the queued lines.
      (clientGone ? writer.abort() : writer.close()).catch(() => undefined);
    }
    const s = result?.stats;
    const cost = s?.costUsd ?? 0;
    const backupRan = rescueRan || !!s?.backupUsed;
    // In this order, as for turns: while the slot is held the user's next request is refused, so the count it reads
    // once the slot is free includes this draft. A failure of one must not skip the other.
    await db.recordUsage(env.DB, user.id, day, cost, backupRan ? 2 : 1).catch(() => undefined);
    await db.releaseTurnSlot(env.DB, user.id, requestId).catch(() => undefined);
    log(
      JSON.stringify({
        evt: 'proposal',
        user: user.id,
        outcome: internal ? 'internal' : (result?.outcome ?? 'aborted'),
        fatal,
        error: result?.error?.code ?? null,
        lang,
        clientGone,
        deadlineHit,
        internal,
        serverMs: now() - t0,
        model: s?.model ?? null,
        servedBy: s?.servedBy ?? null,
        calls: s?.calls ?? null,
        sections: s?.sections ?? 0,
        rejectedLines: s?.rejectedLines ?? 0,
        lint: s?.lint ?? null,
        heldUsed: s?.heldUsed ?? 0,
        missing: s?.missing.length ?? null,
        complete: result?.draft?.complete ?? null,
        fallbackUsed: s?.fallbackUsed ?? null,
        backupUsed: s?.backupUsed ?? null,
        backupSkipped: s?.backupSkipped ?? null,
        draftMs: s ? Math.round(s.ms) : null,
        tokens: s ? { prompt: s.promptTokens, completion: s.completionTokens } : null,
        costUsd: Number(cost.toFixed(6)),
      }),
    );
  };
  ctx.waitUntil(run());
  return new Response(readable, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}
