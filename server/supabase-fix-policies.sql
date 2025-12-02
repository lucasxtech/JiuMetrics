-- Script para corrigir políticas RLS no Supabase
-- Execute este script se as tabelas já existem mas dá erro de API key

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Enable all operations for all users" ON athletes;
DROP POLICY IF EXISTS "Enable all operations for all users" ON opponents;
DROP POLICY IF EXISTS "Enable all operations for all users" ON fight_analyses;

-- Recriar políticas de acesso público
CREATE POLICY "Public Access" ON athletes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON opponents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON fight_analyses FOR ALL USING (true) WITH CHECK (true);
