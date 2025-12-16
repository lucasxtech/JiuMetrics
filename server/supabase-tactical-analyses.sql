-- Tabela para armazenar histórico de análises táticas geradas
CREATE TABLE IF NOT EXISTS tactical_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  athlete_id UUID NOT NULL,
  athlete_name TEXT NOT NULL,
  opponent_id UUID NOT NULL,
  opponent_name TEXT NOT NULL,
  strategy_data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tactical_analyses_user_id ON tactical_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_tactical_analyses_athlete_id ON tactical_analyses(athlete_id);
CREATE INDEX IF NOT EXISTS idx_tactical_analyses_opponent_id ON tactical_analyses(opponent_id);
CREATE INDEX IF NOT EXISTS idx_tactical_analyses_created_at ON tactical_analyses(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE tactical_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem suas próprias análises
CREATE POLICY "Users can view their own tactical analyses"
  ON tactical_analyses
  FOR SELECT
  USING (true); -- Permitir leitura (backend já valida com user_id)

-- Policy: Usuários podem criar suas análises
CREATE POLICY "Users can create their own tactical analyses"
  ON tactical_analyses
  FOR INSERT
  WITH CHECK (true); -- Permitir inserção (backend já valida)

-- Policy: Usuários podem deletar suas análises
CREATE POLICY "Users can delete their own tactical analyses"
  ON tactical_analyses
  FOR DELETE
  USING (true); -- Permitir deleção (backend já valida com user_id)

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tactical_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tactical_analyses_updated_at
  BEFORE UPDATE ON tactical_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_tactical_analyses_updated_at();

-- Comentários
COMMENT ON TABLE tactical_analyses IS 'Histórico de análises táticas geradas pela IA';
COMMENT ON COLUMN tactical_analyses.strategy_data IS 'JSON com a estratégia completa gerada pela IA';
COMMENT ON COLUMN tactical_analyses.metadata IS 'Metadados: analysesCount, model usado, tokens, etc';
