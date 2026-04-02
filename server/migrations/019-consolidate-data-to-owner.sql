-- Migration 019: Consolidate all accounts data into owner account
-- SAFE: runs in a transaction - if anything fails, everything rolls back
-- Run ONCE in Supabase SQL Editor (AFTER migration 018)

BEGIN;

DO $migration$
DECLARE
  lucas_id    UUID;
  test_id     UUID;
  migrate_ids UUID[];
BEGIN
  -- Find owner account
  SELECT id INTO lucas_id FROM users WHERE email = 'lucas.menezes@clint.digital';
  IF lucas_id IS NULL THEN
    RAISE EXCEPTION 'Owner account lucas.menezes@clint.digital not found. Aborting.';
  END IF;

  -- Find test account (keep separate)
  SELECT id INTO test_id FROM users WHERE email = 'contateste@teste.com';

  -- Collect IDs to migrate (everyone except lucas and contateste)
  SELECT array_agg(id) INTO migrate_ids
  FROM users
  WHERE id <> lucas_id
    AND (test_id IS NULL OR id <> test_id);

  IF migrate_ids IS NULL OR array_length(migrate_ids, 1) = 0 THEN
    RAISE NOTICE 'Nothing to migrate. Exiting.';
    RETURN;
  END IF;

  RAISE NOTICE 'Migrating data from % account(s) to lucas.menezes@clint.digital...', array_length(migrate_ids, 1);

  -- VARCHAR(255) tables (need cast for comparison)
  UPDATE athletes
    SET user_id = lucas_id::TEXT
    WHERE user_id IS NOT NULL
      AND user_id <> ''
      AND user_id::UUID = ANY(migrate_ids);

  UPDATE opponents
    SET user_id = lucas_id::TEXT
    WHERE user_id IS NOT NULL
      AND user_id <> ''
      AND user_id::UUID = ANY(migrate_ids);

  UPDATE fight_analyses
    SET user_id = lucas_id::TEXT
    WHERE user_id IS NOT NULL
      AND user_id <> ''
      AND user_id::UUID = ANY(migrate_ids);

  -- UUID tables
  UPDATE tactical_analyses
    SET user_id = lucas_id
    WHERE user_id = ANY(migrate_ids);

  UPDATE ai_chat_sessions
    SET user_id = lucas_id
    WHERE user_id = ANY(migrate_ids);

  UPDATE strategy_versions
    SET user_id = lucas_id
    WHERE user_id = ANY(migrate_ids);

  UPDATE api_usage
    SET user_id = lucas_id
    WHERE user_id = ANY(migrate_ids);

  -- Soft-deactivate migrated accounts
  UPDATE users
    SET is_active = false,
        role = 'user'
    WHERE id = ANY(migrate_ids);

  RAISE NOTICE 'Done. % account(s) deactivated.', array_length(migrate_ids, 1);
END $migration$;

COMMIT;
