-- A release announcement is shown at most once to an account across sessions, devices and tabs.
CREATE TABLE release_notices (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  release_id TEXT NOT NULL,
  shown_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, release_id)
);
