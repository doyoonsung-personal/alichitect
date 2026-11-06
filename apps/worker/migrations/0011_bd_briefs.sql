-- BD meeting brief module (apps/worker/src/features/bd-brief). Module rule (plan §7/§12): every table is
-- bd_-prefixed and owner-scoped, may reference users(id) for the account-deletion cascade, and is removable with
-- the feature; existing platform tables never reference these and gain no columns, so disabling or dropping the
-- module leaves every other schema untouched.

-- One active brief per account and source (plan §7). content is the JSON BriefContent of the accepted version.
CREATE TABLE bd_briefs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('browser-session')),
  source_key TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  lang TEXT NOT NULL CHECK(lang IN ('en','ko','zh')),
  version INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  snapshot_fingerprint TEXT NOT NULL DEFAULT '',
  source_revision INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(owner_id, source_kind, source_key)
);

-- Bounded accepted-version history. evidence is a bounded JSON array of the source ids (and quoted evidence text)
-- actually used by that version, stored inline so pruning old versions can never orphan a retained version's claims.
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

-- Generation records: idempotency, in-flight lease, bounded candidate and feature-only usage accounting.
-- While in progress expires_at is the hard deadline plus cleanup slack; completed/failed records retain accounting
-- for LIMITS.requestRetentionDays. Deleting a brief must not refund its quota or release a still-running model.
-- brief_id deliberately has no FK: the opaque identifier and owner-scoped accounting outlive brief deletion.
CREATE TABLE bd_brief_requests (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('in-progress','completed','failed')),
  candidate TEXT,
  reason TEXT,
  usage_json TEXT,
  version_base INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(brief_id, request_id)
);
CREATE INDEX bd_brief_requests_owner ON bd_brief_requests(owner_id, created_at);
CREATE INDEX bd_brief_requests_expires ON bd_brief_requests(expires_at);
-- expireStaleRequests scans in-progress rows by created_at across ALL owners (housekeeping), which the owner-scoped index above cannot serve
CREATE INDEX bd_brief_requests_state_created ON bd_brief_requests(state, created_at);
CREATE INDEX bd_brief_requests_active ON bd_brief_requests(expires_at) WHERE state = 'in-progress';

-- Remove customer/model payloads even when a brief is deleted outside the HTTP repository.
CREATE TRIGGER bd_briefs_scrub_requests AFTER DELETE ON bd_briefs BEGIN
  UPDATE bd_brief_requests SET candidate = NULL, payload_hash = ''
    WHERE brief_id = OLD.id AND owner_id = OLD.owner_id;
END;
