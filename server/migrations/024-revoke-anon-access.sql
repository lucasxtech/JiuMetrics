-- Migration 024: Fecha o acesso direto ao banco via PostgREST (spec 008)
--
-- ⚠️ NÃO É AUTOAPLICADA. Como todas as migrations deste projeto (ver
-- migrations/README.md e docs/DATABASE.md §1), não há runner nem controle
-- de estado: aplique colando este arquivo no SQL Editor do Supabase.
--
-- CONTEXTO (verificado em produção na spec 002, 2026-08-13): com RLS
-- desligada nas tabelas de domínio e os GRANTs default do Supabase para
-- `anon`/`authenticated` intactos, a chave publicável — que estava
-- COMMITADA em frontend/.env.production — lia 9 das 10 tabelas deste
-- schema, incluindo `users` com `email` e `password_hash` (bcrypt) de 25
-- usuários. Escrita também estava liberada (um INSERT só falhava por
-- violação de NOT NULL, não por permissão). Ver docs/DATABASE.md §4.
--
-- É DCL, não DDL — nenhuma linha de dado é tocada, nenhuma tabela muda de
-- forma. Decisão de revogar (em vez de reativar RLS) em ADR-009: a
-- autenticação é JWT próprio, não Supabase Auth, então `auth.uid()` nunca
-- é satisfeita e uma política RLS não teria como discriminar usuário.
--
-- ESCOPO DELIBERADAMENTE POR TABELA, NÃO `ON ALL TABLES IN SCHEMA public`:
-- um REVOKE amplo no nível do schema arriscaria atingir view ou função
-- interna do Supabase que também viva em `public`. Reduz o comando a
-- exatamente o que a spec 008 pede.
--
-- PRÉ-REQUISITO: a nova chave `service_role` já precisa estar configurada
-- e validada no backend (unificação de cliente da spec 008) ANTES de
-- rodar isto — senão a aplicação para de funcionar junto com a chave anon.
--
-- ROLLBACK (imediato e completo — testado e documentado, não apenas
-- planejado): execute o bloco GRANT no fim deste arquivo.

REVOKE ALL PRIVILEGES ON public.users              FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.athletes           FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.opponents          FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.fight_analyses     FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.tactical_analyses  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.ai_chat_sessions   FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.analysis_versions  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.strategy_versions  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.profile_versions   FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.api_usage          FROM anon, authenticated;

-- A migration 004 concedeu USAGE, SELECT em TODAS as sequences do schema
-- para anon/authenticated (server/migrations/004-api-usage-final.sql:49).
-- Sem revogar isso, a chave anon perderia acesso às TABELAS mas ainda
-- poderia ler o próximo valor de sequence (`nextval`/`currval`) — vazamento
-- de baixo risco, mas sem motivo para deixar aberto.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- ⚠️ NÃO EXECUTAR daqui para baixo. Guardado como o comando de rollback
-- exigido pela spec 008 antes de qualquer REVOKE em produção — reverte a
-- migration inteira em uma única operação, sem perda de dado.
--
-- GRANT ALL ON public.users              TO anon, authenticated;
-- GRANT ALL ON public.athletes           TO anon, authenticated;
-- GRANT ALL ON public.opponents          TO anon, authenticated;
-- GRANT ALL ON public.fight_analyses     TO anon, authenticated;
-- GRANT ALL ON public.tactical_analyses  TO anon, authenticated;
-- GRANT ALL ON public.ai_chat_sessions   TO anon, authenticated;
-- GRANT ALL ON public.analysis_versions  TO anon, authenticated;
-- GRANT ALL ON public.strategy_versions  TO anon, authenticated;
-- GRANT ALL ON public.profile_versions   TO anon, authenticated;
-- GRANT ALL ON public.api_usage          TO anon, authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- VERIFICAÇÃO (rode antes e depois, comparando o resultado — é o R1 da
-- spec 008): com a chave anon, qualquer SELECT abaixo deve passar a
-- falhar por permissão. Rode via REST (não SQL Editor, que usa o usuário
-- postgres e ignora GRANT):
--
--   curl "$SUPABASE_URL/rest/v1/users?select=id&limit=1" \
--        -H "apikey: $SUPABASE_ANON_KEY" \
--        -H "Authorization: Bearer $SUPABASE_ANON_KEY"
--
-- Antes desta migration: 200 com linhas. Depois: 401/403 sem linhas.
-- Repita para athletes, opponents, fight_analyses, tactical_analyses,
-- ai_chat_sessions, analysis_versions, strategy_versions, profile_versions
-- e api_usage.
