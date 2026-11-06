// Every D1 query of the BD brief module. Repository style like src/db.ts, with one hard rule (plan §7): every
// function takes the authenticated owner and EVERY query includes the owner, so another owner's ids read as
// not-found and can never be updated or deleted. JSON columns are parsed defensively: a corrupt row projects to
// null and is treated as not-found; the repository never throws over bad stored JSON.
import type { D1Database } from '../../env.ts';
import type {
  BriefCandidate,
  BriefContent,
  BriefNote,
  BriefPayload,
  BriefRecord,
  BriefSourceKind,
  BriefVersionMeta,
  Lang,
  ModelUsage,
  VersionOrigin,
} from '../../../../../packages/bd-brief/src/types.ts';
import { BD_BRIEF_SCHEMA_VERSION, LIMITS, makeEmptyContent } from '../../../../../packages/bd-brief/src/types.ts';

/* ---------- row shapes (bd_ tables, migration 0011) ---------- */

interface BriefRow {
  id: string;
  owner_id: string;
  source_kind: string;
  source_key: string;
  schema_version: number;
  lang: string;
  version: number;
  content: string;
  snapshot_fingerprint: string;
  source_revision: number;
  created_at: number;
  updated_at: number;
}

interface VersionRow {
  version: number;
  origin: string;
  snapshot_fingerprint: string;
  evidence: string;
  saved_at: number;
}

interface NoteRow {
  id: string;
  brief_id: string;
  owner_id: string;
  request_id: string;
  text: string;
  meeting_date: string | null;
  source: string | null;
  saved_at: number;
}

interface RequestDbRow {
  id: string;
  brief_id: string;
  owner_id: string;
  request_id: string;
  payload_hash: string;
  state: string;
  candidate: string | null;
  reason: string | null;
  usage_json: string | null;
  version_base: number;
  created_at: number;
  expires_at: number;
}

/** A bd_brief_requests row projected into the contract, with its JSON columns parsed (null when corrupt). */
export interface RequestRow {
  id: string;
  briefId: string;
  ownerId: string;
  requestId: string;
  payloadHash: string;
  state: 'in-progress' | 'completed' | 'failed';
  candidate: BriefCandidate | null;
  reason: string | null;
  usage: ModelUsage | null;
  versionBase: number;
  createdAt: number;
  expiresAt: number;
}

function parseJson<T>(s: string | null): T | null {
  if (s === null) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

const isLang = (v: string): v is Lang => v === 'en' || v === 'ko' || v === 'zh';
const isOrigin = (v: string): v is VersionOrigin => v === 'initial' || v === 'generated' || v === 'edit' || v === 'notes-review';
const isRequestState = (v: string): v is RequestRow['state'] => v === 'in-progress' || v === 'completed' || v === 'failed';

/** The bd_briefs row as the contract's BriefRecord; null when the row is missing or its content JSON is corrupt. */
function toBrief(row: BriefRow): BriefRecord | null {
  const content = parseJson<BriefContent>(row.content);
  if (!content || !isLang(row.lang) || row.source_kind !== 'browser-session') return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    sourceKind: row.source_kind as BriefSourceKind,
    sourceKey: row.source_key,
    schemaVersion: BD_BRIEF_SCHEMA_VERSION,
    lang: row.lang,
    version: row.version,
    content,
    snapshotFingerprint: row.snapshot_fingerprint,
    sourceRevision: row.source_revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNote(row: NoteRow): BriefNote {
  return {
    id: row.id,
    briefId: row.brief_id,
    requestId: row.request_id,
    text: row.text,
    meetingDate: row.meeting_date,
    source: row.source,
    savedAt: row.saved_at,
  };
}

function toRequest(row: RequestDbRow): RequestRow | null {
  if (!isRequestState(row.state)) return null;
  return {
    id: row.id,
    briefId: row.brief_id,
    ownerId: row.owner_id,
    requestId: row.request_id,
    payloadHash: row.payload_hash,
    state: row.state,
    candidate: parseJson<BriefCandidate>(row.candidate),
    reason: row.reason,
    usage: parseJson<ModelUsage>(row.usage_json),
    versionBase: row.version_base,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

const BRIEF_COLS = 'id, owner_id, source_kind, source_key, schema_version, lang, version, content, snapshot_fingerprint, source_revision, created_at, updated_at';
const NOTE_COLS = 'id, brief_id, owner_id, request_id, text, meeting_date, source, saved_at';
const REQUEST_COLS = 'id, brief_id, owner_id, request_id, payload_hash, state, candidate, reason, usage_json, version_base, created_at, expires_at';

/* ---------- briefs ---------- */

export async function findActiveBySource(db: D1Database, ownerId: string, sourceKind: BriefSourceKind, sourceKey: string): Promise<BriefRecord | null> {
  const row = await db.prepare(`SELECT ${BRIEF_COLS} FROM bd_briefs WHERE owner_id = ? AND source_kind = ? AND source_key = ?`).bind(ownerId, sourceKind, sourceKey).first<BriefRow>();
  return row ? toBrief(row) : null;
}

export async function getBrief(db: D1Database, ownerId: string, briefId: string): Promise<BriefRecord | null> {
  const row = await db.prepare(`SELECT ${BRIEF_COLS} FROM bd_briefs WHERE id = ? AND owner_id = ?`).bind(briefId, ownerId).first<BriefRow>();
  return row ? toBrief(row) : null;
}

/** The brief with its bounded version history (newest first) and its notes: what GET /briefs/:id returns. */
export async function getPayload(db: D1Database, ownerId: string, briefId: string): Promise<BriefPayload | null> {
  const brief = await getBrief(db, ownerId, briefId);
  if (!brief) return null;
  const [versions, notes] = await Promise.all([listVersions(db, ownerId, briefId), listNotes(db, ownerId, briefId)]);
  return { brief, versions, notes };
}

async function listVersions(db: D1Database, ownerId: string, briefId: string): Promise<BriefVersionMeta[]> {
  const r = await db
    .prepare(`SELECT version, origin, snapshot_fingerprint, saved_at FROM bd_brief_versions v
       WHERE brief_id = ? AND EXISTS (SELECT 1 FROM bd_briefs b WHERE b.id = v.brief_id AND b.owner_id = ?)
       ORDER BY version DESC LIMIT ?`)
    .bind(briefId, ownerId, LIMITS.acceptedVersions)
    .all<VersionRow>();
  return r.results.filter((v) => isOrigin(v.origin)).map((v) => ({ version: v.version, origin: v.origin as VersionOrigin, snapshotFingerprint: v.snapshot_fingerprint, savedAt: v.saved_at }));
}

/** The evidence JSON stored on the newest retained version (the target of a patch); [] when none or corrupt. */
export async function latestVersionEvidence(db: D1Database, ownerId: string, briefId: string): Promise<unknown[]> {
  const r = await db
    .prepare(`SELECT evidence FROM bd_brief_versions v
       WHERE brief_id = ? AND EXISTS (SELECT 1 FROM bd_briefs b WHERE b.id = v.brief_id AND b.owner_id = ?)
       ORDER BY version DESC LIMIT 1`)
    .bind(briefId, ownerId)
    .first<{ evidence: string }>();
  const parsed = parseJson<unknown[]>(r?.evidence ?? null);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Create-if-absent: a unique-constraint violation on (owner_id, source_kind, source_key) means the brief already
 * exists, so the existing row is returned instead of an error (two browser tabs racing both get the same brief).
 */
export async function createBrief(db: D1Database, ownerId: string, init: { id: string; sourceKey: string; lang: Lang; now: number }): Promise<BriefRecord> {
  try {
    await db
      .prepare(
        `INSERT INTO bd_briefs (id, owner_id, source_kind, source_key, schema_version, lang, version, content, snapshot_fingerprint, source_revision, created_at, updated_at)
         VALUES (?, ?, 'browser-session', ?, ?, ?, 0, ?, '', 0, ?, ?)`,
      )
      .bind(init.id, ownerId, init.sourceKey, BD_BRIEF_SCHEMA_VERSION, init.lang, JSON.stringify(makeEmptyContent()), init.now, init.now)
      .run();
  } catch {
    // either the unique source or (astronomically unlikely) the primary key exists: fall back to the stored row
    const existing = await findActiveBySource(db, ownerId, 'browser-session', init.sourceKey);
    if (existing) return existing;
    throw new Error('bd-brief: createBrief failed');
  }
  const made = await getBrief(db, ownerId, init.id);
  if (!made) throw new Error('bd-brief: createBrief lost its row');
  return made;
}

export type SaveVersionResult = { ok: true; version: number } | { ok: false; currentVersion: number };

/**
 * Optimistic concurrency in one batch: the version INSERT and the brief UPDATE are both guarded by
 * `version = expectedVersion`, so a concurrent save cannot be overwritten. On success the history is pruned to the
 * newest LIMITS.acceptedVersions rows; evidence lives inline in each versions row, so pruning never orphans a
 * retained version's claims (plan §7). currentVersion -1 means the brief does not exist for this owner.
 */
export async function saveVersion(
  db: D1Database,
  ownerId: string,
  briefId: string,
  expectedVersion: number,
  content: BriefContent,
  origin: VersionOrigin,
  meta: { snapshotFingerprint: string; sourceRevision: number; evidence: unknown[]; now: number },
): Promise<SaveVersionResult> {
  const current = await db.prepare('SELECT version FROM bd_briefs WHERE id = ? AND owner_id = ?').bind(briefId, ownerId).first<{ version: number }>();
  if (!current) return { ok: false, currentVersion: -1 };
  if (current.version !== expectedVersion) return { ok: false, currentVersion: current.version };
  const next = expectedVersion + 1;
  const contentJson = JSON.stringify(content);
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO bd_brief_versions (brief_id, version, origin, content, snapshot_fingerprint, source_revision, evidence, saved_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ? FROM bd_briefs WHERE id = ? AND owner_id = ? AND version = ?`,
      )
      .bind(briefId, next, origin, contentJson, meta.snapshotFingerprint, meta.sourceRevision, JSON.stringify(meta.evidence), meta.now, briefId, ownerId, expectedVersion),
    db.prepare('UPDATE bd_briefs SET version = ?, content = ?, snapshot_fingerprint = ?, source_revision = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND version = ?')
      .bind(next, contentJson, meta.snapshotFingerprint, meta.sourceRevision, meta.now, briefId, ownerId, expectedVersion),
    db
      .prepare(
        `DELETE FROM bd_brief_versions WHERE brief_id = ? AND version NOT IN
           (SELECT version FROM bd_brief_versions WHERE brief_id = ? ORDER BY version DESC LIMIT ?)`,
      )
      .bind(briefId, briefId, LIMITS.acceptedVersions),
  ]);
  if ((results[1]?.meta.changes ?? 0) !== 1) {
    // a concurrent writer moved the version between the read and the batch: both guarded statements affected 0 rows
    const after = await db.prepare('SELECT version FROM bd_briefs WHERE id = ? AND owner_id = ?').bind(briefId, ownerId).first<{ version: number }>();
    return { ok: false, currentVersion: after?.version ?? -1 };
  }
  return { ok: true, version: next };
}

export async function deleteBrief(db: D1Database, ownerId: string, briefId: string): Promise<boolean> {
  // Versions/notes cascade; the migration trigger scrubs generation payloads but
  // keeps their independent accounting and pending lease until normal expiry.
  const r = await db.prepare('DELETE FROM bd_briefs WHERE id = ? AND owner_id = ?').bind(briefId, ownerId).run();
  return (r.meta.changes ?? 0) === 1;
}

/* ---------- notes ---------- */

export type AddNoteResult = { ok: true; note: BriefNote; deduplicated: boolean } | { ok: false; error: 'not-found' | 'request-conflict' };

/**
 * Saves a meeting note. UNIQUE(brief_id, request_id) is the dedup key: a replayed requestId returns the stored note
 * (deduplicated: true) only when text AND meetingDate AND source are all identical; the same requestId with ANY
 * difference is a request-conflict, so a corrected replay can never silently book the old note.
 */
export async function addNote(
  db: D1Database,
  ownerId: string,
  briefId: string,
  req: { id: string; requestId: string; text: string; meetingDate: string | null; source: string | null; now: number },
): Promise<AddNoteResult> {
  const owned = await db.prepare('SELECT 1 AS x FROM bd_briefs WHERE id = ? AND owner_id = ?').bind(briefId, ownerId).first();
  if (!owned) return { ok: false, error: 'not-found' };
  try {
    await db
      .prepare(`INSERT INTO bd_brief_notes (id, brief_id, owner_id, request_id, text, meeting_date, source, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(req.id, briefId, ownerId, req.requestId, req.text, req.meetingDate, req.source, req.now)
      .run();
  } catch {
    const existing = await db.prepare(`SELECT ${NOTE_COLS} FROM bd_brief_notes WHERE brief_id = ? AND request_id = ? AND owner_id = ?`).bind(briefId, req.requestId, ownerId).first<NoteRow>();
    if (!existing) throw new Error('bd-brief: addNote failed');
    const identical = existing.text === req.text && existing.meeting_date === req.meetingDate && existing.source === req.source;
    return identical ? { ok: true, note: toNote(existing), deduplicated: true } : { ok: false, error: 'request-conflict' };
  }
  return { ok: true, note: { id: req.id, briefId, requestId: req.requestId, text: req.text, meetingDate: req.meetingDate, source: req.source, savedAt: req.now }, deduplicated: false };
}

export async function listNotes(db: D1Database, ownerId: string, briefId: string): Promise<BriefNote[]> {
  const r = await db.prepare(`SELECT ${NOTE_COLS} FROM bd_brief_notes WHERE brief_id = ? AND owner_id = ? ORDER BY saved_at, id`).bind(briefId, ownerId).all<NoteRow>();
  return r.results.map(toNote);
}

/** The given notes that belong to this owner's brief; unknown or foreign ids simply do not appear. */
export async function getNotesByIds(db: D1Database, ownerId: string, briefId: string, ids: string[]): Promise<BriefNote[]> {
  if (!ids.length) return [];
  const marks = ids.map(() => '?').join(', ');
  const r = await db.prepare(`SELECT ${NOTE_COLS} FROM bd_brief_notes WHERE brief_id = ? AND owner_id = ? AND id IN (${marks})`).bind(briefId, ownerId, ...ids).all<NoteRow>();
  return r.results.map(toNote);
}

/* ---------- generation requests: idempotency, lease and feature-only usage accounting ---------- */

export type ClaimResult = { state: 'claimed' } | { state: 'existing'; row: RequestRow } | { state: 'conflict' } | { state: 'limit' };

/**
 * Stores the claim BEFORE any model call (plan §7). The same requestId with the same payload hash returns the
 * existing row (reuse or in-progress); the same requestId with a different payload is a conflict.
 *
 * The INSERT itself is the atomic quota gate (plan §5/§8): a single conditional statement inserts only while BOTH
 * the owner's claims since dayStart are below perDay AND the owner's live in-progress leases (expires_at > now, so
 * an expired lease of a crashed isolate does not block) are below maxConcurrent. A count-then-insert in the route
 * would race: N parallel requests could all pass the count before any claim lands. Limits arrive as parameters —
 * the repository never reads env. 0 rows changed => 'limit'.
 */
export const BD_BRIEF_MAX_GLOBAL_CONCURRENT = 4;

export async function claimRequest(
  db: D1Database,
  ownerId: string,
  briefId: string,
  req: { id: string; requestId: string; payloadHash: string; versionBase: number; now: number; expiresAt: number },
  limits: { dayStart: number; perDay: number; maxConcurrent: number; maxGlobalConcurrent?: number },
): Promise<ClaimResult> {
  const existing = await findRequest(db, ownerId, briefId, req.requestId);
  if (existing) return existing.payloadHash === req.payloadHash ? { state: 'existing', row: existing } : { state: 'conflict' };
  try {
    const r = await db
      .prepare(
        `INSERT INTO bd_brief_requests (id, brief_id, owner_id, request_id, payload_hash, state, version_base, created_at, expires_at)
         SELECT ?, ?, ?, ?, ?, 'in-progress', ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM bd_briefs WHERE id = ? AND owner_id = ?)
           AND (SELECT COUNT(*) FROM bd_brief_requests WHERE owner_id = ? AND created_at >= ?) < ?
           AND (SELECT COUNT(*) FROM bd_brief_requests WHERE owner_id = ? AND state = 'in-progress' AND expires_at > ?) < ?
           AND (SELECT COUNT(*) FROM bd_brief_requests WHERE state = 'in-progress' AND expires_at > ?) < ?`,
      )
      .bind(
        req.id, briefId, ownerId, req.requestId, req.payloadHash, req.versionBase, req.now, req.expiresAt,
        briefId, ownerId,
        ownerId, limits.dayStart, limits.perDay,
        ownerId, req.now, limits.maxConcurrent,
        req.now, limits.maxGlobalConcurrent ?? BD_BRIEF_MAX_GLOBAL_CONCURRENT,
      )
      .run();
    if ((r.meta.changes ?? 0) === 0) return { state: 'limit' };
  } catch {
    const raced = await findRequest(db, ownerId, briefId, req.requestId);
    if (raced) return raced.payloadHash === req.payloadHash ? { state: 'existing', row: raced } : { state: 'conflict' };
    throw new Error('bd-brief: claimRequest failed');
  }
  return { state: 'claimed' };
}

export async function findRequest(db: D1Database, ownerId: string, briefId: string, requestId: string): Promise<RequestRow | null> {
  const row = await db.prepare(`SELECT ${REQUEST_COLS} FROM bd_brief_requests WHERE brief_id = ? AND request_id = ? AND owner_id = ?`).bind(briefId, requestId, ownerId).first<RequestDbRow>();
  return row ? toRequest(row) : null;
}

const retentionMs = (): number => LIMITS.requestRetentionDays * 86_400_000;

/** Books the completed candidate and its usage on the claim row (feature accounting; never the platform's usage table). */
export async function completeRequest(db: D1Database, ownerId: string, briefId: string, requestId: string, candidate: BriefCandidate, usage: ModelUsage | null, now: number): Promise<boolean> {
  const r = await db
    .prepare(`UPDATE bd_brief_requests SET state = 'completed',
      candidate = CASE WHEN EXISTS (SELECT 1 FROM bd_briefs WHERE id = ? AND owner_id = ?) THEN ? ELSE NULL END,
      usage_json = ?, expires_at = ? WHERE brief_id = ? AND request_id = ? AND owner_id = ? AND state = 'in-progress'`)
    .bind(briefId, ownerId, JSON.stringify(candidate), usage ? JSON.stringify(usage) : null, now + retentionMs(), briefId, requestId, ownerId)
    .run();
  return (r.meta.changes ?? 0) === 1;
}

/** Releases the lease after a failure: the row stays as 'failed' so a same-id retry is refused (a retry uses a NEW requestId). */
export async function failRequest(db: D1Database, ownerId: string, briefId: string, requestId: string, reason: string, usage: ModelUsage | null, now: number): Promise<boolean> {
  const r = await db
    .prepare(`UPDATE bd_brief_requests SET state = 'failed', reason = ?, usage_json = COALESCE(?, usage_json), expires_at = ? WHERE brief_id = ? AND request_id = ? AND owner_id = ? AND state = 'in-progress'`)
    .bind(reason, usage ? JSON.stringify(usage) : null, now + retentionMs(), briefId, requestId, ownerId)
    .run();
  return (r.meta.changes ?? 0) === 1;
}

/**
 * Generations claimed since the UTC-day start: the feature's own daily quota, separate from chat turns. FAILED
 * generations consume quota too (every claim counts) — deliberate anti-abuse, so retry loops against a failing
 * model cannot spend unbounded provider calls for free.
 */
export async function countGenerationsToday(db: D1Database, ownerId: string, dayStartMs: number): Promise<number> {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM bd_brief_requests WHERE owner_id = ? AND created_at >= ?').bind(ownerId, dayStartMs).first<{ n: number }>();
  return Number(r?.n ?? 0);
}

/**
 * Opportunistic pruning (called from routes via ctx.waitUntil, never owner-scoped because it is housekeeping):
 * in-progress claims older than the deadline plus slack become failed 'timeout' (a crashed isolate releases its
 * lease), and rows past expires_at are deleted. Returns how many rows changed.
 */
export async function expireStaleRequests(db: D1Database, now: number, staleMs: number = LIMITS.generationDeadlineMs + 60_000): Promise<number> {
  const [expired, deleted] = await db.batch([
    db.prepare(`UPDATE bd_brief_requests SET state = 'failed', reason = 'timeout', expires_at = ?
      WHERE state = 'in-progress' AND (created_at < ? OR expires_at <= ?)`)
      .bind(now + retentionMs(), now - staleMs, now),
    db.prepare("DELETE FROM bd_brief_requests WHERE state != 'in-progress' AND expires_at < ?").bind(now),
  ]);
  return (expired.meta.changes ?? 0) + (deleted.meta.changes ?? 0);
}
