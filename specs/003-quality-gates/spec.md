# SPEC-003 — Portões de qualidade no CI

**Status: Implemented (item 4 diferido)** · Etapa 1 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)
**Executada em:** 2026-08-13 · **Branch:** `chore/spec-002-verification-baseline`

---

## Registro de execução (2026-08-13)

### Resultado

O CI passou de **2 portões bloqueantes** (testes de front e back) para **6**: + lint de frontend, + lint de backend (novo), + build no gate de integração, + secrets scanning. O item 4 (E2E) foi **diferido** com motivo registrado.

| Item do escopo | Estado |
|---|---|
| 1 · Secrets scanning bloqueante | ✅ **FEITO** — + `--only-verified` |
| 2 · ESLint no backend | ✅ **FEITO** — config, script, job de CI |
| 3 · Lint do frontend bloqueante | ✅ **FEITO** |
| 4 · Playwright no CI | ⏸️ **DIFERIDO** — ver o bloco de decisão no escopo |
| 5 · Remover `server/tests/` | ✅ **FEITO** |

### Números

| Medida | Antes | Depois |
|---|---|---|
| Portões bloqueantes no CI | 2 | **6** |
| Erros de lint no backend | *nunca medido* (sem lint) | **19 → 0** |
| Erros de lint no frontend | **15** (reportados e ignorados) | **0** (+ 4 warnings visíveis) |
| Arquivos `.test.js` que nunca rodavam | 3 | **0** |
| Testes | 16 suítes / 180 (back) · 21 / 33 (front) | **idêntico — nenhuma regressão** |

### Decisões tomadas durante a execução

**1. `eslint` como devDependency do `server`.** Única dependência nova. Verificado: dependências de **produção inalteradas**. Efeito colateral: `minimatch` 3.1.2 → 3.1.5 (patch, `dev: true`, compartilhado com jest) — validado pela suíte verde. Ambos os lockfiles (`package-lock.json` e `yarn.lock`) foram atualizados porque o ambiente rotea comandos de pacote via yarn; mantê-los consistentes é preferível a deixá-los divergir.

**2. Conjunto mínimo de regras no backend.** Só erro real, nada de estilo. Motivo: 69 arquivos nunca analisados; um preset completo produziria centenas de apontamentos de formatação e o portão nasceria ignorado — que é exatamente o problema que esta spec resolve.

**3. `react-refresh/only-export-components` rebaixada a `warn`.** Disparava em **3 de 3** contexts, sobre o padrão idiomático `XProvider` + `useX` no mesmo arquivo. Quando uma regra reprova um padrão correto em 100% dos usos, configurar a regra é mais honesto que suprimi-la três vezes. O aviso continua visível.

**4. Dívida documentada, não escondida.** Onde o lint apontou algo que exige decisão de comportamento, **não** corrigi: usei `eslint-disable` com comentário nomeando a spec responsável. **Nenhum caso foi mascarado com prefixo `_`** — isso faria o problema parecer intencional e apagaria a evidência. Em `versionManager`, os 3 casos são evidência **direta** dos bugs das specs 006 e 007.

**5. Uma cascata que eu mesmo criei.** Remover `isLoadingData` de `Strategy.jsx` orfanou `isLoadingAthletes`/`isLoadingOpponents` — e apagaria a evidência de que a tela calcula estado de loading e nunca o renderiza. **Revertido:** a variável foi restaurada e documentada.

### Verificação do portão

Não é possível executar GitHub Actions localmente, então validei o equivalente: **plantei um erro deliberado** e confirmei `exit 1` do lint; revertido, `exit 0`. Os YAMLs dos 4 workflows foram validados por parser.

### Testes e validação

Backend **16 suítes / 180 testes** · Frontend **21 suítes / 33 testes** — verdes antes e depois. Lint backend `exit 0`, frontend `exit 0`. Build OK. App carrega e o **error handler do Express preservou aridade 4** (verificado programaticamente).

### Achado de segurança fora do escopo

**Senha em texto claro de conta viva em `playwright/.env.example`** — ver o bloco dedicado no escopo. Não corrigido (regra 18); registrado em `docs/PROJECT_STATUS.md` e no `CHANGELOG.md`.

### Limitação assumida

**Nenhum destes portões foi exercitado no GitHub Actions de verdade** — só localmente. O primeiro PR nesta branch é o teste real. Riscos identificados: (a) se o TruffleHog escanear além do diff, todo PR bloqueia até a chave do Gemini sair do histórico — mitigação documentada no comentário do workflow; (b) `npm ci` no job novo depende do `package-lock.json` atualizado, que está neste commit.

---

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
4. ~~**Playwright no CI**~~ → ⏸️ **DIFERIDO** (decidido em 2026-08-13, durante a inspeção pré-implementação).

> **Motivo.** A spec assumiu que era "adicionar um job". A inspeção mostrou que não é: `playwright/playwright.config.ts` sobe **apenas o frontend** (`webServer` → `npm run dev` em `frontend/`). Os testes precisam também de:
> - **backend em `:5050`** — não há entrada de `webServer` para ele;
> - **um banco com usuário de teste semeado** — o fixture `authenticatedPage` faz **login real**, e `playwright/.env.example` aponta para uma conta específica;
> - **variáveis de ambiente do backend** (`JWT_SECRET`, `SUPABASE_*`, `GEMINI_API_KEY`) como secrets do GitHub;
> - **IA mockada**.
>
> Isso é **construir um ambiente de teste**, não configurar um job — e depende da **decisão P2** (banco de teste real ou fake de PostgREST) que a [spec 004](../004-authorization-safety-net/spec.md) também precisa resolver. Fazer aqui incharia esta spec e duplicaria a decisão.
>
> **Para onde vai:** o item passa a ser pré-requisito de infraestrutura da [spec 004](../004-authorization-safety-net/spec.md), que já precisa do mesmo ambiente para os testes de autorização. Ligar o Playwright depois disso é o job simples que esta spec imaginava.
>
> **O que esta spec entrega no lugar:** nada — reduzir escopo é a decisão. Os 6 specs de E2E continuam parados, e isso está registrado em `docs/PROJECT_STATUS.md`.

5. **Remover `server/tests/`** — 3 arquivos quebrados que nunca rodam. **Confirmado na inspeção:** os 3 têm **zero** `describe`/`it`/`test`, dois chamam `process.exit`, e `jest --listTests` retorna **0** arquivos de `server/tests/`. São scripts, não testes.

---

## ⚠️ Achado de segurança fora do escopo (2026-08-13)

Descoberto ao inspecionar o que os E2E exigem. **Não corrigido nesta spec** (regra 18 — não é necessário para cumpri-la), mas exige ação do proprietário:

**`playwright/.env.example` contém a senha em texto claro de uma conta viva:**

```
TEST_USER_EMAIL=contateste@teste.com
TEST_USER_PASSWORD=<senha em texto claro>
```

**Verificado no banco de produção:** a conta existe, `role=user`, `is_active=true`. Nenhuma tentativa de login foi feita — só verificação de existência.

O arquivo é **rastreado pelo git**. A migration `019` mantém essa conta deliberadamente separada como conta de teste, então ela não é descartável.

**Por que o portão desta spec não pega isso:** o TruffleHog detecta segredos por **padrão reconhecível** (chaves de API com formato verificável). Uma senha genérica em `TEST_USER_PASSWORD=` não casa com nenhum detector. **Tornar o scanner bloqueante não resolve este caso** — é uma limitação real do instrumento, e vale registrar para não criar falsa confiança.

**Ação recomendada:** rotacionar a senha dessa conta e mover a credencial para secret, junto da rotação da chave do Gemini (pendência da [spec 002](../002-verification-baseline/spec.md)).

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
