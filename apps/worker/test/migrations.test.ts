// 0002_availability.sql upgrades the database of the earlier build (one sign-up and one code per address): accounts and
// sessions survive, the in-flight sign-ups and codes are dropped, and the new tables take several flows per address.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sql = (name: string): string => readFileSync(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), 'utf8');

test('0004 preserves roles, sessions, usage and active requests while widening the role constraint', () => {
  const d = new DatabaseSync(':memory:');
  d.exec('PRAGMA foreign_keys = ON;');
  for (const name of ['0001_init.sql', '0002_availability.sql', '0003_rescue_caps.sql']) d.exec(sql(name));
  d.exec(`INSERT INTO users (id,email,pw_hash,pw_salt,pw_version,pw_changed_at,role,created_at) VALUES
    ('a','a@example.com','h','s',1,1,'admin',1), ('b','b@example.com','h','s',1,1,'user',1);
    INSERT INTO sessions VALUES ('token','b',1,3,NULL);
    INSERT INTO inflight VALUES ('b','req',1);
    INSERT INTO usage (user_id,day,turns) VALUES ('b','2026-11-04',7), ('*','2026-11-04',0);`);
  d.exec(sql('0004_verified_role.sql'));
  assert.deepEqual(d.prepare('SELECT role FROM users ORDER BY id').all().map(u => u.role), ['admin', 'user']);
  d.exec("UPDATE users SET role = 'verified' WHERE id = 'b'");
  assert.throws(() => d.exec("UPDATE users SET role = 'invalid' WHERE id = 'b'"), /CHECK/);
  assert.equal(d.prepare('SELECT user_id FROM sessions WHERE id_hash = ?').get('token')?.user_id, 'b');
  assert.equal(d.prepare('SELECT request_id FROM inflight WHERE user_id = ?').get('b')?.request_id, 'req');
  assert.equal(d.prepare('SELECT turns FROM usage WHERE user_id = ?').get('b')?.turns, 7);
  assert.deepEqual(d.prepare('PRAGMA foreign_key_check').all(), []);
  d.exec("DELETE FROM users WHERE id = 'b'");
  assert.deepEqual(d.prepare('SELECT user_id FROM usage').all().map(u => u.user_id), ['*'], 'the usage cleanup trigger still works');
  d.close();
});

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

// 0003_rescue_caps.sql rebuilds `usage` (its foreign key to users would refuse the global '*' row) and adds the rescue columns.
describe('migration 0003', () => {
  const upTo = (n: 1 | 2): DatabaseSync => {
    const d = new DatabaseSync(':memory:');
    d.exec('PRAGMA foreign_keys = ON;');
    d.exec(sql('0001_init.sql'));
    if (n === 2) d.exec(sql('0002_availability.sql'));
    return d;
  };
  const count = (d: DatabaseSync, table: string): number => (d.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

  test('keeps every usage row, starts the new columns at 0, and accepts the global * row', () => {
    const d = upTo(2);
    d.exec(`INSERT INTO users (id, email, name, pw_hash, pw_salt, pw_version, pw_changed_at, created_at) VALUES ('u_1', 'a@example.com', 'A', 'h', 's', 1, 1, 1), ('u_2', 'b@example.com', 'B', 'h', 's', 1, 1, 1)`);
    d.exec(`INSERT INTO usage (user_id, day, turns, est_cost_usd) VALUES ('u_1', '2026-10-30', 5, 0.25), ('u_1', '2026-10-31', 2, 0.5), ('u_2', '2026-10-31', 9, 1.5)`);
    assert.throws(() => d.exec(`INSERT INTO usage (user_id, day) VALUES ('*', '2026-10-31')`), /FOREIGN KEY/, 'before 0003 the global row is refused');

    d.exec(sql('0003_rescue_caps.sql'));

    const rows = d.prepare('SELECT user_id, day, turns, est_cost_usd, rescues, claude_cost_usd FROM usage ORDER BY user_id, day').all() as Array<Record<string, unknown>>;
    assert.deepEqual(rows.map((r) => ({ ...r })), [
      { user_id: 'u_1', day: '2026-10-30', turns: 5, est_cost_usd: 0.25, rescues: 0, claude_cost_usd: 0 },
      { user_id: 'u_1', day: '2026-10-31', turns: 2, est_cost_usd: 0.5, rescues: 0, claude_cost_usd: 0 },
      { user_id: 'u_2', day: '2026-10-31', turns: 9, est_cost_usd: 1.5, rescues: 0, claude_cost_usd: 0 },
    ]);
    d.exec(`INSERT INTO usage (user_id, day, rescues, claude_cost_usd) VALUES ('*', '2026-10-31', 3, 1.25)`);
    assert.deepEqual({ ...(d.prepare(`SELECT turns, est_cost_usd, rescues, claude_cost_usd FROM usage WHERE user_id = '*'`).get() as object) }, { turns: 0, est_cost_usd: 0, rescues: 3, claude_cost_usd: 1.25 });
    assert.throws(() => d.exec(`INSERT INTO usage (user_id, day) VALUES ('*', '2026-10-31')`), /UNIQUE|PRIMARY/, 'still one row per user and day');
    assert.equal(count(d, 'users'), 2);
  });

  test('removing a user still removes their usage (a trigger replaces the cascade), and leaves the global row', () => {
    const d = upTo(2);
    d.exec(`INSERT INTO users (id, email, name, pw_hash, pw_salt, pw_version, pw_changed_at, created_at) VALUES ('u_1', 'a@example.com', 'A', 'h', 's', 1, 1, 1), ('u_2', 'b@example.com', 'B', 'h', 's', 1, 1, 1)`);
    d.exec(sql('0003_rescue_caps.sql'));
    d.exec(`INSERT INTO usage (user_id, day, turns) VALUES ('u_1', '2026-10-31', 1), ('u_2', '2026-10-31', 1), ('*', '2026-10-31', 0)`);
    d.exec(`DELETE FROM users WHERE id = 'u_1'`);
    assert.deepEqual((d.prepare('SELECT user_id FROM usage ORDER BY user_id').all() as Array<{ user_id: string }>).map((r) => r.user_id), ['*', 'u_2']);
  });

  test('runs on an empty database right after 0001 and 0002, and nothing else is touched', () => {
    const d = upTo(2);
    const before = (d.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name != 'usage' ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
    d.exec(sql('0003_rescue_caps.sql'));
    const after = (d.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('usage', 'usage_new') ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
    assert.deepEqual(after, before);
    assert.equal(count(d, 'usage'), 0);
    assert.equal((d.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'usage_new'`).get() as { n: number }).n, 0, 'no leftover table');
    assert.equal(count(d, 'inflight'), 0);
  });
});
