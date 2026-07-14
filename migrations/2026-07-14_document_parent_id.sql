-- Adds parent/child (SOP hierarchy) support to documents.
-- Run against existing Supabase databases that already have a `documents` table.
-- Safe to re-run.

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
