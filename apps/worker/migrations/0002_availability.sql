-- Availability: a stranger who knows an address must not be able to take its owner's pending sign-up, spend its code,
-- or lock it out (src/auth.ts, src/codes.ts, src/throttle.ts). Two tables change shape and one is added. Rows in the
-- old `signups` and `codes` are sign-ups and codes in flight (15 minutes to 2 days old at most): dropping them only
-- means anyone mid-sign-up starts again. Nothing else is touched, and no account is.
--
-- Safe on an empty database (it runs right after 0001), on the database of an earlier build of this Worker (which had
-- the one-row-per-address tables), and only once: wrangler records it as applied.

DROP TABLE signups;
DROP TABLE codes;

-- Sign-ups waiting for their email code, one row per (address, browser flow): a second browser signing up with the
-- same address adds its own row instead of replacing the first, so a stranger cannot take the owner's pending sign-up
-- or its code. flow_hash binds a row to the browser that submitted it: only that browser's code can turn it into an
-- account, so nobody can attach their password to the code mailed to someone else. At most 5 live rows per address.
CREATE TABLE signups (
  email TEXT NOT NULL,
  flow_hash TEXT NOT NULL,                -- SHA-256 (hex) of the nonce in that browser's signed __Host-ab_flow cookie
  name TEXT NOT NULL,
  note TEXT,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pw_version INTEGER NOT NULL,
  lang TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (email, flow_hash)
);

-- One-time email codes: 6 digits, 15 minutes, 5 tries each (WonderClip's choices). Only an HMAC of the code is kept.
-- One row per (address, purpose, browser flow), at most 5 live rows per address and purpose: a second browser asking
-- for a code for the same address adds a code, it does not replace (or use up the tries of) the first browser's.
CREATE TABLE codes (
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  flow_hash TEXT NOT NULL,                -- the code works only in the browser whose flow cookie carries this nonce
  code_hash TEXT NOT NULL,                -- HMAC-SHA256 under SESSION_SECRET of purpose, email and code
  expires_at INTEGER NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  PRIMARY KEY (email, purpose, flow_hash)
);

-- Scratch rows that known and unknown addresses write alike (src/db.ts decoyWrite), so a sign-up, a reset request or a
-- resend does the same database work whether or not the address has an account. Never read.
CREATE TABLE decoy (
  k TEXT PRIMARY KEY,
  at INTEGER NOT NULL
);
