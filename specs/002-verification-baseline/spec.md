# SPEC-002 — Verificação e contenção

**Status: Implemented (parcial — 5 itens pendentes de acesso do proprietário)** · Etapa 0 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)
**Executada em:** 2026-08-13 · **Branch:** `chore/spec-002-verification-baseline`

---

## Registro de execução (2026-08-13)

### Resultado em uma linha

A verificação **refutou uma conclusão da auditoria, refinou outra, confirmou a terceira e agravou o achado de segurança principal.** Foi o retorno mais alto possível para uma etapa que quase não escreve código — e valida a decisão de colocá-la antes de tudo.

### O que foi feito

| Item do escopo | Estado |
|---|---|
| 1 · Rotacionar a chave do Gemini | ⏳ **PENDENTE — exige acesso ao Google Cloud** (proprietário) |
| 2 · Executar as consultas de verificação | ✅ **FEITO** — método revisado (ver acima); resultados abaixo |
| 3 · Verificar consumidores externos da chave anon | ⏳ **PENDENTE — conhecimento do proprietário.** Confirmado apenas que o frontend não usa Supabase |
| 4 · Confirmar plano da Vercel e timeout | ⏳ **PENDENTE — exige acesso ao painel da Vercel** |
| 5 · Confirmar GitHub Pages e `VITE_API_URL` | ⏳ **PENDENTE — exige acesso às configurações do GitHub** |
| 6 · Remover `GET /api/fight-analysis/debug/all` | ✅ **FEITO** |
| 7 · Registrar os resultados na documentação | ✅ **FEITO** |

### Achados

#### ❌ REFUTADO — o rastreamento de custo de IA funciona

`api_usage`: **173 linhas**, de **2025-12-14 a 2026-08-12**, **US$ 3,0295** acumulados — inclusive registros do multi-agente removido (`multi-agents (gpt-5.4)`, `gpt-4-turbo-preview`, `gpt-4.1`).

A auditoria concluiu que o insert era rejeitado pela política `auth.uid() = user_id`. **A política não está ativa em produção.** O estado real do banco divergiu das migrations `004`/`006` — exatamente o risco que a auditoria apontou ao dizer que "as migrations não são a fonte de verdade", e que aqui invalidou uma conclusão dela mesma.

**Consequência:** item 2 da [spec 007](../007-silent-failures-and-input-validation/spec.md) **removido do escopo**; a dependência da [spec 009](../009-ai-cost-and-reliability/spec.md) sobre a 007 **deixa de existir**.

**Dívida nova, menor:** **55 das 173 linhas com `estimated_cost_usd = 0`** → migrada para a spec 009.

#### 🔄 REFINADO — versionamento de perfil quebrado desde 2026-01-16, não "nunca"

`profile_versions`: **5 linhas, a última em 2026-01-15**. O `git log` datou a quebra com precisão:

| Data | Evento |
|---|---|
| 2026-01-09 (`f185831`) | `ProfileVersion.create` criado, esperando **camelCase** |
| 2026-01-09 → 01-15 | **5 versões gravadas** por chamadas diretas corretas |
| **2026-01-16** (`2b13a64`) | `versionManager.saveProfileVersion` criado passando **snake_case** → quebrado desde o nascimento do wrapper |

O diagnóstico do mecanismo estava certo; o "nunca funcionou" estava errado.

#### ✅ CONFIRMADO — `technical_profile` é no-op

**0 de 37 atletas** com o campo preenchido.

#### 🔴 AGRAVADO — a chave anon expõe hashes de senha

A auditoria marcou o RLS de `users` como UNKNOWN. A medição empírica (tentar ler cada tabela com `SUPABASE_ANON_KEY`) mostrou que **a chave publicável commitada no git lê 9 das 10 tabelas**:

`users` **25 linhas — com `password_hash` (bcrypt `$2b$`, 60 chars) e `email`** · `athletes` 37 · `opponents` 38 · `fight_analyses` 285 · `tactical_analyses` 41 · `ai_chat_sessions` 285 · `analysis_versions` 27 · `strategy_versions` 47 · `api_usage` 173. **Só `profile_versions` está protegida.**

**Escrita também liberada:** o `INSERT` é recusado por violação de `NOT NULL`, **não** por permissão.

**Consequência:** eleva a prioridade da [spec 008](../008-database-access-lockdown/spec.md) acima do previsto no plano — ver *Recomendação* abaixo.

#### 📊 Fatos que desbloqueiam a spec 011

| Medição | Resultado |
|---|---|
| Órfãos de `user_id` | `athletes` 4/37 · `opponents` 1/38 · **`fight_analyses` 62/285** = **67 registros invisíveis** |
| Valores não-UUID | **zero** → conversão VARCHAR→UUID viável **sem perda** |
| E-mails duplicados | **zero** → `UNIQUE(users.email)` aplicável |
| Versões duplicadas | **zero** nas 3 tabelas → `UNIQUE(analysis_id, version_number)` aplicável |
| Colunas de `users` | 12, exatamente as inferidas das migrations |
| População | 25 usuários · 3 admins · 0 inativos · 2 tenants |

### Desvios em relação à spec original

1. **Método de verificação substituído** (documentado no escopo, item 2): o SQL contra `pg_catalog`/`information_schema` não é executável via PostgREST. Substituído por teste empírico com a chave anon, que responde a pergunta de segurança de forma **mais forte** que a consulta ao catálogo.
2. **Cinco itens pendentes de acesso** que só o proprietário tem (Google Cloud, painel da Vercel, configurações do GitHub, conhecimento de consumidores externos). Nenhum bloqueia as specs 004–007, 009–011; **o item 3 bloqueia a spec 008**.

### Testes e validação

- **Backend: 16 suítes, 180 testes, todos verdes** — antes e depois da remoção da rota.
- Nenhuma referência a `debug/all` remanescente em `server/src`, `frontend/src`, `playwright/` ou `tools/`.
- Script de verificação em `.ai/verify-002.js` (temporário, fora do Git). **Somente leitura** — nenhuma escrita em produção.

### Recomendação de sequência (revisada)

O achado de exposição de `password_hash` sugere **antecipar a [spec 008](../008-database-access-lockdown/spec.md)**. Ela hoje depende da [spec 006](../006-ownership-in-data-access/spec.md), e essa dependência tem razão (fechar o banco antes de a aplicação estar correta cria uma janela sem proteção). **A decisão é do proprietário** e está registrada como pendência no checkpoint.

---

## Context

A auditoria de 2026-08-12 ([`AUDIT.md`](../../AUDIT.md)) produziu **23 pontos marcados `NEEDS_CONFIRMATION`**, porque o estado real do banco em produção não é determinável a partir do repositório: as migrations não são a fonte de verdade, a tabela `users` nunca é criada por uma delas, e não existe controle de quais foram aplicadas.

Três conclusões estruturais do plano dependem de fatos não verificados, e ao menos uma delas pode ser **refutada** por uma consulta de um minuto.

Além disso, há um vazamento cross-tenant cuja correção é uma deleção isolada, sem dependência de nada.

## Problem

1. **Projetar sobre suposição.** Se `api_usage` tiver linhas recentes, o diagnóstico de que o registro de custo está quebrado por RLS está **errado**, e a spec 007 estaria corrigindo o problema errado. O mesmo vale para os GRANTs de `anon` (spec 008) e para a existência de órfãos de `user_id` (spec 011).
2. **Uma chave de API do Gemini está no histórico do git** (`.archived/SUPABASE_SETUP.md`), em formato válido. Remover o arquivo não resolve — a chave precisa ser rotacionada.
3. **`GET /api/fight-analysis/debug/all` devolve as análises de todos os tenants**, exigindo apenas autenticação, e fornece os `user_id` e `id` que permitem explorar os outros IDORs.

## Goal

Substituir suposição por fato registrado, e fechar o vazamento de menor custo de correção.

Ao final, nenhuma decisão das specs 003–011 depende de premissa não verificada.

## Scope

1. **Rotacionar a chave da API do Gemini** no Google Cloud; configurar a nova em produção; revogar a antiga.
2. **Executar as consultas de verificação** e registrar os resultados.

> ⚠️ **Método revisado em 2026-08-13, durante a execução.** A versão original desta spec prescrevia SQL contra `pg_tables`, `pg_policies`, `pg_constraint` e `information_schema`. **Isso não é executável com as ferramentas do projeto:** o acesso ao banco é exclusivamente via PostgREST (`@supabase/supabase-js`), que só consulta tabelas — não executa SQL arbitrário. Verificado: não existe RPC `exec_sql` no schema, e a senha do Postgres não está no `.env` (só as chaves de API), então não há conexão `pg` direta disponível.
>
> **O método abaixo responde às mesmas perguntas por via executável** — e, no caso mais importante (GRANTs + RLS), responde de forma **empírica e mais forte**: em vez de perguntar ao catálogo se o `anon` tem permissão, tenta-se **ler a tabela com a chave anon**. Se a leitura funciona, GRANTs estão ativos **e** RLS é ineficaz — que é exatamente o risco descrito no [ADR-009](../../docs/decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md).
>
> As consultas de catálogo que **permanecem inacessíveis** (definição exata de constraints, `column_default`, lista nominal de políticas) ficam como item para o proprietário executar no SQL Editor do Supabase, e não bloqueiam as specs 003–010.

**Executável via PostgREST (feito nesta spec):**

| Pergunta | Método |
|---|---|
| A chave `anon` lê as tabelas? (**a mais importante** — bloqueia a spec 008) | tentar `SELECT` em cada tabela de domínio com `SUPABASE_ANON_KEY` |
| A chave `anon` **escreve**? | tentar `INSERT` inócuo com rollback lógico — ou inferir do resultado da leitura |
| `api_usage` tem linhas? | `count: 'exact'` + `max(created_at)` por `order/limit` |
| `profile_versions` tem linhas? | `count: 'exact'` |
| Órfãos de `user_id` | `count` com filtro `is.null` e `eq.''` |
| Valores não-UUID em `user_id` | buscar os distintos e validar por regex em JS |
| E-mails duplicados | buscar e agrupar em JS |
| Versões duplicadas | buscar `(analysis_id, version_number)` e agrupar em JS |
| Colunas reais de `users` | inspecionar as **chaves** de uma linha (sem imprimir valores — a tabela contém `password_hash` e PII) |

**Não executável — fica para o proprietário no SQL Editor (não bloqueia nada):**

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
SELECT * FROM pg_policies WHERE schemaname = 'public';
SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
 WHERE grantee IN ('anon','authenticated');
SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE connamespace = 'public'::regnamespace;
SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
 WHERE table_name = 'users' ORDER BY ordinal_position;
```

3. **Verificar consumidores da chave anon** — se há script, automação ou integração fora deste repositório usando `SUPABASE_ANON_KEY`. (O frontend **não** usa Supabase — já verificado.)
4. **Confirmar o plano da Vercel e o timeout efetivo** das functions.
5. **Confirmar se o GitHub Pages está publicado e acessado**, e se `VITE_API_URL` existe como secret.
6. **Remover `GET /api/fight-analysis/debug/all`** ([`routes/fightAnalysis.js`](../../server/src/routes/fightAnalysis.js)).
7. **Registrar todos os resultados** em `docs/DATABASE.md` e `docs/PROJECT_STATUS.md`, substituindo os `NEEDS_CONFIRMATION` correspondentes.

## Out of Scope

- Qualquer outra alteração de código.
- Qualquer `REVOKE`, `GRANT` ou alteração de política (spec 008).
- Qualquer migration ou alteração de schema (spec 011).
- Corrigir as falhas silenciosas (spec 007) — aqui apenas se **confirma** que existem.
- Remover o arquivo com a chave do histórico do git (operação separada, de maior risco).
- Remover o GitHub Pages (spec 010).

## Requirements

| # | Requisito |
|---|---|
| R1 | A chave antiga do Gemini está revogada e a IA funciona com a nova |
| R2 | O estado real de RLS, políticas e GRANTs está documentado em `docs/DATABASE.md` |
| R3 | Cada uma das três falhas silenciosas está **confirmada ou refutada**, com o resultado da consulta registrado |
| R4 | A contagem de órfãos, de valores não-UUID e de duplicatas está documentada |
| R5 | O schema real de `users` está documentado |
| R6 | `GET /api/fight-analysis/debug/all` não existe |
| R7 | Está registrado se existe consumidor externo da chave anon |
| R8 | Nenhum `NEEDS_CONFIRMATION` sobre estado de banco permanece em `docs/DATABASE.md` |

## Technical Considerations

**A rotação da chave interrompe a IA** entre revogar a antiga e configurar a nova. Coordenar: criar a nova, configurar na Vercel, validar, e só então revogar.

**As consultas são somente leitura.** Nenhuma altera dado. Podem ser executadas em produção sem risco.

**Se `api_usage` tiver linhas recentes**, a conclusão da auditoria está errada e a spec 007 precisa ser reescrita antes de implementada. Este é o resultado mais valioso desta spec.

**A remoção da rota de debug** é a única alteração de código. Pula controller e model (a query está no próprio arquivo de rota), então a deleção é local e não afeta mais nada.

**O que fazer se um consumidor externo da chave anon for encontrado:** a spec 008 muda de estratégia — precisará de um período de migração desse consumidor antes do `REVOKE`, ou de um papel dedicado com GRANTs mínimos.

## Acceptance Criteria

- [ ] Chave antiga do Gemini revogada; análise de vídeo funcionando com a nova
- [ ] `docs/DATABASE.md` §4 sem `NEEDS_CONFIRMATION`, com o estado real de RLS, políticas e GRANTs
- [ ] `docs/DATABASE.md` com o schema real de `users`
- [ ] Resultado das três consultas de falha silenciosa registrado, com a conclusão (confirmada/refutada) explícita
- [ ] Contagens de órfãos, não-UUID e duplicatas registradas
- [ ] Consumidores externos da chave anon: presença ou ausência registrada
- [ ] Plano da Vercel e timeout efetivo registrados em `docs/ARCHITECTURE.md` §7
- [ ] `GET /api/fight-analysis/debug/all` removida; suíte de backend verde
- [ ] `docs/PROJECT_STATUS.md` com os itens 1–14 de *Needs Confirmation* fechados ou atualizados
- [ ] Se alguma conclusão da auditoria foi refutada, isso está registrado **explicitamente** em `AUDIT.md`

## Testing Strategy

Nenhum teste novo — esta spec não introduz comportamento.

- Suíte de backend (16 suítes) verde depois de remover a rota.
- Verificação manual de que a análise de vídeo funciona com a nova chave.
- Verificação manual de que a rota removida devolve 404.

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/DATABASE.md` | §4 (RLS), §3 (schema de `users`), §5 (constraints reais) — substituir `NEEDS_CONFIRMATION` por fato |
| `docs/PROJECT_STATUS.md` | fechar itens de *Needs Confirmation*; atualizar *Known Issues* se algo foi refutado |
| `docs/ARCHITECTURE.md` | §7 — plano da Vercel e timeout; remover a rota de debug da tabela de endpoints |
| `docs/AUTHORIZATION.md` | remover AZ-1 de *Known Issues* |
| `docs/modules/fight-analysis.md` | remover a rota de debug |
| `AUDIT.md` | registrar refutações, se houver |
| `CHANGELOG.md` | segurança: rotação de chave, remoção da rota |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| Rotação da chave interrompe a IA | Média | Configurar a nova antes de revogar a antiga; validar |
| Uma conclusão da auditoria é refutada e invalida outra spec | Média | **É o objetivo.** Melhor descobrir aqui que em produção |
| Falta de acesso ao dashboard ou ao Google Cloud | Baixa | Portão da spec — verificar antes de começar |
| A rota removida está em uso por alguém | Muito baixa | É marcada como "DEBUG TEMPORÁRIO" no código e não é chamada pelo frontend |

## Dependencies

**Nenhuma.** Esta é a primeira spec a executar. Requer apenas acesso ao dashboard do Supabase e ao Google Cloud.

**Bloqueia:** 003 (chave rotacionada antes de o scanner passar a bloquear), 007 (confirmação das falhas), 008 (GRANTs e consumidores), 011 (órfãos e duplicatas).
