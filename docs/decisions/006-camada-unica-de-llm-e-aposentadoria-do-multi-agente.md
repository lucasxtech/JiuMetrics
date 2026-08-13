# ADR-006 — Camada única de LLM + `responseSchema`; multi-agente aposentado

## Status

**Accepted** — implementado na "Fase 1" (commit `c193c8a`).

## Context

A implementação anterior tinha um **sistema multi-agentes** para análise de vídeo e geração de estratégia: vários agentes especializados (`ScoutAgent`, `StrategyRulesAgent`, um orquestrador) em `server/src/services/agents/`, com um consolidador final.

A auditoria do pipeline de IA registrada em [`../../SPEC-ANALISE-IA.md`](../../SPEC-ANALISE-IA.md) documentou os problemas, com evidência:

- **A2/A1** — *"3 agentes assistem o mesmo vídeo inteiro e um GPT-4.1 (que não vê o vídeo) consolida às cegas, com schema e vocabulário divergentes do resto do sistema"*. Triplicava o custo de análise de vídeo **sem ganho medido**.
- **B4** — *"Quando o parse de JSON falha, o sistema INVENTA dados"*: gráficos 50/50 hardcoded eram salvos como análise real — o oposto exato do "protocolo anti-alucinação" dos próprios prompts.
- **B5** — `cleanMarkdown` podia corromper JSON válido.
- **B3** — schemas de `technical_stats` incompatíveis entre o caminho monolítico e o multi-agente.
- **D1–D5** — SDK (`@google/generative-ai`) e modelo default (`gemini-2.0-flash`) defasados; **nenhuma chamada usava `responseSchema`**; a escolha de modelo do usuário era ignorada no caminho principal de estratégia.

A causa-raiz comum: a saída da IA era **texto livre**, extraída com regex e "consertada" por heurísticas.

## Decision

Três decisões acopladas, executadas juntas:

**1. Camada única de acesso ao SDK.** `services/llm.js` passa a ser a **única** fronteira com `@google/genai`. Nenhum controller ou model importa o SDK; os testes mockam `llm.js` em vez do SDK. A interface expõe `generateJson`, `generateText`, `sendChatMessage`, `uploadVideo`, `deleteFile`, e **toda chamada devolve `usage` normalizado** (tokens + modelo realmente usado).

**2. Saída estruturada obrigatória.** `schemas/videoAnalysis.js` e `schemas/strategy.js` definem `responseSchema` no formato OpenAPI do Gemini, enviados com `responseMimeType: 'application/json'`. Elimina parsing por regex nos fluxos de análise e estratégia.

**3. Aposentadoria do multi-agente.** `server/src/services/agents/` removido. Análise de vídeo e estratégia passam a ser **uma chamada cada**. `ORCHESTRATOR_CONFIG`, `AGENT_CONFIG`, `STRATEGY_AGENT_CONFIG` e as variáveis `USE_MULTI_AGENTS`, `OPENAI_API_KEY`, `OPENAI_MODEL` deixam de ser lidas.

Complementos: temperatura explícita por tarefa (o default do SDK era alto demais para tarefa analítica) e modelo resolvido por tarefa via `TASK_MODELS`, com a escolha do usuário sempre vencendo.

## Rationale

Documentada em `services/llm.js` e na spec:

> *"Saída estruturada SEMPRE via responseSchema (nada de regex sobre texto livre — a causa raiz dos bugs de parse da Fase 0)."*
> *"Temperatura explícita em toda chamada (o default do SDK é alto demais para tarefa analítica)."*
> *"Usage (tokens + modelo real) retornado em toda chamada, para o ApiUsage registrar custo com o modelo verdadeiro."*

O ponto central: **corrigiu-se a causa, não o sintoma.** A alternativa — endurecer o parser de regex — foi rejeitada porque o problema não era o parser, era pedir texto livre e depois tentar adivinhar a estrutura. Com `responseSchema` o provedor garante a forma.

Sobre o multi-agente: a decisão foi tomada com base em **custo medido contra ganho não medido**. Três inferências sobre o mesmo vídeo custavam 3×, o consolidador não via o vídeo, e os vocabulários divergiam — nenhuma evidência de qualidade superior justificava isso.

## Consequences

### Positivas

- **Custo de análise de vídeo reduzido a ~⅓** (1 chamada em vez de 3 sobre o mesmo vídeo).
- **Bugs de parse eliminados** nos fluxos de análise e estratégia. Em particular, o sistema **parou de inventar dados** quando o parse falhava (B4) — hoje falha com `GeminiParseError` em vez de gravar gráficos 50/50 fabricados.
- **Trocar de modelo é trivial** — um lugar (`TASK_MODELS`), e a escolha do usuário é respeitada em todos os fluxos.
- **Testabilidade real** — mockar `llm.js` é simples; mockar o SDK não era.
- **Custo rastreado com o modelo verdadeiro**, não o solicitado (relevante quando há fallback).
- **Um único provedor**, eliminando a dependência de OpenAI que existia só no consolidador.

### Negativas

- **⚠️ O chat ficou fora.** `sendChatMessage` **não aceita `responseSchema`**, e `extractEditSuggestion` continua fazendo `match(/---EDIT_SUGGESTION---.../)` com fallback para procurar JSON solto e três formatos legados. **O caminho de IA mais usado do produto é o único que ainda viola o princípio declarado** — e suas sugestões **escrevem no banco**. Quando o parse falha, a sugestão é perdida em silêncio. É a falha **HIGH** AI-1 da auditoria.
- **~800 linhas de documentação morta** descrevendo o sistema removido continuaram no repositório (`MULTI_AGENTS.md`, `QUICKSTART_MULTI_AGENTS.md`, `IMPLEMENTATION_SUMMARY.md`), além de as instruções de Copilot ainda documentarem `USE_MULTI_AGENTS` e `OPENAI_API_KEY`. Num projeto mantido com assistência de IA, isso é instrução ativa para reintroduzir o que foi removido. Mitigado em 2026-08-12: movidos para [`../_legacy/`](../_legacy/).
- **Vazamento parcial da abstração.** `schemas/*.js` importam `Type` de `@google/genai` e usam o dialeto OpenAPI do Gemini; `uploadVideo`/Files API é conceito específico do Gemini exposto na interface. Trocar de **modelo** está resolvido; trocar de **provedor** exigiria reescrever os schemas e repensar a ingestão de vídeo (~70% do caminho).
- **Um prompt de produção ficou fora do sistema de prompts** — ~53 linhas hardcoded em `strategyService.js`, enquanto os outros 7 vivem em `services/prompts/*.txt`.
- **Sem retry nem timeout de inferência.** Uma chamada só significa que uma falha transitória perde a operação inteira — inclusive depois de o vídeo já ter sido baixado e enviado à Files API.

## Evidence

- `server/src/services/llm.js` — cabeçalho com os princípios declarados
- `server/src/schemas/{videoAnalysis,strategy}.js` — os `responseSchema`
- `server/src/config/ai.js` — `TASK_MODELS`, `GENERATION` (temperaturas), e a nota *"o sistema multi-agentes … foi aposentado — ver SPEC-ANALISE-IA.md itens A1/A2/D4"*
- `server/src/services/strategyService.js` — *"o sistema multi-agentes foi aposentado na Fase 1"*
- Commit `c193c8a` — *"feat: Fase 1 — moderniza camada LLM (@google/genai + responseSchema) e aposenta multi-agente"*
- Commit `92ac963` — *"fix: parar de inventar dados quando o parse do JSON da IA falha"*
- [`../../SPEC-ANALISE-IA.md`](../../SPEC-ANALISE-IA.md) — A1, A2, B3, B4, B5, D1–D5
- `server/src/services/geminiService.js#extractEditSuggestion` — a exceção que permaneceu
- [`../AI.md`](../AI.md#known-issues) — AI-1
