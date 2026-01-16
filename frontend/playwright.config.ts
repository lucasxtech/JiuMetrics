import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Diretório dos testes
  testDir: './e2e',

  // Timeout máximo por teste
  timeout: 30 * 1000,

  // Expectativas
  expect: {
    timeout: 5000,
  },

  // Execução em paralelo
  fullyParallel: true,

  // Falhar o build se deixar test.only no código
  forbidOnly: !!process.env.CI,

  // Número de retentativas em CI
  retries: process.env.CI ? 2 : 0,

  // Workers em paralelo
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  // Configurações compartilhadas
  use: {
    // URL base para navegação (inclui o base path do Vite)
    baseURL: 'http://localhost:5173/JiuMetrics',

    // Coletar trace em caso de falha
    trace: 'on-first-retry',

    // Screenshots em falha
    screenshot: 'only-on-failure',

    // Viewport padrão
    viewport: { width: 1280, height: 720 },
  },

  // Projetos/Browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Adicione mais browsers conforme necessário:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Servidor de desenvolvimento
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
