/**
 * Helpers - Utilitários genéricos para testes E2E
 */

import { Page, Locator, expect } from '@playwright/test';

// ============================================================================
// ESPERAS
// ============================================================================

/**
 * Aguarda o spinner de loading desaparecer
 */
export async function waitForLoadingToFinish(page: Page, timeout = 10000): Promise<void> {
  const spinner = page.locator('[data-testid="loading"], .loading, .spinner');
  await spinner.waitFor({ state: 'hidden', timeout }).catch(() => {});
}

/**
 * Aguarda elemento estar clicável
 */
export async function waitForClickable(locator: Locator, timeout = 5000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
  await expect(locator).toBeEnabled({ timeout });
}

/**
 * Aguarda navegação completar
 */
export async function waitForNavigation(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForURL(urlPattern, { timeout: 10000 });
}

// ============================================================================
// ASSERTIONS
// ============================================================================

/**
 * Verifica se texto existe na página
 */
export async function expectTextVisible(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible();
}

/**
 * Verifica se texto NÃO existe na página
 */
export async function expectTextNotVisible(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text)).not.toBeVisible();
}

/**
 * Verifica contagem de elementos
 */
export async function expectCount(locator: Locator, count: number): Promise<void> {
  await expect(locator).toHaveCount(count);
}

// ============================================================================
// INTERAÇÕES
// ============================================================================

/**
 * Preenche formulário a partir de objeto
 */
export async function fillForm(page: Page, data: Record<string, string>): Promise<void> {
  for (const [label, value] of Object.entries(data)) {
    const field = page.getByLabel(label);
    await field.fill(value);
  }
}

/**
 * Seleciona opção em select
 */
export async function selectOption(locator: Locator, value: string): Promise<void> {
  await locator.selectOption(value);
}

/**
 * Clica e aguarda navegação
 */
export async function clickAndWaitForNavigation(
  locator: Locator,
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  await Promise.all([
    page.waitForURL(urlPattern),
    locator.click(),
  ]);
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Gera string aleatória
 */
export function randomString(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Gera email de teste único
 */
export function randomEmail(): string {
  return `test_${randomString()}@test.com`;
}

/**
 * Retry com backoff exponencial
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}
