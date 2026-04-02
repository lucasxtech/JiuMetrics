-- Migration 018: Fix admin roles — demote all except primary admin
-- SAFE: only UPDATE statements, no data dropped

-- Step 1: Demote everyone to 'user'
UPDATE users SET role = 'user';

-- Step 2: Re-promote only the primary admin
-- ⚠️ Change this email if your main account is different
UPDATE users
SET role = 'admin'
WHERE email = 'lucas.menezes@clint.digital';
