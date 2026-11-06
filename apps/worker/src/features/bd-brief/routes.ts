// The BD brief HTTP routes under BD_BRIEF_API_PREFIX (plan §7). index.ts owns the shared seams (allowed origin,
// same-origin for writes, sign-in, approved status) and calls handleBdBrief with the signed-in user; this file
// enforces bdBriefEligible on EVERY request — the same server-side gate the capability flag uses, so a stale
// browser can never bypass a disabled server — and dispatches the suffix after the prefix.
//
// Documented HTTP choices:
// - POST /briefs answers 200 { brief } for both a fresh create and an existing brief (create-if-absent), so the
//   client has one code path.
// - A failed generation answers a proper HTTP status (504 timeout, 502 model, 422 validation) with the structured
//   body { error: 'generation-failed', reason }; the web client treats any !ok via BdBriefApiError. A failure never
//   touches the last accepted brief and always releases (fails) the lease.
// - An explicit retry of a FAILED generation must use a NEW requestId: replaying the failed one answers
//   409 request-conflict, so no hidden repeated paid calls (plan §7).
import type { Env, ExecutionContextLike } from '../../env.ts';
import type { UserRow } from '../../db.ts';
import { json, readBodyLimited } from '../../http.ts';
import { sha256Hex } from '../../crypto.ts';
import type {
  BriefCandidate,
  BriefContent,
  BriefNote,
  BriefRecord,
  BriefSnapshot,
  IdFactory,
} from '../../../../../packages/bd-brief/src/types.ts';
import { BD_BRIEF_API_PREFIX, BD_BRIEF_SCHEMA_VERSION, EVIDENCE_DESIGN, EVIDENCE_OBJECTIVE, EVIDENCE_PRICING, LIMITS } from '../../../../../packages/bd-brief/src/types.ts';
import { validateAddNoteRequest, validateCreateBriefRequest, validateGenerateRequest, validatePatchRequest } from '../../../../../packages/bd-brief/src/validate.ts';
import { canonicalJson, snapshotFingerprint } from '../../../../../packages/bd-brief/src/evidence.ts';
import { generateBrief } from '../../../../../packages/bd-brief/src/engine.ts';
import { bdBriefDeadlineMs, bdBriefEligible, bdBriefGenerationsPerUserDay } from './policy.ts';
import { createBdBriefModel } from './model.ts';
import * as repo from './repository.ts';

/** The same body cap as the platform's other JSON endpoints (turn.ts MAX_BODY_BYTES). */
const MAX_BODY_BYTES = 512 * 1024;
const JSON_RE = /^application\/json\s*(;.*)?$/i;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export interface BdBriefDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  ids?: IdFactory;
  engine?: typeof generateBrief;
}

type EngineOutcome = Awaited<ReturnType<typeof generateBrief>>;

const defaultIds: IdFactory = { next: (prefix) => `${prefix}-${crypto.randomUUID()}` };

export async function handleBdBrief(request: Request, env: Env, ctx: ExecutionContextLike, me: UserRow, url: URL, deps: BdBriefDeps = {}): Promise<Response> {
  try {
    return await routeBdBrief(request, env, ctx, me, url, deps);
  } catch (e) {
    // ids and codes only: note/snapshot TEXT must never appear in logs (plan §7 retention/privacy)
    console.error(JSON.stringify({ evt: 'bd-brief-internal', user: me.id, path: url.pathname.slice(0, 100), error: (e as Error)?.name ?? 'error' }));
    return json(500, { error: 'internal' });
  }
}

async function routeBdBrief(request: Request, env: Env, ctx: ExecutionContextLike, me: UserRow, url: URL, deps: BdBriefDeps): Promise<Response> {
  if (!bdBriefEligible(env, me)) return json(404, { error: 'not-available' });
  if (me.status !== 'approved') return json(403, { error: 'not-approved' });
  const method = request.method.toUpperCase();
  const suffix = url.pathname.startsWith(BD_BRIEF_API_PREFIX) ? url.pathname.slice(BD_BRIEF_API_PREFIX.length) : '';
  const now = deps.now ?? Date.now;
  const ids = deps.ids ?? defaultIds;

  if (suffix === '/discovery-briefs') {
    if (method !== 'GET') return json(405, { error: 'method-not-allowed' }, { Allow: 'GET' });
    const records = await repo.listDiscoveryBriefs(env.DB, me.id);
    return json(200, { briefs: records.map(b => ({ ...toSummary(b), title: b.discovery!.title })) });
  }

  if (suffix === '/briefs') {
    if (method === 'GET') return listBriefs(env, me, url);
    if (method === 'POST') return createBriefRoute(request, env, me, now, ids);
    return json(405, { error: 'method-not-allowed' }, { Allow: 'GET, POST' });
  }
  const item = /^\/briefs\/([^/]+)$/.exec(suffix);
  if (item) {
    if (!ID_RE.test(item[1])) return json(404, { error: 'not-found' });
    if (method === 'GET') return getBriefRoute(env, me, item[1]);
    if (method === 'PATCH') return patchBriefRoute(request, env, me, item[1], now);
    if (method === 'DELETE') return deleteBriefRoute(env, ctx, me, item[1], now);
    return json(405, { error: 'method-not-allowed' }, { Allow: 'GET, PATCH, DELETE' });
  }
  const sub = /^\/briefs\/([^/]+)\/(notes|generate)$/.exec(suffix);
  if (sub && ID_RE.test(sub[1])) {
    if (method !== 'POST') return json(405, { error: 'method-not-allowed' }, { Allow: 'POST' });
    return sub[2] === 'notes' ? addNoteRoute(request, env, me, sub[1], now, ids) : generateRoute(request, env, ctx, me, sub[1], now, ids, deps);
  }
  return json(404, { error: 'not-found' });
}

/* ---------- body reading and validation ---------- */

type BodyResult = { ok: true; body: unknown } | { ok: false; res: Response };

async function readJsonBody(request: Request): Promise<BodyResult> {
  if (!JSON_RE.test(request.headers.get('content-type') ?? '')) {
    return { ok: false, res: json(415, { error: 'invalid-request', message: 'Content-Type must be application/json' }) };
  }
  const raw = await readBodyLimited(request, MAX_BODY_BYTES);
  if (!raw) return { ok: false, res: json(413, { error: 'limit-exceeded', message: `body larger than ${MAX_BODY_BYTES} bytes` }) };
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(raw)) };
  } catch {
    return { ok: false, res: json(400, { error: 'invalid-request', message: 'body is not valid JSON' }) };
  }
}

const invalid = (issues: readonly string[]): Response => json(400, { error: 'invalid-request', message: issues.join('; ') });

/* ---------- GET /briefs?sourceKey=... ---------- */

async function listBriefs(env: Env, me: UserRow, url: URL): Promise<Response> {
  const sourceKey = url.searchParams.get('sourceKey')?.trim();
  if (!sourceKey) return invalid(['sourceKey is required']);
  const kind = url.searchParams.get('sourceKind') ?? 'browser-session';
  if (kind !== 'browser-session' && kind !== 'discovery') return invalid(['invalid sourceKind']);
  const brief = await repo.findActiveBySource(env.DB, me.id, kind, sourceKey);
  return json(200, { brief: brief ? toSummary(brief) : null });
}

function toSummary(b: BriefRecord): Record<string, unknown> {
  return { id: b.id, sourceKind: b.sourceKind, sourceKey: b.sourceKey, version: b.version, lang: b.lang, snapshotFingerprint: b.snapshotFingerprint, updatedAt: b.updatedAt };
}

/* ---------- POST /briefs ---------- */

async function createBriefRoute(request: Request, env: Env, me: UserRow, now: () => number, ids: IdFactory): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.res;
  const checked = validateCreateBriefRequest(body.body);
  if (!checked.ok) return invalid(checked.issues);
  const value = checked.value;
  // create-if-absent: an existing brief for this owner+source is returned unchanged (200 for both, documented above)
  const defaults = { en: 'First customer meeting', ko: '첫 고객 미팅', zh: '首次客户会议' };
  try {
    const brief = await repo.createBrief(env.DB, me.id, { id: ids.next('brief'), sourceKey: value.sourceKey, lang: value.lang, now: now(),
      ...(value.snapshot.sourceKind === 'discovery' ? { discovery: { title: value.title?.trim() || defaults[value.lang], snapshot: value.snapshot } } : {}) });
    return json(200, { brief });
  } catch (error) {
    if (error instanceof repo.DiscoveryBriefLimitError) return json(429, { error: 'limit-exceeded', message: 'Delete an unused discovery brief before creating another.' });
    throw error;
  }
}

/* ---------- GET /briefs/:id ---------- */

async function getBriefRoute(env: Env, me: UserRow, briefId: string): Promise<Response> {
  const payload = await repo.getPayload(env.DB, me.id, briefId);
  return payload ? json(200, payload) : json(404, { error: 'not-found' });
}

/* ---------- PATCH /briefs/:id ---------- */

/** Ids a stored evidence JSON allows: plain strings and { id } / { sourceId } / { sourceIds } items. */
function storedEvidenceIds(ev: unknown): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      out.add(v);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.id === 'string') out.add(o.id);
      if (typeof o.sourceId === 'string') out.add(o.sourceId);
      if (Array.isArray(o.sourceIds)) for (const x of o.sourceIds) if (typeof x === 'string') out.add(x);
    }
  };
  walk(ev);
  return out;
}

/** The source ids the patched content actually uses: stored inline on the new versions row so pruning stays safe. */
function contentSourceIds(content: BriefContent): string[] {
  const out = new Set<string>();
  const items = [content.opportunity, ...content.valuePoints, ...content.stakeholders, ...content.questions, ...content.concerns, ...(content.nextEngagement ? [content.nextEngagement] : [])];
  for (const it of items) for (const s of it.sourceIds) out.add(s);
  for (const q of content.questions) if (q.answer?.noteId) out.add(q.answer.noteId);
  return [...out];
}

async function patchBriefRoute(request: Request, env: Env, me: UserRow, briefId: string, now: () => number): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.res;
  const brief = await repo.getBrief(env.DB, me.id, briefId);
  if (!brief) return json(404, { error: 'not-found' });
  // the allowed evidence set: this brief's notes, the evidence recorded on the target (newest) version, and the
  // reserved whole-snapshot ids. Unknown sourceIds in the content are rejected by the validator as invalid-request.
  const [notes, stored] = await Promise.all([repo.listNotes(env.DB, me.id, briefId), repo.latestVersionEvidence(env.DB, me.id, briefId)]);
  const evidence = new Set<string>([EVIDENCE_OBJECTIVE, EVIDENCE_DESIGN, EVIDENCE_PRICING]);
  for (const n of notes) evidence.add(n.id);
  for (const id of storedEvidenceIds(stored)) evidence.add(id);
  const checked = validatePatchRequest(body.body, evidence);
  if (!checked.ok) return invalid(checked.issues);
  const p = checked.value;
  const saved = await repo.saveVersion(env.DB, me.id, briefId, p.expectedVersion, p.content, p.origin, {
    snapshotFingerprint: p.snapshotFingerprint,
    sourceRevision: p.sourceRevision,
    evidence: contentSourceIds(p.content),
    now: now(),
  });
  if (!saved.ok) return json(409, { error: 'version-conflict', currentVersion: saved.currentVersion });
  const updated = await repo.getBrief(env.DB, me.id, briefId);
  return updated ? json(200, { brief: updated }) : json(404, { error: 'not-found' });
}

/* ---------- POST /briefs/:id/notes ---------- */

async function addNoteRoute(request: Request, env: Env, me: UserRow, briefId: string, now: () => number, ids: IdFactory): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.res;
  const checked = validateAddNoteRequest(body.body);
  if (!checked.ok) return invalid(checked.issues);
  const n = checked.value;
  if ([...n.text].length > LIMITS.noteChars) return json(400, { error: 'invalid-request', message: `note text exceeds ${LIMITS.noteChars} characters` });
  const res = await repo.addNote(env.DB, me.id, briefId, { id: ids.next('note'), requestId: n.requestId, text: n.text, meetingDate: n.meetingDate, source: n.source, now: now() });
  if (!res.ok) return json(res.error === 'not-found' ? 404 : 409, { error: res.error });
  return json(200, { note: res.note, deduplicated: res.deduplicated });
}

/* ---------- POST /briefs/:id/generate ---------- */

/**
 * review-notes works against the STORED brief: validateGenerateRequest forbids a client-supplied snapshot there (it
 * could smuggle unreviewed evidence in), but the engine's GenerateInput.snapshot is non-nullable, so the route
 * synthesizes a minimal server-side snapshot from the brief row. Its evidence set is then exactly the selected
 * notes plus the reserved pricing-status id — nothing a client can inject.
 */
function reviewSnapshot(brief: BriefRecord, lang: BriefRecord['lang'], capturedAt: number): BriefSnapshot {
  return {
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    sourceKind: brief.sourceKind,
    sourceKey: brief.sourceKey,
    sourceRevision: brief.sourceRevision,
    suppliedBy: 'signed-in-user',
    capturedAt,
    lang,
    objective: null,
    statements: [],
    design: null,
    pricing: { status: 'missing', currency: null, monthlyUsd: null, oneTimeUsd: null, source: null },
  };
}

async function generateRoute(request: Request, env: Env, ctx: ExecutionContextLike, me: UserRow, briefId: string, now: () => number, ids: IdFactory, deps: BdBriefDeps): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) return body.res;
  const checked = validateGenerateRequest(body.body);
  if (!checked.ok) return invalid(checked.issues);
  const g = checked.value;
  const brief = await repo.getBrief(env.DB, me.id, briefId);
  if (!brief) return json(404, { error: 'not-found' });

  if (g.snapshot && brief.sourceKind === 'discovery' && (!brief.discovery || snapshotFingerprint(g.snapshot) !== snapshotFingerprint(brief.discovery.snapshot))) {
    return invalid(['discovery generation must use this meeting\'s saved context']);
  }

  const t = now();
  const deadlineMs = bdBriefDeadlineMs(env);
  ctx.waitUntil(repo.expireStaleRequests(env.DB, t, deadlineMs + 60_000).catch(() => undefined));

  // Cheap fast path only (feature daily quota, plan §8; never the platform's turn counters): it saves the payload
  // hashing when the day is already spent, but the RACE-FREE gate is the conditional INSERT in repo.claimRequest
  // below — a count-then-insert here could be passed by N parallel requests before any claim lands. Failed
  // generations consume quota too (every claim counts): deliberate anti-abuse, not an oversight.
  const d = new Date(t);
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const cap = bdBriefGenerationsPerUserDay(env);
  // Replaying an already-paid request remains available at the daily cap. Its
  // payload hash and state still pass the atomic repository replay checks below.
  if ((await repo.countGenerationsToday(env.DB, me.id, dayStart)) >= cap &&
      !(await repo.findRequest(env.DB, me.id, briefId, g.requestId))) {
    return json(429, { error: 'limit-exceeded', message: `daily brief-generation limit (${cap}) reached` });
  }
  if (g.expectedVersion !== brief.version) return json(409, { error: 'version-conflict', currentVersion: brief.version });
  // the validator guarantees a snapshot for initial/regenerate and forbids one for review-notes
  const snapshot = g.snapshot ?? reviewSnapshot(brief, g.lang, t);

  let notes: BriefNote[] = [];
  if (g.mode === 'review-notes') {
    // the change text is authored against THIS brief's content, so a different lang would mix languages in one brief
    if (g.lang !== brief.lang) return json(400, { error: 'invalid-request', message: `review-notes lang must match the brief lang (${brief.lang})` });
    const wanted = [...new Set(g.noteIds ?? [])];
    if (!wanted.length) return json(400, { error: 'invalid-request', message: 'noteIds is required for review-notes' });
    notes = await repo.getNotesByIds(env.DB, me.id, briefId, wanted);
    // every note must belong to this owner's brief
    if (notes.length !== wanted.length) return json(400, { error: 'invalid-request', message: 'unknown note id' });
  }

  // canonicalJson (evidence.ts) keeps the payload hash stable across rebuilt-but-equal requests
  const payloadHash = await sha256Hex(
    canonicalJson({ mode: g.mode, expectedVersion: g.expectedVersion, lang: g.lang, snapshot: g.snapshot, noteIds: g.mode === 'review-notes' ? [...new Set(g.noteIds ?? [])].sort() : null }),
  );
  const claim = await repo.claimRequest(
    env.DB,
    me.id,
    briefId,
    {
      id: ids.next('bdr'),
      requestId: g.requestId,
      payloadHash,
      versionBase: g.expectedVersion,
      now: t,
      expiresAt: t + deadlineMs + 60_000,
    },
    // the atomic gate: daily quota AND bounded concurrency (plan §5/§8), enforced inside the claim's INSERT
    { dayStart, perDay: cap, maxConcurrent: LIMITS.maxConcurrentGenerations },
  );
  if (claim.state === 'conflict') return json(409, { error: 'request-conflict' });
  if (claim.state === 'limit') return json(429, { error: 'limit-exceeded', message: 'brief-generation limit reached: daily quota spent or another generation is in progress' });
  if (claim.state === 'existing') {
    const row = claim.row;
    if (row.state === 'completed') {
      // a corrupt stored candidate is the only case without a reusable result; fail closed
      return row.candidate ? json(200, { state: 'completed', candidate: row.candidate, usage: row.usage }) : json(500, { error: 'internal' });
    }
    if (row.state === 'in-progress' && row.expiresAt > t) return json(200, { state: 'in-progress' });
    // an expired lease is booked as a timeout before refusing the replay
    if (row.state === 'in-progress') await repo.failRequest(env.DB, me.id, briefId, g.requestId, 'timeout', null, t);
    return json(409, { error: 'request-conflict', message: 'a failed generation cannot be retried with the same requestId; use a new requestId' });
  }

  // The response IS the candidate, so the engine runs inline (ctx.waitUntil would outlive the response). The
  // deadline chains to request.signal: a disconnected browser stops the paid call too.
  const ac = new AbortController();
  const onAbort = (): void => ac.abort();
  request.signal?.addEventListener('abort', onAbort);
  if (request.signal?.aborted) ac.abort();
  const timer = setTimeout(onAbort, deadlineMs);
  let outcome: EngineOutcome;
  try {
    const engine = deps.engine ?? generateBrief;
    outcome = await engine(
      { mode: g.mode, lang: g.lang, snapshot, base: brief.version === 0 ? null : brief, notes },
      { signal: ac.signal, deadlineMs },
      { model: createBdBriefModel(env, deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}), clock: { now }, ids },
    );
  } catch {
    // the engine or the model adapter threw (ModelUnavailableError, provider detail): release the lease and answer
    // structured; the exception text never goes on the wire or into the log
    await repo.failRequest(env.DB, me.id, briefId, g.requestId, 'model', null, t).catch(() => undefined);
    return json(502, { error: 'generation-failed', reason: 'model' });
  } finally {
    clearTimeout(timer);
    request.signal?.removeEventListener('abort', onAbort);
  }
  if (outcome.ok) {
    const candidate: BriefCandidate = outcome.result.candidate;
    await repo.completeRequest(env.DB, me.id, briefId, g.requestId, candidate, outcome.result.usage, t);
    return json(200, { state: 'completed', candidate, usage: outcome.result.usage });
  }
  await repo.failRequest(env.DB, me.id, briefId, g.requestId, outcome.reason, outcome.partialUsage, t);
  const status = outcome.reason === 'timeout' ? 504 : outcome.reason === 'model' ? 502 : 422;
  return json(status, { error: 'generation-failed', reason: outcome.reason });
}

/* ---------- DELETE /briefs/:id ---------- */

async function deleteBriefRoute(env: Env, ctx: ExecutionContextLike, me: UserRow, briefId: string, now: () => number): Promise<Response> {
  ctx.waitUntil(repo.expireStaleRequests(env.DB, now(), bdBriefDeadlineMs(env) + 60_000).catch(() => undefined));
  const deleted = await repo.deleteBrief(env.DB, me.id, briefId);
  return deleted ? new Response(null, { status: 204 }) : json(404, { error: 'not-found' });
}
