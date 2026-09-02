# ADR-009 — Acesso ao banco exclusivamente por `service_role`

## Status

**Accepted — parcialmente implementado** (decidido em 2026-08-12; código executado na [spec 008](../../specs/008-database-access-lockdown/spec.md), 2026-08-24).
**Supersedes [ADR-002](./002-rls-desligado-autorizacao-na-aplicacao.md).**

✅ **O lado do código está feito e é o descrito abaixo:** cliente único `service_role`, sem fallback (`server/src/config/supabase.js`); as variáveis de Supabase saíram de `frontend/.env.production`, que foi retirado do controle de versão.

🟡 **O lado do banco está escrito e não executado.** O `REVOKE` de `anon`/`authenticated` está em [`server/migrations/024-revoke-anon-access.sql`](../../server/migrations/024-revoke-anon-access.sql), pronto para colar no SQL Editor do Supabase — mas não há, neste ambiente, credencial de conexão direta ao Postgres (só a chave `service_role`, que fala REST via PostgREST e não executa DCL). É um passo manual do proprietário. **Até ele rodar, a chave anon publicada continua com GRANT nas tabelas de produção** — o estado descrito em ADR-002/no AUDIT.md §4 é real até essa migration ser aplicada.

## Context

A auditoria de 2026-08-12 ([`../../AUDIT.md`](../../AUDIT.md)) encontrou o seguinte estado:

1. **RLS desligada** em `athletes`, `opponents`, `fight_analyses` (migrations `008`/`009`); políticas `USING (true)` — sem efeito — em `tactical_analyses`, `ai_chat_sessions`, `analysis_versions`.
2. **A migration `004` executa `GRANT ALL ON public.api_usage TO anon, authenticated`**, e os GRANTs default do Supabase para o papel `anon` presumivelmente permanecem nas outras tabelas.
3. **As credenciais do projeto estão em `frontend/.env.production`, arquivo rastreado pelo git** — URL do projeto e chave publicável.
4. **Nenhuma variável de Supabase é usada no frontend** — não há uma única referência a Supabase em `frontend/src` (verificado). Estão publicadas sem servir a nada.
5. **O código usa dois clientes sem regra documentada**, e `supabaseAdmin` **cai silenciosamente para o cliente anon** quando `SUPABASE_SERVICE_ROLE_KEY` não está definida.

Efeito combinado: quem tiver a chave publicável pode falar direto com o PostgREST (`/rest/v1/athletes?select=*`) — **sem JWT da aplicação, sem rate limit, sem os filtros de tenant**. Toda a autorização documentada em [`../AUTHORIZATION.md`](../AUTHORIZATION.md) é contornável por esse caminho.

Duas saídas foram avaliadas: (i) revogar o acesso de `anon` e falar só por `service_role`; (ii) reativar RLS com políticas reais, o que exigiria passar a identidade da aplicação ao Postgres (`SET LOCAL` ou claims customizadas), já que `auth.uid()` é sempre `NULL` ([ADR-001](./001-jwt-proprio-em-vez-de-supabase-auth.md)).

## Decision

**Opção (i): revogar todo acesso de `anon`/`authenticated` às tabelas; o backend passa a acessar o banco exclusivamente com `service_role`.**

Palavras do proprietário (2026-08-12), ao escolher entre as duas: *"faz a primeira"*.

Implicações da decisão:

1. Revogar os GRANTs de `anon` e `authenticated` nas tabelas de `public`.
2. Unificar o acesso do backend no cliente `service_role`, eliminando a divisão arbitrária entre os dois clientes.
3. **Falhar no boot** se `SUPABASE_SERVICE_ROLE_KEY` não estiver definida, em vez do fallback silencioso atual.
4. Remover as variáveis de Supabase de `frontend/.env.production` e rotacionar as chaves.
5. **A autorização é 100% responsabilidade da aplicação** — assumido explicitamente, não por acidente.

**Consequência de projeto que precisa ser executada junto:** como não haverá mais nenhuma possibilidade de o banco servir de rede de segurança, **a garantia de posse deve descer do controller para o model**.

✅ **Pré-requisito CUMPRIDO (2026-08-18).** A [spec 006](../../specs/006-ownership-in-data-access/spec.md) desceu a garantia: o escopo de posse é obrigatório na assinatura de todo método de model de domínio, e a chamada sem ele lança `MissingScopeError` (`utils/scopeGuard.js`). Os 6 endpoints que não verificavam posse foram corrigidos, e a armadilha estrutural — `FightAnalysis.update()`/`.delete()` aceitando qualquer ID, `AnalysisVersion` sem filtro — deixou de existir.

✅ **Bloqueio de verificação RESOLVIDO (2026-08-24).** O proprietário confirmou: **não existe consumidor externo da chave anon.** A spec 008 executou os itens de código (1–4 do Decision, abaixo) sem período de migração para terceiros. Falta só o item 1 do lado do banco — o `REVOKE` em si — que é execução manual, fora do alcance deste ambiente.

## Rationale

**Por que (i) e não (ii):**

- **Coerência com [ADR-001](./001-jwt-proprio-em-vez-de-supabase-auth.md).** O projeto já decidiu que a identidade vive na aplicação. RLS de verdade exigiria reintroduzir a identidade no Postgres — reconstruir, por outro caminho, o que Supabase Auth daria de graça e que foi descartado.
- **Muito menos trabalho.** Revogar GRANTs é uma operação de banco. Implementar RLS real exigiria propagar o `user_id` da aplicação para toda conexão do PostgREST (que é um pool compartilhado, não uma conexão por usuário) e reescrever políticas em 10 tabelas com semântica de tenant.
- **O modelo de escopo atual não é trivial em SQL.** Admin vê todos os `user_id` do mesmo `tenant_id` — auto-referência em `users`. Em `getScopeIds` são 8 linhas legíveis; como política RLS replicada em 10 tabelas, seria significativamente mais difícil de auditar.
- **Resolve o problema imediato de forma completa.** Com `anon` sem GRANT, a chave publicada deixa de dar acesso — independentemente do estado de RLS.

**O que a decisão custa, e foi aceito:** abrir mão de defesa em profundidade. Ver *Consequences*.

## Consequences

### Positivas

- **Fecha o acesso direto ao banco.** A chave publicável deixa de ser uma credencial de acesso, e a aplicação volta a ser o único caminho até o dado.
- **Elimina o fallback silencioso** entre dois níveis de privilégio — o mesmo código deixa de rodar com permissões diferentes dependendo de uma variável de ambiente.
- **Torna o modelo de segurança explícito e auditável.** Hoje o sistema *parece* ter proteção no banco (RLS habilitada em 6 tabelas) e não tem. Depois, fica claro que a proteção é uma só, e onde ela mora.
- **Provavelmente conserta o rastreamento de custo** — `api_usage` é a única tabela cuja política `auth.uid() = user_id` de fato bloqueia, e é justamente a operação que o produto precisa. Ver [`../modules/usage-tracking.md`](../modules/usage-tracking.md). **NEEDS_CONFIRMATION.**

### Negativas

- **Zero defesa em profundidade no banco, agora por decisão.** A auditoria encontrou **6 endpoints** que esqueciam o filtro de posse. Foi o custo consciente da decisão — e a razão pela qual empurrar a garantia para o model deixou de ser opcional. ✅ Feito na spec 006: um endpoint que esqueça o escopo agora **falha** em vez de vazar. Continua não havendo rede no banco.
- **Todo o backend passa a rodar com a chave mais poderosa do projeto.** Um SSRF ou RCE no backend passa a ter acesso total ao banco. (Na prática o efeito é limitado: com RLS desligada, a chave anon já dava acesso equivalente.)
- **Testes de autorização passam a ser infraestrutura crítica.** ✅ Existem desde a [spec 004](../../specs/004-authorization-safety-net/spec.md) e **bloqueiam merge** desde a spec 006: `server/src/__tests__/authorization/`, com fixtures de 2 tenants. Limitação declarada: rodam contra um fake de PostgREST, não contra banco real (decisão P2).
- **Se o produto evoluir para papéis profissionais** (médico, nutricionista — ver [`../DOMAIN.md`](../DOMAIN.md#6-o-que-não-faz-parte-do-domínio-atual)), com dado sensível cruzando fronteira de organização, esta decisão precisa ser reavaliada. Nesse cenário, defesa em profundidade no banco deixa de ser luxo.
- ~~**A revogação de GRANTs pode quebrar acesso legítimo não mapeado.**~~ ✅ **RESPONDIDO (2026-08-24):** não existe consumidor da chave anon fora deste repositório. O `REVOKE` pode rodar sem período de migração.

## ✅ Verificação executada (2026-08-13, [spec 002](../../specs/002-verification-baseline/spec.md))

O pré-requisito desta decisão foi cumprido, por **teste empírico** em vez de consulta ao catálogo (PostgREST não executa SQL cru):

**A chave `anon` lê 9 das 10 tabelas** — `users` (25 linhas, **com `password_hash` bcrypt e `email`**), `athletes` (37), `opponents` (38), `fight_analyses` (285), `tactical_analyses` (41), `ai_chat_sessions` (285), `analysis_versions` (27), `strategy_versions` (47), `api_usage` (173). **Só `profile_versions` está protegida.**

**A escrita também está liberada:** um `INSERT` com a chave anon é recusado por violação de `NOT NULL`, **não** por permissão.

**Consequência para esta decisão:** o risco é **maior** do que o ADR estimou — não é só vazamento de dado de domínio, são hashes de senha. Isto **eleva a prioridade desta spec** acima do que o plano previa, e é a razão de a recomendação atual ser antecipá-la. A premissa da decisão (revogar em vez de reativar RLS) **não muda**.

## Execução (spec 008, 2026-08-24)

Itens 2–4 do *Decision* (unificar cliente, falhar no boot, remover variáveis do frontend) estão feitos no código — ver `server/src/config/supabase.js` e `frontend/.env.production`. O item 1 (`REVOKE`) está escrito em [`server/migrations/024-revoke-anon-access.sql`](../../server/migrations/024-revoke-anon-access.sql) com o rollback (`GRANT` de volta) documentado no próprio arquivo, mas **não foi executado** — nenhuma ferramenta disponível neste ambiente tem uma credencial de conexão direta ao Postgres (a chave `service_role` fala REST via PostgREST, não SQL cru). É o próximo passo manual do proprietário; o resultado esperado, e como verificá-lo, está no cabeçalho da migration. O item 5 (rotação de chaves) segue como ação do proprietário nos dashboards do Supabase e do Google AI Studio — fora do alcance deste ambiente pelo mesmo motivo.

**Ainda pendente** (não bloqueia, só documenta): a definição nominal das políticas e dos GRANTs, consultável apenas no SQL Editor:

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
SELECT * FROM pg_policies WHERE schemaname = 'public';
SELECT grantee, table_name, privilege_type
  FROM information_schema.role_table_grants
 WHERE grantee IN ('anon', 'authenticated');
```

## Evidence

- `server/migrations/{008,009}` — RLS desligada
- `server/migrations/004-api-usage-final.sql` — `GRANT ALL ... TO anon, authenticated`
- `frontend/.env.production` — credenciais rastreadas no git
- `server/src/config/supabase.js` — antes: os dois clientes e o fallback silencioso. Depois da spec 008: cliente único, falha no `require()` sem `SUPABASE_SERVICE_ROLE_KEY`
- `server/migrations/024-revoke-anon-access.sql` — o `REVOKE` escrito (spec 008), pendente de execução manual
- `server/src/models/FightAnalysis.js` — `update`/`delete` sem filtro de `user_id`
- `server/src/utils/tenantScope.js` — a regra de escopo que passa a ser a única proteção
- [`../../AUDIT.md`](../../AUDIT.md) §6, §7, §9 — falhas e evidência em `arquivo:linha`
- Decisão: conversa com o proprietário, 2026-08-12 (registrada em [`../../AUDIT.md`](../../AUDIT.md), seção "Decisões — RESPONDIDAS", D1)
