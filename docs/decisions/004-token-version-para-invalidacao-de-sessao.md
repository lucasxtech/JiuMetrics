# ADR-004 — `token_version` para invalidação imediata de sessão

## Status

**Accepted** — implementado (migration `023`, commit `f227616`).

## Context

JWT é stateless: uma vez assinado, vale até expirar. No JiuMetrics a expiração é de **7 dias**, ou **30 dias** com `rememberMe`.

Isso cria um problema concreto para operações administrativas: se um admin desativa um usuário ou rebaixa um admin a usuário comum, o token já emitido continua válido — e, se o `role` viesse do próprio token, o rebaixado continuaria admin por até 30 dias.

Não há refresh token nem lista de revogação.

O comentário da migration registra o objetivo:

> *"Used to invalidate existing JWTs immediately after role change or deactivation. When this column is incremented, any JWT with an older tokenVersion is rejected."*

## Decision

Adicionar `users.token_version INTEGER NOT NULL DEFAULT 1` e usá-lo como contador de geração de sessão:

1. O JWT carrega `tokenVersion` no payload, capturado no momento do login.
2. O `authMiddleware` compara o `tokenVersion` do token com o `token_version` do banco a cada request. Divergência → `401 "Sessão expirada. Faça login novamente."`
3. `User.invalidateTokens(userId)` incrementa a coluna, invalidando **todos** os tokens daquele usuário.
4. É chamado em `deactivate` e em `changeRole`.

Complementado por duas decisões relacionadas, no mesmo middleware:

- **`role` é lido do banco, não do token** — mesmo antes de o `token_version` mudar, um papel desatualizado no JWT nunca é usado.
- **`is_active` é reconsultado** — conta desativada é rejeitada com `403`.

Para não consultar o banco em todo request, há um cache em memória (`Map`, TTL 5 min, teto 5000 entradas, evicção FIFO), com `evictAuthCache(userId)` chamado em toda mutação sensível.

## Rationale

A motivação está documentada na migration e no código. A escolha resolve o problema real (revogação imediata) com o mínimo de estado: **uma coluna inteira**, em vez de uma tabela de sessões, um denylist de tokens ou infraestrutura de refresh token.

O trio `role` do banco + `is_active` + `token_version` é o que faz **não existir escalonamento de privilégio** neste sistema, apesar das falhas de autorização de dados documentadas em [`../AUTHORIZATION.md`](../AUTHORIZATION.md). Um JWT forjado com `role: 'admin'` não funciona, porque o campo do token simplesmente não é consultado para essa decisão.

## Consequences

### Positivas

- **Revogação imediata** de sessão em troca de papel e desativação, com custo de uma coluna.
- **Defesa contra JWT com `role` manipulado** — o campo existe no payload mas não é fonte de verdade.
- **Cache mantém o custo aceitável** (1 consulta a cada 5 min por usuário, não por request) sem abrir mão da verificação.

### Negativas

- **Granularidade grosseira:** incrementar `token_version` derruba **todas** as sessões do usuário, em todos os dispositivos. Não há como revogar uma sessão específica.
- **O cache introduz janela de inconsistência.** Em ambiente serverless o cache é **por instância**, e `evictAuthCache` limpa só a instância local — uma desativação pode levar até 5 min para valer em todas. Mitigado pelo fato de a verificação de `token_version` acontecer na próxima leitura do banco.
- **⚠️ O fallback de erro anula as três proteções ao mesmo tempo.** Se `User.getAuthInfo` lançar (banco indisponível), o middleware continua com `req.user.role = decoded.role || 'user'` — isto é, **volta a confiar no token**. Nesse estado: token de conta desativada volta a valer, `token_version` deixa de ser comparado, e o `role` do token é aceito. É a falha **HIGH** AZ-8 da auditoria: um JWT antigo de admin só precisa que o banco fique instável.
- **`reactivate` não incrementa `token_version`** (só `deactivate` e `changeRole`), o que é consistente — reativar não deveria invalidar nada — mas cria assimetria a lembrar ao mexer no fluxo.
- **`token_version` é lido de `user.token_version || 1`** no login; se a coluna estiver `NULL` num registro legado, o default `1` pode não corresponder ao valor real. **NEEDS_CONFIRMATION:** a migration define `NOT NULL DEFAULT 1`, então isso só ocorreria em dado inserido fora dela.

## Evidence

- `server/migrations/023-add-token-version.sql` — a coluna e o comentário de propósito
- `server/src/middleware/auth.js` — comparação de `tokenVersion`, leitura de `role` do banco, cache, **e o fallback problemático**
- `server/src/models/User.js` — `invalidateTokens`, `getAuthInfo`, `deactivate`
- `server/src/controllers/userController.js` — `changeRole` e `deactivateUser` chamando `invalidateTokens` + `evictAuthCache`
- `server/src/controllers/authController.js#generateToken` — inclusão de `tokenVersion` no payload
- Commit `f227616` — *"feat(auth): token invalidation, permission hardening & admin UI"*
- [`../AUTHORIZATION.md`](../AUTHORIZATION.md#known-issues) — AZ-8
