import { validateDocument } from '../../../../../packages/business-case/src/engine.ts';
import type { Env } from '../../env.ts';
import type { UserRow } from '../../db.ts';
import { json, readBodyLimited } from '../../http.ts';
import { deleteRecord, finishModelCall, listRecords, listRecordSummaries, reserveModelCall, saveRecord } from './repository.ts';
import { explainDocument } from './model.ts';
import type { ModelDeps } from './model.ts';
import { businessCaseEligible, businessCaseEnabled } from './policy.ts';
export { businessCaseEligible, businessCaseEnabled } from './policy.ts';

export const BUSINESS_CASE_PREFIX = '/api/features/business-case';
export const MAX_BODY_BYTES = 65_536;
export interface BusinessCaseDeps extends ModelDeps { now?: () => number }
const sessionIdValid = (value: string | null): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const methodError = (allow: string): Response => json(405, { error: 'method-not-allowed' }, { Allow: allow });

/** Host invokes this only after cookie auth, approval and same-origin write checks. */
export async function handleBusinessCase(request: Request, env: Env, user: Pick<UserRow, 'id' | 'status' | 'email' | 'role'>,
  deps: BusinessCaseDeps = {}): Promise<Response> {
  // Feature-off must not touch module tables, allowing an unapplied migration.
  if (!businessCaseEnabled(env)) return json(404, { error: 'not-found' });
  if (user.status !== 'approved') return json(403, { error: 'not-approved' });
  if (!businessCaseEligible(env, user)) return json(404, { error: 'not-found' });
  const url = new URL(request.url), suffix = url.pathname.slice(BUSINESS_CASE_PREFIX.length);
  const now = deps.now ?? Date.now;
  if (!url.pathname.startsWith(BUSINESS_CASE_PREFIX)) return json(404, { error: 'not-found' });
  try {
    if (suffix === '') {
      if (request.method === 'GET') {
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionIdValid(sessionId)) return json(400, { error: 'invalid-session-id' });
        return json(200, { records: await listRecords(env.DB, user.id, sessionId) });
      }
      if (request.method !== 'POST') return methodError('GET, POST');
    } else if (suffix === '/versions') {
      if (request.method !== 'GET') return methodError('GET');
      return json(200, { versions: await listRecordSummaries(env.DB, user.id) });
    } else if (suffix === '/explain') {
      if (request.method !== 'POST') return methodError('POST');
    } else if (/^\/bc_[a-f0-9]{32}$/.test(suffix)) {
      if (request.method !== 'DELETE') return methodError('DELETE');
      const deleted = await deleteRecord(env.DB, user.id, suffix.slice(1));
      return deleted ? new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } }) : json(404, { error: 'not-found' });
    } else return json(404, { error: 'not-found' });

    if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') ?? '')) return json(415, { error: 'json-required' });
    const bytes = await readBodyLimited(request, MAX_BODY_BYTES);
    if (!bytes) return json(413, { error: 'body-too-large' });
    let raw: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json(400, { error: 'invalid-body' });
      raw = parsed as Record<string, unknown>;
    } catch { return json(400, { error: 'invalid-json' }); }
    const validated = validateDocument(raw.document);
    if (!validated.ok || !sessionIdValid(validated.value.source.sessionId)) return json(400, { error: 'invalid-document' });
    if (suffix === '') {
      const record = await saveRecord(env.DB, user.id, validated.value, now());
      return record ? json(201, { record }) : json(409, { error: 'history-full' });
    }
    if (raw.lang !== 'en' && raw.lang !== 'ko' && raw.lang !== 'zh') return json(400, { error: 'invalid-language' });
    if (!env.DASHSCOPE_API_KEY) return json(503, { error: 'explanation-unavailable' });
    const callId = await reserveModelCall(env.DB, user.id, now());
    if (!callId) return json(429, { error: 'explanation-limit' }, { 'Retry-After': '60' });
    const result = await explainDocument(validated.value, raw.lang, env, request.signal, deps);
    // Persist success/failure and cost before returning. Never turn a model failure
    // into a chat error or let retrying bypass the module's admission budget.
    await finishModelCall(env.DB, user.id, callId, now(), result.status, result.costUsd, result.costEstimated);
    return result.explanation ? json(200, { explanation: result.explanation }) : json(502, { error: 'explanation-unavailable' });
  } catch {
    // Storage/provider exceptions are isolated from architecture, pricing and auth.
    return json(503, { error: 'business-case-unavailable' });
  }
}
