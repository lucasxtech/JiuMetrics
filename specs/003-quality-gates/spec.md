# SPEC-003 — Portões de qualidade no CI

**Status: Proposed** · Etapa 1 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)

## Context

O CI do JiuMetrics tem quatro workflows e **quase nenhum portão efetivo**:

| Verificação | Estado |
|---|---|
| Testes de backend (16 suítes) | ✅ **bloqueiam** merge |
| Testes de frontend (5 arquivos) | ✅ **bloqueiam** merge |
| Lint do frontend | ❌ `continue-on-error: true` |
| Lint do backend | ❌ **não existe** — 69 arquivos sem análise estática |
| Secrets scanning (TruffleHog) | ❌ `continue-on-error: true` |
| `npm audit` | ❌ `continue-on-error: true` |
| CodeQL | roda, resultado não bloqueia |
| E2E (6 specs Playwright) | ❌ **nunca executados** |

Há um precedente documentado no próprio repositório: o `continue-on-error` foi removido dos testes de backend com a justificativa, escrita no YAML, de que era *"o motivo de 10 testes quebrados terem vivido meses no repositório sem ninguém ver"*. A mesma correção não foi aplicada aos outros portões.

E há um efeito verificado: **uma chave de API do Gemini está commitada no repositório e o scanner de segredos nunca a bloqueou**, porque roda com `continue-on-error`.

## Problem

**As specs 004–011 dependem de o CI recusar regressão.** Sem portão efetivo:

- toda correção depende de vigilância humana na revisão;
- os testes de autorização da spec 004 seriam sugestão, não rede — um PR pode mergear com eles vermelhos;
- os 69 arquivos do backend continuam sem detecção dos erros que a auditoria encontrou (variável não usada, argumento faltando, código inalcançável);
- os 6 testes E2E, que estão bem construídos com Page Objects e fixtures, permanecem investimento parado.

Existe também um item que **finge cobertura**: `server/tests/` tem 3 arquivos com extensão `.test.js` que **nunca rodam** (o `testMatch` do Jest só cobre `__tests__/`) e estão **quebrados** — um faz `require('./src/models/User')` de dentro de `server/tests/`, caminho que não existe, e outro chama `process.exit(1)`.

## Goal

Fazer o CI recusar o que hoje ele apenas comenta, para que as specs seguintes tenham uma rede real.

## Scope

1. **Remover `continue-on-error` do secrets scanning** (`.github/workflows/code-quality.yml`).
2. **ESLint no backend**: configuração flat, com o conjunto **mínimo** de regras que pegam erro real, não estilo — `no-undef`, `no-unused-vars`, `no-unreachable`, `no-dupe-keys`, `no-const-assign`. Script `npm run lint` em `server/`. Job no CI, bloqueando.
3. **Lint do frontend passa a bloquear** (remover `continue-on-error`).
4. **Playwright no CI** — com a IA mockada, contra o frontend buildado. Se instável, rodar como job **explicitamente marcado como não bloqueante**, nunca com `continue-on-error` silencioso.
5. **Remover `server/tests/`** — 3 arquivos quebrados que nunca rodam.

## Out of Scope

- **Corrigir código reprovado pelo lint além do mínimo necessário** para o job passar. Se o lint revelar 40 problemas, corrigir os que bloqueiam e registrar o resto como dívida.
- **Regras de estilo** — Prettier, `.editorconfig`, ordenação de imports, aspas. Fora.
- **`npm audit` bloqueante** — pode reprovar por vulnerabilidade transitiva sem correção disponível, travando todo merge. Manter informativo.
- **CodeQL bloqueante** — mesma razão.
- **Escrever testes novos** (spec 004).
- **Corrigir os problemas que o lint apontar** que não sejam bloqueio de merge.
- **Hooks de pre-commit.**

## Requirements

| # | Requisito |
|---|---|
| R1 | Um commit contendo segredo **reprova** o CI |
| R2 | `cd server && npm run lint` existe e passa |
| R3 | O lint do backend bloqueia merge |
| R4 | O lint do frontend bloqueia merge |
| R5 | Os 6 testes E2E executam no CI, com estado (bloqueante ou não) **explícito no workflow** |
| R6 | `server/tests/` não existe; nenhuma suíte real foi perdida |
| R7 | Nenhum comportamento de aplicação mudou |

## Technical Considerations

**Ligar lint em 69 arquivos nunca analisados pode revelar dezenas de problemas.** É o principal risco de escopo desta spec. Mitigação: começar pelo conjunto mínimo de regras acima. Ampliar é trabalho posterior, não desta spec.

**A ordem importa:** o secrets scanning só pode passar a bloquear **depois** de a chave da spec 002 ser rotacionada e o arquivo tratado — senão o CI trava em todo PR. Isso faz da spec 002 uma dependência dura.

⚠️ **A chave está no histórico do git.** Rotacionar (spec 002) resolve o risco de segurança, mas o TruffleHog pode continuar detectando o segredo histórico se rodar com `fetch-depth: 0` (é o caso hoje). Duas saídas: (a) restringir o scan ao diff do PR; (b) expurgar do histórico. **Decisão necessária antes de implementar** — a (a) é muito mais simples e cobre o caso que importa (impedir **novos** segredos).

**Playwright no CI exige** frontend buildado, backend rodando e IA mockada — os 6 specs esperam o app em `localhost`. Se a montagem desse ambiente se mostrar frágil, o valor ainda existe rodando como job informativo; o que não é aceitável é `continue-on-error` sem que ninguém saiba que não bloqueia.

**`server/tests/` não tem valor a preservar:** verificado que os 3 arquivos são scripts, não testes, e que nenhum é alcançado pelo `testMatch`.

## Acceptance Criteria

- [ ] PR com segredo plantado é **reprovado** pelo CI (verificado com segredo de teste)
- [ ] `npm run lint` existe em `server/` e passa em `main`
- [ ] Job de lint do backend bloqueia merge
- [ ] Job de lint do frontend bloqueia merge
- [ ] Job de E2E executa e o workflow declara explicitamente se bloqueia
- [ ] `server/tests/` removido; `npm test` no backend continua com 16 suítes verdes
- [ ] Nenhum arquivo de `server/src` ou `frontend/src` alterado, exceto o mínimo para o lint passar
- [ ] Problemas de lint não corrigidos estão registrados em `docs/PROJECT_STATUS.md`

## Testing Strategy

Os portões **são** o entregável. Verificações:

| O que | Como |
|---|---|
| Secrets scanning bloqueia | PR com segredo de teste → CI reprova |
| Lint do backend bloqueia | PR com `no-unused-vars` deliberado → CI reprova |
| Suíte preservada | 16 suítes verdes antes e depois |
| Nenhuma regressão de comportamento | Suítes de backend e frontend verdes sem alteração de teste |

Se alguma correção mínima para o lint passar tocar código de aplicação, ela precisa de teste que prove que o comportamento não mudou.

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/ARCHITECTURE.md` | §7 — tabela de CI: quais jobs bloqueiam |
| `CLAUDE.md` | seção *Comandos* — `npm run lint` no backend; remover "backend NÃO tem lint" |
| `docs/PROJECT_STATUS.md` | *Technical Debt* — atualizar lint e testes inertes; registrar dívida de lint remanescente |
| `CHANGELOG.md` | arquitetura/segurança: portões passam a bloquear |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| Lint revela muitos problemas e a spec incha | **Média** | Conjunto mínimo de regras; dívida registrada, não corrigida aqui |
| Secrets scanning trava todo PR por causa do segredo histórico | **Média** | Decidir antes: escanear só o diff do PR, ou expurgar o histórico |
| E2E instável no CI e vira ruído | Média | Job informativo **declarado**, nunca `continue-on-error` silencioso |
| Correção mínima para o lint muda comportamento | Baixa | Suíte verde é o portão; qualquer mudança de código exige teste |
| Remover `server/tests/` apaga algo útil | Muito baixa | Verificado: 3 scripts quebrados que nunca rodam |

## Dependencies

**Depende de:** [spec 002](../002-verification-baseline/spec.md) — a chave precisa estar rotacionada antes de o scanner bloquear.

**Bloqueia:** [spec 004](../004-authorization-safety-net/spec.md) e todas as seguintes. Sem portão, um teste vermelho não impede merge, e a rede de autorização não vale nada.
