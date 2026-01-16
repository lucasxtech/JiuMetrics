-- Migration 014: Permitir context_id NULL em ai_chat_sessions
-- Necessário para estratégias temporárias que não têm ID persistente

-- Remover a constraint NOT NULL do context_id
ALTER TABLE ai_chat_sessions ALTER COLUMN context_id DROP NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN ai_chat_sessions.context_id IS 'ID da análise ou estratégia. Pode ser NULL para estratégias temporárias não salvas.';
