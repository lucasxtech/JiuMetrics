# SPEC-007 — Falhas silenciosas e validação de entrada

**Status: Implemented (2026-08-18)** · Etapa 5 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)

## Context

**Duas** funcionalidades que a UI do JiuMetrics oferece estão quebradas (a auditoria dizia três — ver linha 3 da tabela). Nenhuma é bug de lógica — as duas são **incompatibilidade de contrato**, e sobreviveram porque falham dentro de um `catch` que só escreve no console:

| # | Funcionalidade | Causa |
|---|---|---|
| 1 | **Histórico de versões de perfil técnico** | `versionManager.saveProfileVersion` chama `ProfileVersion.create({person_id, summary, created_by})` (snake_case) numa função que desestrutura `{personId, content, userId}` (camelCase) → **todos os campos ficam `undefined`** → insert viola `NOT NULL` → `console.warn` + `return null`. E `getByPersonId(personId, personType)` é chamada com 2 de 3 argumentos → `.eq('user_id', undefined)` |
| 2 | **Atualização do `technical_profile`** | `Athlete.updateTechnicalProfile(id, dados)` chamada com **2 de 3 argumentos** → `.in('user_id', [undefined])` → `null` silencioso. Só não estoura erro porque `athletes.user_id` é `VARCHAR`, não `UUID` |
| ~~3~~ | ~~**Rastreamento de custo de IA**~~ | ❌ **REFUTADO em 2026-08-13** — funciona (173 linhas, US$ 3,03). A política RLS não está ativa em produção. Ver escopo item 2 |

Há um quarto defeito da mesma família: `versionManager` grava `content.technical_stats`, mas o objeto vem de `parseAnalysisFromDB`, que produz `technicalStats` — **as versões salvas perdem as estatísticas técnicas**.

✅ **E um QUINTO, descoberto ao implementar esta spec** (2026-08-18): `Athlete.updateTechnicalProfile` fazia o merge com `athlete.technical_profile`, chave que `parseAthleteFromDB` não produz. O spread era de `undefined`, então **o perfil existente seria descartado a cada análise mesmo depois de corrigida a aridade** do defeito 2. Notável: `Opponent.updateTechnicalProfile`, que a documentação descreve como cópia, lia `technicalProfile` corretamente — as duas cópias já haviam divergido. Evidência a mais para o [ADR-007](../../docs/decisions/007-unificar-athlete-e-opponent-numa-entidade-com-papel.md).

E há uma causa comum que permitiria repetir tudo: **não existe validação de entrada em nenhum endpoint**. Duas falhas HIGH da auditoria são o mesmo problema — `athlete-summary` aceita corpo arbitrário que vai direto ao LLM, e `analyze-link` aceita `videos[]` sem limite.

## Problem

Em um produto de análise, **uma funcionalidade que falha em silêncio é pior que uma que quebra**: o usuário decide com base em dado que não existe. O histórico de versões aparece vazio e parece "nunca editei"; o custo de IA aparece zerado e parece "não gastei".

E a ausência de validação de entrada é o que mantém aberta a porta para o próximo problema da mesma natureza — foi ela que permitiu `athlete-summary` aceitar corpo arbitrário e `analyze-link` aceitar `videos[]` sem limite.

## Goal

Fazer as duas funcionalidades quebradas funcionarem, fechar o vazamento de detalhe interno nas respostas de erro, e impedir que a próxima falha seja silenciosa.

## Scope

### 1. Corrigir os quatro defeitos de contrato

| Defeito | Correção |
|---|---|
| `saveProfileVersion` ↔ `ProfileVersion.create` | alinhar o contrato; **propagar o erro** em vez de `console.warn` + `null` |
| `getByPersonId` com argumento faltando | passar o escopo |
| `updateTechnicalProfile` com 2 de 3 argumentos | passar o `userId`; a função **lança** se a pessoa não for encontrada |
| `versionManager` lendo `technical_stats` | ler `technicalStats`, ou normalizar na borda |

### 2. ~~Corrigir o registro de custo~~ → ❌ **REMOVIDO DO ESCOPO** (2026-08-13)

A [spec 002](../002-verification-baseline/spec.md) **refutou** este item: `api_usage` tem **173 linhas**, de 2025-12-14 a 2026-08-12, US$ 3,0295 acumulados. A política RLS que supostamente bloqueava o insert **não está ativa em produção**.

**O que fica no lugar, com escopo menor e natureza diferente:**

- **Nada nesta spec.** Migrar `ApiUsage` para `service_role` continua desejável (hoje funciona *por acidente*, dependendo de a política estar inativa), mas passa a ser consequência natural da [spec 008](../008-database-access-lockdown/spec.md), que unifica o cliente de todo o backend.
- **Dívida nova descoberta, fora do escopo desta spec:** **55 das 173 linhas têm `estimated_cost_usd = 0`**, provavelmente por modelos ausentes de `PRICING` (a tabela histórica inclui `multi-agents (gpt-5.4)`, `gpt-4-turbo-preview`, `gpt-4.1`). Isso **subestima o gasto real** e pertence à [spec 009](../009-ai-cost-and-reliability/spec.md), junto do trabalho de custo.

**Consequência para a dependência desta spec:** a [spec 009](../009-ai-cost-and-reliability/spec.md) dependia desta para ter visibilidade de custo. **Essa dependência deixa de existir** — a visibilidade já existe.

### 3. Auditar os `catch` que engolem

Cinco locais. Para cada um, decidir explicitamente:

| Local | Decisão esperada |
|---|---|
| `versionManager.saveProfileVersion` | **propagar** |
| `apiUsageLogger` | tolerar falha (correto — custo não deve derrubar a operação), mas **registrar em campo observável**, não só console |
| `linkController` — falha ao salvar análise | **propagar** ou devolver estado explícito ao cliente |
| `strategyController` — falha ao criar versão | tolerar (B10 do plano exige que a estratégia seja entregue), mas registrar |
| `fightAnalysisController` — `refreshTechnicalSummary` | tolerar, mas registrar |

**Regra:** onde tolerar falha for intencional, o registro precisa ser observável — não um `console.warn` perdido.

### 4. Validação de entrada

✅ **P3 DECIDIDO: zod**, conforme a recomendação já registrada no plano (§12 e §14). Raciocínio completo no [ADR-012](../../docs/decisions/012-zod-para-validacao-de-entrada.md) — em resumo: manual "tende a divergir" e este repositório tem duas evidências locais disso (`processPersonAnalyses` e, descoberto aqui, `Opponent.js` × `Athlete.js`); e zod converge com o [ADR-010](../../docs/decisions/010-adotar-typescript-incrementalmente.md), porque o schema vira tipo via `z.infer` sem retrabalho.

⚠️ **Cobertura PARCIAL e declarada: 3 dos ~15 endpoints que recebem corpo** — os de `/api/ai/*`, os únicos onde corpo não validado custa dinheiro. Estender exige mapear o payload real de cada tela antes: um campo que o controller usa e o schema não declara chega `undefined` **em silêncio**, que é a própria classe de falha que esta spec combate. Cobrir 3 com payload verificado é melhor que 15 no escuro.

### 5. Parar de vazar `error.message`

`handleError` devolve `details: error.message` em ~30 handlers, expondo mensagens do PostgREST/Postgres. Condicionar a `NODE_ENV !== 'production'`. Idem nos 4 handlers que fazem isso diretamente.

**Nota:** [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) já **proíbe** esse padrão. O código viola a própria regra documentada.

## Out of Scope

- **Remover os defaults fabricados** (`age: 25`, `weight: 75`…) — muda comportamento observável; decisão de produto **P6**.
- **Quota, limite de custo, allow-list de modelos, e as 55 linhas com custo zero** — tudo isso é da [spec 009](../009-ai-cost-and-reliability/spec.md). Esta spec não toca custo.
- **Sink de XSS** (spec 010).
- **Fallback de autenticação que abre em falha de banco** — pertence a auth; tratar junto da spec 006 ou em spec própria.
- **Logging estruturado** (logger com nível, request id, PII redigida) — melhoria de observabilidade, spec própria.
- **Corrigir os 6 vazamentos de autorização** (spec 006).
- **Validar todos os endpoints** — começar pelos que recebem corpo.

## Requirements

| # | Requisito |
|---|---|
| R1 | `profile_versions` volta a gravar (está quebrado desde 2026-01-16; a tabela tem 5 linhas antigas) |
| R2 | `technical_profile` do atleta muda após criar análise |
| ~~R3~~ | ❌ **removido** — já é verdade (verificado: 173 linhas, US$ 3,03). Ver escopo item 2 |
| R4 | Versões salvas contêm as estatísticas técnicas |
| R5 | Nenhum `catch` no caminho de persistência devolve `null` silencioso |
| R6 | Onde a falha é tolerada, ela é observável |
| R7 | Endpoints que recebem corpo validam schema |
| R8 | `analyze-link` rejeita `videos[]` acima do limite |
| R9 | Nenhuma resposta de produção contém `error.message` |

## Technical Considerations

**⚠️ Propagar erro muda comportamento observável.** Operações que hoje "funcionam" (com falha oculta) passarão a **retornar erro**. Isso é correto, mas parece regressão para quem usa. Exemplo: salvar resumo de perfil hoje devolve 200 com a versão silenciosamente não gravada; depois pode devolver 500 se o insert falhar de verdade. **Comunicar antes.**

**Validação pode rejeitar o que o frontend envia hoje.** Antes de escrever qualquer schema, **mapear o que o frontend realmente manda** em cada endpoint — inclusive campos extras que ninguém documentou. Um schema estrito demais quebra a tela.

**Ordem interna importa menos do que a spec original supunha**, agora que o registro de custo saiu do escopo. As duas correções de contrato e a validação de entrada são independentes entre si — três PRs em qualquer ordem.

**As três correções são independentes entre si** — três PRs separados, cada um com seu teste.

**Sobreposição com a spec 006:** os `catch` auditados aqui podem estar nos mesmos caminhos que a 006 altera. Se as duas rodarem em paralelo (o plano permite), coordenar para não haver conflito nos mesmos arquivos — em especial `chatController` e `linkController`.

**Como testar as três falhas:** um teste que verifique **apenas o status HTTP passaria com o bug presente** — todas as três devolvem 200 hoje. O teste precisa **consultar a linha no banco**. Isso vale para R1, R2, R3 e R4.

## Acceptance Criteria

- [x] Teste de integração: salvar resumo de perfil **cria linha** em `profile_versions` — verificando a linha, não o status
- [x] Teste de integração: criar análise **altera** `athletes.technical_profile` (+ um caso provando que o merge **preserva** o perfil anterior)
- [~] Teste de integração: operação de IA **cria linha** em `api_usage` — **fora do escopo desta spec** (o item 2 foi removido: a spec 002 refutou a falha, medindo 173 linhas e US$ 3,03)
- [x] Teste de integração: versão salva contém as estatísticas técnicas
- [ ] ⚠️ **NÃO verificado: histórico de versões de perfil aparecendo na UI.** Exige rodar a aplicação contra um banco; declarado, não silenciado
- [~] Telas de custo mostram valor diferente de zero — já mostravam (item 2 removido do escopo)
- [x] `analyze-link` com `videos[]` acima do limite → 400 **sem chamar a IA** (asserção explícita de que `analyzeFrame` não foi chamada)
- [x] Resposta de produção sem `details: error.message` — teste afirma o payload **inteiro** com `NODE_ENV=production`
- [x] Os 5 `catch` auditados, com a decisão registrada em comentário
- [x] 25 suítes verdes (não 16 — a suíte cresceu nas specs 004–007); ⚠️ **E2E continua não executado**, pendência herdada da spec 003
- [x] `CLAUDE.md` sem a advertência das funcionalidades quebradas — substituída pela **causa** delas, que é o risco que permanece

## Testing Strategy

| Nível | O que |
|---|---|
| **Contrato (unidade)** | `saveProfileVersion` → `ProfileVersion.create` com fixture do shape **real**; `parseAnalysisFromDB` × leitores de `technical_stats` |
| **Integração (crítico)** | as quatro correções, **verificando a linha no banco** — não o status HTTP |
| **Unidade** | `updateTechnicalProfile` **lança** quando a pessoa não é encontrada |
| **Unidade** | schema de validação: aceita o payload real do frontend, rejeita o inválido |
| **Integração** | `handleError` não inclui `message` com `NODE_ENV=production` |
| **Regressão** | as 16 suítes; E2E dos fluxos que passam pelos `catch` alterados |

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/PROJECT_STATUS.md` | remover as 3 falhas de *Known Issues* HIGH; atualizar *Implemented* |
| `CLAUDE.md` | **remover a seção das três funcionalidades que nunca funcionaram**; ajustar as regras 2 e 6 de *Security* |
| `docs/modules/chat-and-versions.md` | versionamento de perfil passa a funcionar |
| `docs/modules/athletes-opponents.md` | `technical_profile` passa a atualizar |
| `docs/modules/usage-tracking.md` | **reescrita substancial** — o módulo passa a funcionar |
| `docs/DOMAIN.md` | invariantes 6 e 10 passam a ser garantidas |
| `docs/DATABASE.md` | `api_usage` e `profile_versions` deixam de estar vazias; cliente usado por `ApiUsage` |
| `docs/ARCHITECTURE.md` | §3 — validação de entrada passa a existir |
| `docs/decisions/` | ADR sobre a escolha do validador (P3) |
| `CHANGELOG.md` | `fix:` — três funcionalidades que nunca funcionaram; segurança (vazamento de erro) |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| **Propagar erro expõe falhas até agora ocultas** | **Média** | É o objetivo. Comunicar; avaliar cada `catch` individualmente |
| **Validação rejeita payload real do frontend** | **Média** | Mapear o que o frontend envia **antes** de escrever schema; começar permissivo |
| Diagnóstico do custo está errado (spec 002 refuta) | **Média** | Portão: só implementar o item 2 depois da confirmação |
| Novo erro lançado é engolido por `catch` a montante | Média | Auditar a cadeia completa, não só o ponto da correção |
| Conflito de arquivo com a spec 006 rodando em paralelo | Média | Coordenar `chatController` e `linkController` |
| Corrigir `updateTechnicalProfile` revela dado inconsistente acumulado | Baixa | O campo está desatualizado desde sempre; a primeira execução vai preenchê-lo. Não é perda |

## Dependencies

**Depende de:** [spec 002](../002-verification-baseline/spec.md) — confirmação das três falhas. Se `api_usage` tiver linhas, o item 2 precisa ser reinvestigado. ✅ Tinha: item 2 removido do escopo.
**Decisões:** ✅ **P3 — zod** ([ADR-012](../../docs/decisions/012-zod-para-validacao-de-entrada.md)). ✅ **P5 — corrigir, não remover** o versionamento de perfil: o componente existe na UI e a tabela tem 5 linhas de quando funcionava; remover seria decisão de produto, corrigir é reversível.

**Independente das specs 005–006** — pode rodar em paralelo, com coordenação de arquivos.

**Bloqueia:** [spec 009](../009-ai-cost-and-reliability/spec.md) (quota exige medição), [spec 010](../010-frontend-consolidation/spec.md) (normalização exige saber o shape correto).
