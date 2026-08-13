# ADR-009 — Acesso ao banco exclusivamente por `service_role`

## Status

**Accepted — não implementado** (decidido em 2026-08-12).
**Supersedes [ADR-002](./002-rls-desligado-autorizacao-na-aplicacao.md).**

⚠️ **O estado descrito em ADR-002 é o que está em produção hoje.** Este ADR registra a direção decidida; o código e o banco ainda não refletem isso.

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

**Consequência de projeto que precisa ser executada junto:** como não haverá mais nenhuma possibilidade de o banco servir de rede de segurança, **a garantia de posse deve descer do controller para o model**. Hoje `FightAnalysis.update()` e `.delete()` aceitam qualquer ID, e 6 endpoints não verificam posse — corrigir só os endpoints deixa a armadilha armada para o próximo. Ver [`../../specs/006-ownership-in-data-access/spec.md`](../../specs/006-ownership-in-data-access/spec.md), que é **pré-requisito** de [`008`](../../specs/008-database-access-lockdown/spec.md).

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

- **Zero defesa em profundidade, agora por decisão.** Um endpoint que esqueça o filtro de posse vaza dados sem nenhuma rede abaixo. A auditoria encontrou **6 casos** desses. Isto é o custo consciente da decisão — e a razão pela qual empurrar a garantia para o model deixa de ser opcional.
- **Todo o backend passa a rodar com a chave mais poderosa do projeto.** Um SSRF ou RCE no backend passa a ter acesso total ao banco. (Na prática o efeito é limitado: com RLS desligada, a chave anon já dava acesso equivalente.)
- **Testes de autorização passam a ser infraestrutura crítica.** Hoje não existe um único teste verificando que o usuário A não lê o dado do usuário B — e nenhuma das 6 falhas seria detectada pela suíte atual.
- **Se o produto evoluir para papéis profissionais** (médico, nutricionista — ver [`../DOMAIN.md`](../DOMAIN.md#6-o-que-não-faz-parte-do-domínio-atual)), com dado sensível cruzando fronteira de organização, esta decisão precisa ser reavaliada. Nesse cenário, defesa em profundidade no banco deixa de ser luxo.
- **A revogação de GRANTs pode quebrar acesso legítimo não mapeado.** **NEEDS_CONFIRMATION:** existe algum consumidor da chave anon fora deste repositório (script, dashboard, automação)?

## ✅ Verificação executada (2026-08-13, [spec 002](../../specs/002-verification-baseline/spec.md))

O pré-requisito desta decisão foi cumprido, por **teste empírico** em vez de consulta ao catálogo (PostgREST não executa SQL cru):

**A chave `anon` lê 9 das 10 tabelas** — `users` (25 linhas, **com `password_hash` bcrypt e `email`**), `athletes` (37), `opponents` (38), `fight_analyses` (285), `tactical_analyses` (41), `ai_chat_sessions` (285), `analysis_versions` (27), `strategy_versions` (47), `api_usage` (173). **Só `profile_versions` está protegida.**

**A escrita também está liberada:** um `INSERT` com a chave anon é recusado por violação de `NOT NULL`, **não** por permissão.

**Consequência para esta decisão:** o risco é **maior** do que o ADR estimou — não é só vazamento de dado de domínio, são hashes de senha. Isto **eleva a prioridade desta spec** acima do que o plano previa, e é a razão de a recomendação atual ser antecipá-la. A premissa da decisão (revogar em vez de reativar RLS) **não muda**.

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
- `server/src/config/supabase.js` — os dois clientes e o fallback silencioso
- `server/src/models/FightAnalysis.js` — `update`/`delete` sem filtro de `user_id`
- `server/src/utils/tenantScope.js` — a regra de escopo que passa a ser a única proteção
- [`../../AUDIT.md`](../../AUDIT.md) §6, §7, §9 — falhas e evidência em `arquivo:linha`
- Decisão: conversa com o proprietário, 2026-08-12 (registrada em [`../../AUDIT.md`](../../AUDIT.md), seção "Decisões — RESPONDIDAS", D1)
