-- alichitect accounts, sessions, usage and audit (Cloudflare D1, SQLite).
-- Apply: npm run d1:migrate:remote (production) or npm run d1:migrate:local (wrangler dev).
-- No secret and no address lives here: the first admins come from the ADMIN_EMAILS var at their first sign-in.
-- Times are milliseconds since the Unix epoch.

CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- 'u_' + 16 random hex characters
  email TEXT NOT NULL UNIQUE,             -- lowercase; Google says it is verified
  google_sub TEXT,                        -- Google's stable account id; another sub for a known email is refused
  name TEXT NOT NULL DEFAULT '',
  picture TEXT,                           -- https://lh3.googleusercontent.com/... only
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  note TEXT,                              -- the access request note, up to 500 characters
  lang TEXT,                              -- en, ko or zh: the language of the emails they get
  created_at INTEGER NOT NULL,
  requested_at INTEGER,                   -- when they pressed Request access; null: signed in, no request yet
  decided_at INTEGER,
  decided_by TEXT,                        -- the deciding admin's email, or 'ADMIN_EMAILS'
  last_seen_at INTEGER
);
CREATE INDEX users_status ON users (status, created_at);
CREATE INDEX users_sub ON users (google_sub);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,               -- SHA-256 (hex) of the session id carried in the signed cookie
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER                      -- set on sign-out and when an admin removes access
);
CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expires ON sessions (expires_at);

CREATE TABLE usage (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day TEXT NOT NULL,                      -- UTC day, YYYY-MM-DD
  turns INTEGER NOT NULL DEFAULT 0,
  est_cost_usd REAL NOT NULL DEFAULT 0,   -- packages/core/src/pricing.ts estimate, summary folds included
  PRIMARY KEY (user_id, day)
);

-- One turn in flight per user. A row older than the turn deadline is stale (an isolate that died mid-turn) and is taken over.
CREATE TABLE inflight (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  started_at INTEGER NOT NULL
);

CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  who TEXT NOT NULL,                      -- the actor's email, or 'system'
  what TEXT NOT NULL,                     -- sign-up, seed-admin, request, approve, deny, revoke, promote, demote, account-mismatch
  target TEXT,                            -- the affected user's email
  detail TEXT                             -- short JSON; never request content or secrets
);
CREATE INDEX audit_at ON audit (at);
