/**
 * Fixtures customizados para testes E2E
 * 
 * Estende os fixtures do Playwright com funcionalidades específicas do projeto
 */

import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages';

// ============================================================================
// TIPOS
// ============================================================================

export interface TestUser {
  email: string;
  password: string;
}

export interface AuthFixtures {
  authenticatedPage: Page;
  loginPage: LoginPage;
}

// ============================================================================
// DADOS DE TESTE
// ============================================================================

export const TEST_USER: TestUser = {
  email: 'contateste@teste.com',
  password: '33335929Aa@',
};

// ============================================================================
// FIXTURES
// ============================================================================

/**
 * Fixtures customizados que estendem o Playwright
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Página já autenticada - login automático antes do teste
   */
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    
    await loginPage.login(TEST_USER.email, TEST_USER.password);
    await page.waitForSelector('text=Overview', { timeout: 15000 });
    
    await use(page);
  },

  /**
   * LoginPage já instanciada
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
