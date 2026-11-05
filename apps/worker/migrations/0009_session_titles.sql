-- Cache one Flash title per owner and initial-brief hash; prompts are never retained here.
CREATE TABLE session_titles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brief_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, brief_hash)
);
CREATE INDEX session_titles_budget ON session_titles(user_id, created_at);
