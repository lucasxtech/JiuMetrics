/**
 * BasePage - Classe base para todos os Page Objects
 * 
 * Implementa padrões comuns e métodos reutilizáveis
 * para todas as páginas do sistema.
 */

import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading, .spinner');
    this.errorMessage = page.locator('[role="alert"], .error-message, .error');
  }

  /**
   * Rota da página - deve ser implementada por cada Page Object
   */
  protected abstract get route(): string;

  /**
   * Navega para a página
   */
  async goto(): Promise<void> {
    await this.page.goto(this.route);
    await this.waitForLoad();
  }

  /**
   * Aguarda o carregamento da página
   */
  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  /**
   * Verifica se a página está visível (método abstrato)
   */
  abstract expectPageVisible(): Promise<void>;

  /**
   * Aguarda resposta da API
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout = 10000): Promise<void> {
    await this.page.waitForResponse(
      response => {
        const url = response.url();
        return typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * Verifica se há erro na página
   */
  async expectError(message?: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  /**
   * Verifica se não há erro na página
   */
  async expectNoError(): Promise<void> {
    await expect(this.errorMessage).not.toBeVisible();
  }

  /**
   * Tira screenshot da página
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `playwright/reports/screenshots/${name}.png` });
  }

  /**
   * Aguarda um tempo específico (usar com moderação)
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Obtém a URL atual
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Verifica se está na URL correta
   */
  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }
}
