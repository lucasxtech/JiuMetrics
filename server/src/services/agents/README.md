# Sistema Multi-Agentes

Este diretório contém a implementação do sistema multi-agentes para análise de vídeos de Jiu-Jitsu.

## Estrutura

```
agents/
├── AgentBase.js           # Classe abstrata base
├── TechnicalAgent.js      # Agente técnico (guarda, passagem, finalizações)
├── TacticalAgent.js       # Agente tático (gameplan, timing, posicionamento)
├── RulesAgent.js          # Agente de regras IBJJF (pontuação, técnicas ilegais)
├── Orchestrator.js        # Orquestrador GPT-4/GPT-5
└── index.js               # Exports
```

## Como Funciona

### 1. AgentBase (Classe Abstrata)

Fornece funcionalidade comum:
- Retry logic com exponential backoff
- Extração de confidence score
- Chamada à API Gemini
- Loading e preenchimento de prompts

Cada agente especializado herda de `AgentBase` e implementa:
- `parseResult(result, context)` - Formato específico do output

### 2. Agentes Especializados

#### TechnicalAgent
- **Prompt:** `agent-technical.txt`
- **Foco:** Técnicas visíveis (guarda, passagem, finalizações, transições)
- **Output:** Estrutura técnica detalhada

#### TacticalAgent
- **Prompt:** `agent-tactical.txt`
- **Foco:** Padrões de jogo, gameplan, timing
- **Output:** Análise tática comportamental

#### RulesAgent
- **Prompt:** `agent-rules.txt`
- **Foco:** Pontuação IBJJF, vantagens, técnicas ilegais
- **Output:** Scoring e validação de regras

### 3. Orchestrator

Coordena a execução:

```javascript
const { Orchestrator } = require('./agents');

const orchestrator = new Orchestrator(
  geminiClient,
  process.env.OPENAI_API_KEY,
  'gpt-4-turbo-preview'
);

const result = await orchestrator.orchestrateVideoAnalysis(frameData, context);
```

**Fluxo:**
1. Executa 3 agentes em paralelo (`Promise.all`)
2. Consolida resultados com GPT-4/GPT-5
3. Resolve conflitos (prioriza por confidence)
4. Retorna formato compatível com sistema legado

## Uso

### Básico

```javascript
const { Orchestrator } = require('../services/agents');

const frameData = {
  fileUri: 'gs://bucket/video.mp4',
  mimeType: 'video/mp4'
};

const context = {
  athleteName: 'João Silva',
  giColor: 'azul',
  belt: 'roxa',
  result: 'vitória por pontos',
  beltRules: 'Faixa roxa: toe hold permitido...'
};

const result = await orchestrator.orchestrateVideoAnalysis(frameData, context);

console.log(result.charts);
console.log(result.summary);
console.log(result.totalUsage.estimatedCost); // $0.0387
```

### Com Feature Flag

```javascript
// geminiService.js já implementa isso
const useAgents = process.env.USE_MULTI_AGENTS === 'true';
const result = await analyzeFrame(frameUri, context, model, useAgents);
```

## Configuração

### Variáveis de Ambiente

```bash
# Habilitar sistema
USE_MULTI_AGENTS=true

# API Key OpenAI (obrigatória para orquestrador)
OPENAI_API_KEY=sk-proj-...

# Modelo do orquestrador
OPENAI_MODEL=gpt-4-turbo-preview
```

### Ajustes de Configuração

Em `server/src/config/ai.js`:

```javascript
AGENT_CONFIG: {
  ENABLED: true,
  PARALLEL_EXECUTION: true,
  MIN_CONFIDENCE_THRESHOLD: 0.6, // ← Ajustar se necessário
  RETRY_CONFIG: {
    MAX_RETRIES: 3, // ← Ajustar se necessário
    INITIAL_DELAY: 1000
  }
}
```

## Prompts

Os prompts ficam em `../prompts/`:

- `agent-technical.txt` - Instruções para análise técnica
- `agent-tactical.txt` - Instruções para análise tática
- `agent-rules.txt` - Instruções para análise de regras
- `agent-orchestrator-video.txt` - Instruções para consolidação

### Editando Prompts

1. Edite o arquivo `.txt`
2. Não precisa reiniciar servidor (hot reload)
3. Teste com `/api/ai/debug/compare-analysis`

## Resolução de Conflitos

Quando agentes discordam:

1. **Por especialidade:**
   - Pontuação → Agente de Regras
   - Técnicas → Agente Técnico
   - Gameplan → Agente Tático

2. **Por confidence:**
   - Se empate de especialidade, usa maior confidence

3. **Fallback:**
   - Se todos < 0.6, usa média ponderada

## Error Handling

### Retry Logic

```javascript
// Automático em AgentBase
async retryWithBackoff(fn, maxRetries = 3) {
  // 1ª tentativa → delay 1s
  // 2ª tentativa → delay 2s
  // 3ª tentativa → delay 4s
  // Falha definitiva
}
```

### Fallback

Se um agente falha:
- Retorna estrutura mínima com `confidence: 0.3`
- Orquestrador usa dados parciais
- System continua funcionando

Se todos agentes falham:
- Orquestrador usa consolidação fallback (sem GPT)
- Se GPT também falha, usa sistema monolítico

## Performance

### Tempo de Execução

- **Sequencial:** ~18s (3 agentes × 6s cada)
- **Paralelo:** ~6s (max dos 3 agentes)
- **Orquestrador GPT:** +4s
- **Total:** ~10-12s por frame

### Otimizações

- Cache de prompts (já implementado)
- Retry apenas em erros de rede (não em validação)
- Timeout de 30s por agente
- Circuit breaker após 3 falhas consecutivas (TODO)

## Testes

### Unitários (TODO)

```bash
cd server
npm test -- --testPathPattern=agents
```

### Debug

```bash
curl -X POST http://localhost:5000/api/ai/debug/compare-analysis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "frameData": "data:image/png;base64,...",
    "context": {
      "athleteName": "Test",
      "belt": "azul"
    }
  }'
```

## Troubleshooting

### "geminiClient é obrigatório"

**Causa:** Tentou instanciar Orchestrator sem cliente Gemini

**Solução:**
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const orchestrator = new Orchestrator(genAI, process.env.OPENAI_API_KEY);
```

### "Cannot find module './agents'"

**Causa:** Import incorreto

**Solução:**
```javascript
// ✅ Correto
const { Orchestrator } = require('./services/agents');

// ❌ Incorreto
const Orchestrator = require('./services/agents/Orchestrator');
```

### Confidence sempre < 0.6

**Causas:**
- Frames de baixa qualidade
- Prompts precisam ajuste
- Modelo inadequado

**Soluções:**
1. Melhorar qualidade dos frames
2. Ajustar threshold em `ai.js`
3. Revisar prompts

## Roadmap

- [ ] Testes unitários completos
- [ ] Circuit breaker pattern
- [ ] Cache de análises similares
- [ ] Métricas detalhadas (Prometheus)
- [ ] Agente de Evolução (comparativo temporal)
- [ ] Agente de Contexto (histórico de lutas)

## Referências

- [Documentação completa](../../docs/MULTI_AGENTS.md)
- [Arquitetura geral](../../docs/ARCHITECTURE.md)
- [API Reference](../../docs/API.md)
