// 0011_bd_briefs.sql is purely additive: the module rule (plan §7/§12) is that bd_-prefixed tables are owner-scoped,
// removable with the feature, and never referenced by existing tables. Verified the way test/migrations.test.ts does:
// real SQLite, migrations applied in order, old data seeded before the new migration runs.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sql = (name: string): string => readFileSync(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8');
const OLD = ['0001_init.sql', '0002_availability.sql', '0003_rescue_caps.sql', '0004_verified_role.sql', '0005_mcp.sql', '0006_release_notices.sql', '0007_mcp_pdf.sql', '0008_mcp_pdf_writer.sql', '0009_session_titles.sql', '0010_business_case.sql'];

function seeded(): DatabaseSync {
  const d = new DatabaseSync(':memory:');
  d.exec('PRAGMA foreign_keys = ON;');
  for (const name of OLD) d.exec(sql(name));
  d.exec(`INSERT INTO users (id,email,pw_hash,pw_salt,pw_version,pw_changed_at,role,created_at) VALUES
    ('u_a','a@example.com','h','s',1,1,'user',1), ('u_b','b@example.com','h','s',1,1,'user',1);`);
  d.exec(sql('0011_bd_briefs.sql'));
  return d;
}

const brief = (id: string, owner: string, sourceKey: string): string =>
  `INSERT INTO bd_briefs (id, owner_id, source_kind, source_key, lang, content, created_at, updated_at) VALUES ('${id}', '${owner}', 'browser-session', '${sourceKey}', 'en', '{}', 1, 1)`;

describe('migration 0011', () => {
  test('is additive: existing tables survive with their data, only bd_ tables are new', () => {
    const d = new DatabaseSync(':memory:');
    d.exec('PRAGMA foreign_keys = ON;');
    for (const name of OLD) d.exec(sql(name));
    d.exec(`INSERT INTO users (id,email,pw_hash,pw_salt,pw_version,pw_changed_at,role,created_at) VALUES ('u_a','a@example.com','h','s',1,1,'user',1);
      INSERT INTO sessions VALUES ('token','u_a',1,3,NULL);
      INSERT INTO usage (user_id,day,turns) VALUES ('u_a','2026-11-05',4);`);
    const tablesBefore = (d.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
    d.exec(sql('0011_bd_briefs.sql'));
    const tablesAfter = (d.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
    assert.deepEqual(tablesAfter.filter((t) => !t.startsWith('bd_')), tablesBefore, 'no existing table added, dropped or rebuilt');
    for (const t of ['bd_briefs', 'bd_brief_versions', 'bd_brief_notes', 'bd_brief_requests']) assert.ok(tablesAfter.includes(t), t);
    assert.equal((d.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }).n, 1);
    assert.equal((d.prepare(`SELECT turns FROM usage WHERE user_id = 'u_a'`).get() as { turns: number }).turns, 4);
    d.close();
  });

  test('one active brief per (owner, source_kind, source_key); other owners may reuse a source key', () => {
    const d = seeded();
    d.exec(brief('br1', 'u_a', 'sess-1'));
    assert.throws(() => d.exec(brief('br2', 'u_a', 'sess-1')), /UNIQUE/);
    d.exec(brief('br3', 'u_b', 'sess-1'));
    d.exec(brief('br4', 'u_a', 'sess-2'));
    assert.throws(() => d.exec(`INSERT INTO bd_briefs (id, owner_id, source_kind, source_key, lang, content, created_at, updated_at) VALUES ('br5', 'u_a', 'mcp-design', 'k', 'en', '{}', 1, 1)`), /CHECK/, 'source_kind is constrained');
    assert.throws(() => d.exec(`INSERT INTO bd_briefs (id, owner_id, source_kind, source_key, lang, content, created_at, updated_at) VALUES ('br6', 'u_a', 'browser-session', 's', 'ja', '{}', 1, 1)`), /CHECK/, 'lang is constrained');
    d.close();
  });

  test('versions and requests enforce their CHECK constraints, notes dedup on (brief_id, request_id)', () => {
    const d = seeded();
    d.exec(brief('br1', 'u_a', 'sess-1'));
    d.exec(`INSERT INTO bd_brief_versions (brief_id, version, origin, content, snapshot_fingerprint, saved_at) VALUES ('br1', 1, 'generated', '{}', 'fp', 1)`);
    assert.throws(() => d.exec(`INSERT INTO bd_brief_versions (brief_id, version, origin, content, snapshot_fingerprint, saved_at) VALUES ('br1', 2, 'rewritten', '{}', 'fp', 1)`), /CHECK/);
    assert.throws(() => d.exec(`INSERT INTO bd_brief_versions (brief_id, version, origin, content, snapshot_fingerprint, saved_at) VALUES ('br1', 1, 'edit', '{}', 'fp', 1)`), /UNIQUE|PRIMARY/, 'one row per version');
    const note = (id: string, reqId: string): string => `INSERT INTO bd_brief_notes (id, brief_id, owner_id, request_id, text, saved_at) VALUES ('${id}', 'br1', 'u_a', '${reqId}', 't', 1)`;
    d.exec(note('n1', 'r1'));
    assert.throws(() => d.exec(note('n2', 'r1')), /UNIQUE/, 'the dedup key');
    d.exec(note('n3', 'r2'));
    const request = (id: string, reqId: string, state: string): string =>
      `INSERT INTO bd_brief_requests (id, brief_id, owner_id, request_id, payload_hash, state, created_at, expires_at) VALUES ('${id}', 'br1', 'u_a', '${reqId}', 'h', '${state}', 1, 2)`;
    d.exec(request('q1', 'g1', 'in-progress'));
    assert.throws(() => d.exec(request('q2', 'g1', 'completed')), /UNIQUE/, 'UNIQUE(brief_id, request_id) is the idempotency key');
    d.close();
  });

  test('the stale-lease expiry scan has its supporting index', () => {
    const d = seeded();
    // expireStaleRequests' UPDATE filters state+created_at across ALL owners; the owner-scoped index cannot serve it
    const names = (d.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'bd_brief_requests' ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
    assert.ok(names.includes('bd_brief_requests_state_created'), names.join(', '));
    d.close();
  });

  test('the request state CHECK holds', () => {
    const d = seeded();
    d.exec(brief('br1', 'u_a', 'sess-1'));
    d.exec(`INSERT INTO bd_brief_requests (id, brief_id, owner_id, request_id, payload_hash, state, created_at, expires_at) VALUES ('q1', 'br1', 'u_a', 'g1', 'h', 'in-progress', 1, 2)`);
    assert.throws(() => d.exec(`INSERT INTO bd_brief_requests (id, brief_id, owner_id, request_id, payload_hash, state, created_at, expires_at) VALUES ('q2', 'br1', 'u_a', 'g2', 'h', 'done', 1, 2)`), /CHECK/);
    assert.throws(() => d.exec(`INSERT INTO bd_brief_requests (id, brief_id, owner_id, request_id, payload_hash, state, created_at, expires_at) VALUES ('q3', 'br1', 'u_a', 'g1', 'h2', 'completed', 1, 2)`), /UNIQUE/, 'same requestId twice');
    d.close();
  });

  test('account deletion cascades all module data; brief deletion keeps scrubbed generation accounting', () => {
    const d = seeded();
    d.exec(brief('br1', 'u_a', 'sess-1'));
    d.exec(brief('br2', 'u_b', 'sess-1'));
    d.exec(`INSERT INTO bd_brief_versions (brief_id, version, origin, content, snapshot_fingerprint, saved_at) VALUES ('br1', 1, 'initial', '{}', 'fp', 1), ('br2', 1, 'initial', '{}', 'fp', 1);
      INSERT INTO bd_brief_notes (id, brief_id, owner_id, request_id, text, saved_at) VALUES ('n1', 'br1', 'u_a', 'r1', 't', 1), ('n2', 'br2', 'u_b', 'r1', 't', 1);
      INSERT INTO bd_brief_requests (id, brief_id, owner_id, request_id, payload_hash, state, created_at, expires_at) VALUES ('q1', 'br1', 'u_a', 'g1', 'h', 'completed', 1, 2), ('q2', 'br2', 'u_b', 'g1', 'h', 'completed', 1, 2);`);
    d.exec(`UPDATE bd_brief_requests SET candidate = 'private customer candidate' WHERE id = 'q2'; DELETE FROM bd_briefs WHERE id = 'br2'`);
    const count = (t: string, w: string): number => (d.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${w}`).get() as { n: number }).n;
    assert.equal(count('bd_brief_versions', `brief_id = 'br2'`), 0);
    assert.equal(count('bd_brief_notes', `brief_id = 'br2'`), 0);
    assert.equal(count('bd_brief_requests', `brief_id = 'br2'`), 1);
    assert.equal((d.prepare("SELECT payload_hash FROM bd_brief_requests WHERE id='q2'").get() as { payload_hash: string }).payload_hash, '');
    assert.equal((d.prepare("SELECT candidate FROM bd_brief_requests WHERE id='q2'").get() as { candidate: string | null }).candidate, null);
    d.exec(`DELETE FROM users WHERE id = 'u_a'`);
    for (const t of ['bd_briefs', 'bd_brief_versions', 'bd_brief_notes']) assert.equal(count(t, '1 = 1'), 0, t);
    assert.equal(count('bd_brief_requests', "owner_id = 'u_a'"), 0);
    assert.equal(count('bd_brief_requests', "owner_id = 'u_b'"), 1);
    d.exec(`DELETE FROM users WHERE id = 'u_b'`);
    for (const t of ['bd_briefs', 'bd_brief_versions', 'bd_brief_notes', 'bd_brief_requests']) assert.equal(count(t, '1 = 1'), 0, t);
    assert.deepEqual(d.prepare('PRAGMA foreign_key_check').all(), []);
    d.close();
  });
});
