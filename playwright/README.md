# Playwright E2E Tests

Framework de testes End-to-End para o JiuMetrics.

## 📁 Estrutura

```
playwright/
├── pages/                    # Page Object Model
│   ├── BasePage.ts           # Classe base para todas as páginas
│   ├── LoginPage.ts          # Página de login
│   ├── OverviewPage.ts       # Dashboard principal
│   ├── AthletesPage.ts       # Gestão de atletas
│   ├── OpponentsPage.ts      # Gestão de adversários
│   ├── StrategyPage.ts       # Geração de estratégias
│   ├── VideoAnalysisPage.ts  # Análise de vídeo
│   ├── ChatComponent.ts      # Componente de chat com IA
│   └── index.ts              # Barrel export
├── fixtures/                 # Dados e configurações de teste
│   ├── index.ts              # Fixtures customizados (authenticatedPage)
│   └── TestDataBuilder.ts    # Builder pattern para dados
├── helpers/                  # Utilitários específicos
│   └── api.helper.ts         # Helper para chamadas de API
├── utils/                    # Utilitários genéricos
│   ├── Logger.ts             # Sistema de logging
│   └── helpers.ts            # Funções auxiliares
├── tests/                    # Arquivos de teste
│   ├── e2e/                  # Testes End-to-End
│   │   ├── navigation.spec.ts
│   │   ├── athletes.spec.ts
│   │   ├── opponents.spec.ts
│   │   ├── strategy.spec.ts
│   │   ├── video-analysis.spec.ts
│   │   └── chat.spec.ts
│   └── integration/          # Testes de integração (futuro)
├── config/                   # Configurações adicionais
├── reports/                  # Resultados (gerado, ignorado pelo git)
├── playwright.config.ts      # Configuração principal
├── tsconfig.json             # TypeScript config
├── package.json              # Dependências do Playwright
├── .env.example              # Variáveis de ambiente
└── README.md                 # Esta documentação
```

## 🚀 Comandos

### Da raiz do projeto:

```bash
# Rodar todos os testes
npm run test:e2e

# Rodar com interface gráfica
npm run test:e2e:ui

# Rodar com browser visível
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Ver relatório HTML
npm run test:e2e:report

# Codegen - gravar testes
npm run test:e2e:codegen

# Instalar dependências do Playwright
npm run install:e2e
```

### Diretamente na pasta playwright:

```bash
cd playwright

# Rodar todos os testes
npm test

# Rodar com interface gráfica
npm run test:ui

# Rodar testes específicos
npm test -- --grep "Atletas"

# Rodar um arquivo específico
npm test tests/e2e/athletes.spec.ts
```

## 📋 Padrões

### Page Object Model

Todas as páginas herdam de `BasePage`:

```typescript
export class MinhaPagina extends BasePage {
  readonly meuElemento: Locator;

  constructor(page: Page) {
    super(page);
    this.meuElemento = page.getByRole('button', { name: /clique/i });
  }

  protected get route(): string {
    return '/minha-rota';
  }

  async expectPageVisible(): Promise<void> {
    await expect(this.meuElemento).toBeVisible();
  }
}
```

### Fixtures

Use o `authenticatedPage` para testes que precisam de usuário logado:

```typescript
import { test, expect } from '../../fixtures';

test('meu teste', async ({ authenticatedPage }) => {
  // Já está logado!
  await authenticatedPage.goto('/athletes');
});
```

### Test Data Builder

Use para gerar dados consistentes:

```typescript
import { TestDataBuilder } from '../../fixtures/TestDataBuilder';

const athlete = TestDataBuilder.athlete({ name: 'Meu Atleta' });
const opponent = TestDataBuilder.opponent();
```

## 🎯 Boas Práticas

1. **Locators semânticos**: Prefira `getByRole()`, `getByLabel()`, `getByText()`
2. **Regex case-insensitive**: Use `/texto/i` para tolerância a variações
3. **Esperas explícitas**: Use `waitFor()` ao invés de `page.waitForTimeout()`
4. **Assertions claras**: Cada teste deve ter assertions significativas
5. **Independência**: Testes não devem depender de estado de outros testes

## 🔧 Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=seu@email.com
TEST_USER_PASSWORD=sua_senha
```

### Credenciais de Teste

O usuário padrão está configurado em `fixtures/index.ts`:

```typescript
export const TEST_USER = {
  email: 'contateste@teste.com',
  password: '33335929Aa@',
};
```

## 📊 Relatórios

Após rodar os testes, os relatórios ficam em:

- `reports/html-report/` - Relatório HTML interativo
- `reports/results.json` - Resultados em JSON
- `reports/test-results/` - Screenshots e traces de falhas
