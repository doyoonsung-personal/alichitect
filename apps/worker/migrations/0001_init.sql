-- alichitect accounts, sign-ups, email codes, sessions, throttles, usage and audit (Cloudflare D1, SQLite).
-- Apply: npm run d1:migrate:remote (production) or npm run d1:migrate:local (wrangler dev).
-- No secret and no address lives here: the first admins come from the ADMIN_EMAILS var when they confirm their email.
-- Times are milliseconds since the Unix epoch.
--
-- The account flow (src/auth.ts), as on the WonderClip platform: sign up with email, password and name, enter the
-- 6-digit code mailed to the address, wait for an administrator's approval, sign in with email and password.
-- A users row exists only once its address is confirmed; until then the sign-up waits in `signups`.

CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- 'u_' + 16 random hex characters
  email TEXT NOT NULL UNIQUE,             -- lowercase; confirmed with an emailed code before the row exists
  name TEXT NOT NULL DEFAULT '',
  pw_hash TEXT NOT NULL,                  -- base64url of the derived key (src/password.ts)
  pw_salt TEXT NOT NULL,                  -- base64url, 16 random bytes per password
  pw_version INTEGER NOT NULL,            -- hashing scheme; 1 = PBKDF2-SHA256, 100,000 iterations, 32-byte key.
                                          -- A sign-in with an older version re-hashes with the current one.
  pw_changed_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  note TEXT,                              -- why they need access (sign-up form), up to 500 characters
  lang TEXT,                              -- en, ko or zh: the language of the emails they get
  created_at INTEGER NOT NULL,            -- when the email code was entered
  requested_at INTEGER,                   -- when the request reached the admins (= created_at; null for ADMIN_EMAILS)
  decided_at INTEGER,
  decided_by TEXT,                        -- the deciding admin's email, or 'ADMIN_EMAILS'
  last_login_at INTEGER,
  last_seen_at INTEGER
);
CREATE INDEX users_status ON users (status, created_at);

-- A sign-up waiting for its email code. Bound to the browser that submitted it (flow_hash), so a second sign-up for
-- the same address from elsewhere can never attach its password to the first person's code.
CREATE TABLE signups (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  note TEXT,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pw_version INTEGER NOT NULL,
  lang TEXT,
  flow_hash TEXT NOT NULL,                -- SHA-256 (hex) of the nonce in that browser's signed __Host-ab_flow cookie
  created_at INTEGER NOT NULL
);

-- One-time email codes: 6 digits, 15 minutes, 5 tries each (WonderClip's choices). Only an HMAC of the code is kept.
CREATE TABLE codes (
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  code_hash TEXT NOT NULL,                -- HMAC-SHA256 under SESSION_SECRET of purpose, email and code
  flow_hash TEXT NOT NULL,                -- the code works only in the browser whose flow cookie carries this nonce
  expires_at INTEGER NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  PRIMARY KEY (email, purpose)
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,               -- SHA-256 (hex) of the session id carried in the signed cookie
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER                      -- set on sign-out, password reset or change, and when an admin removes access
);
CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expires ON sessions (expires_at);

-- Fixed-window attempt counters (src/throttle.ts): sign-in, sign-up, codes, resends and mails, per email and per IP.
CREATE TABLE rate (
  k TEXT PRIMARY KEY,                     -- rule + ':' + HMAC of the email or IP (never the raw value)
  window_start INTEGER NOT NULL,
  n INTEGER NOT NULL
);

-- Progressive lockouts after repeated failures (wrong password, wrong code), per email and per IP.
CREATE TABLE lockouts (
  k TEXT PRIMARY KEY,                     -- rule + ':' + HMAC of the email, IP or user id
  fails INTEGER NOT NULL,                 -- failures since the last success (reset after a quiet day)
  last_fail_at INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);

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
  what TEXT NOT NULL,                     -- sign-up, seed-admin, password-reset, password-change, approve, deny,
                                          -- revoke, promote, demote
  target TEXT,                            -- the affected user's email
  detail TEXT                             -- short JSON; never request content, passwords, codes or secrets
);
CREATE INDEX audit_at ON audit (at);
