-- Private PDF links pin an existing design revision and the IDE's report text.
CREATE TABLE mcp_pdf_exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  design_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  options TEXT NOT NULL
);
