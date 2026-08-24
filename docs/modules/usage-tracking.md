# Módulo: Rastreamento de Uso e Custo de IA

> ✅ **VERIFICADO em 2026-08-13 (spec 002): este módulo FUNCIONA.** 173 linhas em `api_usage`, de 2025-12-14 a 2026-08-12, **US$ 3,0295** acumulados.
>
> A auditoria havia concluído que a persistência era rejeitada por RLS. **A conclusão estava errada** — a política `auth.uid() = user_id` não está ativa em produção. Restam duas dívidas **menores** de qualidade de dado, descritas em *Known Issues*.
>
> **Código:** `server/src/models/ApiUsage.js`, `server/src/utils/apiUsageLogger.js`, `server/src/controllers/usageController.js` · **Tabela:** `api_usage` · **Frontend:** `pages/Settings.jsx`, card de custo em `pages/Overview.jsx`, `services/usageService.js`

---

## Responsibility

Registrar cada chamada à API do Gemini com tokens consumidos e custo estimado, e expor estatísticas agregadas por período, modelo e tipo de operação.

**É o único controle financeiro do produto.**

✅ **Desde a [spec 009](../../specs/009-ai-cost-and-reliability/spec.md) o módulo deixou de ser só observação.** O gasto registrado aqui alimenta `services/costGuard.js`, que barra a operação **antes** da chamada de IA quando o grupo atinge o orçamento do mês. Ainda não há alerta ativo (só aviso no log a partir de 80%) nem circuit breaker por modelo.

## Business Rules

`IMPLEMENTED`, verificadas no código:

1. **Toda operação de IA registra uso**, com `operation_type` identificando a origem: `video_analysis`, `strategy`, `summary`, `consolidate_profile`, `chat_analysis`, `chat_profile`, `chat_strategy`.
2. **Falha no registro nunca derruba a operação principal.** Decisão mantida e agora **explícita**: a spec 007 auditou este `catch` e registrou TOLERAR como a decisão certa — custo não pode derrubar uma operação de IA que o usuário já pagou. O que mudou é a visibilidade: `logToleratedFailure` marca a falha de forma localizável (`grep "FALHA TOLERADA"`) em vez de um `console.warn` indistinguível de ruído. ⚠️ Continua sendo stdout, sem alerta nem agregação.
3. **Custo é calculado por tabela de preços por modelo** (`PRICING`), em USD por 1 M de tokens, com preço separado de input e output.
4. **Modelos `3-pro-preview` usam preço em faixas (*tiered*)** — até 200 K tokens de prompt: $2/$12; acima: $4/$18.
5. **Modelo desconhecido cai no preço de `gemini-2.5-flash`** (`DEFAULT_MODEL`), agora **com aviso no log** (spec 009). Registrar zero seria pior — subestimaria o gasto. E o cenário que tornava isso perigoso deixou de existir: a allow-list garante que todo modelo que chega até aqui tem preço em `PRICING`.
6. **Escopo:** admin vê o consumo de todo o grupo; usuário comum vê só o próprio (via `resolveScope`, `services/authorization.js` — spec 005).
7. **Períodos suportados:** `today`, `week`, `month` (default), `all`.
8. **A resposta agrega por modelo e por operação**, e devolve os 10 registros mais recentes.
9. **`api_usage` não é transferido** quando um usuário é excluído com transferência de dados — é descartado junto com a conta.

## Inputs

**Interno** (chamado por outros módulos):

```js
logApiUsageWithType({
  userId,
  operationType,          // 'video_analysis' | 'strategy' | 'chat_analysis' | ...
  usage: { modelName, promptTokens, completionTokens, totalTokens },
  metadata                // { athleteName, videosCount, personId, ... }
})
```

O objeto `usage` vem sempre de `services/llm.js#extractUsage`, que normaliza o `usageMetadata` do SDK do Gemini. **O `modelName` é o modelo efetivamente usado**, não o solicitado.

**HTTP:**

| Endpoint | Auth | Dado |
|---|---|---|
| `GET /api/usage/stats?period=today\|week\|month\|all` | autenticada | — |
| `GET /api/usage/pricing` | autenticada | — |

## Outputs

`GET /api/usage/stats`:

```
{
  period, startDate, endDate,
  stats: {
    totalCost,        // USD, 6 casas decimais
    totalTokens,
    requestsCount,
    byModel:     [{ model, tokens, cost, count }],
    byOperation: [{ operation, tokens, cost, count }],
    recentUsage: [{ id, model, operation, tokens, cost, createdAt }]   // 10 mais recentes
  }
}
```

`GET /api/usage/pricing`: a tabela `PRICING` completa, com `currency: 'USD'` e `unit: 'per 1M tokens'`.

## Dependencies

- `models/ApiUsage.js` — cálculo, persistência e agregação
- `services/authorization.js#resolveScope` — escopo admin/usuário (spec 005; `utils/tenantScope.js#getScopeIds` é wrapper `@deprecated`)
- ~~`supabase` (cliente anon)~~ ✅ **RESOLVIDO na spec 008** — `config/supabase.js` unificou num único cliente `service_role`; `ApiUsage.js` importa o mesmo `supabase` de sempre (nenhuma linha mudou neste arquivo), mas o que esse nome aponta mudou. O registro deixou de depender da política RLS estar inativa
- Tabela `api_usage` — RLS ligada nas migrations, **sem efeito para o código, que agora acessa por `service_role`**
- `services/llm.js#extractUsage` — origem de todo `usage`

## Flow

```mermaid
flowchart TD
    subgraph "Escrita — a cada operação de IA"
        OP["análise · estratégia · resumo · chat"] --> LLM["llm.js#extractUsage<br/>modelo real + tokens"]
        LLM --> LOG["logApiUsageWithType"]
        LOG --> CALC["calculateCost(modelo, tokens)<br/>PRICING, com faixas"]
        CALC --> INS["INSERT em api_usage<br/>via cliente service_role (spec 008)"]
        INS --> OK["✅ gravado<br/>(173 linhas, verificado 2026-08-13)"]
        INS -.->|"erro do PostgREST, qualquer causa"| REJ["❌ rejeitado"]
        REJ --> WARN["logToleratedFailure (spec 007)<br/>falha TOLERADA por decisão,<br/>mas localizável no log"]
    end

    subgraph "Leitura"
        GET["GET /api/usage/stats"] --> SC["resolveScope"]
        SC --> SEL["SELECT filtrado por user_id + período"]
        SEL --> AGG["aggregateStats: por modelo e operação"]
        AGG --> UI["Settings.jsx · card de custo do Overview"]
    end

    style OK fill:#1f6f43,color:#fff
    style WARN fill:#8b1a1a,color:#fff
```

## Not Responsible For

- **Escolher o modelo** — é `config/ai.js#resolveModel`, que desde a spec 009 **valida contra a allow-list**.
- **Impor limites ou quota** — a decisão vive em `services/costGuard.js` (spec 009); este módulo fornece o dado de gasto que ela consulta.
- **Faturamento real** — os valores são **estimativas** calculadas de uma tabela mantida à mão; a fonte de verdade é o console do Google Cloud.
- **Alertas** — não há notificação de gasto anômalo. Só um `console.warn` a partir de 80% do orçamento, que ninguém vê se ninguém procurar.

## Known Issues

| Severidade | Problema |
|---|---|
| ~~HIGH~~ | ❌ **REFUTADO (2026-08-13).** A auditoria concluiu que a persistência nunca funcionou, porque o model usa o cliente anon contra a política `auth.uid() = user_id`. **Medição: 173 linhas, US$ 3,0295, última em 2026-08-12.** A política **não está ativa em produção** — a chave anon lê e escreve `api_usage` sem restrição. Lição registrada: as migrations descrevem um estado que o banco real não tem |
| **MEDIUM** | **55 das 173 linhas têm `estimated_cost_usd = 0`** — custo registrado como zero, **subestimando o gasto real**. ⚠️ A causa provável registrada originalmente (modelo ausente de `PRICING`) **não se sustenta na leitura do código**: modelo desconhecido era precificado como flash, não como zero. Zero vem de `!modelName` ou de tokens zerados. É inferência, não medição. A spec 009 impede que volte a acontecer, mas **não recalcula as linhas antigas** — isso seria migração de dado |
| **LOW** | **`operation_type` divergente:** existe `strategy_chat` em produção, fora da lista documentada (`chat_strategy`). Nomenclatura histórica inconsistente |
| ~~**HIGH**~~ | ✅ **RESOLVIDO (specs 007 e 009)** — não havia quota, teto nem validação de modelo, e um usuário autenticado podia gerar gasto ilimitado sem ninguém ver. Hoje: teto de vídeos por requisição, allow-list de modelos e orçamento mensal por tenant, todos barrando antes de gastar. Sem **alerta** ainda (só log a partir de 80%) |
| ~~**MEDIUM**~~ | ✅ **RESOLVIDO (spec 009)** — `calculateCost` caía no preço do flash em silêncio, e `resolveModel` aceitava qualquer string do cliente: dava para usar modelo caro registrando custo de barato. A allow-list fecha a entrada, e `calculateCost` passou a **avisar** em vez de reprecificar calado. Teste garante que todo modelo da allow-list tem preço em `PRICING` |
| **MEDIUM** | **`PRICING` é mantida à mão** e pode divergir da tabela real do Google. Não há teste comparando com a fonte oficial |
| **MEDIUM** | **A tabela `api_usage` foi criada três vezes** (`003` → `004` com `DROP CASCADE` → `006`), com políticas diferentes em cada. Estado real medido em 2026-08-13: a política **não bloqueia** (a chave anon lê e escreve). A definição nominal das políticas permanece **UNKNOWN** — só consultável no SQL Editor |
| **LOW** | **`utils/apiUsageLogger.js#logApiUsage`** (a variante sem `operationType`) **não tem chamadores** — código morto, e chama `ApiUsage.create`, método que não existe no model |
| **LOW** | **Sem paginação nas estatísticas** — busca todos os registros do período e agrega em memória |
| **LOW** | **`Settings.jsx` mostra "Nenhum uso registrado"** tanto quando realmente não há uso quanto quando a requisição falhou — o usuário não distingue |
| **LOW** | **A ordem das linhas desta tabela** mistura o refutado com o vigente; a primeira linha é histórica e está riscada de propósito |

## Future Considerations

- ~~**Migrar para `supabaseAdmin`**~~ ✅ feito na spec 008 — não como migração pontual deste model, mas porque o backend inteiro passou a ter um único cliente (`service_role`). O registro deixou de depender de a política RLS estar inativa.
- **Investigar as 55 linhas com custo zero** — provavelmente modelos ausentes de `PRICING`. É o que hoje subestima o gasto real, e **a visibilidade já existe** (ao contrário do que a auditoria supunha).
- **Quota por usuário/tenant** persistida no banco, com enforcement antes da chamada de IA.
- **Allow-list de modelos**, encerrando tanto o abuso de custo quanto a contabilidade incorreta.
- **Alerta de gasto anômalo.**
- **Teste comparando `PRICING`** com a tabela oficial do Google, ou busca dinâmica.
