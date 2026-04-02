-- Migration 022: Fix tenant_id for users migrated in migration 019
-- Problem: Migration 021 ran AFTER 019, assigning tenant_id = own_id to every user
--          with created_by IS NULL — including users whose data was already migrated
--          to lucas. Those users must share lucas's tenant to appear in his admin panel.
-- Safe: only UPDATE — no data is dropped.

DO $fix$
DECLARE
  lucas_id UUID;
  affected INT;
BEGIN
  SELECT id INTO lucas_id FROM users WHERE email = 'lucas.menezes@clint.digital';
  IF lucas_id IS NULL THEN
    RAISE EXCEPTION 'lucas.menezes@clint.digital not found';
  END IF;

  -- All inactive users that are NOT their own tenant root (i.e. not genuinely independent accounts)
  -- should belong to lucas's tenant.
  -- contateste@teste.com is intentionally a separate tenant — exclude it.
  UPDATE users
  SET tenant_id    = lucas_id,
      created_by   = lucas_id   -- establishes the group membership going forward
  WHERE is_active  = false
    AND tenant_id <> lucas_id   -- not already in lucas's group
    AND email      <> 'contateste@teste.com';  -- keep test account isolated

  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Fixed tenant_id for % user(s)', affected;
END $fix$;
