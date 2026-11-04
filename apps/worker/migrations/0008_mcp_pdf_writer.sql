-- A retry for the same proposal must not start another billable writing pass.
-- Existing exports already contain their final render options.
ALTER TABLE mcp_pdf_exports ADD COLUMN writing_since INTEGER;
ALTER TABLE mcp_pdf_exports ADD COLUMN write_error TEXT;
CREATE UNIQUE INDEX mcp_pdf_one_pending ON mcp_pdf_exports(user_id) WHERE writing_since IS NOT NULL;
CREATE INDEX mcp_pdf_queue ON mcp_pdf_exports(writing_since) WHERE writing_since IS NOT NULL;
