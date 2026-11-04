import { PricingTurnError, runPricingTurn } from '../../../packages/core/src/solution-pricing-engine.ts';
import { fatalMessage } from '../../server/src/messages.ts';
import { checkPricingRequest } from '../../server/src/request.ts';
import { decodeDesignBody, PRICING_ATTACHMENT_BYTES } from '../../server/src/pricing-envelope.ts';
import * as db from './db.ts';
import { proposalDeadlineMs, turnsPerDay, type Env, type ExecutionContextLike } from './env.ts';
import { json, readBodyLimited } from './http.ts';
import { MAX_BODY_BYTES, makeRedactor, reject, sharedTurnState, turnConfig, workerFatalMessage } from './turn.ts';

/** A pricing answer takes the same user slot and daily turn allowance as drawing a design. */
export async function handlePricing(request: Request, env: Env, ctx: ExecutionContextLike, user: db.UserRow, price = runPricingTurn): Promise<Response> {
  if (!/^application\/json\s*(;.*)?$/i.test(request.headers.get('content-type') ?? '')) {
    return reject(415, 'unsupported-media-type', 'Content-Type must be application/json');
  }
  const raw = await readBodyLimited(request, MAX_BODY_BYTES + PRICING_ATTACHMENT_BYTES);
  if (!raw) return reject(413, 'body-too-large', 'Request is too large');
  const envelope = decodeDesignBody(raw, MAX_BODY_BYTES, true);
  if (!envelope.ok) return reject(envelope.status, envelope.code, envelope.message);
  const checked = checkPricingRequest(envelope.body);
  if (!checked.ok) return reject(400, checked.code, checked.message);
  const pricing = checked.value;
  const apiKey = env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) return reject(503, 'no-key', fatalMessage('no-key', pricing.lang));

  const cfg = turnConfig(env);
  const now = Date.now();
  const requestId = crypto.randomUUID();
  if (!await db.acquireTurnSlot(env.DB, user.id, requestId, now, Math.max(cfg.deadlineMs, proposalDeadlineMs(env)) + 60_000)) {
    return reject(409, 'user-busy', workerFatalMessage('user-busy', pricing.lang));
  }
  // Register the work before waiting for Qwen so a disconnected client still books usage and releases its slot.
  const running = run(apiKey);
  ctx.waitUntil(running.then(() => undefined));
  return running;

  async function run(apiKey: string): Promise<Response> {
    let costUsd = 0;
    let started = false;
    const day = db.utcDay(now);
    const abort = new AbortController();
    const onDisconnect = (): void => abort.abort();
    const timer = setTimeout(onDisconnect, cfg.deadlineMs);
    request.signal.addEventListener('abort', onDisconnect);
    if (request.signal.aborted) onDisconnect();
    try {
      const limit = turnsPerDay(env);
      if (user.role !== 'admin' && await db.turnsToday(env.DB, user.id, now) >= limit) {
        const message = workerFatalMessage('quota-exceeded', pricing.lang, { n: limit });
        return json(429, { type: 'fatal', code: 'quota-exceeded', message, retryable: false },
          { 'Retry-After': String(86400 - Math.floor(now / 1000) % 86400) });
      }
      if (abort.signal.aborted) return reject(409, 'aborted', fatalMessage('aborted', pricing.lang));
      started = true;
      const result = await price(pricing, sharedTurnState().catalog, { apiKey, baseUrl: cfg.baseUrl, signal: abort.signal });
      costUsd = result.costUsd;
      const redact = makeRedactor(apiKey, env.ANTHROPIC_API_KEY);
      return new Response(redact(JSON.stringify({ pricing: result.pricing })), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      if (error instanceof PricingTurnError) costUsd = error.costUsd;
      const code = abort.signal.aborted ? 'pricing-timeout' : 'pricing-unavailable';
      return json(abort.signal.aborted ? 504 : 502, { type: 'fatal', code, message: fatalMessage(code, pricing.lang), retryable: true });
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener('abort', onDisconnect);
      // Release after booking so rapid follow-ups see the new usage.
      try { if (started) await db.recordUsage(env.DB, user.id, day, costUsd, 1); }
      finally { await db.releaseTurnSlot(env.DB, user.id, requestId); }
    }
  }
}
