# ADR-002 — RLS desligado; autorização na camada de aplicação

## Status

**Superseded by [ADR-009](./009-acesso-ao-banco-exclusivamente-por-service-role.md)** (2026-08-12).

⚠️ **O estado descrito aqui é o que está em produção hoje.** O ADR-009 decide substituí-lo, mas **ainda não foi implementado**. Até lá, este documento descreve o comportamento real do sistema.

## Context

Após a adoção de JWT próprio ([ADR-001](./001-jwt-proprio-em-vez-de-supabase-auth.md)), as políticas RLS escritas com `auth.uid()` deixaram de funcionar: sem Supabase Auth, `auth.uid()` é sempre `NULL`, e qualquer política do tipo `auth.uid() = user_id` passa a negar tudo.

O schema inicial (`001-schema.sql`) havia habilitado RLS com políticas permissivas (`FOR ALL USING (true)`). Depois disso, as migrations oscilaram quatro vezes:

| Migration | O que fez |
|---|---|
| `001` | RLS ligado + políticas `USING (true)` |
| `002` | **RLS desligado** em `athletes`, `opponents`, `fight_analyses`; políticas removidas |
| `005` | Políticas `USING (true) WITH CHECK (true)` recriadas |
| `008` | **RLS desligado** novamente |
| `009` | **RLS desligado** novamente (reaplicando `002`) |

Os comentários das migrations mostram que a inserção de dados estava falhando e que RLS foi tratada como o obstáculo:

- `009-execute-este.sql`: *"⚠️ EXECUTE ESTE SQL NO SUPABASE PARA CORRIGIR O ERRO DE CADASTRO"* … *"IMPORTANTE: Desabilitar RLS (usamos autenticação JWT customizada no backend)"*
- `008-corrigir-constraint.sql`: *"✅ Pronto! Agora você pode cadastrar atletas sem erros de foreign key"*
- `007-tactical-analyses.sql`, na política de SELECT: *"USING (true); -- Permitir leitura (backend já valida com user_id)"*

## Decision

Desabilitar RLS nas tabelas de domínio e **tratar a camada de aplicação como o único ponto de autorização de dados**. Onde RLS ficou habilitada, usar políticas permissivas (`USING (true)`), documentando que a validação real é do backend.

Estado resultante (ver [`../DATABASE.md`](../DATABASE.md#4-estado-de-rls--visão-consolidada)):

| Tabela | RLS |
|---|---|
| `athletes`, `opponents`, `fight_analyses` | **desligada** |
| `tactical_analyses`, `ai_chat_sessions`, `analysis_versions` | ligada, `USING (true)` — sem efeito |
| `profile_versions`, `strategy_versions` | ligada, `auth.uid() = user_id` — contornada porque o código usa `service_role` |
| `api_usage` | ligada, `auth.uid() = user_id` — **bloqueia**, porque o código usa a chave anon |

A regra de autorização passou a viver em `utils/tenantScope.js#getScopeIds`, aplicada nos controllers.

## Rationale

A justificativa documentada nas migrations é **pragmática, não arquitetural**: RLS estava impedindo inserções, e desligá-la desbloqueou o desenvolvimento. O comentário *"backend já valida com user_id"* mostra que a delegação ao backend foi consciente.

**Original rationale for choosing this over reapontar as políticas para o modelo de JWT próprio could not be determined from the available repository/history.** Alternativas que teriam funcionado e não constam de nenhuma discussão no repositório: passar o `user_id` da aplicação para o Postgres via `SET LOCAL` / claims customizadas, ou acessar o banco exclusivamente com `service_role` e revogar `anon` (o que veio a ser decidido em 2026-08-12 — [ADR-009](./009-acesso-ao-banco-exclusivamente-por-service-role.md)).

Vale registrar o que **não** foi decidido junto: nada nas migrations menciona revogar os GRANTs de `anon`. Com RLS desligada e os GRANTs default do Supabase intactos, a chave anon passa a ter acesso irrestrito às tabelas — consequência que aparentemente não foi avaliada na época.

## Consequences

### Positivas

- **Desbloqueou o desenvolvimento** imediatamente.
- **Um único lugar para raciocinar sobre autorização.** `getScopeIds` tem 8 linhas e expressa a regra de negócio com precisão — é auditável de uma olhada, o que uma política RLS distribuída por 10 tabelas não seria.
- **Regras de escopo que RLS não expressaria facilmente** (admin vê o grupo inteiro via `tenant_id` auto-referente) ficaram triviais em JavaScript.

### Negativas — e são graves

- **Não existe defesa em profundidade.** Há exatamente **uma** camada de proteção de dados: o filtro no controller. Onde ela falha, o dado fica exposto sem nenhuma rede abaixo. A auditoria encontrou **6 endpoints** sem essa verificação, com leitura **e escrita** cross-tenant. Ver [`../AUTHORIZATION.md`](../AUTHORIZATION.md#known-issues).
- **A segurança depende de disciplina, não de estrutura.** `FightAnalysis.update()` e `.delete()` aceitam qualquer ID; nenhum método de `AnalysisVersion` filtra por usuário (e a tabela nem tem `user_id`). O sistema é seguro só enquanto todo controller lembrar de filtrar.
- **O banco fica alcançável sem passar pela aplicação.** Com RLS desligada e GRANTs de `anon` presumivelmente intactos, quem tiver a chave publicável fala direto com o PostgREST — sem JWT, sem rate limit, sem filtro de tenant. A chave está em `frontend/.env.production`, arquivo **rastreado pelo git**. **NEEDS_CONFIRMATION:** estado real dos GRANTs.
- **`api_usage` foi o efeito colateral não previsto.** A única tabela cuja política *não* foi neutralizada é justamente a que o código acessa com a chave anon — então a política bloqueia, e o rastreamento de custo provavelmente **nunca funcionou**. Ver [`../modules/usage-tracking.md`](../modules/usage-tracking.md).
- **Migrations contraditórias** dificultam saber o estado real: RLS foi ligada e desligada 4 vezes, e não há controle de quais migrations foram aplicadas em produção.

## Evidence

- `server/migrations/001-schema.sql` — RLS ligado + políticas permissivas iniciais
- `server/migrations/002-add-user-id.sql` — `DISABLE ROW LEVEL SECURITY` + justificativa
- `server/migrations/005-fix-policies.sql` — políticas `USING (true)` recriadas
- `server/migrations/008-corrigir-constraint.sql`, `009-execute-este.sql` — RLS desligado novamente
- `server/migrations/007-tactical-analyses.sql` — *"backend já valida com user_id"*
- `server/migrations/004-api-usage-final.sql` — `GRANT ALL ON public.api_usage TO anon, authenticated`
- `server/src/utils/tenantScope.js` — a regra de autorização resultante
- `server/src/models/FightAnalysis.js` — `update`/`delete` sem filtro de `user_id`
- `frontend/.env.production` — credenciais do projeto rastreadas no git
- [`../AUDIT.md`](../../AUDIT.md) §6, §7 — as 6 falhas de autorização, com evidência em `arquivo:linha`
