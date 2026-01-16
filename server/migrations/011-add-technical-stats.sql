-- Migration 011: Adicionar coluna technical_stats na tabela fight_analyses
-- Esta coluna armazena estatísticas técnicas detalhadas da análise

-- Adicionar coluna technical_stats se não existir
ALTER TABLE fight_analyses 
ADD COLUMN IF NOT EXISTS technical_stats JSONB;

-- Comentário
COMMENT ON COLUMN fight_analyses.technical_stats IS 'Estatísticas técnicas detalhadas: sweeps, submissions, guard_passes, back_takes';
