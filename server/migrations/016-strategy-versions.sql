-- =====================================================
-- Migration 016: Histórico de versões de estratégias táticas
-- =====================================================

CREATE TABLE IF NOT EXISTS strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência à análise tática
  analysis_id UUID NOT NULL REFERENCES tactical_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Versão
  version_number INTEGER NOT NULL DEFAULT 1,
  
  -- Conteúdo da estratégia nesta versão (JSON completo)
  content JSONB NOT NULL,
  
  -- Campo específico que foi editado (null = estratégia completa)
  edited_field VARCHAR(100),
  
  -- Quem/como foi editado
  edited_by VARCHAR(20) NOT NULL CHECK (edited_by IN ('user', 'ai', 'system')),
  edit_reason TEXT,
  
  -- Metadados
  is_current BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_strategy_versions_analysis ON strategy_versions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_user ON strategy_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_version ON strategy_versions(analysis_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_current ON strategy_versions(analysis_id, is_current) WHERE is_current = true;

-- Habilitar RLS
ALTER TABLE strategy_versions ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem suas próprias versões
DROP POLICY IF EXISTS strategy_versions_user_policy ON strategy_versions;

CREATE POLICY strategy_versions_user_policy ON strategy_versions
  FOR ALL
  USING (auth.uid() = user_id);

-- Comentário
COMMENT ON TABLE strategy_versions IS 'Histórico de versões das estratégias táticas de análises';
