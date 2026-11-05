import type { BusinessCaseDocument, BusinessCaseRecord } from '../../../../../packages/business-case/src/types.ts';
import { validateDocument } from '../../../../../packages/business-case/src/engine.ts';
import type { D1Database } from '../../env.ts';
import { randomHex } from '../../crypto.ts';

export const RECORDS_PER_SESSION = 20;
export const RECORDS_PER_USER = 200;
export const MODEL_CALLS_PER_USER_DAY = 10;
export const MODEL_CALLS_PER_DAY = 200;
export const MODEL_CALLS_CONCURRENT = 4;
export const MODEL_LEASE_MS = 35_000;

interface StoredRecord { id: string; created_at: number; document_json: string }

/** Metadata-only cleanup list remains available after the local browser session is gone. */
export async function listRecordSummaries(db: D1Database, userId: string): Promise<Array<{ id: string; sessionId: string; title: string; createdAt: number }>> {
  const rows = await db.prepare(`SELECT id,session_id,created_at,
    CASE WHEN json_valid(document_json) THEN json_extract(document_json,'$.source.title') ELSE '' END AS title
    FROM bc_records WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT ?`)
    .bind(userId, RECORDS_PER_USER).all<{ id: string; session_id: string; created_at: number; title: string | null }>();
  return rows.results.map(row => ({ id: row.id, sessionId: row.session_id, title: row.title ?? '', createdAt: row.created_at }));
}

export async function listRecords(db: D1Database, userId: string, sessionId: string): Promise<BusinessCaseRecord[]> {
  const rows = await db.prepare('SELECT id,created_at,document_json FROM bc_records WHERE user_id=? AND session_id=? ORDER BY created_at DESC,id DESC LIMIT ?')
    .bind(userId, sessionId, RECORDS_PER_SESSION).all<StoredRecord>();
  return rows.results.flatMap(row => {
    try {
      const checked = validateDocument(JSON.parse(row.document_json));
      return checked.ok ? [{ id: row.id, createdAt: row.created_at, document: checked.value }] : [];
    } catch { return []; }
  });
}

/** One SQL statement checks and writes the bounded history, including across tabs. */
export async function saveRecord(db: D1Database, userId: string, document: BusinessCaseDocument, now: number): Promise<BusinessCaseRecord | null> {
  const id = `bc_${randomHex(16)}`;
  const result = await db.prepare(`INSERT INTO bc_records(id,user_id,session_id,created_at,document_json)
    SELECT ?,?,?,?,? WHERE
      (SELECT COUNT(*) FROM bc_records WHERE user_id=? AND session_id=?) < ? AND
      (SELECT COUNT(*) FROM bc_records WHERE user_id=?) < ?`)
    .bind(id, userId, document.source.sessionId, now, JSON.stringify(document), userId, document.source.sessionId,
      RECORDS_PER_SESSION, userId, RECORDS_PER_USER).run();
  return result.meta.changes === 1 ? { id, createdAt: now, document } : null;
}

export async function deleteRecord(db: D1Database, userId: string, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM bc_records WHERE user_id=? AND id=?').bind(userId, id).run();
  return result.meta.changes === 1;
}

export async function reserveModelCall(db: D1Database, userId: string, now: number): Promise<string | null> {
  const id = `bcm_${randomHex(16)}`;
  const dayStart = Math.floor(now / 86_400_000) * 86_400_000;
  // The reservation and both budgets are one atomic statement, so concurrent
  // requests cannot each pass a separate read/check before consuming capacity.
  const result = await db.prepare(`INSERT INTO bc_model_calls(id,user_id,created_at,lease_until,status)
    SELECT ?,?,?,?,'pending' WHERE
      NOT EXISTS (SELECT 1 FROM bc_model_calls WHERE user_id=? AND status='pending' AND lease_until>?) AND
      (SELECT COUNT(*) FROM bc_model_calls WHERE status='pending' AND lease_until>?) < ? AND
      (SELECT COUNT(*) FROM bc_model_calls WHERE user_id=? AND created_at>=?) < ? AND
      (SELECT COUNT(*) FROM bc_model_calls WHERE created_at>=?) < ?`)
    .bind(id, userId, now, now + MODEL_LEASE_MS, userId, now, now, MODEL_CALLS_CONCURRENT, userId, dayStart, MODEL_CALLS_PER_USER_DAY,
      dayStart, MODEL_CALLS_PER_DAY).run();
  return result.meta.changes === 1 ? id : null;
}

export async function finishModelCall(db: D1Database, userId: string, id: string, now: number,
  status: 'ok' | 'error' | 'invalid', costUsd: number | null, estimated: boolean): Promise<void> {
  const cost = costUsd !== null && Number.isFinite(costUsd) && costUsd >= 0 ? costUsd : null;
  await db.prepare('UPDATE bc_model_calls SET completed_at=?,lease_until=0,status=?,cost_usd=?,cost_estimated=? WHERE user_id=? AND id=? AND status=\'pending\'')
    .bind(now, status, cost, cost === null || estimated ? 1 : 0, userId, id).run();
}
