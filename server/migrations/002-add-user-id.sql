-- Adicionar user_id às tabelas athletes e opponents
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna user_id à tabela athletes (usar VARCHAR para UUID do nosso sistema)
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- 2. Adicionar coluna user_id à tabela opponents
ALTER TABLE opponents ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- 3. Adicionar coluna user_id à tabela fight_analyses
ALTER TABLE fight_analyses ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_athletes_user_id ON athletes(user_id);
CREATE INDEX IF NOT EXISTS idx_opponents_user_id ON opponents(user_id);
CREATE INDEX IF NOT EXISTS idx_fight_analyses_user_id ON fight_analyses(user_id);

-- 5. Desabilitar RLS temporariamente para usar autenticação JWT customizada
-- (Como estamos usando nosso próprio sistema JWT, não o auth.users do Supabase)
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE opponents DISABLE ROW LEVEL SECURITY;
ALTER TABLE fight_analyses DISABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
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
