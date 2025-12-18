-- Tabela para rastrear uso da API do Gemini e custos
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_name VARCHAR(100) NOT NULL,
  operation_type VARCHAR(50) NOT NULL, -- 'video_analysis', 'strategy', 'summary'
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage(model_name);

-- RLS Policies
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só podem ver seus próprios registros
CREATE POLICY "Users can view own api usage"
  ON api_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Sistema pode inserir registros (via service role)
CREATE POLICY "Service can insert api usage"
  ON api_usage
  FOR INSERT
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE api_usage IS 'Rastreamento de uso e custos da API do Google Gemini';
COMMENT ON COLUMN api_usage.model_name IS 'Nome do modelo Gemini usado (gemini-2.0-flash, gemini-2.5-pro, etc)';
COMMENT ON COLUMN api_usage.operation_type IS 'Tipo de operação realizada (video_analysis, strategy, summary)';
COMMENT ON COLUMN api_usage.estimated_cost_usd IS 'Custo estimado em USD baseado nos preços do Google';
