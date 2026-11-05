import { compactSessionTitle, draftSessionTitle, sessionTitleBrief, SESSION_TITLE_VERSION } from '../../../packages/core/src/session-title.ts';
import type { Env } from './env.ts';
import { sha256Hex } from './crypto.ts';
import { recordUsage } from './db.ts';
import { json, readBodyLimited } from './http.ts';

export class TitleUnavailable extends Error {
  status: number; code: string; retryAfter: number;
  constructor(status: number, code: string, retryAfter = 3600) { super(code); this.status = status; this.code = code; this.retryAfter = retryAfter; }
}
interface CachedTitle { title: string; ready: number; created_at: number }
export interface TitleDeps { draft?: typeof draftSessionTitle; now?: () => number; fetchImpl?: typeof fetch }

/** Owner-scoped persistent idempotency also prevents two browser tabs from buying the same title twice. */
export async function cachedSessionTitle(env: Env, owner: string, brief: string, signal?: AbortSignal, deps: TitleDeps = {}) {
  if (!env.DASHSCOPE_API_KEY) throw new TitleUnavailable(503, 'no-key');
  const now = deps.now?.() ?? Date.now(), hash = await sha256Hex(JSON.stringify([SESSION_TITLE_VERSION, brief]));
  const row = await env.DB.prepare('SELECT title, ready, created_at FROM session_titles WHERE user_id=? AND brief_hash=?')
    .bind(owner, hash).first<CachedTitle>();
  if (row) {
    if (!row.ready && now - row.created_at < 15_000) throw new TitleUnavailable(409, 'title-pending', 15);
    // A terminated request retains its bounded fallback instead of buying the same title on every visit.
    return { title: row.title, titleVersion: SESSION_TITLE_VERSION };
  }
  const fallback = compactSessionTitle(brief);
  const claim = await env.DB.prepare(`INSERT INTO session_titles(user_id,brief_hash,title,ready,created_at)
    SELECT ?,?,?,0,? WHERE (SELECT COUNT(*) FROM session_titles WHERE user_id=? AND created_at>?) < 40
    ON CONFLICT DO NOTHING`).bind(owner, hash, fallback, now, owner, now - 86_400_000).run();
  if (claim.meta.changes !== 1) throw new TitleUnavailable(429, 'title-budget', 3600);
  const result = await (deps.draft ?? draftSessionTitle)(brief, {
    apiKey: env.DASHSCOPE_API_KEY, baseUrl: env.QWEN_BASE_URL, signal, fetchImpl: deps.fetchImpl,
  });
  await env.DB.prepare('UPDATE session_titles SET title=?,ready=1 WHERE user_id=? AND brief_hash=?')
    .bind(result.title, owner, hash).run();
  await recordUsage(env.DB, owner, new Date(now).toISOString().slice(0, 10), result.costUsd, 0).catch(() => undefined);
  return { title: result.title, titleVersion: SESSION_TITLE_VERSION };
}

/** Called only behind the normal approved-account cookie and same-origin write checks. */
export async function handleSessionTitle(request: Request, env: Env, owner: string, deps: TitleDeps = {}): Promise<Response> {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') ?? '')) return json(415, { error: 'json-required' });
  const raw = await readBodyLimited(request, 32_768);
  if (!raw) return json(413, { error: 'body-too-large' });
  let brief: string | null = null;
  try { brief = sessionTitleBrief(JSON.parse(new TextDecoder().decode(raw))); } catch { /* invalid JSON */ }
  if (!brief) return json(400, { error: 'invalid-title-brief' });
  try { return json(200, await cachedSessionTitle(env, owner, brief, request.signal, deps)); }
  catch (error) {
    if (error instanceof TitleUnavailable) return json(error.status, { error: error.code }, { 'Retry-After': String(error.retryAfter) });
    throw error;
  }
}
