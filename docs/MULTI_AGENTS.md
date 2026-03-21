# Sistema Multi-Agentes para Análise de Jiu-Jitsu

## 📋 Visão Geral

O sistema possui **dois pipelines multi-agentes** independentes, ambos ativados pela mesma flag `USE_MULTI_AGENTS=true`:

| Pipeline | Entrada | Agentes | Orquestrador |
|----------|---------|---------|--------------|
| **Análise de Vídeo** | Frames de vídeo (imagens) | Técnico, Tático, Regras IBJJF | GPT-4 |
| **Geração de Estratégia** | Resumos textuais de atleta e adversário | Scout, Gameplan, StrategyRules | GPT-4 |

---

## 🥋 Pipeline 2: Multi-Agentes de Estratégia (NOVO)

### Visão Geral

Ao gerar uma estratégia tática, 3 agentes Gemini rodam em **paralelo** — cada um com foco exclusivo — e o GPT-4 consolida o resultado final no formato JSON da estratégia.

### Arquitetura

```
                    ┌─────────────────────────┐
                    │   ORQUESTRADOR GPT-4    │
                    │  (síntese da estratégia)│
                    └──────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼─────┐         ┌─────▼──────┐        ┌─────▼──────┐
   │  Scout   │         │  Gameplan  │        │  Strategy  │
   │  Agent   │         │   Agent    │        │ RulesAgent │
   │ (Gemini) │         │  (Gemini)  │        │  (Gemini)  │
   └──────────┘         └────────────┘        └────────────┘
  Analisa APENAS       Cataloga APENAS        Valida regras
  o adversário         o arsenal do atleta    IBJJF por faixa
```

### Agentes

#### 1. **ScoutAgent** — Adversário
Analisa exclusivamente o adversário: guarda preferida, entradas em pé, ataques, vulnerabilidades e padrão comportamental (observável, não inferência psicológica).

**Output:** `preferred_guard`, `standup_entry`, `signature_attacks`, `dangerous_finishes`, `vulnerabilities`, `behavioral_pattern`, `counter_attacks`, `scout_summary`

#### 2. **GameplanAgent** — Atleta
Cataloga exclusivamente o arsenal do atleta: melhores armas, guarda ideal, passagens, finalizações de alta taxa, sequências de poder e lacunas a evitar.

**Output:** `best_weapons`, `optimal_guard`, `optimal_passing`, `high_pct_finishes`, `power_sequence`, `phase_strengths`, `gaps_to_avoid`, `gameplan_summary`

#### 3. **StrategyRulesAgent** — Regras IBJJF
Valida o que é permitido/proibido considerando a faixa mais restritiva dos dois competidores. Usa `BELT_RULES` de `config/ai.js`.

**Output:** `allowed_leg_locks`, `forbidden_techniques`, `scoring_opportunities`, `dq_risks`, `belt_warnings`, `rules_summary`

#### 4. **StrategyOrchestrator** — GPT-4
Recebe os 3 outputs e gera o JSON final da estratégia no mesmo formato do sistema monolítico (`resumo_rapido`, `analise_de_matchup`, `plano_tatico_faseado`, `cronologia_inteligente`, `checklist_tatico`).

### Arquivos

```
server/src/services/agents/strategy/
├── StrategyAgentBase.js      # Classe base text-only (sem imagens)
├── ScoutAgent.js             # Análise do adversário
├── GameplanAgent.js          # Arsenal do atleta
├── StrategyRulesAgent.js     # Validação IBJJF
├── StrategyOrchestrator.js   # Orquestração + GPT-4
└── index.js                  # Exports

server/src/services/prompts/
├── strategy-scout.txt        # Prompt do Scout
├── strategy-gameplan.txt     # Prompt do Gameplan
├── strategy-rules.txt        # Prompt de Regras
└── strategy-orchestrator.txt # Prompt de consolidação GPT-4
```

### Ponto de entrada

```javascript
// geminiService.js
const result = await geminiService.generateTacticalStrategyWithAgents(athleteData, opponentData);
// result.strategy → mesmo formato de generateTacticalStrategy()
```

Ativado automaticamente via `strategyService.js` quando `STRATEGY_AGENT_CONFIG.ENABLED === true` (lê `USE_MULTI_AGENTS`).

### Custo estimado

- **3 Agentes Gemini** (texto): ~5.000 tokens → ~$0.001
- **Orquestrador GPT-4**: ~8.000 tokens → ~$0.05
- **Total por estratégia**: ~$0.05

---

## 🎥 Pipeline 1: Multi-Agentes de Vídeo (ORIGINAL)

O Sistema Multi-Agentes de vídeo utiliza **3 agentes especializados** (Gemini Vision) coordenados por um **orquestrador inteligente** (GPT-4) para produzir análises mais precisas de frames de vídeo.

### Por que Multi-Agentes?
- Análise única tenta cobrir todos os aspectos ao mesmo tempo
- Maior propensão a "alucinações" (inventar dados)
- Dificuldade em focar em detalhes específicos
- Conflitos entre diferentes tipos de análise

**Solução multi-agentes:**
- Cada agente se especializa em um domínio específico
- Análise paralela reduz tempo total
- Insights mais profundos por área
- Orquestrador resolve conflitos inteligentemente

---

## 🏗️ Arquitetura

```
                    ┌─────────────────────────┐
                    │   ORQUESTRADOR GPT-5    │
                    │  (síntese + narrativa)  │
                    └──────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼─────┐         ┌─────▼──────┐        ┌─────▼──────┐
   │  Agente  │         │   Agente   │        │   Agente   │
   │ Técnico  │         │   Tático   │        │   Regras   │
   │(Gemini)  │         │  (Gemini)  │        │   IBJJF    │
   │UNIFICADO │         │            │        │  (Gemini)  │
   └──────────┘         └────────────┘        └────────────┘
  Guarda+Passagem       Gameplan+Timing        Pontos+Faltas
  +Finalizações         +Posicionamento        +Ilegalidades
  +Transições
       │                      │                      │
       └──────────────────────┴──────────────────────┘
                              │
                       ┌──────▼───────┐
                       │  Frame Vídeo │
                       │   (Gemini    │
                       │    Vision)   │
                       └──────────────┘
```

### Componentes

#### 1. **Agente Técnico** (Gemini Vision)
**Responsabilidades:**
- Jogo de guarda (tipos, controles, efetividade)
- Jogo de passagem (técnicas, pressão, progressão)
- Posições dominantes (montada, costas, side control)
- Finalizações (de guarda, de top, de transição)
- Transições (fluídez, criatividade)
- Defesa (escapes, prevenção)
- Raspagens

**Output:**
```javascript
{
  confidence: 0.85,
  guardGame: { types: [...], effectiveness: 80 },
  passingGame: { types: [...], pressure: 7 },
  submissions: { from_guard: [...], from_top: [...] },
  transitions: { fluidity: 8, creativity: 7 },
  // ...
}
```

#### 2. **Agente Tático** (Gemini Vision)
**Responsabilidades:**
- Identificação de gameplan
- Análise de timing (reativo vs proativo)
- Controle de posição
- Gestão de pressão
- Adaptabilidade

**Output:**
```javascript
{
  confidence: 0.82,
  gameplan: { identified: "pressure_passing", consistency: 8 },
  timing: { reactive: 30, proactive: 70 },
  positioning: { dominanceOriented: true, riskTolerance: 6 },
  // ...
}
```

#### 3. **Agente de Regras IBJJF** (Gemini Vision)
**Responsabilidades:**
- Pontuação (sweeps, passes, mount, back)
- Vantagens
- Penalidades
- Técnicas ilegais por faixa
- Posições conquistadas

**Output:**
```javascript
{
  confidence: 0.88,
  scoring: { totalPoints: 2, sweeps: 1, guard_passes: 0 },
  advantages: { count: 1, reasons: [...] },
  illegalTechniques: { detected: false },
  // ...
}
```

#### 4. **Orquestrador** (GPT-4/GPT-5)
**Responsabilidades:**
- Execução paralela dos 3 agentes
- Consolidação de resultados
- Resolução de conflitos (prioriza por confidence)
- Geração de summary narrativo
- Conversão para formato legado (charts + stats)

**Output:**
```javascript
{
  charts: [/* 5 gráficos */],
  technical_stats: { ... },
  summary: "Parágrafo consolidado...",
  metadata: {
    agentsUsed: ['Agente Técnico', 'Agente Tático', 'Agente de Regras'],
    orchestrator: 'gpt-4-turbo-preview',
    elapsedTime: 12.5
  },
  totalUsage: {
    gemini: { promptTokens: 4500, completionTokens: 2000 },
    gpt: { prompt_tokens: 1500, completion_tokens: 800 },
    estimatedCost: 0.0234
  }
}
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Adicione ao `server/.env`:

```bash
# Sistema Multi-Agentes (Feature Flag)
USE_MULTI_AGENTS=false  # true para habilitar

# OpenAI API Key (necessário apenas se USE_MULTI_AGENTS=true)
OPENAI_API_KEY=sk-proj-your_key_here

# Modelo do OpenAI
OPENAI_MODEL=gpt-4-turbo-preview  # ou gpt-5 quando disponível
```

### 2. Instalar Dependências

```bash
cd server
npm install openai
```

### 3. Habilitar Sistema

Para habilitar o sistema multi-agentes:

```bash
# No arquivo server/.env
USE_MULTI_AGENTS=true
```

---

## 🚀 Uso

### Upload de Vídeo

O sistema multi-agentes é **transparente** para o frontend. Basta fazer upload normalmente:

```javascript
// Frontend - Não precisa mudar nada!
const formData = new FormData();
formData.append('videos', videoFile);
formData.append('athleteName', 'João Silva');
formData.append('giColor', 'azul');

const response = await api.post('/api/video/upload', formData);
```

O backend automaticamente usa multi-agentes se `USE_MULTI_AGENTS=true`.

### Endpoint de Debug

Para comparar análises lado a lado:

```bash
POST /api/ai/debug/compare-analysis
Authorization: Bearer <token>
Content-Type: application/json

{
  "frameData": "data:image/png;base64,iVBOR...",
  "context": {
    "athleteName": "João Silva",
    "giColor": "azul",
    "belt": "azul",
    "result": "vitória por pontos"
  }
}
```

**Response:**
```json
{
  "success": true,
  "comparison": {
    "elapsedTime": "15.34s",
    "monolithic": {
      "status": "fulfilled",
      "summary": "...",
      "usage": { "totalTokens": 5000 }
    },
    "multiAgent": {
      "status": "fulfilled",
      "summary": "...",
      "usage": { "totalTokens": 12000 },
      "metadata": {
        "agentsUsed": [...]
      }
    },
    "metrics": {
      "tokensComparison": {
        "difference": 7000,
        "percentageIncrease": "140%"
      },
      "costComparison": {
        "monolithicEstimate": "$0.0125",
        "multiAgentEstimate": "$0.0387"
      }
    }
  }
}
```

---

## 📊 Custo Estimado

### Por Frame de Vídeo

| Sistema | Tokens | Custo/Frame | Custo/Vídeo (8 frames) |
|---------|--------|-------------|-------------------------|
| **Monolítico** | ~5,000 | $0.0125 | $0.10 |
| **Multi-Agentes** | ~12,000 | $0.0387 | $0.31 |
| **Incremento** | +140% | +209% | +210% |

### Breakdown Multi-Agentes (por frame)

- **3 Agentes Gemini**: ~9,000 tokens → $0.0225
- **1 Orquestrador GPT**: ~3,000 tokens → $0.0162
- **Total**: ~12,000 tokens → $0.0387

### Considerações

✅ **Vale a pena se:**
- Precisão é crítica (competidores profissionais)
- Orçamento comporta 3x o custo
- Análises servem para decisões estratégicas importantes

❌ **Talvez não valha se:**
- Treinos casuais/hobby
- Volume muito alto de vídeos
- Orçamento limitado
- Análise exploratória inicial

---

## 🔧 Resolução de Conflitos

Quando agentes discordam, o orquestrador aplica estas regras:

1. **Pontuação** → PRIORIZE Agente de Regras
2. **Técnicas** → PRIORIZE Agente Técnico
3. **Gameplan** → PRIORIZE Agente Tático
4. **Conflito geral** → PRIORIZE maior `confidence` score

Exemplo:
```javascript
// Agente Técnico: 10 tentativas de finalização (confidence: 0.85)
// Agente Tático: 8 tentativas de finalização (confidence: 0.72)
// Orquestrador escolhe: 10 (maior confidence)
```

---

## 📝 Prompts Especializados

Os prompts ficam em `server/src/services/prompts/`:

- **agent-technical.txt** (300+ linhas): Análise técnica detalhada
- **agent-tactical.txt** (200+ linhas): Análise tática de padrões
- **agent-rules.txt** (200+ linhas): Arbitragem IBJJF
- **agent-orchestrator-video.txt** (300+ linhas): Consolidação GPT

### Editando Prompts

Para ajustar um agente:

1. Edite o arquivo `.txt` correspondente
2. **Não precisa reiniciar servidor** (prompts são recarregados)
3. Teste com endpoint de debug
4. Compare antes/depois

---

## 🐛 Troubleshooting

### Sistema não está usando multi-agentes

**Sintomas:** Logs mostram "Sistema Monolítico"

**Soluções:**
```bash
# 1. Verificar variável de ambiente
echo $USE_MULTI_AGENTS  # deve retornar "true"

# 2. Verificar .env
cat server/.env | grep USE_MULTI_AGENTS

# 3. Reiniciar servidor
cd server && npm run dev
```

### Erro: "openaiApiKey é obrigatória"

**Sintomas:** Erro ao tentar usar multi-agentes

**Soluções:**
```bash
# 1. Verificar se API key está no .env
cat server/.env | grep OPENAI_API_KEY

# 2. Gerar nova key se necessário
# https://platform.openai.com/api-keys

# 3. Adicionar ao .env
echo "OPENAI_API_KEY=sk-proj-..." >> server/.env
```

### Agentes falhando (confidence baixo)

**Sintomas:** Confidence < 0.5 em múltiplos frames

**Possíveis causas:**
- Frames muito escuros/tremidos
- Ângulo ruim da câmera
- Qualidade de vídeo baixa
- Prompts podem precisar ajuste

**Soluções:**
1. Melhorar qualidade de vídeo
2. Ajustar prompts para serem mais tolerantes
3. Usar threshold de confidence mais baixo (config)

### Custo muito alto

**Sintomas:** Custo por vídeo > $0.50

**Soluções:**
1. Reduzir número de frames extraídos (8 → 5)
2. Usar modelo mais barato (GPT-4 → GPT-3.5 turbo)
3. Desabilitar multi-agentes temporariamente
4. Implementar cache de análises similares

---

## 🔄 Migração Gradual

### Fase 1: Feature Flag (ATUAL)
- Sistema disponível via `USE_MULTI_AGENTS=true`
- Padrão: multi-agentes **desabilitado**
- Período: 2-4 semanas de testes

### Fase 2: Testes A/B
- 10% dos usuários com multi-agentes
- Coletar métricas de satisfação
- Comparar precisão vs custo

### Fase 3: Rollout Gradual
- 25% → 50% → 75% → 100%
- Monitorar custos e performance
- Ajustar prompts baseado em feedback

### Fase 4: Default
- Multi-agentes como padrão
- Sistema monolítico como fallback
- Remover código legado após estabilidade

---

## 📈 Métricas de Sucesso

### Precisão
- [ ] Redução de "alucinações" (valores inventados)
- [ ] Identificação > 90% de técnicas visíveis
- [ ] Confidence médio > 0.75

### Performance
- [ ] Tempo de análise < 30s por frame
- [ ] Taxa de sucesso > 95%
- [ ] Fallback funcional em caso de erro

### Custo
- [ ] Custo/vídeo < $0.40
- [ ] ROI positivo para usuários premium

---

## 🛠️ Desenvolvimento

### Adicionar Novo Agente

1. Criar classe em `server/src/services/agents/`:
```javascript
// NewAgent.js
const AgentBase = require('./AgentBase');

class NewAgent extends AgentBase {
  constructor() {
    super('Novo Agente', 'agent-new', ['foco1', 'foco2'], 'gemini');
  }

  parseResult(result, context) {
    // Implementar parsing
  }
}
```

2. Criar prompt em `server/src/services/prompts/agent-new.txt`

3. Atualizar `Orchestrator.js`:
```javascript
const NewAgent = require('./NewAgent');

this.agents = [
  new TechnicalAgent(),
  new TacticalAgent(),
  new RulesAgent(),
  new NewAgent() // ← Adicionar aqui
];
```

4. Atualizar config em `ai.js`:
```javascript
AGENTS: [
  // ... existentes
  { name: 'new', enabled: true, description: '...' }
]
```

---

## 📚 Referências

- [Documentação Gemini Vision](https://ai.google.dev/tutorials/vision_quickstart)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Regras IBJJF](https://ibjjf.com/rules)
- [Arquitetura do Projeto](../ARCHITECTURE.md)

---

## ⚠️ Importante

- **NUNCA commite API keys** no Git
- **Rotacione keys** se expostas acidentalmente
- **Monitore custos** diariamente durante rollout
- **Valide outputs** com especialistas em JJ
- **Mantenha fallback** sempre funcional

---

**Status:** ✅ Implementado e funcional  
**Última atualização:** Março 2026  
**Responsável:** Sistema de Análise de Atletas
