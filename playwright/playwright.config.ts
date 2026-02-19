import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // ============================================================================
  // DIRETÓRIOS
  // ============================================================================
  
  testDir: './tests',
  outputDir: './reports/test-results',

  // ============================================================================
  // TIMEOUTS
  // ============================================================================
  
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  // ============================================================================
  // EXECUÇÃO
  // ============================================================================
  
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // ============================================================================
  // REPORTERS
  // ============================================================================
  
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: './reports/html-report',
      open: 'never',
    }],
    ['json', {
      outputFile: './reports/results.json',
    }],
  ],

  // ============================================================================
  // CONFIGURAÇÕES GLOBAIS
  // ============================================================================
  
  use: {
    baseURL: 'http://localhost:5173',
    
    // Traces e screenshots
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Timeouts de ação
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  // ============================================================================
  // PROJETOS (BROWSERS)
  // ============================================================================
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Descomente para testar em outros browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // ============================================================================
  // WEB SERVER
  // ============================================================================
  
  webServer: {
    command: 'npm run dev',
    cwd: resolve(__dirname, '../frontend'),
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
