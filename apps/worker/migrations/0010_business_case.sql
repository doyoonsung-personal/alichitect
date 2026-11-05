-- Optional business-case module. No core session, chat or proposal tables change.
CREATE TABLE bc_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  document_json TEXT NOT NULL CHECK (length(document_json) <= 65536)
);
CREATE INDEX bc_records_owner_session ON bc_records(user_id, session_id, created_at DESC);

-- Reservations count even when a provider fails. This is both the module's
-- admission ledger and its cost ledger; a missing cost is unknown, not free.
CREATE TABLE bc_model_calls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ok', 'error', 'invalid')),
  cost_usd REAL,
  cost_estimated INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX bc_model_calls_owner_time ON bc_model_calls(user_id, created_at);
CREATE INDEX bc_model_calls_time ON bc_model_calls(created_at);
CREATE INDEX bc_model_calls_active ON bc_model_calls(lease_until) WHERE status = 'pending';
