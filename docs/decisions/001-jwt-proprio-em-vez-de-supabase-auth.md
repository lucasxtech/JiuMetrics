# ADR-001 — JWT próprio em vez de Supabase Auth

## Status

**Accepted** — implementado e em produção.

## Context

O projeto usa Supabase como banco de dados. O Supabase oferece um sistema de autenticação integrado (Supabase Auth), com a tabela `auth.users` e a função `auth.uid()` disponível dentro de políticas RLS.

O schema inicial foi construído **assumindo Supabase Auth**: a migration `003-api-usage.sql` cria `api_usage.user_id` como `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, e as tabelas de domínio ganharam FKs equivalentes.

Em algum momento essa premissa foi abandonada em favor de autenticação própria. A migration `002-add-user-id.sql` registra a mudança explicitamente:

> *"Desabilitar RLS temporariamente para usar autenticação JWT customizada (Como estamos usando nosso próprio sistema JWT, não o auth.users do Supabase)"*

E a `008-corrigir-constraint.sql` remove as FKs remanescentes:

> *"Remover constraints de foreign key que referenciam auth.users"* … *"porque nosso sistema usa IDs VARCHAR, não UUIDs do auth.users"*

## Decision

Implementar autenticação própria: tabela `public.users` gerenciada pela aplicação, senhas com `bcrypt`, sessões via JWT HS256 assinado com `JWT_SECRET`, e o token transportado no header `Authorization: Bearer`.

Supabase Auth não é usado em nenhum ponto. `auth.uid()` é sempre `NULL` no contexto das queries da aplicação.

## Rationale

**Original rationale could not be fully determined from the available repository/history.** As migrations registram *o que* foi feito e que a mudança foi deliberada, mas não *por que* Supabase Auth foi descartado. O histórico do git nesse período tem mensagens genéricas (`fix`, `fix debugs`).

O que **é** possível afirmar a partir do código:

- A aplicação precisava de campos de identidade que Supabase Auth não oferece nativamente sem tabela auxiliar: `role`, `is_active`, `created_by`, `tenant_id`, `token_version`.
- O modelo de grupo (`tenant_id` auto-referente apontando para o admin-raiz) é uma regra de negócio própria, que teria de viver numa tabela de perfil de qualquer forma.
- O comentário da migration `008` sugere que a fricção imediata foi de **tipo** (`VARCHAR` × `UUID`) e de **FK falhando** no cadastro — ou seja, a decisão parece ter sido tomada sob pressão de um bug de inserção, não como escolha arquitetural planejada. Isso é inferência a partir do texto da migration, não fato documentado.

## Consequences

### Positivas

- **Controle total do modelo de identidade** — `role`, `tenant_id`, `is_active` e `token_version` vivem na mesma tabela, sem `JOIN` com uma tabela de perfil separada.
- **Validação de sessão mais forte que o padrão.** Como a aplicação controla a verificação, o `authMiddleware` consulta o banco a cada request (com cache de 5 min) e valida `role`, `is_active` e `token_version` — ver [ADR-004](./004-token-version-para-invalidacao-de-sessao.md). É a razão de **não existir escalonamento de privilégio** no sistema.
- **Sem dependência do Supabase para autenticar** — trocar de provedor de banco não exigiria migrar usuários e senhas.
- **CSRF não se aplica** — a credencial é um header, não um cookie.

### Negativas

- **RLS torna-se inútil na prática.** Toda política escrita com `auth.uid()` nunca é satisfeita. Foi a causa direta de RLS ter sido desligado ([ADR-002](./002-rls-desligado-autorizacao-na-aplicacao.md)) e de `api_usage` provavelmente **nunca ter gravado** (a política `auth.uid() = user_id` bloqueia o insert do cliente anon).
- **Foreign keys perdidas.** A `008` removeu as FKs em vez de reapontá-las para `public.users`, e converteu `user_id` para `VARCHAR(255)` em `athletes`, `opponents` e `fight_analyses`. Resultado: tipos divergentes na mesma coluna semântica (VARCHAR em 3 tabelas, UUID em 5) e **nenhuma integridade referencial** para posse de dado.
- **Efeito colateral que mascara bugs:** com `user_id` em `VARCHAR`, uma comparação com a string `'undefined'` retorna zero linhas em silêncio em vez de estourar erro de tipo. Foi exatamente o que esconde o no-op de `Athlete.updateTechnicalProfile`.
- **Responsabilidades que passaram a ser da aplicação e não foram implementadas:** recuperação de senha, verificação de e-mail, refresh token, MFA, proteção distribuída de brute force.
- **Fósseis no repositório:** `server/FIX_USER_ID.sql` ainda consulta `auth.users`; a migration `003` ainda cria FK para ela.

## Evidence

- `server/migrations/002-add-user-id.sql` — comentário explicando a troca e o `DISABLE ROW LEVEL SECURITY`
- `server/migrations/008-corrigir-constraint.sql` — remoção das FKs para `auth.users` e conversão para `VARCHAR(255)`
- `server/migrations/003-api-usage.sql` — a FK original para `auth.users(id)`
- `server/src/middleware/auth.js` — verificação de JWT + consulta ao banco
- `server/src/controllers/authController.js` — `generateToken`, `login`, `register`
- `server/src/models/User.js` — `bcrypt`, `getAuthInfo`, `invalidateTokens`
- `server/FIX_USER_ID.sql` — fóssil consultando `auth.users`
- [`../AUTHORIZATION.md`](../AUTHORIZATION.md), [`../DATABASE.md`](../DATABASE.md) §5
