-- Migration 013: Adicionar tipo 'profile' às sessões de chat e criar tabela de versões
-- Permite usar chat de IA para editar resumos técnicos de perfil

-- =====================================================
-- PARTE 1: Atualizar constraint de context_type
-- =====================================================

-- Remover a constraint antiga
ALTER TABLE ai_chat_sessions DROP CONSTRAINT IF EXISTS ai_chat_sessions_context_type_check;

-- Adicionar nova constraint com 'profile' incluído
ALTER TABLE ai_chat_sessions ADD CONSTRAINT ai_chat_sessions_context_type_check 
  CHECK (context_type IN ('analysis', 'strategy', 'profile'));

-- Comentário explicativo
COMMENT ON COLUMN ai_chat_sessions.context_type IS 'Tipo do contexto: analysis (análise de luta), strategy (estratégia tática), profile (perfil técnico do atleta/adversário)';

-- =====================================================
-- PARTE 2: Criar tabela de versões de perfil técnico
-- =====================================================

CREATE TABLE IF NOT EXISTS profile_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência ao atleta ou adversário
  person_id UUID NOT NULL,
  person_type VARCHAR(20) NOT NULL CHECK (person_type IN ('athlete', 'opponent')),
  user_id UUID NOT NULL,
  
  -- Versão
  version_number INTEGER NOT NULL DEFAULT 1,
  
  -- Conteúdo do resumo técnico nesta versão
  content TEXT NOT NULL,
  
  -- Quem/como foi editado
  edited_by VARCHAR(20) NOT NULL CHECK (edited_by IN ('user', 'ai', 'ai_suggestion')),
  edit_reason TEXT,
  
  -- Metadados
  is_current BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profile_versions_person ON profile_versions(person_id, person_type);
CREATE INDEX IF NOT EXISTS idx_profile_versions_user ON profile_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_versions_version ON profile_versions(person_id, person_type, version_number DESC);

-- Habilitar RLS
ALTER TABLE profile_versions ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem suas próprias versões
DROP POLICY IF EXISTS profile_versions_user_policy ON profile_versions;

CREATE POLICY profile_versions_user_policy ON profile_versions
  FOR ALL
  USING (auth.uid() = user_id);

-- Comentário
COMMENT ON TABLE profile_versions IS 'Histórico de versões do resumo técnico de atletas e adversários';
