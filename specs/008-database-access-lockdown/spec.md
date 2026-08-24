# SPEC-008 — Fechamento do acesso ao banco

**Status: Implemented (2026-08-24) — parcial: código pronto, execução em produção pendente** · Etapa 6 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)

## Context

O JiuMetrics usa autenticação JWT própria, não Supabase Auth ([ADR-001](../../docs/decisions/001-jwt-proprio-em-vez-de-supabase-auth.md)). Isso tornou RLS inútil na prática — qualquer política com `auth.uid()` nunca é satisfeita — e levou a desligá-la nas tabelas de domínio ([ADR-002](../../docs/decisions/002-rls-desligado-autorizacao-na-aplicacao.md)):

| Tabela | RLS |
|---|---|
| `athletes`, `opponents`, `fight_analyses` | **desligada** |
| `tactical_analyses`, `ai_chat_sessions`, `analysis_versions` | ligada, `USING (true)` — sem efeito |
| `api_usage` | ligada, `auth.uid() = user_id` — **bloqueia** o que o produto precisa |

A migration `004` executa `GRANT ALL ON public.api_usage TO anon, authenticated`, e os GRANTs default do Supabase para `anon` presumivelmente permanecem nas outras tabelas.

Ao mesmo tempo, a URL do projeto e a chave publicável estão em [`frontend/.env.production`](../../frontend/.env.production) — **arquivo rastreado pelo git**. E essas variáveis são **inúteis no frontend**: não há uma única referência a Supabase em `frontend/src` (verificado).

O proprietário decidiu em 2026-08-12, entre revogar `anon` ou reativar RLS: **revogar** ([ADR-009](../../docs/decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md)).

## Problem

Com RLS desligada e GRANTs de `anon` ativos, **quem tiver a chave publicável fala direto com o PostgREST** — sem JWT da aplicação, sem rate limit, sem filtro de tenant.

Isso torna **contornável toda a autorização** implementada nas specs 005 e 006. Corrigir 6 endpoints e deixar essa porta aberta é proteger a entrada da frente e deixar a de trás destrancada.

Há um segundo problema, do mesmo desenho: `supabaseAdmin` **cai silenciosamente** para o cliente anon quando `SUPABASE_SERVICE_ROLE_KEY` não está definida. O mesmo código roda com dois níveis de privilégio dependendo de uma variável de ambiente, sem nenhum aviso.

## Goal

Tornar a aplicação o **único caminho** até o dado, e eliminar a ambiguidade de privilégio no acesso.

## Scope

1. **`REVOKE`** de `anon` e `authenticated` nas tabelas de `public`.
2. **Unificar o backend em `service_role`** — eliminar a divisão arbitrária entre os dois clientes (hoje: 7 módulos usam anon, 4 usam admin, sem regra documentada).
3. **Falhar no boot** se `SUPABASE_SERVICE_ROLE_KEY` não estiver definida — fim do fallback silencioso.
4. **Remover as variáveis de Supabase de `frontend/.env.production`** e adicionar `.env.production` ao `.gitignore`.
5. **Rotacionar as chaves** do Supabase (a publicável está no git).

## Out of Scope

- **Reativar RLS** — o [ADR-009](../../docs/decisions/009-acesso-ao-banco-exclusivamente-por-service-role.md) escolheu a outra via. Nota: se o produto evoluir para dado de saúde com papéis profissionais, **a premissa muda** e RLS volta à mesa (§6.4 do plano).
- **Qualquer mudança de schema** (spec 011).
- **Expurgar as chaves do histórico do git** — operação separada, de maior risco.
- **Corrigir vazamentos de autorização** (spec 006 — **pré-requisito** desta).
- **Mudar o comportamento de qualquer endpoint.**

## Requirements

| # | Requisito |
|---|---|
| R1 | Chamada ao PostgREST com a chave anon **falha** para todas as tabelas de `public` |
| R2 | O backend **não inicia** sem `SUPABASE_SERVICE_ROLE_KEY` |
| R3 | Um único cliente Supabase no backend; nenhum fallback silencioso |
| R4 | `frontend/.env.production` sem credencial de Supabase; arquivo no `.gitignore` |
| R5 | Chaves do Supabase rotacionadas |
| R6 | Nenhum comportamento de endpoint mudou |
| R7 | As 16 suítes de backend verdes |

## Technical Considerations

**⚠️ Esta spec é bloqueada por uma verificação, não por uma decisão.** A [spec 002](../002-verification-baseline/spec.md) precisa responder: **existe consumidor externo da chave anon?** (script, automação, integração fora deste repositório). Se existir, a estratégia muda — período de migração desse consumidor, ou papel dedicado com GRANTs mínimos.

**O rollback é trivial e completo:** `GRANT` de volta. É a propriedade mais importante desta spec e o que a torna aceitável apesar do risco. Preparar o comando de rollback **antes** de executar.

**É DCL, não DDL.** Nenhum dado é alterado. Nenhuma linha é tocada. Isso limita bastante o risco.

**Efeito colateral positivo esperado:** `api_usage` é a única tabela cuja política de fato bloqueia, e é exatamente a operação que o produto precisa. Unificar em `service_role` provavelmente **conserta o registro de custo** — o que sobrepõe ao item 2 da [spec 007](../007-silent-failures-and-input-validation/spec.md). **Coordenar:** se a 007 já corrigiu usando `supabaseAdmin`, este item apenas confirma; se não, a 008 resolve por consequência.

**Por que unificar os clientes em vez de manter os dois:** a divisão atual não tem regra documentada e o fallback silencioso significa que o comportamento em produção depende de uma variável estar definida. Com `anon` sem GRANT, o cliente anon deixa de funcionar para qualquer coisa — manter dois clientes seria manter um que não funciona.

**Ordem em relação à spec 006:** esta vem **depois**. Fechar o banco quando a aplicação ainda tem 6 vazamentos cria uma janela em que a única camada de proteção é a que sabemos estar furada.

**Sequência de execução recomendada:**

1. criar a nova chave `service_role`; configurar na Vercel; validar que a aplicação funciona
2. unificar o cliente no código; validar
3. fazer o `REVOKE` (com o `GRANT` de rollback pronto)
4. validar que a aplicação continua funcionando e que a chave anon falha
5. rotacionar a chave publicável; remover do `.env.production`

Cada passo é reversível independentemente.

## Acceptance Criteria

- [~] `curl` ao PostgREST com a chave anon **falha** para `athletes`, `opponents`, `fight_analyses`, `tactical_analyses`, `ai_chat_sessions`, `analysis_versions`, `api_usage`, `users`, `profile_versions`, `strategy_versions` — **script pronto em [`migrations/024-revoke-anon-access.sql`](../../server/migrations/024-revoke-anon-access.sql), não executado.** Nenhuma ferramenta disponível neste ambiente tem credencial de conexão direta ao Postgres (a chave `service_role` fala REST via PostgREST, não SQL cru) — é passo manual do proprietário, com o comando de verificação (`curl` antes/depois) no cabeçalho do próprio arquivo
- [x] Aplicação funciona normalmente com `service_role` — as 28 suítes de backend (331 testes) passam com o cliente unificado
- [x] Backend **não inicia** sem `SUPABASE_SERVICE_ROLE_KEY` — `server/src/config/__tests__/supabase.test.js`, 4 casos, incluindo o de regressão que impede reintroduzir um cliente anon
- [x] `grep` por `supabaseAdmin` mostra zero ocorrências em código; `supabase` é o único cliente
- [x] `frontend/.env.production` sem `SUPABASE_*`; arquivo retirado do controle de versão (`git rm --cached`) e `.gitignore` corrigido para `.env.*` (o padrão anterior, só `.env`, não cobria `.env.production` — a causa raiz do vazamento)
- [ ] **Chaves do Supabase e do Gemini rotacionadas; senha de teste trocada** — ação nos dashboards do Supabase / Google AI Studio, fora do alcance deste ambiente
- [x] As suítes de backend verdes (28/28, 331/331) e lint sem erro; ⚠️ **E2E continua não rodando** (dívida pré-existente, não desta spec)
- [x] Comando de rollback (`GRANT`) documentado no próprio arquivo da migration, comentado e pronto para descomentar
- [~] `SELECT count(*) FROM api_usage` cresce após operação de IA — **já era verdade antes desta spec** (spec 002 mediu 173 linhas, US$ 3,03; a spec 007 já havia registrado o efeito). Não é um efeito colateral desta spec: a tabela nunca esteve bloqueada, ao contrário do que a auditoria original supunha

## Testing Strategy

| Nível | O que |
|---|---|
| **Verificação de segurança** | teste (ou script documentado) que **falha** ao acessar cada tabela com a chave anon |
| **Boot** | processo **não inicia** sem a chave de serviço |
| **Regressão** | as 16 suítes de backend, sem alteração |
| **E2E** | login → atleta → análise (IA mockada) → estratégia → chat |
| **Manual** | todas as telas do frontend carregam e operam |

⚠️ **Verificação obrigatória antes de fechar a spec:** exercitar **todos** os caminhos que usavam `supabaseAdmin` (`ChatSession`, `ProfileVersion`, `StrategyVersion`, `User.transferData/deleteAllData/hardDelete`) — são os que mudam de cliente, e alguns (exclusão permanente de usuário) não são cobertos por teste automatizado.

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/DATABASE.md` | §1 (um cliente), §4 (estado de acesso após `REVOKE`) — **reescrita** das duas seções |
| `docs/AUTHORIZATION.md` | tabela de proteção por camada; *Future Direction* → *Current* |
| `docs/ARCHITECTURE.md` | §4 (dois clientes → um), §7 (variáveis obrigatórias) |
| `docs/decisions/009` | Status → implementado; registrar o resultado da verificação de consumidores |
| `docs/decisions/002` | confirmar a substituição |
| `docs/modules/usage-tracking.md` | se o custo passou a gravar por consequência |
| `CLAUDE.md` | *Database* regra 6 (dois clientes) — atualizar |
| `CHANGELOG.md` | **segurança** — acesso direto ao banco fechado; chaves rotacionadas |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| **Consumidor externo não mapeado quebra** | **Alta** | Spec 002 verifica **antes**; rollback por `GRANT` é imediato |
| Aplicação para de funcionar por permissão faltante em `service_role` | Média | `service_role` bypassa RLS e tem GRANT total por padrão; validar em staging antes |
| Caminho que usava `supabaseAdmin` quebra ao unificar | Média | Exercitar todos os 4 módulos afetados, incl. exclusão permanente de usuário |
| Rotação de chave interrompe o serviço | Média | Configurar a nova, validar, e só então revogar a antiga |
| Fechar o banco com a aplicação ainda furada | **Alta** | Dependência dura da spec 006 |
| `REVOKE` amplo demais atinge função ou view interna do Supabase | Média | Revogar por tabela em `public`, não `ALL` no schema; testar em staging |

## Dependencies

**Depende de:**
- [spec 002](../002-verification-baseline/spec.md) — **verificação de consumidores externos da chave anon** (bloqueio duro) e estado real dos GRANTs
- [spec 006](../006-ownership-in-data-access/spec.md) — a aplicação precisa estar correta antes de ser o único guardião

**Coordena com:** [spec 007](../007-silent-failures-and-input-validation/spec.md) — o item de `api_usage` se sobrepõe.

**Bloqueia:** [spec 011](../011-schema-integrity/spec.md) — trabalho de schema com acesso consolidado é mais seguro.
