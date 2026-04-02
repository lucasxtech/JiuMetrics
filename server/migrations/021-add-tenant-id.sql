-- Migration 021: Add tenant_id for multi-tenant group isolation
-- tenant_id always points to the root admin of the group.
-- This allows multiple admins within the same group without breaking isolation.

-- Step 1: Add the column (nullable first so we can populate)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES users(id);

-- Step 2: Root users (created_by IS NULL) are their own tenant root
UPDATE users SET tenant_id = id WHERE created_by IS NULL;

-- Step 3: Direct sub-users (created_by is a root user) inherit tenant_id from creator
-- Handles 1 level deep: sub-users created directly by the root admin
UPDATE users u
SET tenant_id = creator.tenant_id
FROM users creator
WHERE u.created_by = creator.id
  AND creator.tenant_id IS NOT NULL;

-- Step 4: Handle deeper nesting (up to 3 levels - runs 3 times to propagate)
UPDATE users u
SET tenant_id = creator.tenant_id
FROM users creator
WHERE u.created_by = creator.id
  AND u.tenant_id IS NULL
  AND creator.tenant_id IS NOT NULL;

UPDATE users u
SET tenant_id = creator.tenant_id
FROM users creator
WHERE u.created_by = creator.id
  AND u.tenant_id IS NULL
  AND creator.tenant_id IS NOT NULL;

UPDATE users u
SET tenant_id = creator.tenant_id
FROM users creator
WHERE u.created_by = creator.id
  AND u.tenant_id IS NULL
  AND creator.tenant_id IS NOT NULL;

-- Step 5: Fallback - any still-null gets tenant_id = own id (shouldn't happen)
UPDATE users SET tenant_id = id WHERE tenant_id IS NULL;

-- Step 6: Make non-nullable after population
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;

-- Index for fast group lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
