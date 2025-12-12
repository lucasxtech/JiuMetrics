-- SOLUÇÃO SIMPLIFICADA: Permitir inserções na tabela api_usage
-- Execute este SQL no Supabase SQL Editor

-- Primeiro, criar a tabela se não existir (SEM foreign key)
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage(model_name);

-- Habilitar RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Service can insert api usage" ON api_usage;
DROP POLICY IF EXISTS "Users can view own api usage" ON api_usage;
DROP POLICY IF EXISTS "Users can insert own api usage" ON api_usage;

-- Policy: Usuários autenticados podem inserir seus próprios registros
CREATE POLICY "Users can insert own api usage"
  ON api_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem ver seus próprios registros
CREATE POLICY "Users can view own api usage"
  ON api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE api_usage IS 'Rastreamento de uso e custos da API do Google Gemini';

