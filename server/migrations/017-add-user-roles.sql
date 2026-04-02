-- Migration 017: Add role and created_by to users table
-- ADDITIVE ONLY — no data is dropped or modified (existing users are preserved)

-- 1. Add role column with safe default 'user'
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- 2. Add created_by column (nullable — existing users won't have this set)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Add is_active column for soft-disable (never hard delete users)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 4. Promote the existing admin user(s) — update this email list to match your admin accounts
-- These are the original ALLOWED_EMAILS that had full access
UPDATE users
SET role = 'admin'
WHERE email IN (
  'lucas.menezes@clint.digital',
  'contateste@teste.com',
  'esterbp30@gmail.com',
  'kauagomestrator@gmail.com',
  'bruandalpra13@gmail.com',
  'isaacbaitsdarosa@gmail.com',
  'bernardobernert@gmail.com',
  'lucianobernert@gmail.com'
);

-- 5. Add index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
