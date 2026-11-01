-- Caps on the Claude backup (src/turn.ts, src/db.ts rescueUsage and bookRescue). A turn that Model Studio's content
-- filter stops is finished by Claude, paid from the owner's Anthropic credit, and anyone can write text that trips the
-- filter on purpose. So `usage` now also counts rescues and Claude's cost per user and day, and a row with user_id '*'
-- holds the same two numbers for everybody together: a rescue starts only while the user's count and the day's total
-- cost are under their caps (vars CLAUDE_RESCUES_PER_USER_DAY, CLAUDE_RESCUES_PER_ADMIN_DAY, CLAUDE_BUDGET_USD_PER_DAY).
--
-- The global '*' row is not a user, so `usage` cannot keep its foreign key to users(id): SQLite cannot drop a constraint,
-- so the table is rebuilt (nothing references it) and a trigger takes over the cascade, so removing a user still removes
-- their usage. Every existing row is copied; the new columns start at 0. Safe on an empty database and run only once.

CREATE TABLE usage_new (
  user_id TEXT NOT NULL,                  -- a users.id, or '*' for the row that totals every user (rescues and claude_cost_usd only)
  day TEXT NOT NULL,                      -- UTC day, YYYY-MM-DD
  turns INTEGER NOT NULL DEFAULT 0,       -- a turn the Claude backup finished counts as 2 (the daily quota, TURNS_PER_DAY)
  est_cost_usd REAL NOT NULL DEFAULT 0,   -- packages/core/src/pricing.ts estimate, summary folds and Claude included
  rescues INTEGER NOT NULL DEFAULT 0,     -- turns the Claude backup was asked to finish
  claude_cost_usd REAL NOT NULL DEFAULT 0, -- what those rescues cost (an upper bound when a stream broke before its usage record)
  PRIMARY KEY (user_id, day)
);

INSERT INTO usage_new (user_id, day, turns, est_cost_usd) SELECT user_id, day, turns, est_cost_usd FROM usage;
DROP TABLE usage;
ALTER TABLE usage_new RENAME TO usage;

CREATE TRIGGER usage_user_deleted AFTER DELETE ON users
BEGIN
  DELETE FROM usage WHERE user_id = OLD.id;
END;
