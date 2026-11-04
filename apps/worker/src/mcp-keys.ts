import { randomHex, randomToken, sha256Hex } from './crypto.ts';
import { userById } from './db.ts';
import type { D1Database } from './env.ts';

export type KeyScope = 'read' | 'write';
export interface KeyInfo {
  id: string; name: string; scope: KeyScope; created_at: number; expires_at: number;
  last_used_at: number | null; revoked_at: number | null;
}
export const MAX_ACTIVE_KEYS = 10;
export async function issueKey(db: D1Database, owner: string, name: string, scope: KeyScope, days: number, now: number, issuanceId = randomHex(16)) {
  if (!name.trim() || name.length > 60 || !['read', 'write'].includes(scope) || ![30, 90, 365].includes(days) || !/^[a-f0-9]{32}$/.test(issuanceId)) return null;
  const id = randomHex(8);
  const secret = `ali_mcp_${id}_${randomToken(32)}`;
  const result = await db.prepare(`INSERT INTO mcp_keys(id,user_id,name,digest,scope,created_at,expires_at,issuance_id)
    SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM mcp_keys WHERE user_id=? AND revoked_at IS NULL AND expires_at>?) < ?
    ON CONFLICT(user_id,issuance_id) DO NOTHING`)
    .bind(id, owner, name.trim(), await sha256Hex(secret), scope, now, now + days * 86400000, issuanceId, owner, now, MAX_ACTIVE_KEYS).run();
  return result.meta.changes === 1 ? secret : null;
}
export async function listKeys(db: D1Database, owner: string) {
  return (await db.prepare(`SELECT id,name,scope,created_at,expires_at,last_used_at,revoked_at FROM mcp_keys
    WHERE user_id=? ORDER BY (revoked_at IS NULL AND expires_at>?) DESC, created_at DESC LIMIT 100`).bind(owner, Date.now()).all<KeyInfo>()).results;
}
export async function revokeKey(db: D1Database, owner: string, id: string, now: number) {
  await db.prepare('UPDATE mcp_keys SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL').bind(now, id, owner).run();
}
export async function authenticateKey(request: Request, db: D1Database, now: number) {
  const match = /^Bearer (ali_mcp_[a-f0-9]{16}_[A-Za-z0-9_-]{43})$/i.exec(request.headers.get('Authorization') ?? '');
  if (!match) return null;
  const key = await db.prepare(`SELECT id,user_id,scope,last_used_at FROM mcp_keys WHERE digest=? AND revoked_at IS NULL AND expires_at>?`)
    .bind(await sha256Hex(match[1]), now).first<{ id: string; user_id: string; scope: KeyScope; last_used_at: number | null }>();
  if (!key) return null;
  const user = await userById(db, key.user_id);
  if (user?.status !== 'approved') return null;
  if (!key.last_used_at || now - key.last_used_at > 60000) {
    await db.prepare('UPDATE mcp_keys SET last_used_at=? WHERE id=?').bind(now, key.id).run();
  }
  return { user, scope: key.scope };
}
