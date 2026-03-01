# Instruções para GitHub Copilot

Este projeto é uma plataforma de análise de atletas de Jiu-Jitsu usando IA (Google Gemini).

## Regras Fundamentais

### 1. NUNCA use código inline para:

- **Prompts de IA**: Sempre em arquivos `.txt` em `server/src/services/prompts/`
- **Constantes de configuração**: Sempre em `server/src/config/ai.js`
- **Labels de gráficos**: Usar `CHART_LABELS` de `config/ai.js`
- **Modelos de IA**: Usar `DEFAULT_MODEL` de `config/ai.js`

### 2. Tratamento de Erros

Sempre use as classes de erro customizadas:

```javascript
// Importar de:
const { GeminiApiError, NotFoundError, ValidationError } = require('../utils/errors');
const { handleError } = require('../utils/errorHandler');

// Em controllers, usar:
try {
  // código
} catch (error) {
  handleError(res, 'Descrição da operação', error);
}
```

### 3. Sistema de Prompts

Para criar ou modificar prompts:

```javascript
// Carregar prompt
const { getPrompt } = require('../services/prompts');
const prompt = getPrompt('nome-do-prompt', { VARIAVEL: valor });
```

Arquivos de prompt ficam em `server/src/services/prompts/*.txt` com placeholders `{{VARIAVEL}}`.

### 4. Testes E2E (Playwright)

- **Sempre em TypeScript** (`.ts`)
- **Usar Page Object Model** em `frontend/e2e/pages/`
- **Usar fixtures** de `frontend/e2e/fixtures.ts`
- **Preferir locators semânticos**:
  1. `getByRole()` - Primeiro
  2. `getByLabel()` - Para forms
  3. `getByTestId()` - Último recurso

Exemplo de Page Object:

```typescript
export class ExamplePage {
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.getByRole('button', { name: /enviar/i });
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
```

### 5. Testes Unitários (Jest)

- Arquivos em `server/src/__tests__/*.test.js`
- Mockar dependências externas
- Testar casos de sucesso E erro

### 6. Banco de Dados (Supabase)

- **Sempre usar models** para acesso ao banco
- **Row Level Security (RLS)** habilitado em todas as tabelas
- **user_id** obrigatório para operações (vem do middleware de autenticação)

```javascript
// ✅ CORRETO - Usar model
const athlete = await Athlete.getById(athleteId, userId);

// ❌ EVITAR - Query direta
const { data } = await supabase.from('athletes').select('*');
```

### 7. Sistema de Chat IA

O chat permite refinar conteúdo existente (análises, perfis, estratégias) com IA:

**Fluxo:**
1. Criar sessão: `POST /chat/session` com `contextType` e `contextId`
2. Enviar mensagem: `POST /chat/send` ou endpoints específicos (`/chat/profile-send`, `/chat/strategy-send`)
3. IA retorna sugestão: `{ field, newValue, reason }`
4. Frontend exibe diff em `EditableText`
5. Aceitar: `POST /chat/apply-edit` → Atualiza conteúdo + Cria versão

**Adicionar novo tipo de chat:**
1. Criar prompt em `server/src/services/prompts/chat-TIPO.txt`
2. Adicionar em `CONTEXT_TYPES` no `chatController.js` com `fieldMapping`
3. Criar componente `TipoChatPanel.jsx` no frontend

### 8. Sistema de Versionamento

Toda edição via chat cria uma versão automaticamente:

```javascript
// Backend - Salvar versão
const version = await StrategyVersion.create({
  strategy_id: strategyId,
  content: JSON.stringify(content),  // Snapshot completo
  created_by: userId
});

// Frontend - Listar versões
const versions = await api.get(`/chat/versions/strategy/${id}`);

// Restaurar versão
await api.post(`/chat/restore-version/strategy/${id}`, { versionId });
```

**Modelos:** AnalysisVersion, ProfileVersion, StrategyVersion

### 9. Terminologia de Estratégias

**IMPORTANTE:** O campo correto é `como_vencer`, não `tese_da_vitoria`:

```javascript
// ✅ CORRETO
const strategy = {
  resumo_rapido: {
    como_vencer: "Explicação de como vencer...",
    tres_prioridades: [...]
  }
}

// ❌ OBSOLETO (manter apenas como fallback)
const oldStrategy = {
  tese_da_vitoria: "..."  // Deprecated
}
```

**No chat de estratégias:**
- Palavras-chave `["tese", "vencer", "vitória", "ganhar"]` → mapeia para `como_vencer`
- Sempre priorizar `resumo_rapido.como_vencer` ao ler estratégias

### 10. Monitoramento de Custos

Toda chamada ao Gemini deve registrar uso:

```javascript
// Após chamar Gemini
const result = await model.generateContent(prompt);

await logApiUsage({
  userId: req.user.id,
  endpoint: 'analyze-video',  // Identificador do endpoint
  usage: result.usageMetadata  // { promptTokenCount, candidatesTokenCount, totalTokenCount }
});

// Consultar estatísticas
const stats = await ApiUsage.getStats(userId);
// { totalCalls, totalTokens, inputTokens, outputTokens, estimatedCost }
```

**Endpoints:**
- `GET /usage/stats` - Estatísticas do usuário
- `GET /usage/pricing` - Tabela de preços

## Estrutura do Projeto

```
server/src/
├── config/ai.js          # Constantes de IA
├── utils/
│   ├── errors.js         # Classes de erro
│   ├── errorHandler.js   # Handler centralizado
│   └── apiUsageLogger.js # Logger de uso da API
├── services/
│   ├── geminiService.js  # Serviço principal de IA
│   └── prompts/
│       ├── index.js      # Loader de prompts
│       ├── video-analysis.txt
│       ├── athlete-summary.txt
│       ├── tactical-strategy.txt
│       ├── chat-analysis.txt   # Chat para análises
│       ├── chat-profile.txt    # Chat para perfis
│       └── chat-strategy.txt   # Chat para estratégias
├── models/
│   ├── Athlete.js
│   ├── Opponent.js
│   ├── FightAnalysis.js
│   ├── ChatSession.js          # Sessões de chat
│   ├── AnalysisVersion.js      # Versionamento de análises
│   ├── ProfileVersion.js       # Versionamento de perfis
│   ├── StrategyVersion.js      # Versionamento de estratégias
│   └── ApiUsage.js             # Rastreamento de custos
├── controllers/
│   ├── chatController.js       # Lógica de chat IA
│   ├── strategyVersionController.js
│   └── usageController.js      # Estatísticas de uso
├── routes/
│   ├── chat.js                 # Rotas de chat
│   └── usage.js                # Rotas de monitoramento
└── __tests__/            # Testes unitários

frontend/src/
├── components/
│   ├── chat/
│   │   ├── ProfileChatPanel.jsx    # Chat para perfis
│   │   ├── StrategyChatPanel.jsx   # Chat para estratégias
│   │   └── AiChatPanel.jsx         # Chat para análises
│   ├── version/
│   │   └── VersionHistoryPanel.jsx # Histórico de versões
│   └── analysis/
│       └── EditableText.jsx        # Diff viewer para edições
├── services/
│   ├── chatService.js       # API de chat
│   └── usageService.js      # API de uso/custos
└── utils/aiConfig.js        # Config de IA do frontend

playwright/
├── fixtures/
│   ├── fixtures.ts          # Fixtures compartilhados
│   └── TestDataBuilder.ts   # Builder de dados de teste
├── pages/*.ts               # Page Objects
└── tests/
    ├── e2e/*.spec.ts        # Testes E2E
    └── integration/*.spec.ts # Testes de integração
```

## Padrões de Código

### Backend (Node.js)

- CommonJS (`require`/`module.exports`)
- Async/await para operações assíncronas
- JSDoc para documentação de funções

### Frontend (React)

- ES Modules (`import`/`export`)
- Functional components com hooks
- CSS Modules ou Tailwind

### Testes E2E

- TypeScript obrigatório
- Page Object Model
- Fixtures para setup reutilizável

## Exemplos de Uso Correto

### Análise de Vídeo

```javascript
const { DEFAULT_MODEL } = require('../config/ai');
const { getPrompt } = require('../services/prompts');
const { handleError } = require('../utils/errorHandler');
const { logApiUsage } = require('../utils/apiUsageLogger');

async function analyzeVideo(req, res) {
  try {
    const prompt = getPrompt('video-analysis', { VIDEO_URL: req.body.url });
    const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(prompt);
    
    // ✅ SEMPRE registrar uso da API
    await logApiUsage({ 
      userId: req.user.id, 
      endpoint: 'video_analysis', 
      usage: result.usageMetadata 
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, 'Analisar vídeo', error);
  }
}
```

### Chat com IA (Refinar Estratégia)

```javascript
// Backend - chatController.js
exports.sendStrategyMessage = async (req, res) => {
  try {
    const { sessionId, message, strategyData } = req.body;
    
    // Carregar prompt especializado para estratégias
    const prompt = getPrompt('chat-strategy', {
      ATHLETE_NAME: strategyData.athlete.name,
      OPPONENT_NAME: strategyData.opponent.name,
      CONTENT: JSON.stringify(strategyData.strategy),
      USER_MESSAGE: message
    });
    
    const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
    const result = await model.generateContent(prompt);
    
    // Registrar uso
    await logApiUsage({
      userId: req.user.id,
      endpoint: 'chat_strategy',
      usage: result.usageMetadata
    });
    
    // Parsear resposta da IA (deve retornar JSON)
    const aiResponse = JSON.parse(result.response.text());
    
    res.json({ 
      success: true, 
      data: {
        message: aiResponse.message,
        pendingEdit: aiResponse.field ? {
          field: aiResponse.field,
          newValue: aiResponse.newValue,
          reason: aiResponse.reason
        } : null
      }
    });
  } catch (error) {
    handleError(res, 'Processar chat de estratégia', error);
  }
};
```

### Salvar Versão Automaticamente

```javascript
// Backend - Ao aplicar edição do chat
exports.applyEdit = async (req, res) => {
  try {
    const { sessionId, editIndex, contextType, contextId } = req.body;
    
    // 1. Buscar conteúdo atual
    const currentContent = await Strategy.getById(contextId, req.user.id);
    
    // 2. Aplicar edição
    const updatedContent = { ...currentContent, ...editedFields };
    await Strategy.update(contextId, updatedContent, req.user.id);
    
    // 3. ✅ SEMPRE criar versão após edição
    await StrategyVersion.create({
      strategy_id: contextId,
      content: JSON.stringify(updatedContent),
      created_by: req.user.id,
      source: 'chat_ai'  // Identificar origem da mudança
    });
    
    res.json({ success: true, data: updatedContent });
  } catch (error) {
    handleError(res, 'Aplicar edição', error);
  }
};
```

### Teste E2E

```typescript
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages';

test('deve fazer login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@test.com', 'password');
  await expect(page).toHaveURL(/overview/);
});
```

## Lembretes

- `git stash -u` para incluir arquivos novos
- Rodar testes antes de commitar
- Prompts NUNCA inline, sempre em `.txt`
- **SEMPRE** registrar uso da API Gemini com `logApiUsage()`
- **SEMPRE** criar versão após edições via chat
- Usar `como_vencer` em vez de `tese_da_vitoria`
- Todas operações de DB devem passar `userId` (RLS)
- Chat retorna JSON estruturado: `{ field, newValue, reason }`

## Fluxo Completo: Chat → Edição → Versão

```
1. Frontend: POST /chat/send → IA analisa contexto
2. Backend: Retorna { pendingEdit: { field, newValue, reason } }
3. Frontend: Exibe diff em EditableText component
4. Usuário aceita → POST /chat/apply-edit
5. Backend: Atualiza conteúdo + Cria versão + Retorna sucesso
6. Frontend: Atualiza UI + Mostra toast de confirmação
```

## Documentação Disponível

- [docs/API.md](../docs/API.md) - Todos os endpoints (50+)
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - Arquitetura técnica
- [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) - Guia de desenvolvimento
- [docs/SETUP.md](../docs/SETUP.md) - Setup e configuração
- [docs/DEPLOY.md](../docs/DEPLOY.md) - Deploy em produção
- [docs/ESTRATEGIAS.md](../docs/ESTRATEGIAS.md) - Sistema de estratégias
- [docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md) - Como contribuir
