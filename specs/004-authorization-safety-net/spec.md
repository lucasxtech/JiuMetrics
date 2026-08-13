# SPEC-004 — Rede de testes de autorização

**Status: Proposed** · Etapa 2 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)

## Context

A auditoria encontrou **6 endpoints sem verificação de posse** e 1 chamada de escrita desprotegida dentro de um endpoint correto. Qualquer usuário autenticado lê e **sobrescreve** dados de qualquer outro tenant.

**Nenhuma dessas falhas seria detectada pela suíte atual** (16 suítes de backend, 5 de frontend, 6 E2E que nunca rodam).

Há uma descoberta que determina o desenho desta spec: **os testes de controller mockam os models**.

```js
jest.mock('../../models/FightAnalysis');
jest.mock('../../utils/tenantScope');
```

Consequência: um teste de controller **nunca poderá provar ownership**, porque o model que faria o filtro foi substituído por um mock que devolve o que o teste mandar. Esses testes passariam com o bug presente — e passam hoje.

Isso invalida o instinto natural ("testar autorização nos controllers") e obriga a rede a ficar em outro nível.

## Problem

Sem teste que **falhe hoje**, corrigir 6 endpoints de autorização é confiança, não verificação.

Escrever o teste **depois** da correção não prova que a correção funciona — prova apenas que o teste concorda com o código que acabou de ser escrito. É exatamente o tipo de garantia que já falhou três vezes neste projeto (as três funcionalidades que a UI oferece e que nunca funcionaram sobreviveram a uma suíte verde).

E há um risco específico na spec 006: exigir escopo pode **quebrar funcionalidade legítima** — o admin operando sobre dado de um membro do grupo. Sem um baseline que capture o comportamento correto de admin, esse dano é invisível.

## Goal

Produzir uma rede que:

1. **falhe hoje**, nos 6 endpoints, comprovando o vazamento;
2. **capture o comportamento correto de admin** como baseline, para que as specs 005 e 006 não o quebrem;
3. viva no nível onde ownership é realmente observável.

Ao final desta spec, o repositório tem testes vermelhos **intencionais e documentados**. Nenhuma correção é feita.

## Scope

1. **Adicionar `supertest`** como devDependency do backend. ⚠️ **Decisão pendente P1** — é a única dependência nova que o plano propõe.
2. **Fixtures de dois tenants**, com dois usuários cada (1 admin + 1 comum por tenant), e dados de domínio em cada: atleta, adversário, análise de luta, estratégia, sessão de chat, versões.
3. **Testes de vazamento** — devem **falhar**:

| # | Endpoint | Prova |
|---|---|---|
| 1 | `POST /api/chat/manual-edit` | usuário do tenant A **não** sobrescreve análise do tenant B |
| 2 | `GET /api/chat/versions/:analysisId` | usuário de A **não** lê versões de análise de B |
| 3 | `POST /api/chat/restore-version` | usuário de A **não** reverte análise de B |
| 4 | `POST /api/chat/apply-edit` (`sessionId`) | usuário de A **não** altera `context_snapshot` de sessão de B |
| 5 | `POST /api/ai/analyze-link` | usuário de A **não** cria análise vinculada a `personId` de B |
| 6 | `POST /api/ai/athlete-summary` | corpo arbitrário é rejeitado; o endpoint não opera sobre dado alheio |

4. **Testes de baseline** — devem **passar** hoje e continuar passando:

| # | Prova |
|---|---|
| B1 | usuário comum lê **apenas** os próprios dados em todos os endpoints de listagem |
| B2 | admin lê dados de **todos** os membros do próprio tenant |
| B3 | admin **não** lê dados de outro tenant |
| B4 | admin **escreve** sobre dado de membro do grupo (o comportamento que a spec 006 pode quebrar) |
| B5 | recurso fora do escopo devolve **404**, não 403 |

5. **Testes de unidade de `getScopeIds`** como baseline da regra (admin → tenant; user → próprio id), para a spec 005 provar equivalência.
6. **Documentar as falhas esperadas** — cada teste vermelho referencia o AZ correspondente de [`docs/AUTHORIZATION.md`](../../docs/AUTHORIZATION.md).

## Out of Scope

- **Qualquer correção.** Nenhuma linha de `server/src` muda.
- **Refatorar os testes existentes** — os 16 suítes continuam como estão.
- **Testes de regra de negócio, custo, IA ou frontend** (specs 007, 009, 010).
- **Cobertura ampla de endpoints** — só os 6 com falha e os 5 de baseline.
- **Substituir os mocks dos testes de controller** — eles continuam válidos para o que testam (orquestração).

## Requirements

| # | Requisito |
|---|---|
| R1 | 6 testes de vazamento existem e **falham**, com o motivo documentado |
| R2 | 5 testes de baseline existem e **passam** |
| R3 | Testes de unidade de `getScopeIds` capturam a regra atual |
| R4 | Fixtures de dois tenants são reutilizáveis pelas specs seguintes |
| R5 | O CI executa os testes e a falha é **visível e intencional** |
| R6 | Nenhum arquivo de `server/src` foi alterado |

## Technical Considerations

**Onde a rede fica** — três níveis, cada um provando algo diferente:

| Nível | Prova | Ferramenta |
|---|---|---|
| **API** | a requisição inteira respeita o escopo | `supertest` sobre o `app` |
| **Model (integração)** | a query realmente filtra | Jest + banco de teste |
| **Política (unidade)** | a regra de escopo está certa | Jest puro |

**`supertest` funciona sem abrir porta** — `server/index.js` já faz `module.exports = app`, e o `listen` é condicionado a `NODE_ENV !== 'production'`. Verificado.

⚠️ **Decisão pendente P2 — ambiente de banco.** Duas opções:

| Opção | Prova | Custo |
|---|---|---|
| **Supabase de teste** | a query real, com PostgREST real | precisa de projeto e seed |
| **Fake de PostgREST** | apenas que o filtro foi *pedido* | rápido, sem infra |

**Recomendação: Supabase de teste.** O fake não valida a query — e a query **é** exatamente o que está errado. Um fake que aceite `.in('user_id', [...])` sem executá-lo passaria mesmo com o filtro ausente no `WHERE` final.

**Como manter testes vermelhos no CI sem travar tudo:** marcá-los com `test.failing()` (Jest 29 suporta) ou agrupá-los numa suíte separada, executada e reportada mas não bloqueante — **com o estado declarado**. Na spec 006 eles passam a bloquear. Nunca usar `skip`: um teste pulado é invisível.

**`athlete-summary` é diferente dos outros cinco.** Hoje ele aceita `athleteData` inteiro do corpo, sem noção de posse — não há "dado alheio" a acessar, porque ele não busca nada. O teste deve provar que **corpo arbitrário não deveria ser aceito**, e vai naturalmente virar um teste de contrato quando a spec 006 mudar o endpoint para receber `athleteId`.

## Acceptance Criteria

- [ ] `supertest` em `devDependencies` do backend (após aprovação de P1)
- [ ] Fixtures criam 2 tenants × 2 usuários × dados de domínio completos
- [ ] Os 6 testes de vazamento **falham**, cada um referenciando seu AZ
- [ ] Os 5 testes de baseline **passam**
- [ ] Teste de unidade de `getScopeIds` cobre admin e usuário comum
- [ ] CI executa e reporta; estado (bloqueante ou não) declarado no workflow
- [ ] `git diff server/src` **vazio**
- [ ] `docs/PROJECT_STATUS.md` registra a existência da rede e o estado vermelho intencional

## Testing Strategy

Esta spec **é** a estratégia de teste. O que ela não faz:

- não busca cobertura percentual;
- não testa componentes React;
- não chama o Gemini real (IA mockada onde o fluxo a envolver);
- não testa getters nem wrappers de axios.

**Regra de processo:** cada teste de vazamento precisa ser **verificado falhando** antes de a spec ser considerada pronta. Um teste que nunca falhou não prova nada.

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/PROJECT_STATUS.md` | *Technical Debt* — testes de autorização passam de "não existem" para "existem, vermelhos" |
| `docs/AUTHORIZATION.md` | cada AZ ganha referência ao teste que o comprova |
| `CLAUDE.md` | *Change Process* item 5 — apontar as fixtures como ponto de partida |
| `JIU_METRICS_REFACTORING_PLAN.md` | §10 — registrar a decisão de P2 |
| `CHANGELOG.md` | `test:` — rede de autorização |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| Ambiente de banco de teste não viável | **Média** | Decisão P2; fallback é fake de PostgREST, com cobertura menor **declarada** |
| `supertest` recusado (P1) | Média | Fallback: testes de model + E2E via Playwright. Ciclo mais lento, cobertura menor |
| Testes vermelhos no CI geram ruído e viram normal | **Média** | Estado declarado no workflow; a spec 006 os torna bloqueantes. Nunca `skip` |
| Fixtures acoplam-se ao schema atual e a spec 011 as quebra | Média | Fixtures via API (não `INSERT` direto) onde possível, para sobreviverem a mudança de schema |
| Escrever teste revela um 7º vazamento | Baixa | Bem-vindo. Documentar e incluir no escopo da spec 006 |

## Dependencies

**Depende de:** [spec 003](../003-quality-gates/spec.md) — sem CI que bloqueie, teste não é rede.
**Decisões pendentes:** P1 (`supertest`), P2 (ambiente de banco).

**Bloqueia:** [spec 005](../005-authorization-policy-seam/spec.md) (precisa do baseline para provar equivalência) e [spec 006](../006-ownership-in-data-access/spec.md) (precisa dos testes vermelhos para provar a correção).
