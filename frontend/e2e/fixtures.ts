/**
 * Fixtures reutilizáveis para testes E2E
 * 
 * Este arquivo estende os fixtures do Playwright para incluir
 * funcionalidades compartilhadas entre os testes.
 */

import { test as base, expect, Page } from '@playwright/test';

// ============================================================================
// TIPOS
// ============================================================================

interface AuthFixtures {
  authenticatedPage: Page;
}

interface TestUser {
  email: string;
  password: string;
}

// ============================================================================
// DADOS DE TESTE
// ============================================================================

export const TEST_USER: TestUser = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

// ============================================================================
// FIXTURES CUSTOMIZADOS
// ============================================================================

/**
 * Fixture que fornece uma página já autenticada
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Fazer login antes do teste
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Senha').fill(TEST_USER.password);
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // Aguardar redirecionamento após login
    await page.waitForURL(/\/(overview|dashboard)/);
    
    await use(page);
  },
});

// ============================================================================
// HELPERS REUTILIZÁVEIS
// ============================================================================

/**
 * Aguarda carregamento de dados da API
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 10000 }
  );
}

/**
 * Aguarda o spinner de loading desaparecer
 */
export async function waitForLoadingToFinish(page: Page): Promise<void> {
  const spinner = page.locator('[data-testid="loading-spinner"], .loading, .spinner');
  await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
    // Spinner pode não existir, ignorar
  });
}

/**
 * Preenche formulário a partir de objeto de dados
 */
export async function fillForm(
  page: Page, 
  data: Record<string, string>
): Promise<void> {
  for (const [label, value] of Object.entries(data)) {
    const field = page.getByLabel(label);
    await field.fill(value);
  }
}

/**
 * Verifica se toast/notificação apareceu com mensagem
 */
export async function expectToast(
  page: Page, 
  message: string | RegExp
): Promise<void> {
  const toast = page.locator('[role="alert"], .toast, .notification');
  await expect(toast).toContainText(message);
}

/**
 * Navega para página e aguarda carregamento
 */
export async function navigateAndWait(
  page: Page, 
  path: string
): Promise<void> {
  await page.goto(path);
  await waitForLoadingToFinish(page);
}

// Re-exporta expect para conveniência
export { expect };
