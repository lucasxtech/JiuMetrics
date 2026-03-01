# Guia de Boas Práticas

Este documento estabelece as práticas de código do projeto para manter consistência, reutilização e facilidade de manutenção.

## Índice

1. [Princípio Fundamental: Nada Inline](#princípio-fundamental-nada-inline)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Sistema de Prompts](#sistema-de-prompts)
4. [Tratamento de Erros](#tratamento-de-erros)
5. [Configurações Centralizadas](#configurações-centralizadas)
6. [Testes com Jest](#testes-com-jest)
7. [Testes E2E com Playwright](#testes-e2e-com-playwright)
8. [Checklist de Code Review](#checklist-de-code-review)

---

## Princípio Fundamental: Nada Inline

### ❌ O que evitar

```javascript
// ❌ RUIM: Prompt inline no código
const response = await model.generateContent(`
  Você é um especialista em Jiu-Jitsu.
  Analise o seguinte vídeo: ${videoUrl}
  ... (200 linhas de prompt)
`);

// ❌ RUIM: Configurações hardcoded
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ❌ RUIM: Mensagens de erro inline
res.status(500).json({ error: 'Erro ao processar vídeo' });
```

### ✅ O que fazer

```javascript
// ✅ BOM: Prompt em arquivo externo
const { getPrompt } = require('../services/prompts');
const prompt = getPrompt('video-analysis', { VIDEO_URL: videoUrl });

// ✅ BOM: Configuração centralizada
const { DEFAULT_MODEL } = require('../config/ai');
const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

// ✅ BOM: Erro centralizado com classe customizada
const { GeminiProcessingError } = require('../utils/errors');
throw new GeminiProcessingError('Falha ao processar vídeo');
```

---

## Estrutura de Arquivos

```
server/src/
├── config/           # Configurações centralizadas
│   └── ai.js         # Constantes de IA (modelos, limites, labels)
│
├── utils/            # Utilitários reutilizáveis
│   ├── errors.js     # Classes de erro customizadas
│   ├── errorHandler.js
│   ├── apiUsageLogger.js
│   └── versionManager.js
│
├── services/
│   ├── prompts/      # Prompts externos
│   │   ├── index.js  # Loader de prompts
│   │   └── *.txt     # Arquivos de prompt
│   └── geminiService.js
│
├── controllers/      # Lógica de requisições
├── routes/           # Definição de rotas
├── middleware/       # Middlewares Express
│
└── __tests__/        # Testes unitários
    ├── errors.test.js
    ├── prompts.test.js
    └── ...
```

---

## Sistema de Prompts

### Criar novo prompt

1. Crie o arquivo em `server/src/services/prompts/`:

```txt
# meu-novo-prompt.txt

Você é um assistente especializado em {{ESPECIALIDADE}}.

## Contexto
{{CONTEXTO}}

## Tarefa
Analise os dados e retorne em JSON:
{
  "resultado": "...",
  "confianca": 0.0
}
```

2. Use no código:

```javascript
const { getPrompt } = require('../services/prompts');

const prompt = getPrompt('meu-novo-prompt', {
  ESPECIALIDADE: 'Jiu-Jitsu',
  CONTEXTO: dadosDoAtleta
});
```

### Convenções de placeholders

| Placeholder | Uso |
|-------------|-----|
| `{{VIDEO_URL}}` | URL do vídeo para análise |
| `{{ATHLETE_DATA}}` | JSON com dados do atleta |
| `{{OPPONENT_DATA}}` | JSON com dados do oponente |
| `{{SUMMARIES}}` | Lista de resumos para consolidar |
| `{{BELT}}` | Faixa do atleta |
| `{{RULES}}` | Regras específicas da faixa |
| `{{CHAT_HISTORY}}` | Histórico de conversa |
| `{{USER_MESSAGE}}` | Mensagem atual do usuário |

---

## Tratamento de Erros

### Classes disponíveis

```javascript
const {
  AppError,           // Erro genérico (500)
  NotFoundError,      // Recurso não encontrado (404)
  ValidationError,    // Dados inválidos (400)
  AuthenticationError,// Não autenticado (401)
  AuthorizationError, // Não autorizado (403)
  
  // Erros específicos do Gemini
  GeminiApiError,           // Erro de comunicação (502)
  GeminiQuotaExceededError, // Cota excedida (429)
  GeminiContentBlockedError,// Conteúdo bloqueado (400)
  GeminiApiKeyMissingError, // API key inválida (500)
  GeminiProcessingError,    // Erro de processamento (500)
  
  parseGeminiError    // Parser automático de erros
} = require('../utils/errors');
```

### Uso correto

```javascript
// Em controllers
const { handleError } = require('../utils/errorHandler');

async function getAthlete(req, res) {
  try {
    const athlete = await Athlete.findById(req.params.id);
    if (!athlete) {
      throw new NotFoundError('Atleta');
    }
    res.json({ success: true, data: athlete });
  } catch (error) {
    handleError(res, 'buscar atleta', error);
  }
}

// Para erros do Gemini
try {
  const result = await model.generateContent(prompt);
} catch (error) {
  throw parseGeminiError(error); // Converte automaticamente
}
```

---

## Configurações Centralizadas

### Arquivo: `config/ai.js`

```javascript
// Usar constantes, nunca valores hardcoded
const { 
  DEFAULT_MODEL,      // 'gemini-2.0-flash'
  AVAILABLE_MODELS,   // Lista de modelos válidos
  MAX_SUMMARY_WORDS,  // 250
  RATE_LIMITS,        // { CHAT_WINDOW_MS, CHAT_MAX_REQUESTS }
  CHART_TITLES,       // Títulos dos gráficos
  CHART_LABELS,       // Labels dos gráficos
  BELT_RULES          // Regras por faixa
} = require('../config/ai');
```

### Adicionar nova configuração

1. Adicione em `config/ai.js`
2. Exporte no module.exports
3. Importe onde necessário
4. Adicione teste em `__tests__/aiConfig.test.js`

---

## Testes com Jest

### Estrutura de teste

```javascript
// __tests__/meuModulo.test.js

const { minhaFuncao } = require('../utils/meuModulo');

describe('MeuModulo', () => {
  describe('minhaFuncao', () => {
    it('deve retornar X quando receber Y', () => {
      const resultado = minhaFuncao('Y');
      expect(resultado).toBe('X');
    });

    it('deve lançar erro para entrada inválida', () => {
      expect(() => minhaFuncao(null)).toThrow();
    });
  });
});
```

### Executar testes

```bash
# Todos os testes
cd server && npm test

# Arquivo específico
npm test -- errors.test.js

# Com coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Testes E2E com Playwright (TypeScript)

### Instalação

```bash
cd frontend
npm install -D @playwright/test typescript @types/node
npx playwright install chromium
```

### Configuração: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### TypeScript Config: `tsconfig.playwright.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["e2e/**/*.ts", "playwright.config.ts"]
}
```

### Estrutura de testes E2E

```
frontend/
├── e2e/
│   ├── fixtures.ts        # Fixtures customizados + helpers
│   ├── pages/             # Page Objects (TypeScript)
│   │   ├── index.ts       # Re-exporta todos
│   │   ├── login.page.ts
│   │   ├── athletes.page.ts
│   │   └── video-analysis.page.ts
│   └── specs/             # Arquivos de teste
│       ├── auth.spec.ts
│       ├── athletes.spec.ts
│       └── video-analysis.spec.ts
├── playwright.config.ts
└── tsconfig.playwright.json
```

### Page Object Pattern (TypeScript)

```typescript
// e2e/pages/login.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Senha');
    this.submitButton = page.getByRole('button', { name: /entrar/i });
    this.errorMessage = page.locator('[role="alert"], .error-message');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  async loginAndWaitForRedirect(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.page.waitForURL(/\/(overview|dashboard)/);
  }
}
```

### Fixtures Customizados

```typescript
// e2e/fixtures.ts
import { test as base, Page } from '@playwright/test';

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

// Fixture para página autenticada
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Senha').fill(TEST_USER.password);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL(/\/(overview|dashboard)/);
    await use(page);
  },
});

// Helpers reutilizáveis
export async function waitForLoadingToFinish(page: Page): Promise<void> {
  const spinner = page.locator('[data-testid="loading-spinner"], .loading');
  await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
}

export { expect } from '@playwright/test';
```

### Exemplo de teste E2E (TypeScript)

```typescript
// e2e/specs/auth.spec.ts
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages';

test.describe('Autenticação', () => {
  test('deve exibir página de login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalido@teste.com', 'senhaerrada');
    
    await loginPage.expectError(/credenciais|inválid/i);
  });

  test('deve redirecionar após login válido', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect('user@test.com', 'password123');
    
    await expect(page).not.toHaveURL(/login/);
  });
});
```

### Locators Recomendados (Ordem de Preferência)

```typescript
// ✅ PREFIRA (em ordem):
page.getByRole('button', { name: /enviar/i })  // 1. Role + accessible name
page.getByLabel('Email')                        // 2. Label (forms)
page.getByPlaceholder('Digite seu email')       // 3. Placeholder
page.getByText('Bem-vindo')                     // 4. Texto visível
page.getByTestId('submit-button')               // 5. data-testid (último recurso)

// ❌ EVITE:
page.locator('#submit-btn')                     // ID frágil
page.locator('.form-input')                     // Classe CSS
page.locator('div > form > button')             // Seletor complexo
```

### Executar testes Playwright

```bash
# Todos os testes
npx playwright test

# Com UI interativa (recomendado para debug)
npx playwright test --ui

# Arquivo específico
npx playwright test auth.spec.ts

# Ver browser durante execução
npx playwright test --headed

# Debug mode (pausa em cada passo)
npx playwright test --debug

# Ver relatório HTML
npx playwright show-report

# Gerar código automaticamente
npx playwright codegen http://localhost:5173
```

---

## Checklist de Code Review

### Antes de abrir PR

- [ ] **Sem código inline**: Prompts em arquivos `.txt`, configs em `config/`
- [ ] **Erros tratados**: Usando classes de `utils/errors.js`
- [ ] **Testes unitários**: Cobertura para novas funções
- [ ] **Testes E2E**: Para fluxos críticos de usuário
- [ ] **Sem console.log**: Usar logger apropriado
- [ ] **Sem secrets**: Nenhuma API key ou senha no código
- [ ] **Documentação**: JSDoc para funções públicas

### Durante review

```javascript
// ⚠️ Red flags para comentar:

// 1. Prompt inline
const prompt = `Você é um assistente...`; // ❌ Mover para .txt

// 2. Modelo hardcoded
model: 'gemini-2.0-flash' // ❌ Usar DEFAULT_MODEL

// 3. Número mágico
if (tokens > 1000) // ❌ Criar constante

// 4. Catch vazio
catch (e) {} // ❌ Tratar ou logar

// 5. any implícito
const data = response.data; // ❌ Tipar adequadamente
```

---

## Comandos Úteis

```bash
# Backend
cd server
npm test                    # Testes unitários
npm run dev                 # Servidor dev

# Frontend  
cd frontend
npm run dev                 # Vite dev server
npm test                    # Vitest
npx playwright test         # E2E tests
npx playwright test --ui    # UI mode

# Git (lembrete!)
git stash -u               # Inclui arquivos untracked!
git stash -a               # Inclui também ignorados
```

---

## Referências

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Page Object Pattern](https://playwright.dev/docs/pom)
- [Google AI Documentation](https://ai.google.dev/docs)
