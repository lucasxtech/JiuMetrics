# SPEC — Refatoração do Pipeline de Análise com IA (JiuMetrics)

> Análise profunda do fluxo end-to-end: cadastro de luta → análise de vídeo → perfil consolidado → geração de estratégia.
> Cada item traz: **Problema → Evidência (arquivo:linha) → Impacto → Correção exata**.
>
> Data da análise: 2026-07-23. Estado do repo: branch `main`, commit `a10bc95`.

---

## Sumário executivo

O sistema tem uma boa "casca" de produto (versões, chat de refinamento, multi-tenant), mas o **motor de análise tem defeitos estruturais** que fazem a estratégia final ser gerada com muito menos informação do que parece:

1. **A estratégia NUNCA recebe dados quantitativos.** Os `technical_stats` extraídos do vídeo são descartados no momento de salvar (bug B1) e, mesmo se fossem salvos, a consolidação lê a chave errada (bug B2). O Scout/Gameplan trabalham só com texto narrativo.
2. **Quando o parse de JSON falha, o sistema INVENTA dados** (gráficos 50/50 hardcoded) e salva como análise real — o oposto exato do "protocolo anti-alucinação" dos prompts (bug B4).
3. **O multi-agente de vídeo triplica o custo sem ganho comprovado**: 3 agentes assistem o mesmo vídeo inteiro e um GPT-4.1 (que não vê o vídeo) consolida às cegas, com schema e vocabulário divergentes do resto do sistema (A2, B3).
4. **As regras IBJJF estão erradas e triplicadas** em 3 lugares diferentes (C1, C2) — a estratégia pode sugerir técnica ilegal para a faixa (ex.: toe hold para roxa).
5. **O modelo default (`gemini-2.0-flash`) e o SDK (`@google/generative-ai`) estão defasados**, nenhuma chamada usa `responseSchema`/`generationConfig`, e a escolha de modelo do usuário é ignorada no caminho principal de estratégia (D1–D5).
6. **A metodologia dos gráficos (percentuais forçados a somar 100%) não é auditável** — não há timestamps nem eventos verificáveis; a proposta na seção final troca isso por um **event log com timestamps** + agregação determinística em código.

Prioridades: **P0** = pipeline de dados quebrado (corrigir antes de qualquer coisa); **P1** = metodologia/arquitetura de IA; **P2** = qualidade/manutenção.

---

## 0. Fluxo E2E atual (como funciona hoje, de fato)

```
UI "Análise de vídeo" (frontend/src/components/video/VideoAnalysis.jsx)
  │  seleciona atleta/adversário + cor do kimono + resultado da luta + URL(s) YouTube
  ▼
POST /api/ai/analyze-link (linkController.analyzeLink)          [modelo vem do localStorage]
  │  para CADA vídeo:
  ▼
geminiService.analyzeFrame(url, ctx, model, useAgents=true)     [hardcoded true]
  ▼
Orchestrator (agents/Orchestrator.js)
  ├─ TechnicalAgent  ─┐
  ├─ TacticalAgent   ─┼─ 3× Gemini, CADA UM recebe o VÍDEO INTEIRO (URL YouTube direto; fallback: download 720p + File API)
  ├─ RulesAgent      ─┘
  └─ GPT-4.1 consolida os 3 JSONs (sem ver o vídeo) → formato "legado" {charts, technical_stats, summary}
  ▼
consolidateAnalyses(análises dos N vídeos)                      [média aritmética + renormalização p/ 100%]
  └─ se >1 summary → consolidateSummariesWithAI (mais 1 Gemini)
  ▼
FightAnalysis.create(...)                                       [❌ technical_stats É DESCARTADO aqui]
  ▼
StrategyService.consolidateAnalyses(personId)                   [+1 Gemini se >1 análise] → salva technicalSummary no perfil
  ▼
─────────────── (depois, na aba Estratégia) ───────────────
POST /api/strategy/compare (strategyController.compareAndStrategy)
  ▼
StrategyService.generateStrategy(athleteId, opponentId)
  ├─ usa technicalSummary salvo (ou reconsolida)
  ├─ re-chama consolidateAnalyses SÓ p/ pegar stats (❌ +2 Gemini desperdiçados; stats sempre null — bugs B1/B2)
  ▼  USE_MULTI_AGENTS=true →
StrategyOrchestrator (agents/strategy/)
  ├─ ScoutAgent (adversário)   ─┐
  ├─ GameplanAgent (atleta)    ─┼─ 3× Gemini texto (❌ modelo hardcoded gemini-2.0-flash)
  ├─ StrategyRulesAgent (IBJJF)─┘
  └─ GPT-4.1 sintetiza → JSON da estratégia
  ▼
TacticalAnalysis.create + StrategyVersion.createInitial → UI (AiStrategyBox / modal / chat de refinamento)
```

**Caminho morto:** `POST /api/video/upload` (videoController) extrai **8 frames estáticos** por vídeo e roda o pipeline multi-agente completo **por frame** (3 Gemini + 1 GPT × 8 = 32 chamadas/vídeo) — e **nenhum componente do frontend chama esse endpoint**. Ver A1.

**Contagem de chamadas LLM para 1 análise de 2 vídeos + 1 estratégia (hoje):**
6 Gemini vídeo + 2 GPT (consolidação vídeo) + 1 Gemini (merge summaries) + 1 Gemini (perfil) + 2 Gemini (stats desperdiçados) + 3 Gemini (agentes estratégia) + 1 GPT (síntese) = **16 chamadas**, das quais ~5 são desperdício puro e 3 são triplicação do mesmo vídeo.

---

## P0 — Bugs que quebram o fluxo de dados (corrigir primeiro)

### B1. `technical_stats` nunca é salvo no banco

- **Evidência:** [linkController.js:181-190](server/src/controllers/linkController.js#L181) e [videoController.js:194-203](server/src/controllers/videoController.js#L194) chamam `FightAnalysis.create({ ..., charts, summary, technicalProfile: consolidated.technicalProfile, ... })`. O objeto retornado por `consolidateAnalyses` ([geminiService.js:454-600](server/src/services/geminiService.js#L454)) **não tem** campo `technicalProfile` (vira `''`) e o campo que existe, `technical_stats`, **não é passado**. O model aceita `technicalStats` ([FightAnalysis.js:108](server/src/models/FightAnalysis.js#L108)) → salvo `null` sempre.
- **Impacto:** todo dado quantitativo (raspagens, passagens, finalizações, costas) extraído do vídeo é jogado fora. O "Dashboard de Performance" da UI só aparece na resposta imediata, nunca no histórico. A estratégia roda sem números (ver B2).
- **Correção:**
  1. Em `linkController.analyzeLink` e `videoController.uploadAndAnalyzeVideo`, passar `technicalStats: consolidated.technical_stats` no `FightAnalysis.create`.
  2. Remover `technicalProfile: consolidated.technicalProfile` (campo fantasma) ou passá-lo de fato se ainda houver uso.

### B2. Consolidação lê a chave errada (`technical_stats` vs `technicalStats`)

- **Evidência:** `StrategyService.consolidateTechnicalStats` filtra `analyses.filter(a => a.technical_stats)` ([strategyService.js:611](server/src/services/strategyService.js#L611)) e todos os acessos internos usam snake_case — mas as análises vêm de `FightAnalysis.getByPersonId` → `parseAnalysisFromDB`, que retorna **`technicalStats`** camelCase ([dbParsers.js:52](server/src/utils/dbParsers.js#L52)). Resultado: `validAnalyses` sempre vazio → `consolidatedStats = null` → `formatTechnicalStats` retorna `"Dados técnicos não disponíveis ainda."` ([geminiService.js:647](server/src/services/geminiService.js#L647)) → `ScoutAgent`/`GameplanAgent` recebem `"Sem dados quantitativos disponíveis"`.
- **Impacto:** **combinado com B1, a estratégia nunca viu um único número em toda a história do sistema.** Todos os campos `pontos`, `probabilidade`, `taxa de sucesso` que aparecem na estratégia são invenção do modelo.
- **Correção:** padronizar em `consolidateTechnicalStats` (e em `formatStatsAsNarrative`/`formatChartsAsNarrative` se aplicável) a leitura via `a.technicalStats`. Recomendo padronizar TODO o domínio interno em camelCase e converter apenas na borda (dbParsers/model), com teste unitário: "análise parseada do DB → consolidateTechnicalStats retorna stats não-nulos".

### B3. Schemas de `technical_stats` incompatíveis entre monolítico e multi-agente

- **Evidência:** o prompt monolítico define `{sweeps:{quantidade,efetividade_percentual}, guard_passes:{quantidade}, submissions:{tentativas,ajustadas,concluidas,detalhes}, back_takes:{...}}` ([video-analysis.txt:188-206](server/src/services/prompts/video-analysis.txt#L188)). O orquestrador multi-agente exige OUTRO schema: `{total_techniques, guard_pulls, guard_passes:int, sweeps:int, submissions_attempts, escapes, takedowns, scoring:{points,advantages,penalties}}` ([agent-orchestrator-video.txt:108-121](server/src/services/prompts/agent-orchestrator-video.txt#L108)). `consolidateAnalyses` espera o schema monolítico ([geminiService.js:521-527](server/src/services/geminiService.js#L521)): lê `sweeps.quantidade` de um `sweeps` que é número → tudo vira **0**; `submissions`/`back_takes` nem existem → pulados.
- **Impacto:** com `USE_MULTI_AGENTS=true` (que está ativo no `.env` e hardcoded nos controllers), os KPIs consolidados são sempre zero — os cards da UI (condicionados a `> 0`) nunca renderizam; nada quantitativo sobrevive.
- **Correção:** definir **um único schema canônico** de `technical_stats` (recomendo o monolítico, que a UI já consome) num módulo `server/src/schemas/technicalStats.js`, e:
  1. Ajustar `agent-orchestrator-video.txt` para produzir exatamente esse schema;
  2. Validar com JSON Schema na saída (ou melhor: `responseSchema` do Gemini/OpenAI structured outputs — ver D3);
  3. Adicionar teste de contrato: saída do orquestrador → `consolidateAnalyses` → stats ≠ zeros quando input tem dados.

### B4. Parser de JSON injeta DADOS FALSOS quando falha

- **Evidência:** `extractJson` → `createFallbackStructure` retorna `DEFAULT_CHARTS` com valores inventados ("Agressivo 50 / Calmo 50", "Puxar Guarda 60 / Trocar Queda 40"...) ([chartUtils.js:4-33, 87-99, 143-183](server/src/utils/chartUtils.js#L4)). O `_warning` embutido não é exibido em lugar nenhum. Esses charts fake seguem o fluxo normal: são salvos no banco, entram na consolidação do perfil e na estratégia.
- **Impacto:** violação direta do "PROTOCOLO ANTI-ALUCINAÇÃO" que os prompts tanto enfatizam — só que causada pelo **código**. Um parse falho numa luta contamina o perfil do atleta silenciosamente. Os labels fake ("Calmo", "Raspagem" como guarda) nem existem no vocabulário canônico.
- **Correção:**
  1. **Nunca** retornar dados sintéticos: em falha de parse, lançar `GeminiParseError` e propagar (o controller já tem tratamento de erro por vídeo);
  2. A causa raiz é não usar structured output — ver D3. Com `responseMimeType: 'application/json'` + `responseSchema`, o parse manual desaparece;
  3. Enquanto existir, remover `DEFAULT_CHARTS` e as regexes perigosas de `cleanMarkdown` (ver B5).

### B5. `cleanMarkdown` pode corromper JSON válido

- **Evidência:** [chartUtils.js:42-58](server/src/utils/chartUtils.js#L42): substitui `\n` por espaço e depois aplica `/\/\/.*$/gm` (remoção de "comentários") — como o texto virou linha única, **qualquer `//` dentro de uma string (ex.: URL num summary) trunca o resto do JSON inteiro**. O auto-quoting `([{,]\s*)(\w+):` também injeta aspas dentro de valores string que contenham `, palavra:`.
- **Impacto:** análises válidas viram fallback fake (B4) de forma intermitente e não-reproduzível.
- **Correção:** deletar `cleanMarkdown` na íntegra quando D3 (structured output) entrar. Se precisar de parser de emergência para respostas markdown, usar apenas: strip de code fences + `JSON.parse` direto + em falha, erro.

### B6. ScoutAgent descarta o padrão comportamental do adversário

- **Evidência:** o prompt retorna `behavioral_pattern` ([strategy-scout.txt:75-79](server/src/services/prompts/strategy-scout.txt#L75)), mas o parser lê `data.psychological_profile` ([ScoutAgent.js:43](server/src/services/agents/strategy/ScoutAgent.js#L43)) — campo que não existe no schema do prompt → sempre `{}`; `behavioral_pattern` é descartado.
- **Impacto:** ritmo do adversário, comportamento quando perde/vence — informação central para a cronologia da estratégia — nunca chega ao GPT sintetizador.
- **Correção:** trocar para `behavioral_pattern: data.behavioral_pattern || {}` no parse (e no objeto de fallback), e conferir que `strategy-orchestrator.txt` menciona esse campo no relatório do Scout.

### B7. Placeholder `{{MAX_WORDS}}` nunca preenchido

- **Evidência:** [consolidate-summaries.txt:15](server/src/services/prompts/consolidate-summaries.txt#L15) tem `Máximo {{MAX_WORDS}} palavras`, mas `consolidateSummariesWithAI` só passa `SUMMARY_COUNT`, `ATHLETE_NAME`, `SUMMARIES` ([geminiService.js:621-625](server/src/services/geminiService.js#L621)).
- **Impacto:** o modelo recebe o placeholder cru; instrução de tamanho vira ruído.
- **Correção:** passar `MAX_WORDS: MAX_SUMMARY_WORDS` no `getPrompt`. Adicionar teste que valida que todo `{{VAR}}` de cada prompt tem variável correspondente no call-site (o `prompts.test.js` é o lugar natural).

### B8. `StrategyService` tem dois `generateStrategy` — código morto e quebrado

- **Evidência:** `static generateStrategy(athlete, opponent, matchupAnalysis)` (regras hardcoded, [strategyService.js:304](server/src/services/strategyService.js#L304)) é **sobrescrito** por `static async generateStrategy(athleteId, opponentId, ...)` ([strategyService.js:732](server/src/services/strategyService.js#L732)). `compareAndGenerateStrategy` (:188) chama `this.generateStrategy(athlete, opponent, matchupAnalysis)` — que agora resolve para a versão async com argumentos errados; além disso usa `Athlete.getById` sem `await` e campos inexistentes (`technicalProfile.preference`, `strongPositions`, `weakPositions`). `findBestMatchup` (:397) depende de tudo isso. Nenhuma rota ativa usa esses métodos.
- **Impacto:** ~250 linhas de código morto que confundem manutenção (foi exatamente o tipo de coisa que o Copilot deixou para trás); risco de alguém "reativar" achando que funciona.
- **Correção:** deletar `compareAndGenerateStrategy`, `analyzeMatchup`, o `generateStrategy` rule-based e `findBestMatchup` (e a rota comentada `/best-matchup` no frontend service). Se "melhor matchup" for feature desejada, reimplementar sobre os dados reais depois da Fase 2.

### B9. Duas chamadas Gemini desperdiçadas por estratégia gerada

- **Evidência:** quando `technicalSummary` existe, `generateStrategy` ainda chama `consolidateAnalyses(personId, allowedUserIds, null)` **só para pegar `technical_stats`** ([strategyService.js:761-782](server/src/services/strategyService.js#L761)) — e essa função, com >1 análise, roda o prompt inteiro de consolidação no Gemini e o texto é jogado fora. ×2 (atleta e adversário).
- **Impacto:** latência e custo extras em toda geração de estratégia; além de mascarar o bug B2 (stats retornam null de qualquer forma).
- **Correção:** extrair um método `getConsolidatedStats(personId, userIds)` que chama apenas `FightAnalysis.getByPersonId` + `consolidateTechnicalStats` (zero IA) e usar esse método nos dois ramos. `consolidateAnalyses` fica só para gerar/regenerar o resumo textual.

### B10. Agregação de finalizações pode gerar chave `"[object Object]"`

- **Evidência:** `submissions.detalhes` não tem shape definido no prompt ([video-analysis.txt:200](server/src/services/prompts/video-analysis.txt#L200) — `"detalhes": []`). Em `consolidateTechnicalStats`, cada item vira chave de objeto: `submissionCount[sub] = ...` ([strategyService.js:699-707](server/src/services/strategyService.js#L699)). Se o modelo devolver objetos (`{tecnica, resultado}`), todas as técnicas colapsam em `"[object Object]"`. A UI tem defesa (`detail.nome || detail.name || JSON.stringify`), o backend não.
- **Correção:** definir no schema canônico `detalhes: [{ tecnica: string, resultado: 'tentada'|'ajustada'|'concluida' }]` e normalizar na agregação (`const key = typeof sub === 'string' ? sub : sub.tecnica`).

### B11. Chat de estratégia ensina o modelo a corromper o schema

- **Evidência:** os exemplos de `EDIT_SUGGESTION` em [chat-strategy.txt:62-86](server/src/services/prompts/chat-strategy.txt#L62) usam shapes que **não existem** na estratégia real: `plano_tatico_faseado: {fase_inicial, meio_da_luta, final_da_luta}` (real: `em_pe_standup`, `jogo_de_passagem_top`, `jogo_de_guarda_bottom`) e `checklist_tatico: {ofensiva, defensiva, mental}` (real: `oportunidades_de_pontos`, `armadilhas_dele`, `protocolo_de_emergencia`).
- **Impacto:** quando o usuário aplica a sugestão, `strategy_data` é substituído por um objeto com chaves erradas → as seções somem/quebram na renderização do `AiStrategyBox`/modal (e ficam gravadas assim no histórico de versões).
- **Correção:** reescrever os exemplos com o schema real completo de cada seção; incluir no prompt o JSON Schema da seção; no backend (`applyEdit`), **validar `newValue` contra o schema do campo** antes de aplicar e recusar com mensagem clara se inválido.

### B12. Atributos calculados sobre campos que não existem

- **Evidência:** `processPersonAnalyses` espera `data.actions`, `data.positions`, `data.techniques`, `data.sweeps[]` ([athleteStatsUtils.js:32-64](server/src/utils/athleteStatsUtils.js#L32)) — nenhum desses campos existe no schema das análises (nem monolítico, nem multi-agente). Não há chamador em produção no server (só testes); `docs/ESTRATEGIAS.md` afirma que esses atributos alimentam a estratégia (não alimentam). O frontend tem cópia espelhada (`frontend/src/utils/athleteStats.js`) usada para exibir "atributos" no perfil.
- **Impacto:** atributos exibidos são efetivamente constantes (pisos dos `Math.max`) — informação decorativa que engana o usuário; documentação mente sobre o fluxo.
- **Correção:** ou (a) deletar util + exibição de atributos, ou (b) na Fase 2, recalcular atributos a partir do event log real (ver seção "Nova arquitetura"). Atualizar `docs/ESTRATEGIAS.md`.

### B13. Caminho de upload: análise temporal a partir de frames estáticos + endpoint morto

- **Evidência:** `videoController.uploadAndAnalyzeVideo` extrai **8 frames** ([videoController.js:65](server/src/controllers/videoController.js#L65)) e roda `analyzeFrame(dataUri, ..., useAgents=true)` **por frame** (:102-120) — 3 Gemini + 1 GPT-4.1 por frame = **32 chamadas por vídeo**. Os prompts perguntam ritmo, timing, fadiga, sequências — impossível responder de uma imagem parada; o RulesAgent "pontua" a luta a partir de 1 frame (critério IBJJF exige 3s de controle!). E `grep` no frontend mostra que **nenhum componente chama `/api/video/upload`**.
- **Impacto:** código morto caro e metodologicamente inválido; os prompts dos agentes ainda falam "frame" por herança desse caminho (ver E1).
- **Correção:** deletar o caminho de frames (`extractFrames`/`ffmpegService`, `frameToBase64`, o loop de frames do controller). Se upload de arquivo local for feature desejada: `multer` → `uploadVideoToGemini` (File API já existe e já é usada no fallback do YouTube) → mesmo pipeline do link. Um único caminho de análise.

---

## P1 — Metodologia e arquitetura de IA

### A1. Multi-agente de vídeo: 3× o custo, consolidador cego, sem evidência de ganho

- **Evidência:** `Orchestrator` roda `TechnicalAgent`, `TacticalAgent`, `RulesAgent` em paralelo — cada um recebe o vídeo inteiro ([Orchestrator.js:63-100](server/src/services/agents/Orchestrator.js#L63)) → 3× tokens de vídeo. A consolidação é feita por **GPT-4.1 sem acesso ao vídeo** (:141-167), resolvendo conflitos "por confidence" — um número que os próprios agentes chutam (default 0.7 em [AgentBase.js:163](server/src/services/agents/AgentBase.js#L163)). O endpoint de comparação (`/api/ai/debug/compare-analysis`) existe, mas nada mede qualidade — só tokens.
- **Impacto:** custo ~3-4× por análise; latência maior; mais superfícies de parse/schema para quebrar (B3); nenhuma métrica mostra que o resultado é melhor que 1 chamada bem-feita. Vídeo é o input caro — pagar 3× por ele é a pior alavanca de custo possível.
- **Correção (decisão recomendada):** **aposentar o multi-agente de VÍDEO.** Voltar a 1 chamada por vídeo com modelo forte + structured output + prompt unificado (o "monolítico" reformado pela Fase 2 abaixo). Multi-perspectiva, se desejada, aplica-se melhor na fase de ESTRATÉGIA (texto barato), não na de ingestão de vídeo (cara). Manter a flag `USE_MULTI_AGENTS` só para a estratégia — ou remover de vez após A2.

### A2. Multi-agente de estratégia: agentes "separados" que não se falam + síntese cross-provider

- **Evidência:** Scout analisa só o adversário, Gameplan só o atleta, Rules só a faixa ([StrategyOrchestrator.js:35-79](server/src/services/agents/strategy/StrategyOrchestrator.js#L35)) — cada um é uma re-descrição do mesmo `resumo` que já existe, sem informação nova (os stats chegam vazios — B1/B2). A síntese é GPT-4.1 ($2/$8 por 1M reais do gpt-4.1; o código ainda calcula custo como GPT-4 Turbo $10/$30 — [Orchestrator.js:298-311](server/src/services/agents/Orchestrator.js#L298)).
- **Impacto:** 4 chamadas + 2 provedores + 2 API keys para o que 1 chamada Gemini com prompt seccionado faz igual ou melhor (o cruzamento arma×vulnerabilidade acontece de qualquer forma só na síntese). Latência e pontos de falha triplicados; o usuário escolhe modelo e é ignorado (D5).
- **Correção:** colapsar em **1 chamada de estratégia** com prompt estruturado em seções (scout do adversário / arsenal do atleta / regras da faixa injetadas por código / síntese) + `responseSchema` com o JSON atual da estratégia. Se quiser robustez extra (P2): gerar 2 candidatas com temperatura diferente e passar um **verificador** (checagem determinística de legalidade + 1 chamada curta de crítica) — é mais barato e mais mensurável que o pipeline atual.

### A3. Gráficos: percentuais forçados a somar 100% não são um dado — são uma alucinação estruturada

- **Evidência:** o prompt exige "OS GRAFICOS PRECISAM SOMAR 100%" ([video-analysis.txt:103](server/src/services/prompts/video-analysis.txt#L103)); `normalizeChartData` força a soma ([chartUtils.js:106-136](server/src/utils/chartUtils.js#L106)); a consolidação tira **média aritmética de percentuais entre lutas** e renormaliza ([geminiService.js:531-557](server/src/services/geminiService.js#L531), [strategyService.js:132-183](server/src/services/strategyService.js#L132)).
- **Impacto:**
  - "Personalidade" somando 100% é semanticamente vazio (ser 60% agressivo + 40% explosivo não significa nada — traços não são fatias de pizza);
  - médias de percentuais entre lutas com durações/contextos diferentes distorcem (uma luta de 1 raspagem pesa igual a uma de 10);
  - nada é auditável: não há como verificar se "De la Riva 45%" corresponde ao vídeo.
- **Correção:** ver "Nova arquitetura" — gráficos passam a ser **agregações determinísticas de eventos contados** (frequências reais), e traços de personalidade viram **scores independentes 0-100** derivados de métricas (ex.: iniciativa = % de trocas iniciadas pelo atleta), não fatias.

### A4. Nada é rastreável ao vídeo (sem timestamps)

- **Evidência:** nenhum prompt pede timestamps; nenhum schema tem `t`/`timestamp` por evento.
- **Impacto:** impossível auditar alucinação (o problema nº 1 declarado nos próprios prompts); impossível construir features tipo "clicar na raspagem e ver o momento do vídeo"; impossível montar golden set de avaliação.
- **Correção:** núcleo da Fase 2 — extração de **event log com timestamps** (o Gemini reporta `MM:SS` de forma confiável em vídeos; a File API/URL do YouTube preserva a linha do tempo).

### A5. O adversário no vídeo é ignorado

- **Evidência:** todos os prompts mandam "IGNORE completamente o oponente" (ex.: [agent-technical.txt:17](server/src/services/prompts/agent-technical.txt#L17)).
- **Impacto:** numa luta há informação dos DOIS atletas. Se o usuário analisa a luta do seu atleta, o oponente daquela luta é frequentemente um adversário futuro (ou um proxy de estilo). Hoje seria preciso rodar (e pagar) a análise duas vezes no mesmo vídeo.
- **Correção (Fase 2):** o event log registra `quem: 'alvo'|'oponente'` por evento (mesmo custo de vídeo). O perfil do alvo continua sendo o produto principal; o log do oponente fica disponível para (a) vincular a um segundo cadastro opcional e (b) enriquecer o contexto ("as raspagens sofridas" viram vulnerabilidades do alvo).

### A6. Cadeia de compressão lossy até a estratégia

- **Evidência:** vídeo → 3 JSONs de agente → GPT gera summary → merge de summaries por vídeo → consolidação de perfil (outro prompt, inline em [strategyService.js:505-557](server/src/services/strategyService.js#L505), duplicando `consolidate-summaries.txt`) → estratégia. Cada etapa re-resume o resumo anterior.
- **Impacto:** o que chega à estratégia é um resumo de resumo de resumo — detalhes técnicos específicos (a "sequência de poder", o setup exato) degradam a cada salto; e existem **duas implementações de consolidação** com regras diferentes (uma limita 250 palavras via prompt-arquivo; a outra 250-400 via prompt inline).
- **Correção:** (1) unificar consolidação numa única função/prompt; (2) na Fase 2, a estratégia recebe **dados estruturados (event logs agregados + stats) + resumos curtos**, não apenas prosa — estrutura não degrada com re-sumarização.

---

## P1 — Regras IBJJF (conhecimento de domínio errado)

### C1. Três fontes de regras divergentes

- **Evidência:** (1) `BELT_RULES` em [config/ai.js:73-103](server/src/config/ai.js#L73); (2) texto hardcoded em `formatBeltRulesForStrategy`/`getBeltRulesText` ([geminiService.js:116-174](server/src/services/geminiService.js#L116)); (3) tabela própria dentro de [agent-rules.txt:133-159](server/src/services/prompts/agent-rules.txt#L133). As três divergem entre si.
- **Correção:** `BELT_RULES` vira a **única fonte** (corrigida — ver C2), com um formatter único (`formatBeltRules(belt): string`) usado por todos os prompts via placeholder. Deletar as tabelas hardcoded do prompt e do service.

### C2. Erros factuais nas regras (podem gerar sugestão de técnica ILEGAL)

Referência: tabela de "Technical Fouls" do rulebook IBJJF — leg locks por faixa (adulto): *straight ankle lock* liberada da branca; *wrist lock* da azul; *kneebar, toe hold, calf slicer, bicep slicer* apenas marrom/preta; *heel hook e knee reaping* apenas NO-GI marrom/preta (2021+), proibidos no gi em todas as faixas.

| Onde | O que diz | Erro |
|---|---|---|
| [config/ai.js:86-89](server/src/config/ai.js#L86) (roxa) | `allowed: ['chave de pé reta', 'toe hold']` | **Toe hold é marrom/preta.** Roxa: só chave de pé reta |
| [config/ai.js:89](server/src/config/ai.js#L89) (roxa) | "Bicep slicer permitido da montada" | **Falso** — bicep slicer é marrom/preta |
| [geminiService.js:156-160](server/src/services/geminiService.js#L156) (roxa) | "Chave de pé reta + TOE HOLD permitidos" | Mesmo erro do toe hold |
| [agent-rules.txt:143-151](server/src/services/prompts/agent-rules.txt#L143) (azul) | proíbe "Wrist locks"; "Knee bars (em algumas divisões)" | **Wrist lock é permitido da azul em diante**; kneebar não é permitido em divisão adulta azul nenhuma |
| [agent-rules.txt:153-155](server/src/services/prompts/agent-rules.txt#L153) (roxa) | "✅ Permitido: Toe hold, knee bar, ankle lock" e proíbe wrist locks | **Duplamente errado** (toe hold/kneebar são marrom+; wrist lock é permitido) |
| config/geminiService (marrom/preta) | "Heel hook (apenas em NO-GI de algumas federações)" | Impreciso: IBJJF 2021+ permite heel hook/reaping em **NO-GI marrom/preta**; no gi é proibido em todas |

- **Impacto:** o RulesAgent/estratégia pode recomendar toe hold para um roxa (DQ imediata em campeonato) ou vetar wrist lock legal. Para um produto cuja proposta é "estratégia de competição", isso é erro crítico de credibilidade.
- **Correção exata:** reescrever `BELT_RULES` (fonte única, por faixa adulto gi):
  ```js
  branca:  { allowed: ['chave de pé reta'], forbidden: ['wrist lock','toe hold','kneebar','calf slicer','bicep slicer','heel hook','knee reaping','jump guard','scissor takedown','slam'] },
  azul:    { allowed: ['chave de pé reta','wrist lock'], forbidden: ['toe hold','kneebar','calf slicer','bicep slicer','heel hook','knee reaping','slam'] },
  roxa:    { ...igual à azul... },
  marrom:  { allowed: ['chave de pé reta','wrist lock','toe hold','kneebar','calf slicer','bicep slicer'], forbidden: ['heel hook (gi)','knee reaping (gi)','slam'], notes: 'Heel hook/reaping permitidos apenas NO-GI' },
  preta:   { ...igual à marrom... }
  ```
  E adicionar o **verificador determinístico** (P1, seção Nova arquitetura §4): antes de devolver a estratégia, escanear técnicas citadas contra a lista da faixa restritiva e remover/flagar — não confiar só no LLM para isso.

---

## P1 — Modelos LLM e uso da API

### D1. Modelo default defasado para a tarefa

- **Evidência:** `DEFAULT_MODEL: 'gemini-2.0-flash'` ([config/ai.js:7](server/src/config/ai.js#L7)); é o modelo usado por default em análise de vídeo, consolidações, chat, e **hardcoded** nos agentes de estratégia.
- **Avaliação:** para *video understanding* técnico (identificar De la Riva vs RDLR, contar raspagens com critério de 3s), o 2.0 Flash é a pior escolha da família atual — é um modelo de fev/2025, otimizado para custo, fraco em raciocínio temporal fino. A família 2.5+ (Flash/Pro) tem video understanding significativamente melhor e suporte a `mediaResolution`; o 3 Pro (preview) é o topo para multimodal. **Recomendação:**
  - **Análise de vídeo (event log):** `gemini-2.5-pro` (ou `gemini-3-pro-preview` se o custo couber) — é a etapa que define a qualidade de TODO o resto; não economizar aqui.
  - **Consolidações/perfil/chat:** `gemini-2.5-flash` — texto barato e bom.
  - **Estratégia:** `gemini-2.5-pro` (1 chamada só, vale o modelo forte).
  - Verificar contra a doc de pricing atual os nomes/preços vigentes (o repo cita `gemini-3.1-pro-preview` — conferir se existe/estável antes de default).
  - Atualizar a tabela do README (diz que 3-pro-preview é "grátis" — desatualizado) e o `PRICING` do config (GPT_4_TURBO/GPT_5 chutados — [config/ai.js:174-187](server/src/config/ai.js#L174)).

### D2. SDK deprecado

- **Evidência:** `@google/generative-ai ^0.24.1` ([server/package.json](server/package.json)) + `@google/generative-ai/server` para File API.
- **Impacto:** SDK oficialmente **descontinuado** (substituído pelo `@google/genai`, GA desde 2025) — sem novas features (structured output novo, mediaResolution, Gemini 3, Files API nova) e sem correções.
- **Correção:** migrar para `@google/genai`. Mudanças mecânicas: `new GoogleGenAI({apiKey})`, `ai.models.generateContent({model, contents, config})`, `ai.files.upload()`. Encapsular num único módulo `server/src/services/llm.js` para o resto do código não depender do SDK (facilita trocar modelo/provedor e testar).

### D3. Zero `generationConfig` / structured output (causa raiz de metade dos bugs)

- **Evidência:** `grep generationConfig|responseMimeType|responseSchema` → **0 ocorrências** em `src/`. As configs `AGENT_CONFIG.GEMINI_CONFIG` (temperature 0.3 etc.) e `STRATEGY_AGENT_CONFIG.GEMINI_CONFIG` ([config/ai.js:144-149,166-170](server/src/config/ai.js#L144)) são **dead config** — definidas e nunca aplicadas. Todas as chamadas Gemini rodam com temperatura default (1.0!) e retornam texto livre que o `extractJson` tenta remendar.
- **Impacto:** variância alta entre execuções (temperatura 1.0 para tarefa analítica), JSONs quebrados frequentes → fallback fake (B4).
- **Correção:** em toda chamada Gemini analítica:
  ```js
  config: {
    temperature: 0.2,
    responseMimeType: 'application/json',
    responseSchema: <schema da tarefa>,   // schemas canônicos versionados em server/src/schemas/
  }
  ```
  Chat continua texto livre (mas ver E4). Deletar `extractJson`+`cleanMarkdown` após migração.

### D4. Dependência de OpenAI só para consolidar — remover

- **Evidência:** GPT-4.1 é usado apenas como consolidador nos dois orquestradores ([Orchestrator.js:38-39](server/src/services/agents/Orchestrator.js#L38), [StrategyOrchestrator.js:32](server/src/services/agents/strategy/StrategyOrchestrator.js#L32)).
- **Impacto:** segunda API key, segundo SDK, segunda superfície de erro/custo — para uma tarefa (fundir JSONs / sintetizar) que o próprio Gemini faz. O custo calculado está errado (usa preço de GPT-4 Turbo).
- **Correção:** com A1/A2 aplicados, a dependência `openai` sai do package.json. (Se quiser manter opção multi-provedor por resiliência, isolar atrás de `llm.js` — mas não como parte do fluxo default.)

### D5. Seleção de modelo do usuário ignorada/mentida no caminho principal

- **Evidência:** o front manda `model` em tudo; mas com `USE_MULTI_AGENTS=true`: `generateTacticalStrategyWithAgents` **não aceita** `customModel` ([geminiService.js:776](server/src/services/geminiService.js#L776)) e o `StrategyOrchestrator` usa `DEFAULT_MODEL` hardcoded ([StrategyOrchestrator.js:57](server/src/services/agents/strategy/StrategyOrchestrator.js#L57)); ainda assim o metadata grava `strategyModel: customModel || 'gemini-2.0-flash'` ([strategyService.js:822](server/src/services/strategyService.js#L822)) — **mente sobre o modelo usado** (na real foi 3× flash + gpt-4.1). O tracking de custos (`ApiUsage`) herda o nome errado.
- **Correção:** propagar `model` por todo caminho (orquestradores incluídos) e gravar em `ApiUsage`/metadata os modelos reais por etapa. Com A2 (1 chamada), isso vira trivial.

### D6. Custo de vídeo sem nenhuma alavanca aplicada

- **Evidência:** vídeo entra em resolução default (~300 tokens/s de vídeo; 5 min ≈ 90k tokens) e o multi-agente paga isso 3×. Nenhum uso de `mediaResolution: 'low'` (~100 tokens/s, geralmente suficiente para ações corporais grandes como grappling), nenhum `videoMetadata` (fps/clipping), nenhum cache.
- **Correção:** na Fase 2, expor `mediaResolution` como config (default `low`, com opção `default` para vídeos de câmera distante) e medir a diferença de qualidade no golden set. Com 1 chamada + low-res, uma luta de 5 min custa ~30k tokens de input (~US$0,04 no 2.5 Pro / ~US$0,01 no 2.5 Flash) contra ~270k tokens hoje.

### D7. Inconsistência YouTube: monolítico sempre baixa; multi-agente tenta URL direto

- **Evidência:** caminho monolítico baixa sempre ([geminiService.js:257-271](server/src/services/geminiService.js#L257)); multi-agente tenta URL direto e cai para download ([geminiService.js:375-397](server/src/services/geminiService.js#L375)).
- **Correção:** unificar: tentar `fileData: {fileUri: youtubeUrl}` primeiro (vídeos públicos), fallback download+File API — num único helper `resolveVideoPart(url)` usado por qualquer análise.

---

## P2 — Qualidade de prompts

### E1. Prompts dos agentes falam "frame" mas recebem vídeo completo

- **Evidência:** "Sua especialidade é análise técnica VISUAL de **frames** de vídeo" ([agent-technical.txt:4](server/src/services/prompts/agent-technical.txt#L4)); "Seja honesto sobre limitações do **frame único**" ([agent-tactical.txt:255](server/src/services/prompts/agent-tactical.txt#L255)); seções inteiras "LIMITAÇÕES DO FRAME", "No Frame:". Herança do caminho de frames morto (B13).
- **Impacto:** instrução contraditória rebaixa a qualidade: o modelo é instruído a duvidar de percepção temporal que ele TEM (vídeo completo) — durações, ritmo, sequências.
- **Correção:** reescrever para "vídeo completo": pedir explicitamente observações temporais (timestamps, durações, sequências de eventos) — que é exatamente o que a Fase 2 formaliza.

### E2. Vocabulário de labels divergente entre prompt do orquestrador, prompt monolítico e config

- **Evidência:** `CHART_LABELS` canônico em [config/ai.js:42-69](server/src/config/ai.js#L42); o guia de mapeamento do orquestrador usa labels fora do vocabulário: "defensivo", "controlador", "busca top", "luta em pé", "x-guard", "aranha", "knee slice", "leg drag", "stack pass", "kimura", "leg attacks" ([agent-orchestrator-video.txt:129-175](server/src/services/prompts/agent-orchestrator-video.txt#L129)). Nada valida labels na saída.
- **Impacto:** gráficos consolidados misturam vocabulários ("laço" e "aranha" como fatias distintas da mesma coisa); consolidação entre lutas não agrega o que deveria ser o mesmo label; kimura sugerida não existe no enum de finalizações.
- **Correção:** gerar a lista de labels do prompt **a partir do config** (placeholder `{{GUARD_LABELS}}` etc.) e validar a saída contra o enum (com `responseSchema` enum isso é automático). Revisar o enum canônico: faltam kimura, americana, ezequiel e outras finalizações comuns; sobra ambiguidade ("estrangulamento" genérico + variantes específicas).

### E3. System prompt do chat como mensagem de usuário + resposta forjada

- **Evidência:** [geminiService.js:1026-1039](server/src/services/geminiService.js#L1026): o "system prompt" entra como primeira mensagem `user` seguida de um `model` forjado ("Entendi o contexto...").
- **Impacto:** instruções degradam com histórico longo (o próprio código admite: precisou reinjetar lembrete a cada mensagem — :1044); resposta forjada polui o histórico.
- **Correção:** usar `systemInstruction` nativo do Gemini para o contexto+regras; o lembrete de mapeamento de campos sai da mensagem do usuário.

### E4. `EDIT_SUGGESTION` por regex em texto livre

- **Evidência:** protocolo `---EDIT_SUGGESTION---` parseado por regex ([geminiService.js:912-968](server/src/services/geminiService.js#L912)) com múltiplos fallbacks frágeis.
- **Correção:** trocar por **function calling / tool use** (`tools: [{functionDeclarations: [suggest_edit(field, newValue, reason)]}]`) — o modelo ou responde texto, ou chama a função com args tipados; parse desaparece. (Suportado no `@google/genai`.)

### E5. Typos e exemplo com viés no prompt principal

- **Evidência:** "sem repetição ou **padão**" e "O **adversidade** teve dificuldade" ([video-analysis.txt:87,96](server/src/services/prompts/video-analysis.txt#L87)); o exemplo de summary descreve um guardeiro DLR → vieses conhecidos de exemplo único (modelos copiam o arquétipo do exemplo em casos ambíguos).
- **Correção:** corrigir typos; ter 2 exemplos contrastantes (um guardeiro, um passador-wrestler) ou zero exemplo + rubrica.

### E6. `matchResult` cru no caminho multi-agente

- **Evidência:** monolítico mapeia `'vitoria-pontos'` → frase legível ([geminiService.js:90-105](server/src/services/geminiService.js#L90)); multi-agente passa o slug cru ([geminiService.js:327](server/src/services/geminiService.js#L327)).
- **Correção:** extrair `formatMatchResult(slug)` único e usar nos dois lugares (ou só no novo caminho unificado).

### E7. UI promete Vimeo/Drive; backend só aceita YouTube

- **Evidência:** validação aceita vimeo/drive ([videoAnalysisService.js:40-49](frontend/src/services/videoAnalysisService.js#L40)) e o hero diz "Suporte para YouTube, Vimeo e Google Drive" ([VideoAnalysis.jsx:159](frontend/src/components/video/VideoAnalysis.jsx#L159)); `linkController` rejeita não-YouTube (:65-71).
- **Correção:** restringir a validação/copy a YouTube (ou implementar download genérico via yt-dlp, que já suporta Vimeo — decisão de produto).

---

## P2 — Arquitetura/operacional

### F1. Requisição HTTP síncrona segura a análise inteira; progresso é fake

- **Evidência:** `analyzeLink` processa tudo na request; o front anima uma barra por `setInterval` sem relação com o backend ([AnalysisProgressContext.jsx:23-40](frontend/src/contexts/AnalysisProgressContext.jsx#L23)). Deploy alvo é Vercel (timeout de função).
- **Correção:** tabela `analysis_jobs (id, status, stage, result, error)` + endpoint de criação que responde `202 {jobId}` + polling `GET /jobs/:id` (estágios reais: baixando/enviando/analisando/consolidando). Não precisa de fila externa — um worker in-process resolve no estágio atual do produto.

### F2. `technicalSummary` (cache do perfil) com invalidação incompleta

- **Evidência:** regenerado após criar análise (link/videoController), mas **não** ao deletar/editar análise; e a regeneração usa `model=null` → sempre `gemini-2.0-flash`, ignorando a escolha do usuário ([linkController.js:197](server/src/controllers/linkController.js#L197)).
- **Correção:** regenerar (ou marcar stale) em delete/edit de análise; propagar o modelo.

### F3. Metadados da luta não são persistidos

- **Evidência:** `matchResult`, `belt` (do momento da luta), data da luta, evento/campeonato, nome do oponente naquele vídeo — nada disso é salvo em `fight_analyses` (só `video_url`, `charts`, `summary`).
- **Impacto:** consolidação não pode ponderar por recência/resultado; impossível responder "como ele lutou nas últimas 3 lutas".
- **Correção:** migração adicionando `match_result`, `belt_at_fight`, `fight_date`, `event_name`, `opponent_label` a `fight_analyses`; controllers passam adiante; consolidação usa pesos por recência (ex.: meia-vida de 12 meses).

### F4. Sem avaliação de qualidade (não dá para saber se qualquer mudança melhora)

- **Evidência:** o endpoint debug compara apenas tokens/custo; não há dataset de referência.
- **Correção:** montar um **golden set**: 3–5 vídeos de luta anotados manualmente (event log verdadeiro: raspagens, passagens, finalizações com timestamps) + script `server/scripts/eval-analysis.js` que roda o pipeline e mede precisão/recall de eventos e erro de placar. Toda mudança de prompt/modelo roda o eval. Sem isso, qualquer refactor de prompt é fé.

---

## Nova arquitetura proposta (a "estratégia melhor de analisar")

Princípio: **LLM extrai eventos; código faz matemática; LLM escreve texto a partir de dados estruturados.** Um provedor (Gemini), um caminho de análise, tudo com `responseSchema`.

### 1) Ingestão — uma chamada por vídeo: **Event Log**

Modelo: `gemini-2.5-pro` (config por usuário), `mediaResolution: 'low'`, `temperature: 0.2`.

```jsonc
// responseSchema (resumido)
{
  "meta": { "duracao_video": "MM:SS", "alvo_identificado": true, "confianca_identificacao": 0.9, "limitacoes": ["câmera distante no 2º round"] },
  "eventos": [
    {
      "t": "01:23",                          // timestamp no vídeo
      "quem": "alvo" | "oponente",
      "tipo": "puxada_guarda|queda|raspagem|passagem|montada|costas|joelho_barriga|finalizacao_tentativa|finalizacao_concluida|escape|recomposicao|punicao|vantagem",
      "tecnica": "de_la_riva",               // enum canônico (single source: config)
      "detalhe": "gancho na perna de trás, pegada na gola",
      "resultado": "sucesso|falha|parcial",
      "posicao_antes": "em_pe", "posicao_depois": "guarda_dlr",
      "pontos_ibjjf": 2                       // 0 se não pontuou (critério 3s)
    }
  ],
  "segmentos_posicao": [ { "de": "00:00", "ate": "01:20", "posicao": "em_pe", "quem_controla": "neutro" } ],
  "resumo_narrativo": "texto corrido, mesmo padrão anti-adjetivo do prompt atual"
}
```

Por que isso resolve os problemas centrais:
- **Auditável** (A4): cada claim tem timestamp — dá para conferir no vídeo e construir o golden set (F4).
- **Anti-alucinação estrutural**: contar eventos observados é uma tarefa em que o modelo alucina muito menos do que "atribua percentuais que somem 100".
- **Oponente incluído de graça** (A5).
- `technical_stats`, gráficos e placar deixam de ser output do LLM.

### 2) Derivação determinística (código, zero IA)

`server/src/services/analysisDerivation.js`:
- `technical_stats` = contagens do event log (schema canônico único — resolve B3);
- **Gráficos de frequência** (guardas usadas, passagens, finalizações) = contagem de eventos por técnica — números reais, não percentuais inventados (resolve A3);
- **Comportamento inicial** = primeiro evento do alvo após cada início de combate;
- **Traços de estilo** = métricas independentes 0–100 (não somam 100): iniciativa (% de trocas iniciadas), pressão (% tempo por cima avançando), aceleração final (densidade de eventos no último terço vs primeiro) — cada uma com fórmula documentada;
- **Placar estimado** = soma de `pontos_ibjjf` (validável contra `matchResult` informado: se divergir muito, flag de qualidade na análise).

### 3) Consolidação multi-lutas (1 chamada de texto, barata)

- Agregação dos event logs em código (com peso por recência — F3);
- `gemini-2.5-flash` escreve o perfil narrativo a partir de: stats agregados + top-sequências (bigramas de eventos: "DLR → raspagem" 4×) + resumos por luta;
- Substitui `consolidate-summaries.txt` + prompt inline duplicado (A6/F: unificação).

### 4) Estratégia (1 chamada forte + verificador)

- Input estruturado: perfil+stats do atleta, perfil+stats do adversário, `BELT_RULES[faixaRestritiva]` (corrigidas — C2) injetadas por código, `responseSchema` = JSON atual da estratégia (frontend não muda);
- Prompt em seções (o conteúdo dos atuais scout/gameplan/rules vira SEÇÕES de um prompt só — mantém a ideia boa do cruzamento arma×vulnerabilidade sem 4 chamadas);
- **Pós-verificação determinística**: scan das técnicas citadas na estratégia contra a lista de proibidas da faixa; se encontrar, re-prompt de correção (1 retry) ou remoção com flag. É a única garantia real contra sugestão ilegal — prompt sozinho não garante;
- `oportunidades_de_pontos.probabilidade` só pode citar números se os stats existirem (instrução condicional no prompt — resolve E7/"probabilidades inventadas").

### 5) Custo/latência estimados (5 min de luta)

| | Hoje (multi-agente) | Proposta |
|---|---|---|
| Chamadas por vídeo | 3× Gemini vídeo + 1 GPT | **1× Gemini vídeo** |
| Tokens de vídeo | ~270k (3× default res) | ~30k (1× low res) |
| Estratégia | 3 Gemini + 1 GPT + 2 desperdiçadas | 1 Gemini (+1 retry eventual) |
| Provedores/keys | 2 | 1 |
| Custo típico análise* | ~US$0,08 (flash) mas 3× latência | ~US$0,01 (flash) / ~US$0,05 (2.5 pro) |

\* estimativa; validar com pricing vigente na implementação.

---

## Plano de implementação sugerido (ordem)

**Fase 0 — Correções P0 (1 dia, sem mudar arquitetura):**
1. B1+B2 (persistir stats + chave camelCase) — destrava dados quantitativos já no pipeline atual;
2. B4+B5 (matar fallback fake; falha = erro);
3. B7 (MAX_WORDS), B6 (behavioral_pattern), B9 (stats sem IA), B10 (detalhes shape);
4. C2 (BELT_RULES corrigidas como fonte única) + C1 (formatter único);
5. B8 (deletar código morto do strategyService) e B13 (deletar caminho de frames);
6. B11 (exemplos do chat-strategy com schema real + validação no applyEdit).

**Fase 1 — Modernização da camada LLM (1–2 dias):**
7. D2 (migrar `@google/genai` atrás de `llm.js`);
8. D3 (responseSchema+temperature em toda chamada; deletar extractJson/cleanMarkdown);
9. D1+D5 (novos defaults de modelo; propagar escolha do usuário; ApiUsage com modelos reais);
10. A1+A2+D4 (aposentar multi-agente de vídeo e de estratégia; remover `openai`).

**Fase 2 — Nova metodologia (3–5 dias):**
11. Event log schema + prompt novo de ingestão (E1 morre junto);
12. Derivação determinística + migração F3 (metadados da luta);
13. Consolidação unificada com pesos; estratégia 1-chamada + verificador de legalidade;
14. F4 (golden set + script de eval) — **fazer antes de trocar o prompt de ingestão**, para medir a troca;
15. F1 (job assíncrono + progresso real) e E3/E4 (systemInstruction + tool-use no chat).

**Critérios de aceite (mínimos):**
- Estratégia gerada exibe números reais que batem com o event log (hoje: impossível);
- Zero análises salvas com `_warning`/charts default;
- Estratégia para faixa roxa nunca cita toe hold/kneebar (teste automatizado com perfil sintético);
- Eval no golden set: recall de eventos ≥ baseline anotado à mão (definir na criação do set);
- Custo por análise registrado em `ApiUsage` com o modelo real de cada etapa.
