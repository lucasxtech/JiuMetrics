-- Migration 010: Tabelas para Chat de IA e Histórico de Análises
-- Permite refinar análises via chat e manter histórico de versões

-- =====================================================
-- TABELA: ai_chat_sessions
-- Armazena sessões de chat vinculadas a análises
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Contexto da sessão (a qual análise o chat está vinculado)
  context_type VARCHAR(20) NOT NULL CHECK (context_type IN ('analysis', 'strategy')),
  context_id UUID NOT NULL, -- ID da fight_analysis ou tactical_analysis
  
  -- Snapshot do contexto original (para manter consistência)
  context_snapshot JSONB NOT NULL,
  
  -- Mensagens do chat
  messages JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados
  title VARCHAR(255), -- Título opcional da sessão
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_context ON ai_chat_sessions(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_created_at ON ai_chat_sessions(created_at DESC);

-- =====================================================
-- TABELA: analysis_versions
-- Histórico de versões das análises (após edições)
-- =====================================================
CREATE TABLE IF NOT EXISTS analysis_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência à análise original
  analysis_id UUID NOT NULL,
  analysis_type VARCHAR(20) NOT NULL CHECK (analysis_type IN ('fight', 'tactical')),
  
  -- Versão
  version_number INTEGER NOT NULL DEFAULT 1,
  
  -- Conteúdo da versão
  content JSONB NOT NULL, -- Snapshot completo da análise nesta versão
  
  -- Quem/como foi editado
  edited_by VARCHAR(20) NOT NULL CHECK (edited_by IN ('user', 'ai', 'ai_suggestion')),
  edit_reason TEXT, -- Motivo da edição (mensagem do usuário ou descrição)
  
  -- Metadados
  is_current BOOLEAN DEFAULT false, -- Marca a versão atual
  chat_session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_analysis_versions_analysis ON analysis_versions(analysis_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_versions_current ON analysis_versions(analysis_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_analysis_versions_created_at ON analysis_versions(created_at DESC);

-- =====================================================
-- ADICIONAR COLUNA NA TABELA fight_analyses
-- Para rastrear versão atual e se está editada
-- =====================================================
ALTER TABLE fight_analyses 
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_summary TEXT,
ADD COLUMN IF NOT EXISTS original_charts JSONB;

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_versions ENABLE ROW LEVEL SECURITY;

-- Policies para ai_chat_sessions
CREATE POLICY "Users can view their own chat sessions"
  ON ai_chat_sessions
  FOR SELECT
  USING (true); -- Backend valida com user_id

CREATE POLICY "Users can create their own chat sessions"
  ON ai_chat_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own chat sessions"
  ON ai_chat_sessions
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own chat sessions"
  ON ai_chat_sessions
  FOR DELETE
  USING (true);

-- Policies para analysis_versions
CREATE POLICY "Users can view analysis versions"
  ON analysis_versions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create analysis versions"
  ON analysis_versions
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_ai_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_chat_sessions_updated_at
  BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_sessions_updated_at();

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE ai_chat_sessions IS 'Sessões de chat com IA para refinar análises';
COMMENT ON COLUMN ai_chat_sessions.context_type IS 'Tipo: analysis (fight_analysis) ou strategy (tactical_analysis)';
COMMENT ON COLUMN ai_chat_sessions.context_snapshot IS 'Snapshot do estado da análise quando o chat iniciou';
COMMENT ON COLUMN ai_chat_sessions.messages IS 'Array de mensagens: [{role, content, timestamp, suggestions?}]';

COMMENT ON TABLE analysis_versions IS 'Histórico de versões das análises após edições';
COMMENT ON COLUMN analysis_versions.edited_by IS 'Quem editou: user (manual), ai (aceito), ai_suggestion (sugestão)';
COMMENT ON COLUMN analysis_versions.is_current IS 'true se esta é a versão ativa atual';
