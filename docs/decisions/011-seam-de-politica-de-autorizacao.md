# ADR-011 — Seam de política de autorização

## Status

**Accepted — implementado** (spec 005, 2026-08-18).

## Context

Toda a autorização de dados do JiuMetrics cabia em 8 linhas (`utils/tenantScope.js#getScopeIds`):

```js
async function getScopeIds(req, User) {
  if (req.user?.role === 'admin') return User.getGroupUserIds(req.userId);
  return [req.userId];
}
```

A regra está **correta** — implementa exatamente o requisito de produto confirmado pelo proprietário: usuário comum vê apenas os próprios dados; só admin vê o grupo. É chamada em **23 pontos** de 8 controllers.

Duas propriedades desse desenho limitavam a evolução:

1. **Recebia o `req` do Express e o model `User`.** A regra de negócio estava amarrada ao transporte HTTP — não era testável nem reutilizável fora de um request.
2. **Respondia uma pergunta só:** "quais `user_id` este ator pode ver?". Não respondia "este ator pode **esta ação** neste **recurso**?".

O roadmap do produto prevê papéis profissionais (preparador físico, nutricionista, médico) com **permissões específicas sobre informações do atleta**. Como analisado no [plano de refatoração §6](../../JIU_METRICS_REFACTORING_PLAN.md#6-autenticação-e-autorização--target), isso não é expressável por RBAC puro: exige **role + relacionamento + escopo de campo**. Se a decisão de autorização continuar espalhada em 23 chamadas a uma função que só sabe resolver escopo por tenant, cada nova dimensão de autorização exige varrer os 23 pontos de novo.

A spec 006 (correção dos 6 vazamentos de posse, ver [`AUTHORIZATION.md`](../AUTHORIZATION.md)) já ia tocar boa parte desses pontos. Fazer a extração antes dela aproveita essa passagem — fazer depois significaria uma terceira varredura pelos mesmos arquivos.

## Decision

**Criar um ponto único de decisão de autorização, desacoplado do Express, com comportamento idêntico ao anterior.**

`server/src/services/authorization.js`:

| Função | Responsabilidade |
|---|---|
| `resolveScope(actor)` | devolve os `user_id` que o ator alcança. Implementação inicial idêntica a `getScopeIds` |
| `authorize(actor, action, resource)` | assinatura estabelecida para decisões futuras por ação/recurso; implementação inicial delega a `resolveScope` |

`actor` é um objeto simples `{ id, role, tenantId }`, extraído do `req` pelo `middleware/auth.js` (que agora popula `req.actor`, ao lado do já existente `req.user`/`req.userId`) — **nunca pelo módulo de política**, que não importa Express nem lê `req`.

Os 23 call sites foram migrados para `resolveScope(req.actor)`. `getScopeIds` continua existindo em `utils/tenantScope.js`, marcado `@deprecated`, delegando ao novo módulo — nenhum call site interno o usa mais; a remoção fica para uma limpeza posterior.

**Deliberadamente sem RBAC, sem tabela de papéis, sem relacionamento profissional↔atleta, sem escopo de campo.** Esta spec entrega a costura onde essas dimensões futuras serão inseridas — não as implementa.

## Rationale

**Por que `actor` e não `req`:** o módulo de política precisa ser chamável de um teste, de um script e (futuramente) de um job, sem depender de um objeto `req` do Express. A extração do `actor` a partir do `req` fica no middleware de auth, que já produz `req.user`/`req.userId` — `req.actor` é só mais um campo populado no mesmo lugar.

**Por que estabelecer `authorize()` agora, mesmo com implementação mínima:** é a assinatura que absorve as dimensões futuras. Se apenas `resolveScope` existisse, a primeira regra por relacionamento profissional não teria onde morar e voltaria para os controllers — exatamente o problema que este seam resolve. O custo de manter uma função de ~4 linhas sem uso funcional ainda é baixo; o benefício é o endereço já existir quando o primeiro profissional entrar no produto.

**Por que `tenantId` no shape do `actor` mas não usado:** `resolveScope` resolve o grupo a partir de `actor.id` via `User.getGroupUserIds` (que internamente busca o `tenant_id`), exatamente como o `getScopeIds` que substitui — não precisa que o middleware pré-calcule `tenantId` a cada request (isso seria uma query extra em toda chamada autenticada, uma mudança de comportamento que esta spec explicitamente não queria introduzir). O campo fica reservado, `null` por enquanto, para quando uma dimensão futura precisar dele sem custo de query.

**Por que antes da spec 006, não depois:** a 006 vai alterar como o escopo chega aos models (empurrar o filtro de posse para dentro deles). Se a 006 viesse primeiro, os mesmos 23 call sites seriam tocados duas vezes — uma para mudar de `getScopeIds` para `resolveScope`, outra para ajustar a chamada ao novo contrato do model.

**Por que `services/` e não um diretório `authorization/`:** um arquivo é suficiente para o tamanho atual (2 funções). Um diretório faria sentido quando houver política por recurso — decisão menor, revisitável sem custo quando chegar a hora.

## Consequences

### Positivas

- **Ponto único de decisão testável sem HTTP** — `server/src/services/__tests__/authorization.test.js` roda sem Express, sem `req` mockado.
- **As 3 dimensões futuras (papel profissional, relacionamento, escopo de campo) têm onde morar** sem tocar os 23 call sites de novo.
- **Zero mudança de comportamento observável** — provado pelos 5 testes de baseline da spec 004 (B1–B5), que passam sem nenhuma linha alterada, e pela suíte completa (194 → 201 testes, todos verdes).
- **`getScopeIds` continua funcionando** para qualquer código externo que ainda o chame — é wrapper, não breaking change.

### Negativas

- **`authorize()` pode virar abstração vazia** se a spec 006 (ou o primeiro papel profissional) não a adotar de fato. Aceito conscientemente — ver *Rationale*. Revisitar se, quando chegar a hora, ninguém a estiver chamando.
- **Migração mecânica em 8 arquivos** é superfície para erro humano (esquecer um call site, deixar um import morto). Mitigado por `grep -rn "getScopeIds" server/src` como critério de aceitação e pela suíte de testes existente + spec 004 como rede.
- **`req.actor` e `req.user` coexistem**, carregando informação parcialmente sobreposta (`id`, `role`). Dívida deliberada — remover `req.user`/`req.userId` está fora do escopo desta spec, que preservou tudo que já existia para não ampliar o raio de mudança.

## Evidence

- `server/src/services/authorization.js` — `resolveScope`, `authorize`
- `server/src/services/__tests__/authorization.test.js` — testes de unidade, sem Express
- `server/src/utils/tenantScope.js` — wrapper `@deprecated`
- `server/src/middleware/auth.js` — `req.actor` populado nos dois caminhos (sucesso e fallback de DB)
- `grep -rn "getScopeIds" server/src` — só o wrapper e seu comentário, verificado em 2026-08-18
- 23 call sites migrados: `usageController` (1), `chatController` (2), `opponentController` (4), `fightAnalysisController` (5), `aiController` (1), `linkController` (1), `strategyController` (5), `athleteController` (4)
- `server/src/controllers/__tests__/fightAnalysisController.test.js` e `strategyController.test.js` — mocks atualizados de `utils/tenantScope` para `services/authorization`
- [specs/005-authorization-policy-seam/spec.md](../../specs/005-authorization-policy-seam/spec.md)
- [JIU_METRICS_REFACTORING_PLAN.md §6](../../JIU_METRICS_REFACTORING_PLAN.md#6-autenticação-e-autorização--target) — as três dimensões futuras e os três estágios de evolução
