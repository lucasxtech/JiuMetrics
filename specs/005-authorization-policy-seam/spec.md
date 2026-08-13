# SPEC-005 — Seam de política de autorização

**Status: Proposed** · Etapa 3 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)

## Context

Toda a autorização de dados do JiuMetrics cabe em 8 linhas ([`utils/tenantScope.js`](../../server/src/utils/tenantScope.js)):

```js
async function getScopeIds(req, User) {
  if (req.user?.role === 'admin') return User.getGroupUserIds(req.userId);
  return [req.userId];
}
```

A regra está **correta** e implementa exatamente o requisito de produto confirmado pelo proprietário: usuário comum vê apenas os próprios dados; só admin vê o grupo. É chamada em **23 pontos** dos controllers.

Duas propriedades desse desenho limitam a evolução:

1. **Recebe o `req` do Express e o model `User`.** A regra de negócio está amarrada ao transporte HTTP — não é testável nem reutilizável fora de um request.
2. **Responde uma pergunta só:** "quais `user_id` este ator pode ver?". Não responde "este ator pode **esta ação** neste **recurso**?".

O roadmap do produto prevê papéis profissionais (preparador físico, nutricionista, médico) com **permissões específicas sobre informações do atleta**. Como analisado no [plano](../../JIU_METRICS_REFACTORING_PLAN.md#6-autenticação-e-autorização--target) §6.2, isso não é expressável por RBAC puro: exige **role + relacionamento + escopo de campo**.

## Problem

Se a decisão de autorização continuar espalhada em 23 chamadas a uma função que só sabe resolver escopo por tenant, então **cada nova dimensão de autorização exige varrer os 23 pontos de novo**.

A spec 006 já vai tocar boa parte desses pontos para corrigir os 6 vazamentos. Fazer a extração agora aproveita essa passagem. Fazer depois significa uma terceira varredura pelos mesmos arquivos.

Não é problema de estética: é o custo concreto de adicionar o primeiro profissional ao produto.

## Goal

Criar um **ponto único de decisão de autorização**, desacoplado do Express, com **comportamento idêntico** ao atual.

Esta spec deliberadamente **não entrega ganho funcional**. Entrega a costura onde as dimensões futuras serão inseridas sem tocar call sites.

## Scope

1. **Criar o módulo `authorization`** (`server/src/authorization/` ou `server/src/services/authorization.js` — decisão de layout, não de arquitetura), com:

| Função | Responsabilidade |
|---|---|
| `resolveScope(actor)` | devolve os `user_id` que o ator alcança. **Inicialmente idêntico a `getScopeIds`** |
| `authorize(actor, action, resource)` | assinatura estabelecida; implementação inicial delega a `resolveScope` |

2. **Definir o conceito de `actor`** — um objeto simples (`{ id, role, tenantId }`), extraído do `req` **pelo middleware**, não pelo módulo de política. O módulo nunca vê `req`.
3. **Migrar os 23 call sites** para o novo módulo.
4. **`getScopeIds` fica como wrapper deprecado**, delegando ao novo módulo, com comentário apontando o substituto. Remoção numa limpeza posterior.
5. **Testes de unidade** do módulo, sem Express.

## Out of Scope

- **Roles, permissions, tabela de papéis** — nada de RBAC.
- **Relacionamentos profissional ↔ atleta** — nenhuma tabela nova.
- **Escopo de campo.**
- **Qualquer mudança de comportamento observável.** Se uma resposta de API muda, a spec falhou.
- **Corrigir os 6 vazamentos** (spec 006).
- **Aplicar escopo nos models** (spec 006).
- **Middleware de autorização por rota** — a decisão continua sendo chamada pelo controller.
- **Remover `getScopeIds`** — fica como wrapper.

## Requirements

| # | Requisito |
|---|---|
| R1 | O módulo `authorization` é testável **sem** Express e sem HTTP |
| R2 | `resolveScope` produz **exatamente** o mesmo resultado que `getScopeIds` para os dois papéis |
| R3 | Zero referência a `getScopeIds` fora do wrapper deprecado |
| R4 | Nenhuma resposta de API mudou |
| R5 | Todos os testes da spec 004 passam **sem modificação** |
| R6 | A assinatura `authorize(actor, action, resource)` existe e está documentada, mesmo com implementação mínima |

## Technical Considerations

**Por que `actor` e não `req`:** o módulo de política precisa ser chamável de um teste, de um script e (futuramente) de um job. Receber `req` impede isso. A extração do `actor` a partir do `req` fica no middleware de auth, que já produz `req.user` e `req.userId`.

**Por que estabelecer `authorize()` agora, mesmo trivial:** é a assinatura que absorve as dimensões futuras. Se apenas `resolveScope` existir, a primeira regra por relacionamento não terá onde morar e voltará para os controllers — que é o problema que esta spec resolve.

**Risco de migração incompleta.** São 23 pontos em 8 controllers. Mitigação: `grep` por `getScopeIds` deve retornar apenas o wrapper; e os testes de baseline da spec 004 (B1–B5) cobrem o comportamento.

**Ordem em relação à spec 006.** Esta vem **antes** porque a 006 vai alterar como o escopo chega aos models. Se a 006 viesse primeiro, os mesmos call sites seriam tocados duas vezes.

**`authorization` não pode importar controller nem model de domínio.** Pode importar `models/User` (precisa compor o tenant). É a única dependência permitida, e está registrada em §4.2 do plano.

**Layout de diretório é decisão menor.** Um arquivo em `services/` é suficiente para o tamanho atual; um diretório faz sentido quando houver políticas por recurso. Não vale bikeshedding — o que importa é ser um ponto único.

## Acceptance Criteria

- [ ] Módulo `authorization` existe e seus testes rodam **sem** Express
- [ ] `resolveScope(actor)` cobre admin (tenant) e usuário comum (próprio id)
- [ ] `authorize(actor, action, resource)` existe, documentada, com implementação mínima
- [ ] `grep -rn "getScopeIds" server/src` retorna **apenas** o wrapper deprecado e seus usos internos
- [ ] Todos os testes da spec 004 passam **sem uma linha alterada**
- [ ] Diff de comportamento vazio: mesmas respostas para as mesmas requisições
- [ ] Wrapper `getScopeIds` marcado como deprecado, apontando o substituto
- [ ] ADR novo registrando a decisão do seam

## Testing Strategy

| Nível | O que |
|---|---|
| **Unidade (novo)** | `resolveScope`: admin devolve todos os ids do tenant; usuário devolve `[próprio id]`; ator sem role trata como usuário comum |
| **Unidade (novo)** | `authorize`: assinatura estável; comportamento inicial equivalente a `resolveScope` |
| **Regressão (spec 004)** | B1–B5 passam **sem modificação** — é a prova principal de que nada mudou |
| **Regressão (existente)** | as 16 suítes de backend passam. Os testes que mockam `utils/tenantScope` podem precisar mockar o novo módulo — **essa alteração é permitida e esperada**, e é a única exceção a R5 |

⚠️ Nota sobre R5 vs os mocks existentes: três suítes de controller fazem `jest.mock('../../utils/tenantScope')`. Ao migrar os call sites, esses mocks passam a apontar para o lugar errado. **Atualizá-los é parte do escopo** e não viola R5, que se refere aos testes **novos** da spec 004 (que testam via API, não via mock).

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/AUTHORIZATION.md` | *Current Implementation* §5 — a regra passa a viver no módulo de política; *Future Direction* — atualizar o Estágio 1 como concluído |
| `docs/ARCHITECTURE.md` | §3 (camadas) e §5 — incluir `authorization` |
| `docs/decisions/` | **ADR novo** — seam de política: contexto, decisão, por que não RBAC agora, consequências |
| `CLAUDE.md` | *Authorization* — o padrão obrigatório passa a citar o novo módulo |
| `docs/modules/users-and-admin.md` | *Not Responsible For* — `getScopeIds` sai deste módulo |
| `CHANGELOG.md` | `refactor:` — sem mudança de comportamento |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| Migração incompleta deixa call site no caminho antigo | **Média** | `grep` como critério de aceitação; wrapper mantém o antigo funcionando durante a transição |
| Mudança sutil de comportamento na extração | **Média** | Testes de baseline da spec 004 são o portão; diff de comportamento vazio é critério |
| `authorize()` vira abstração vazia que ninguém usa | Média | Aceito consciente: o custo é ~1 função; o benefício é o endereço existir. Se a spec 006 não a usar, revisitar |
| Bikeshedding sobre layout de diretório | Baixa | Declarado como decisão menor |
| Mocks de `tenantScope` nos testes existentes quebram | Baixa | Esperado; atualizar é escopo |

## Dependencies

**Depende de:** [spec 004](../004-authorization-safety-net/spec.md) — os testes de baseline (B1–B5) são a única prova de que esta refatoração não muda comportamento.

**Bloqueia:** [spec 006](../006-ownership-in-data-access/spec.md) — que consome o escopo resolvido por este módulo.

**Habilita (futuro, sem spec):** papéis profissionais, relacionamentos, escopo de campo — as três dimensões analisadas em §6 do plano.
