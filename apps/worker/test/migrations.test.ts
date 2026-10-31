// 0002_availability.sql upgrades the database of the earlier build (one sign-up and one code per address): accounts and
// sessions survive, the in-flight sign-ups and codes are dropped, and the new tables take several flows per address.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sql = (name: string): string => readFileSync(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8');

describe('migration 0002', () => {
  test('keeps accounts and sessions, drops sign-ups and codes in flight, and allows one row per browser flow', () => {
    const d = new DatabaseSync(':memory:');
    d.exec('PRAGMA foreign_keys = ON;');
    d.exec(sql('0001_init.sql'));
    d.exec(`INSERT INTO users (id, email, name, pw_hash, pw_salt, pw_version, pw_changed_at, created_at) VALUES ('u_1', 'a@example.com', 'A', 'h', 's', 1, 1, 1)`);
    d.exec(`INSERT INTO sessions (id_hash, user_id, created_at, expires_at) VALUES ('x', 'u_1', 1, 2)`);
    d.exec(`INSERT INTO signups (email, name, pw_hash, pw_salt, pw_version, flow_hash, created_at) VALUES ('b@example.com', 'B', 'h', 's', 1, 'f1', 1)`);
    d.exec(`INSERT INTO codes (email, purpose, code_hash, flow_hash, expires_at, sent_at) VALUES ('b@example.com', 'verify', 'c', 'f1', 9, 1)`);

    d.exec(sql('0002_availability.sql'));

    assert.equal((d.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n, 1);
    assert.equal((d.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n, 1);
    assert.equal((d.prepare('SELECT COUNT(*) AS n FROM signups').get() as { n: number }).n, 0);
    assert.equal((d.prepare('SELECT COUNT(*) AS n FROM codes').get() as { n: number }).n, 0);
    for (const f of ['f1', 'f2']) {
      d.exec(`INSERT INTO signups (email, flow_hash, name, pw_hash, pw_salt, pw_version, created_at) VALUES ('b@example.com', '${f}', 'B', 'h', 's', 1, 1)`);
      d.exec(`INSERT INTO codes (email, purpose, flow_hash, code_hash, expires_at, sent_at) VALUES ('b@example.com', 'verify', '${f}', 'c', 9, 1)`);
    }
    assert.throws(() => d.exec(`INSERT INTO codes (email, purpose, flow_hash, code_hash, expires_at, sent_at) VALUES ('b@example.com', 'verify', 'f1', 'c', 9, 1)`), 'one row per flow');
    d.exec(`INSERT INTO decoy (k, at) VALUES ('d0', 1)`);
  });

  test('on an empty database it runs right after 0001', () => {
    const d = new DatabaseSync(':memory:');
    d.exec(sql('0001_init.sql'));
    d.exec(sql('0002_availability.sql'));
    const tables = (d.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
    assert.ok(['audit', 'codes', 'decoy', 'inflight', 'lockouts', 'rate', 'sessions', 'signups', 'usage', 'users'].every((t) => tables.includes(t)));
  });
});
