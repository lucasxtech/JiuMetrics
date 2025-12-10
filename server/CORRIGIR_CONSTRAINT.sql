-- ⚠️ EXECUTE ESTE SQL NO SUPABASE PARA REMOVER AS CONSTRAINTS PROBLEMÁTICAS

-- 1. Remover constraints de foreign key que referenciam auth.users
ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_user_id_fkey;
ALTER TABLE opponents DROP CONSTRAINT IF EXISTS opponents_user_id_fkey;
ALTER TABLE fight_analyses DROP CONSTRAINT IF EXISTS fight_analyses_user_id_fkey;

-- 2. Se a coluna user_id for UUID, vamos alterá-la para VARCHAR
-- (porque nosso sistema usa IDs VARCHAR, não UUIDs do auth.users)
ALTER TABLE athletes ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE opponents ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE fight_analyses ALTER COLUMN user_id TYPE VARCHAR(255);

-- 3. Desabilitar RLS (Row Level Security) - já fizemos isso antes, mas garantir
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE opponents DISABLE ROW LEVEL SECURITY;
ALTER TABLE fight_analyses DISABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas
DROP POLICY IF EXISTS "Enable all operations for all users" ON athletes;
DROP POLICY IF EXISTS "Enable all operations for all users" ON opponents;
DROP POLICY IF EXISTS "Enable all operations for all users" ON fight_analyses;
DROP POLICY IF EXISTS "Users can view their own athletes" ON athletes;
DROP POLICY IF EXISTS "Users can insert their own athletes" ON athletes;
DROP POLICY IF EXISTS "Users can update their own athletes" ON athletes;
DROP POLICY IF EXISTS "Users can delete their own athletes" ON athletes;
DROP POLICY IF EXISTS "Users can view their own opponents" ON opponents;
DROP POLICY IF EXISTS "Users can insert their own opponents" ON opponents;
DROP POLICY IF EXISTS "Users can update their own opponents" ON opponents;
DROP POLICY IF EXISTS "Users can delete their own opponents" ON opponents;
DROP POLICY IF EXISTS "Users can view their own analyses" ON fight_analyses;
DROP POLICY IF EXISTS "Users can insert their own analyses" ON fight_analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON fight_analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON fight_analyses;

-- ✅ Pronto! Agora você pode cadastrar atletas sem erros de foreign key
