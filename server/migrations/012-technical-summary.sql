-- Migration: Adiciona campo de resumo técnico consolidado aos atletas e adversários
-- Data: 2026-01-08

-- Adicionar coluna technical_summary na tabela athletes
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS technical_summary TEXT,
ADD COLUMN IF NOT EXISTS technical_summary_updated_at TIMESTAMPTZ;

-- Adicionar coluna technical_summary na tabela opponents
ALTER TABLE opponents 
ADD COLUMN IF NOT EXISTS technical_summary TEXT,
ADD COLUMN IF NOT EXISTS technical_summary_updated_at TIMESTAMPTZ;

-- Comentários
COMMENT ON COLUMN athletes.technical_summary IS 'Resumo técnico consolidado gerado pela IA a partir de todas as análises';
COMMENT ON COLUMN athletes.technical_summary_updated_at IS 'Data da última atualização do resumo técnico';
COMMENT ON COLUMN opponents.technical_summary IS 'Resumo técnico consolidado gerado pela IA a partir de todas as análises';
COMMENT ON COLUMN opponents.technical_summary_updated_at IS 'Data da última atualização do resumo técnico';
