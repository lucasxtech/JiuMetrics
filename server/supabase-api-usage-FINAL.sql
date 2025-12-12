-- ============================================
-- SQL DEFINITIVO para criar tabela api_usage
-- Execute TODO este script no Supabase SQL Editor
-- ============================================

-- 1. Habilitar extensão UUID (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Dropar tabela se existir (recomeçar do zero)
DROP TABLE IF EXISTS public.api_usage CASCADE;

-- 3. Criar tabela no schema PUBLIC (importante para API)
CREATE TABLE public.api_usage (
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

-- 4. Criar índices
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at);
CREATE INDEX idx_api_usage_model ON public.api_usage(model_name);

-- 5. Habilitar RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS
CREATE POLICY "api_usage_insert_policy"
  ON public.api_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_usage_select_policy"
  ON public.api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- 7. Garantir que a tabela está exposta na API
-- (Isto é feito automaticamente ao criar no schema public, mas vamos garantir)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.api_usage TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 8. Comentários
COMMENT ON TABLE public.api_usage IS 'Rastreamento de uso e custos da API do Google Gemini';

-- 9. Verificar se a tabela foi criada corretamente
SELECT 
  'Tabela criada com sucesso!' as status,
  count(*) as total_records 
FROM public.api_usage;
