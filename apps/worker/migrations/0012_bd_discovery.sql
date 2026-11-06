-- Independent first-meeting briefs, isolated to the BD module.
-- SQLite cannot widen an existing CHECK constraint in place. Preserve all three
-- related tables before rebuilding them. Drop children before the parent so FK
-- cascades cannot lose notes/versions. The request ledger stays in place and its
-- scrub trigger is suspended only for the rebuild; payloads/accounting are kept.
-- Apply this entire file as one migration transaction (Wrangler/D1 default).
CREATE TABLE bd_m12_briefs AS SELECT * FROM bd_briefs;
CREATE TABLE bd_m12_versions AS SELECT * FROM bd_brief_versions;
CREATE TABLE bd_m12_notes AS SELECT * FROM bd_brief_notes;
DROP TRIGGER bd_briefs_scrub_requests;
DROP TABLE bd_brief_versions;
DROP TABLE bd_brief_notes;
DROP TABLE bd_briefs;

CREATE TABLE bd_briefs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('browser-session','discovery')),
  source_key TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  lang TEXT NOT NULL CHECK(lang IN ('en','ko','zh')),
  version INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  snapshot_fingerprint TEXT NOT NULL DEFAULT '',
  source_revision INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  discovery_title TEXT,
  discovery_snapshot TEXT,
  CHECK((source_kind = 'browser-session' AND discovery_title IS NULL AND discovery_snapshot IS NULL)
    OR (source_kind = 'discovery' AND discovery_title IS NOT NULL AND discovery_snapshot IS NOT NULL)),
  UNIQUE(owner_id, source_kind, source_key)
);

CREATE TABLE bd_brief_versions (
  brief_id TEXT NOT NULL REFERENCES bd_briefs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  origin TEXT NOT NULL CHECK(origin IN ('initial','generated','edit','notes-review')),
  content TEXT NOT NULL,
  snapshot_fingerprint TEXT NOT NULL,
  source_revision INTEGER NOT NULL DEFAULT 0,
  evidence TEXT NOT NULL DEFAULT '[]',
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (brief_id, version)
);

-- Explicitly saved meeting notes. UNIQUE(brief_id, request_id) is the client dedup key (plan §7).
CREATE TABLE bd_brief_notes (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL REFERENCES bd_briefs(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  text TEXT NOT NULL,
  meeting_date TEXT,
  source TEXT,
  saved_at INTEGER NOT NULL,
  UNIQUE(brief_id, request_id)
);
CREATE INDEX bd_brief_notes_brief ON bd_brief_notes(brief_id, saved_at);
-- bd_brief_versions needs no index of its own: its PRIMARY KEY (brief_id, version) already scopes by brief.

INSERT INTO bd_briefs (id,owner_id,source_kind,source_key,schema_version,lang,version,content,snapshot_fingerprint,source_revision,created_at,updated_at)
 SELECT id,owner_id,source_kind,source_key,schema_version,lang,version,content,snapshot_fingerprint,source_revision,created_at,updated_at FROM bd_m12_briefs;
INSERT INTO bd_brief_versions SELECT * FROM bd_m12_versions;
INSERT INTO bd_brief_notes SELECT * FROM bd_m12_notes;
DROP TABLE bd_m12_briefs;
DROP TABLE bd_m12_versions;
DROP TABLE bd_m12_notes;
CREATE INDEX bd_briefs_owner_kind_updated ON bd_briefs(owner_id,source_kind,updated_at DESC);

CREATE TRIGGER bd_briefs_scrub_requests AFTER DELETE ON bd_briefs BEGIN
  UPDATE bd_brief_requests SET candidate = NULL, payload_hash = ''
    WHERE brief_id = OLD.id AND owner_id = OLD.owner_id;
END;
