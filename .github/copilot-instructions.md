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

## Estrutura do Projeto

```
server/src/
├── config/ai.js          # Constantes de IA
├── utils/
│   ├── errors.js         # Classes de erro
│   ├── errorHandler.js   # Handler centralizado
│   └── apiUsageLogger.js # Logger de uso da API
├── services/
│   └── prompts/
│       ├── index.js      # Loader de prompts
│       └── *.txt         # Arquivos de prompt
└── __tests__/            # Testes unitários

frontend/
├── src/utils/aiConfig.js # Config de IA do frontend
└── e2e/
    ├── fixtures.ts       # Fixtures compartilhados
    ├── pages/*.ts        # Page Objects
    └── specs/*.ts        # Testes
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
    
    await logApiUsage({ userId: req.user.id, endpoint: 'video_analysis', usage: result.usageMetadata });
    
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, 'Analisar vídeo', error);
  }
}
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
