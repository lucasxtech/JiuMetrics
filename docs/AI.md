# AI — Integração com IA no JiuMetrics

> **Descreve a integração como está implementada hoje.** Nenhum prompt, modelo ou parâmetro foi alterado nesta etapa.
>
> **Fonte:** `server/src/services/{llm,geminiService,strategyService,videoDownloader}.js`, `server/src/services/prompts/*.txt`, `server/src/schemas/*.js`, `server/src/config/ai.js`, `server/src/models/ApiUsage.js`. Verificado em 2026-08-12 contra `main` (`895066f`).
>
> **Contexto histórico:** a camada de IA foi modernizada na "Fase 1" (commit `c193c8a`), guiada por [`../SPEC-ANALISE-IA.md`](../SPEC-ANALISE-IA.md). O sistema multi-agentes anterior foi **removido** — ver [ADR-006](./decisions/006-camada-unica-de-llm-e-aposentadoria-do-multi-agente.md).

---

# Current Architecture

## Camadas

```mermaid
flowchart TD
    subgraph controllers
        LC["linkController<br/>análise de vídeo"]
        SC["strategyController<br/>estratégia"]
        AC["aiController<br/>resumo / consolidação"]
        CC["chat*Controller<br/>16 endpoints de chat"]
    end
    LC --> GS["geminiService.js (845 linhas)<br/>prompts + domínio IBJJF + parsing"]
    SC --> SS["strategyService.js<br/>consolidação + orquestração"]
    AC --> SS
    AC --> GS
    CC --> GS
    SS --> GS
    GS --> LLM["services/llm.js<br/>ÚNICA fronteira com o SDK"]
    SS --> LLM
    LLM --> SDK["@google/genai (GoogleGenAI)"]
    GS --> P["services/prompts/*.txt (7 arquivos)"]
    GS --> SCH["schemas/*.js (responseSchema)"]
    LC --> VD["videoDownloader.js<br/>yt-dlp → ytdl-core"]

    style LLM fill:#1f6f43,color:#fff
```

**Regra arquitetural central:** nenhum controller ou model importa `@google/genai`. Todo acesso ao SDK passa por `services/llm.js`, e os testes mockam esse módulo em vez do SDK. Trocar de modelo ou SDK acontece em um só lugar.

## Provedor e configuração

| Item | Valor |
|---|---|
| Provedor | **Google Gemini** |
| SDK | `@google/genai` 2.13 |
| Credencial | `GEMINI_API_KEY` — se ausente, o cliente é `null` e as chamadas falham com `GeminiApiKeyMissingError` (avisa no boot, não derruba o processo) |
| Interface exposta | `generateJson`, `generateText`, `sendChatMessage`, `uploadVideo`, `deleteFile` |

**Modelos por tarefa** (`config/ai.js#TASK_MODELS`):

| Tarefa | Modelo default | Temperatura |
|---|---|---|
| `VIDEO_ANALYSIS` | `gemini-2.5-pro` | 0.2 |
| `STRATEGY` | `gemini-2.5-pro` | 0.3 |
| `TEXT` (resumo, consolidação) | `gemini-2.5-flash` | 0.4 |
| `CHAT` | `gemini-2.5-flash` | 0.7 |

`resolveModel(task, userModel)` — **a escolha explícita do usuário sempre vence o default**. O valor vem do `localStorage` do cliente e viaja no `req.body.model`. Não é validado (ver *Known Issues*).

`AVAILABLE_MODELS` lista `gemini-3.1-pro-preview`, `gemini-3-pro-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`. **A mesma lista existe duplicada** em `frontend/src/utils/aiConfig.js`.

## Prompts

7 arquivos `.txt` em `server/src/services/prompts/`, carregados por `prompts/index.js` com cache em memória e substituição `{{PLACEHOLDER}}`:

| Arquivo | Usado em |
|---|---|
| `video-analysis.txt` | análise de vídeo |
| `tactical-strategy.txt` | geração de estratégia |
| `athlete-summary.txt` | `POST /api/ai/athlete-summary` |
| `consolidate-summaries.txt` | consolidação de múltiplos resumos de vídeo |
| `chat-analysis.txt` | chat sobre uma análise |
| `chat-profile.txt` | chat sobre um perfil técnico |
| `chat-strategy.txt` | chat sobre uma estratégia |

`fillPrompt` usa `split().join()` em vez de `String.replace` — imune a `$&`/`$1` no valor substituído. Coberto por `src/__tests__/prompts.test.js` (360 linhas).

⚠️ **Exceção:** existe um oitavo prompt de produção **hardcoded** em `strategyService.js` (~53 linhas, o prompt de consolidação de múltiplas análises). Não está em `services/prompts/`, não é coberto pelo teste de prompts.

## Saída estruturada

`schemas/videoAnalysis.js` e `schemas/strategy.js` definem `responseSchema` no formato OpenAPI do Gemini, enviados com `responseMimeType: 'application/json'`. Isso substituiu o padrão anterior de "JSON de exemplo dentro do prompt + regex para extrair", que era a causa-raiz de uma família de bugs de parse.

**Cobertura:** análise de vídeo ✅ · estratégia ✅ · **chat ❌** (texto livre + regex — ver *Known Issues*).

## Domínio IBJJF no prompt

`config/ai.js#BELT_RULES` é a **fonte única** de regras por faixa (técnicas permitidas, proibidas, observações), com aliases pt/en resolvidos por `resolveBeltKey`. `getBeltLevel` dá o nível numérico (1=branca … 5=preta) para determinar a faixa mais restritiva entre dois competidores.

Não é apenas texto de prompt: `getBeltLevel` alimenta lógica de decisão. Ver [ADR-005](./decisions/005-belt-rules-como-tabela-deterministica.md).

## Rastreamento de custo

`models/ApiUsage.js` mantém `PRICING` por modelo (com faixas *tiered* para os `3-pro-preview`) e `calculateCost`. Toda operação de IA chama `logApiUsage`/`logApiUsageWithType`, que **nunca lança** — falha de registro não derruba a operação.
⚠️ O registro provavelmente **não persiste** — ver *Known Issues*.

## Tratamento de erro

`utils/errors.js` define 12 classes tipadas com `statusCode`: `GeminiQuotaExceededError`, `GeminiContentBlockedError`, `GeminiApiKeyMissingError`, `GeminiApiError`, `GeminiProcessingError`, `GeminiParseError`, `VideoDownloadError`, além das genéricas. `parseGeminiError` normaliza o erro cru do SDK.

`videoDownloader.classifyDownloadError` traduz 10 modos de falha do YouTube (bot detection, vídeo privado, restrição de idade, timeout, tamanho, copyright, live…) em mensagens acionáveis em pt-BR.

---

# Fight Analysis

## Entrada

`POST /api/ai/analyze-link` (rate limit `heavyLimiter` 30/15min, autenticado):

```
{
  videos:      [{ url, giColor }],   // N itens — SEM LIMITE
  athleteName: string,
  personId:    string,               // opcional — se presente, persiste
  personType:  'athlete' | 'opponent',
  belt:        string,               // alimenta as regras IBJJF
  matchResult: string,               // 'vitoria-pontos', 'derrota-finalizacao', ...
  model:       string                // opcional, NÃO validado
}
```

**Só YouTube é suportado.** `extractYouTubeId` valida via `new URL()` e rejeita o que não for YouTube. Upload de arquivo **não existe** — `POST /api/ai/analyze-video` é um stub que retorna 400 apontando para `analyze-link`.

## Processamento

```mermaid
sequenceDiagram
    participant LC as linkController
    participant GS as geminiService.analyzeFrame
    participant VD as videoDownloader
    participant G as Gemini

    Note over LC: loop SERIAL sobre N vídeos, sem limite
    LC->>GS: analyzeFrame(url, contexto, model)
    GS->>GS: getPrompt('video-analysis') + buildVideoAnalysisContext
    Note over GS: contexto = nome do atleta, faixa+regras IBJJF,<br/>cor do kimono, resultado da luta
    GS->>G: Tentativa 1 — fileData{fileUri: youtubeUrl}
    alt Gemini aceita a URL
        G-->>GS: JSON validado por VIDEO_ANALYSIS_SCHEMA
    else Gemini recusa
        GS->>VD: downloadYouTubeVideo(url)
        Note over VD: yt-dlp (binário) → fallback ytdl-core (JS)<br/>máx 200MB / 720p / timeout 120s
        VD-->>GS: arquivo local
        GS->>G: files.upload → aguarda ACTIVE (polling 2→5s, máx 120s)
        GS->>G: Tentativa 2 — fileData{fileUri, mimeType}
        G-->>GS: JSON
    end
    GS->>GS: normalizeAnalysisCharts (força soma 100%, descarta vazios)
    Note over GS: finally: remove arquivo local + delete na Files API
    GS-->>LC: { analysis, usage }
```

Se um vídeo falha, o loop **continua** com os demais; só retorna erro se **nenhum** foi analisado com sucesso.

## Prompt

`video-analysis.txt` + contexto montado em `buildVideoAnalysisContext`, que injeta:

- atleta alvo (com instrução explícita de **ignorar o oponente** no vídeo)
- faixa + regras IBJJF formatadas de `BELT_RULES`
- cor do kimono para identificar quem analisar
- resultado da luta, para contextualizar se o estilo foi eficaz

## Resposta e parsing

`VIDEO_ANALYSIS_SCHEMA` garante a forma. **Não há parsing manual** — `JSON.parse` sobre saída já validada pelo schema; falha lança `GeminiParseError`.

Estrutura: `charts` (5 gráficos comportamentais — Personalidade Geral, Comportamento Inicial, Jogo de Guarda, Jogo de Passagem, Tentativas de Finalização), `technical_stats` (raspagens, passagens, finalizações, tomadas de costas) e `summary` (texto narrativo).

## Pós-processamento

1. `normalizeAnalysisCharts` — força cada gráfico a somar 100%, descarta gráficos sem dado.
2. `consolidateAnalyses` (**função pura, sem IA**) — médias entre os N vídeos.
3. Se houver **mais de um** resumo: `consolidateSummariesWithAI` — 2ª chamada de IA (modelo `TEXT`).

## Armazenamento

| Destino | Quando |
|---|---|
| `fight_analyses` | se `personId` foi enviado (⚠️ sem verificar posse) |
| `athletes/opponents.technical_summary` | reconsolidado logo após salvar, de forma **síncrona** |
| `api_usage` | tokens somados de todos os vídeos (⚠️ provavelmente falha) |

---

# Strategy Generation

## Entrada

`POST /api/strategy/compare` (rate limit `heavyLimiter`, autenticado): `{ athleteId, opponentId, model? }`.

**Apenas IDs** — os dados são carregados no servidor, sob escopo de tenant. Este endpoint faz a verificação de posse corretamente.

## Dados utilizados

```mermaid
flowchart TD
    A["Athlete.getById<br/>(escopo verificado)"] --> CHK{"technical_summary<br/>já salvo?"}
    O["Opponent.getById<br/>(escopo verificado)"] --> CHK
    FA["fight_analyses dos dois lados<br/>(1 query cada, em paralelo)"] --> GATE{"≥1 análise<br/>de cada lado?"}
    GATE -->|não| ERR["erro específico:<br/>qual lado falta"]
    GATE -->|sim| CHK
    CHK -->|"SIM — reusa"| STATS["consolidateTechnicalStats<br/>(função pura, sem IA)"]
    CHK -->|"NÃO — consolida"| AI1["consolidateAnalyses<br/>(1 chamada de IA)"]
    STATS --> PROMPT
    AI1 --> PROMPT["tactical-strategy.txt"]
    PROMPT --> BELT["faixa MAIS RESTRITIVA<br/>governa as técnicas"]
    BELT --> G["llm.generateJson<br/>STRATEGY_SCHEMA · temp 0.3"]

    style BELT fill:#2b5797,color:#fff
```

O que entra no prompt por lado: `name`, `belt` (+ regras IBJJF formatadas), `resumo` (o `technical_summary` narrativo) e `technical_stats` formatados de forma legível, omitindo zeros.

**Regra de faixa:** `getBeltLevel` compara os dois; a mais restritiva governa. Se a faixa mais restritiva não é preta, um bloco `BELT_WARNING` é injetado no prompt proibindo técnicas ilegais para ela. Faixa vazia ou desconhecida → conjunto de branca.

## Modelo e resposta

`gemini-2.5-pro` (ou a escolha do usuário), temperatura 0.3, **uma única chamada** com `STRATEGY_SCHEMA`. O sistema multi-agentes anterior fazia várias — ver [ADR-006](./decisions/006-camada-unica-de-llm-e-aposentadoria-do-multi-agente.md).

Estrutura de saída: `resumo_rapido` (`como_vencer`, `tres_prioridades`), `analise_de_matchup`, `plano_tatico_faseado`, `cronologia_inteligente`, `checklist_tatico`.

## Armazenamento

| Destino | Conteúdo |
|---|---|
| `tactical_analyses` | `strategy_data` (JSONB) + `metadata` (modelo, tokens, contagens) + nomes **desnormalizados** |
| `strategy_versions` | versão inicial (`edited_by: 'system'`) |
| `api_usage` | tokens da estratégia (⚠️ provavelmente falha) |

Falha ao salvar no histórico **não derruba** a geração — o usuário recebe a estratégia. Falha ao criar a versão inicial também é tolerada.

---

# Chat (refinamento)

Terceiro fluxo de IA, com 3 subtipos (`analysis`, `profile`, `strategy`) e 15 endpoints em `/api/chat`.

**Mitigação de prompt injection** (commit `23b475b`, [ADR-003](./decisions/003-system-instruction-fixa-no-chat.md)):

- `CHAT_SYSTEM_INSTRUCTION` é uma **constante fixa** que nunca interpola dado do usuário;
- o bloco de contexto entra como **primeiro turno `user`**, com aviso explícito de que é dado, não comando;
- o histórico da conversa vem depois.

O papel `system` carrega mais autoridade para o modelo do que uma mensagem comum — colocar dado influenciável do usuário ali era o vetor mais perigoso.

Para contexto `strategy`, um lembrete de mapeamento de campos é reinjetado ao final de cada mensagem, porque após 2–3 turnos o modelo tendia a reutilizar o último campo sugerido (viés de recência).

A IA pode devolver uma **sugestão de edição**, extraída por `extractEditSuggestion` (regex — ver *Known Issues*), que só é aplicada quando o usuário aceita.

---

# Known Issues

Severidade conforme [`../AUDIT.md`](../AUDIT.md) §8. **Nada foi corrigido.**

## HIGH

### AI-1 — O chat é o único caminho sem saída estruturada
`llm.js` documenta como princípio *"saída estruturada SEMPRE via responseSchema"*, mas `sendChatMessage` não aceita schema, e `extractEditSuggestion` volta ao padrão que a Fase 1 aboliu: `match(/---EDIT_SUGGESTION---([\s\S]*?)---END_SUGGESTION---/)`, com fallback para procurar JSON solto, limpeza de cercas markdown e três formatos legados aceitos.
**Impacto:** as sugestões de edição da IA — que **escrevem no banco** — dependem de regex frágil. Quando o parse falha, o usuário recebe "Preparei uma sugestão de alteração para você revisar" e a sugestão é perdida em silêncio.
**Mitigação parcial existente:** `validateStrategyField` valida o shape antes de persistir estratégia. Não há equivalente para edição de análise.

### AI-2 — `model` do usuário vai cru para o SDK
`resolveModel` retorna `userModel` sem conferir contra `AVAILABLE_MODELS`.
**Impacto:** (a) usuário força o modelo mais caro em toda tarefa, inclusive chat; (b) string arbitrária chega ao SDK; (c) **a contabilidade de custo quebra em silêncio** — `calculateCost` cai no preço de `gemini-2.5-flash` para modelo desconhecido, registrando custo sem relação com o cobrado.

### AI-3 — Nenhum limite de vídeos por request
`analyzeLink` itera `videos[]` sem teto, e cada item é uma inferência de vídeo em `gemini-2.5-pro` — a operação mais cara do sistema.
**Impacto:** combinado com AI-2, com o rate limiting ineficaz em serverless e com o registro de custo quebrado, **não existe nenhum controle efetivo de gasto de IA**.

### AI-4 — Registro de custo provavelmente não funciona
`models/ApiUsage.js` usa o cliente **anon** contra política RLS `auth.uid() = user_id`, e o projeto não usa Supabase Auth → `auth.uid()` é `NULL`. O erro é engolido em `apiUsageLogger`.
**Impacto:** o único controle financeiro do produto não funciona; as telas de custo mostram zero como dado real.
**NEEDS_CONFIRMATION:** `SELECT count(*), max(created_at) FROM api_usage;`

## MEDIUM

| # | Problema | Impacto |
|---|---|---|
| AI-5 | **Prompt hardcoded fora de `services/prompts/`** (~53 linhas em `strategyService.js`) | Prompt de produção invisível para quem procura no lugar certo; fora do teste de prompts |
| AI-6 | **Validação de host do YouTube por substring** — `hostname.includes('youtube.com')` deixa `youtube.com.attacker.net` passar. Também no frontend, que ainda aceita qualquer URL contendo "video" | SSRF limitado: o servidor busca URL de host controlado pelo atacante, e a URL vai ao Gemini como `fileData`. Mitigado por `execFile` sem shell e pelos limites de tamanho/timeout |
| AI-7 | **Prompt injection mitigado só no chat** — `athleteName`, `matchResult` e `belt` entram crus no prompt de análise; `athleteData` inteiro do body vai serializado; e o `technical_summary`, **gerado a partir de vídeo de terceiros**, é reinjetado no prompt de estratégia | Injeção **indireta**: o payload pode vir do vídeo analisado, não do usuário. Impacto atual baixo (dado majoritariamente auto-fornecido, saída não executa nada, schema limita a forma). Sobe se o produto abrir para tenants não confiáveis |
| AI-8 | **Sem retry e sem timeout de inferência** — nenhuma chamada a `generateContent`/`sendMessage` tem timeout próprio ou retry | Quota estourada ou 5xx transitório perde a operação inteira, **inclusive depois** de baixar o vídeo e enviá-lo à Files API. O trabalho caro já foi pago |
| AI-9 | **Fallbacks degradam o dado em silêncio** — se a consolidação por IA falha, o retorno é `summaries.join(' ')`, persistido em `technical_summary` e **indistinguível de um resumo real** — e depois alimenta a estratégia | Dado de qualidade inferior tratado como equivalente |
| AI-10 | **Trabalho longo de IA em request serverless** | Download (até 120s) + upload/polling (até 120s) + inferência, × N vídeos em série, sem `maxDuration` no `vercel.json`. Provável timeout **após** consumir tokens. **NEEDS_CONFIRMATION:** plano da Vercel |

## LOW

| # | Problema |
|---|---|
| AI-11 | **`AVAILABLE_MODELS` duplicada** entre `config/ai.js` e `frontend/src/utils/aiConfig.js` |
| AI-12 | **`config/ai.js` mistura domínio e infra** — regras IBJJF, nomes de modelo, temperaturas, limites de download, rate limits e labels de gráfico no mesmo arquivo |
| AI-13 | **`geminiService.js` acumula três papéis** em 845 linhas: montagem de prompt, regras de domínio e parsing |

---

# Constraints

Limites reais, que qualquer proposta de evolução precisa respeitar.

1. **Só YouTube.** Não há upload de arquivo. Depende de `@distube/ytdl-core` e do binário `yt-dlp` — **dependência de sistema não declarada em nenhum manifesto**. Ambos quebram rotineiramente quando o YouTube muda, e são as dependências mais frágeis do projeto. Em produção (Vercel) `yt-dlp` não existe, então o caminho real é sempre `ytdl-core`.

2. **YouTube pode bloquear por detecção de bot.** Mitigado por `YOUTUBE_COOKIES`, que **expira** e precisa de renovação manual.

3. **Limites de vídeo:** 200 MB, 720p, timeout de download 120 s, processamento na Files API 120 s.

4. **Serverless não sustenta trabalho longo** — ver AI-10.

5. **Os gráficos não são auditáveis.** Percentuais forçados a somar 100%, sem timestamps nem eventos verificáveis. É interpretação do modelo apresentada como distribuição. `frames_analyzed` é resquício de um caminho de análise por frames estáticos que **já foi removido** do código.

6. **Cadeia de compressão lossy até a estratégia:** vídeo → análise estruturada → resumo narrativo → consolidação de N resumos → prompt de estratégia. Cada etapa perde informação, e a estratégia final vê apenas texto mais alguns números agregados.

7. **`analysis_versions` não tem `user_id`** — restrição de schema que impede autorizar versões por dono sem alterar a tabela.

8. **Não há job assíncrono, fila ou canal de tempo real.** O progresso mostrado na UI é simulado no cliente.

---

# Future Considerations

> **Nada aqui está implementado.**
>
> 🎯 A arquitetura-alvo de IA — cost guard, versionamento de prompt, retry/timeout com políticas distintas para análise e estratégia, e o **limite honesto** da reprodutibilidade — está em [`../JIU_METRICS_REFACTORING_PLAN.md`](../JIU_METRICS_REFACTORING_PLAN.md) §9. Spec: [009](../specs/009-ai-cost-and-reliability/spec.md).

## Documentado em spec anterior

[`../SPEC-ANALISE-IA.md`](../SPEC-ANALISE-IA.md) propõe substituir a metodologia dos gráficos por um **event log com timestamps** + agregação determinística em código (itens A3/A4). Isso tornaria os números auditáveis e rastreáveis ao vídeo. Continua **não implementado**.

## Decidido, não implementado (`PLANNED`)

- **`BELT_RULES` conferida contra o regulamento oficial IBJJF**, mantida como tabela determinística em código, com fonte citada e data de revisão. **Não** virar RAG/base de conhecimento: a legalidade de uma técnica por faixa não pode ser probabilística. Ver [ADR-005](./decisions/005-belt-rules-como-tabela-deterministica.md).
  ⚠️ A **correção esportiva** da tabela atual é `NEEDS_CONFIRMATION` — exige revisão humana com o regulamento em mãos.

## Em consideração (sem decisão)

- Estender `responseSchema` ao chat, encerrando o último parsing por regex.
- Allow-list de modelos + limite de `videos[]` + quota por tenant — depende de o registro de custo funcionar primeiro, para haver visibilidade.
- Job assíncrono (`202 {jobId}` + polling), que também habilitaria progresso real na UI.
- Retry com backoff nas chamadas de inferência, e timeout explícito.
- Marcar `technical_summary` gerado por fallback degradado, para não tratá-lo como equivalente a um resumo consolidado.
- Trazer o prompt hardcoded de `strategyService.js` para `services/prompts/`.
- Trocar de provedor de IA exigiria reescrever `schemas/*.js` (usam `Type` do SDK do Gemini e o dialeto OpenAPI dele) e repensar a ingestão de vídeo (Files API é conceito específico do Gemini). Os controllers não seriam afetados. Para *trocar de modelo*, a arquitetura atual já resolve; para *trocar de provedor*, está ~70% do caminho.

---

## Ver também

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — camadas e infraestrutura
- [`modules/fight-analysis.md`](./modules/fight-analysis.md) · [`modules/strategies.md`](./modules/strategies.md) · [`modules/chat-and-versions.md`](./modules/chat-and-versions.md)
- [`../SPEC-ANALISE-IA.md`](../SPEC-ANALISE-IA.md) — auditoria e proposta anteriores do pipeline de IA
- [`../AUDIT.md`](../AUDIT.md) §8 — evidência em `arquivo:linha`
