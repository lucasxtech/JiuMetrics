-- Migration 023: Add token_version to users table
-- Used to invalidate existing JWTs immediately after role change or deactivation.
-- When this column is incremented, any JWT with an older tokenVersion is rejected.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;
