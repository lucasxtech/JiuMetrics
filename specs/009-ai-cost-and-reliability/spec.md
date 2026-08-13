# SPEC-009 — Custo e confiabilidade de IA

**Status: Proposed** · Etapa 7 do [plano de refatoração](../../JIU_METRICS_REFACTORING_PLAN.md)

## Context

A camada de IA do JiuMetrics foi modernizada na Fase 1 ([ADR-006](../../docs/decisions/006-camada-unica-de-llm-e-aposentadoria-do-multi-agente.md)) e é a parte melhor construída do sistema: `services/llm.js` é fronteira única com o SDK, análise e estratégia usam `responseSchema`, e existe taxonomia de erro tipada.

Restam quatro lacunas, todas com consequência mensurável:

1. **Nenhum controle de gasto.** `resolveModel` aceita **qualquer string** de modelo vinda do cliente; `analyze-link` itera `videos[]` **sem limite**, e cada item é uma inferência de vídeo em `gemini-2.5-pro` — a operação mais cara do sistema. O rate limiting é `MemoryStore` em serverless, portanto **inoperante**. E o registro de custo provavelmente nunca gravou (corrigido na [spec 007](../007-silent-failures-and-input-validation/spec.md)).
2. **Nenhum retry, nenhum timeout de inferência.** Uma quota estourada ou 5xx transitório perde a operação inteira — **inclusive depois** de baixar o vídeo e enviá-lo à Files API. O custo já foi consumido quando a falha ocorre.
3. **Análise histórica não é reproduzível.** `metadata` guarda modelo e tokens, mas **não a versão do prompt**. Sem ela, não é possível saber com que instrução uma estratégia de três meses atrás foi gerada.
4. **Fallbacks degradam o dado em silêncio.** Se a consolidação por IA falha, grava `summaries.join(' ')` em `technical_summary` — **indistinguível** de um resumo consolidado de verdade — e isso alimenta a estratégia.

Há também um prompt de produção **hardcoded** (~53 linhas em `strategyService.js`), fora de `services/prompts/` e fora do teste de prompts.

## Problem

**Um usuário autenticado pode gerar gasto ilimitado de API, e ninguém vê no painel.** Não é hipótese: basta um loop de retry no cliente, ou selecionar o modelo mais caro e enviar 50 vídeos.

E quando a chamada falha por motivo transitório, o dinheiro já foi gasto e o trabalho é perdido — sem nova tentativa.

## Goal

Tornar o gasto de IA **visível, limitado e resiliente**, e tornar análises históricas reproduzíveis.

## Scope

### 1. Controle de custo

| Item | Detalhe |
|---|---|
| **Allow-list de modelos** | `resolveModel` valida contra `AVAILABLE_MODELS`; modelo desconhecido é **rejeitado**, não silenciosamente reprecificado |
| **Limite de `videos[]`** | teto explícito por request, validado antes de qualquer chamada |
| **Cost guard** | `assertWithinBudget(actor, operacaoEstimada)` — barra **antes** de gastar |
| **Quota por ator** | persistida. ⚠️ **Decisão P8**: por usuário ou por tenant |
| **Rate limiting efetivo** | store externo, ou na borda — `MemoryStore` não funciona em serverless |

### 2. Confiabilidade

| Item | Detalhe |
|---|---|
| **Retry com backoff** | apenas para falhas transitórias (5xx, timeout); **nunca** para erro de conteúdo bloqueado ou quota estourada |
| **Timeout explícito de inferência** | hoje depende do default do SDK |
| **Políticas distintas por fluxo** | análise de vídeo e estratégia têm perfis de custo e latência muito diferentes (§9.3 do plano) — não devem compartilhar política |

### 3. Reprodutibilidade e prompts

| Item | Detalhe |
|---|---|
| **Versionamento de prompt** | identificador de versão por template |
| **Registrar a versão em `metadata`** | aditivo; linhas antigas ficam sem versão (correto — não sabemos qual foi) |
| **Mover o prompt hardcoded** | de `strategyService.js` para `services/prompts/` |
| **Marcar degradação** | `technical_summary` gerado por fallback fica distinguível de um consolidado real |

## Out of Scope

- **Saída estruturada no chat** — ⚠️ **decisão P9**. Muda **como a IA responde**; merece spec própria e não deve entrar de carona numa spec de custo.
- **Job assíncrono** para análise de vídeo — etapa 9.
- **Troca de provedor de IA** — sem segundo caso real, a abstração sairia errada (§9.4 do plano).
- **Alterar conteúdo de qualquer prompt.** Mover é operação **byte a byte**.
- **Alterar modelos default por tarefa.**
- **Event log com timestamps** para os gráficos ([`SPEC-ANALISE-IA.md`](../../SPEC-ANALISE-IA.md) A3/A4) — decisão de produto aberta.
- **Validação semântica da saída** (ex.: rejeitar estratégia que sugere técnica ilegal para a faixa) — valioso, mas é regra de domínio e merece spec própria.

## Requirements

| # | Requisito |
|---|---|
| R1 | Modelo fora da allow-list é **rejeitado** |
| R2 | `videos[]` acima do limite → erro **antes** de qualquer chamada de IA |
| R3 | Quota excedida → erro antes da chamada |
| R4 | Rate limiting efetivo em ambiente serverless |
| R5 | Retry apenas em falha transitória, com teto de tentativas |
| R6 | Timeout explícito em toda chamada de inferência |
| R7 | Políticas de retry/timeout distintas para análise e estratégia |
| R8 | `metadata` contém a versão do prompt usada |
| R9 | Prompt movido é **byte-idêntico** ao original |
| R10 | Resumo degradado é distinguível de consolidado real |
| R11 | Nenhum prompt de produção fora de `services/prompts/` |

## Technical Considerations

**⚠️ Risco mais fácil de subestimar: mover o prompt.** Qualquer diferença de texto — um espaço, uma quebra de linha — **muda a saída da IA em silêncio**. O prompt hardcoded tem ~53 linhas com separadores Unicode (`━━━`) e interpolações. A verificação precisa ser **comparação byte a byte** do prompt final montado, com o mesmo input, antes e depois. É critério de aceitação próprio (R9).

**Retry aumenta custo em caso de falha parcial.** Um retry sobre uma inferência de vídeo em `gemini-2.5-pro` custa outra inferência completa. Limitar tentativas e **nunca** repetir erro não transitório: conteúdo bloqueado e quota estourada não melhoram com nova tentativa.

**A ordem importa: registro antes de limite.** Sem `api_usage` gravando ([spec 007](../007-silent-failures-and-input-validation/spec.md)), calibrar quota é adivinhação. Começar **permissivo** e observar por um período antes de apertar.

**Allow-list pode rejeitar modelo que usuários já selecionaram.** A escolha vem do `localStorage` (`ai_model`). Se alguém tem um valor obsoleto salvo, passa a receber erro. Mitigação: aceitar valor desconhecido **caindo para o default da tarefa** com aviso em log, em vez de erro — ou limpar o `localStorage` pelo frontend. **Decidir antes de implementar.**

**Versionamento de prompt: manter simples.** Um identificador por arquivo (hash do conteúdo, ou versão manual no cabeçalho). Não construir sistema de gestão de prompts — o requisito é saber *qual texto* gerou *qual saída*.

**Reprodutibilidade tem limite honesto.** Mesmo com prompt e modelo registrados, LLM não é determinístico e modelos são depreciados pelo provedor. O objetivo alcançável é **auditabilidade** ("com que instrução e modelo isso foi gerado?"), não replay bit-a-bit. Documentar essa limitação em `docs/AI.md` para não criar expectativa falsa.

**Cost guard precisa estimar antes de saber.** O custo real só é conhecido depois da resposta (tokens retornados). O guard trabalha com estimativa (nº de vídeos × custo típico do modelo). Boa o suficiente para barrar abuso; não serve para cobrança precisa.

## Acceptance Criteria

- [ ] Modelo fora da allow-list rejeitado (ou cai no default com log — conforme decisão)
- [ ] `videos[]` acima do limite → 400 **sem** chamada de IA (verificado por mock não invocado)
- [ ] Quota excedida → erro antes da chamada
- [ ] Rate limiting funciona com múltiplas instâncias
- [ ] Retry ocorre em 5xx/timeout; **não** ocorre em conteúdo bloqueado nem quota
- [ ] Teto de tentativas respeitado
- [ ] Timeout ativo; requisição pendurada é interrompida
- [ ] Políticas de análise e estratégia são **distintas** e documentadas
- [ ] `metadata` de novas estratégias contém a versão do prompt
- [ ] **Prompt movido é byte-idêntico** — teste comparando o prompt montado antes/depois
- [ ] `technical_summary` degradado é distinguível
- [ ] `grep` não encontra prompt de produção fora de `services/prompts/`
- [ ] As 16 suítes verdes; nenhum teste de prompt existente quebrado

## Testing Strategy

| Nível | O que |
|---|---|
| **Unidade** | allow-list aceita/rejeita corretamente; `calculateCost` por modelo e faixa |
| **Unidade (crítico)** | **prompt montado é idêntico** antes e depois de mover — com fixture de input real |
| **Unidade** | classificação de erro transitório × permanente |
| **Integração** | limite de `videos[]` barra **antes** de a IA ser chamada (mock **não** invocado) |
| **Integração** | quota excedida barra antes da chamada |
| **Integração** | `metadata` persistida contém a versão do prompt |
| **Integração** | retry respeita o teto; não repete erro permanente |
| **Regressão** | `src/__tests__/prompts.test.js` (360 linhas) verde |
| **Nunca** | chamar o Gemini real em teste — custo e não determinismo |

## Documentation Impact

| Documento | Mudança |
|---|---|
| `docs/AI.md` | **substancial** — *Known Issues* AI-2/3/4/8/9 resolvidos; nova seção de custo, retry, versionamento; documentar o **limite honesto** da reprodutibilidade |
| `docs/modules/usage-tracking.md` | módulo passa de "observa" para "observa e barra"; novo caso de uso |
| `docs/modules/fight-analysis.md` | limite de vídeos; retry |
| `docs/modules/strategies.md` | prompt movido; versionamento |
| `docs/ARCHITECTURE.md` | §6 — cost guard e prompt registry |
| `docs/decisions/` | **ADR** sobre versionamento de prompt e o limite de reprodutibilidade |
| `docs/PROJECT_STATUS.md` | *Known Issues* HIGH 9 e 10 |
| `CLAUDE.md` | regra 6 de *AI* — passa a existir limite; regra 3 — sem exceção de prompt inline |
| `CHANGELOG.md` | IA e segurança (controle de custo) |

## Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| **Mover o prompt altera a saída da IA em silêncio** | **Alta** | Comparação byte a byte como critério de aceitação (R9) |
| Quota mal calibrada bloqueia uso legítimo | **Média** | Começar permissiva; observar com o registro funcionando; apertar depois |
| Allow-list rejeita modelo salvo no `localStorage` | Média | Decidir entre rejeitar ou cair no default; limpar `localStorage` se necessário |
| Retry multiplica custo | **Média** | Teto baixo; nunca repetir erro permanente |
| Store externo de rate limit adiciona infraestrutura | Média | Avaliar rate limit na borda como alternativa sem novo serviço |
| Diagnóstico do custo estava errado (spec 002) | Média | Portão: spec 007 concluída e `api_usage` gravando |
| Marcar degradação muda o que a UI exibe | Baixa | É o objetivo; verificar as telas |

## Dependencies

**Depende de:** ~~[spec 007](../007-silent-failures-and-input-validation/spec.md)~~ — **dependência removida em 2026-08-13.** A spec 002 verificou que o registro de custo **já funciona** (173 linhas, US$ 3,0295), então a visibilidade necessária para calibrar quota **já existe**. Esta spec pode ser executada sem esperar a 007.

**Escopo acrescentado por consequência:** investigar as **55 das 173 linhas com `estimated_cost_usd = 0`** — provavelmente modelos ausentes de `PRICING`. Item que era da 007 e migrou para cá, porque é trabalho de custo.
**Decisões pendentes:** P8 (quota por usuário ou tenant), P9 (saída estruturada no chat — fora do escopo).

**Independente das specs 005–006, 008** — pode rodar em paralelo, coordenando arquivos com a 007.
