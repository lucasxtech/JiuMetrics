-- 025 — Spec 014: perfil da conta, troca de senha obrigatória e vínculo conta ↔ ficha.
-- Aditiva e idempotente. Aplicar à mão no SQL Editor do Supabase. NÃO contém UPDATE.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile VARCHAR(30) NOT NULL DEFAULT 'atleta';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_profile_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_profile_check
      CHECK (profile IN ('atleta','professor','nutricionista','fisioterapeuta','preparador_fisico'));
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS account_user_id UUID NULL
    REFERENCES users(id) ON DELETE SET NULL;

-- Uma ficha por conta.
CREATE UNIQUE INDEX IF NOT EXISTS athletes_account_user_id_key
  ON athletes(account_user_id) WHERE account_user_id IS NOT NULL;

-- Rollback (manual, se necessário):
-- DROP INDEX IF EXISTS athletes_account_user_id_key;
-- ALTER TABLE athletes DROP COLUMN IF EXISTS account_user_id;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_profile_check;
-- ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
-- ALTER TABLE users DROP COLUMN IF EXISTS profile;
