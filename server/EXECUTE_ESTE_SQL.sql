-- ⚠️ EXECUTE ESTE SQL NO SUPABASE PARA CORRIGIR O ERRO DE CADASTRO

-- 1. Adicionar coluna user_id (se ainda não existe)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
ALTER TABLE opponents ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
ALTER TABLE fight_analyses ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_athletes_user_id ON athletes(user_id);
CREATE INDEX IF NOT EXISTS idx_opponents_user_id ON opponents(user_id);
CREATE INDEX IF NOT EXISTS idx_fight_analyses_user_id ON fight_analyses(user_id);

-- 3. IMPORTANTE: Desabilitar RLS (usamos autenticação JWT customizada no backend)
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE opponents DISABLE ROW LEVEL SECURITY;
ALTER TABLE fight_analyses DISABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas antigas
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

-- ✅ Pronto! Agora tente cadastrar o atleta novamente
