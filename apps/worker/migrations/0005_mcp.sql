-- Personal credentials only authorize MCP. Browser sessions and existing local designs are independent.
CREATE TABLE mcp_keys (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, digest TEXT NOT NULL UNIQUE, scope TEXT NOT NULL CHECK(scope IN ('read','write')),
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_used_at INTEGER, revoked_at INTEGER,
  issuance_id TEXT NOT NULL, UNIQUE(user_id, issuance_id)
);
CREATE INDEX mcp_keys_owner ON mcp_keys(user_id, created_at);

-- Reserve a request before spending a turn. The same receipt stores the result atomically with its revision.
CREATE TABLE mcp_revisions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL, design_id TEXT NOT NULL, revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('working','done','failed')), created_at INTEGER NOT NULL,
  snapshot TEXT, error TEXT, PRIMARY KEY(user_id, request_id)
);
CREATE UNIQUE INDEX mcp_revision_slot ON mcp_revisions(user_id, design_id, revision) WHERE status <> 'failed';
CREATE INDEX mcp_latest ON mcp_revisions(user_id, design_id, status, revision DESC);
