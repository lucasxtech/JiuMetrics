/**
 * Page Object Model - Página de Estratégia
 */

import { Page, Locator, expect } from '@playwright/test';

export class StrategyPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly athleteSelect: Locator;
  readonly opponentSelect: Locator;
  readonly generateButton: Locator;
  readonly strategyResult: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /estratégia|simulação/i, level: 1 });
    // CustomSelect para atleta e adversário
    this.athleteSelect = page.locator('[data-testid="athlete-select"]').or(page.getByText(/selecione.*atleta/i).locator('..'));
    this.opponentSelect = page.locator('[data-testid="opponent-select"]').or(page.getByText(/selecione.*adversário/i).locator('..'));
    this.generateButton = page.getByRole('button', { name: /gerar|simular|estratégia/i });
    this.strategyResult = page.locator('[data-testid="strategy-result"], .strategy-result, .ai-strategy');
    this.loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner');
    this.errorMessage = page.locator('[role="alert"], .error-message, .error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/strategy');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  async expectPageVisible(): Promise<void> {
    // A página pode ter diferentes títulos, verificar conteúdo
    await expect(this.generateButton).toBeVisible({ timeout: 10000 });
  }

  async expectSelectorsVisible(): Promise<void> {
    // Verificar se há seletores de atleta e adversário na página
    await expect(this.page.getByText(/atleta/i).first()).toBeVisible();
    await expect(this.page.getByText(/adversário/i).first()).toBeVisible();
  }

  async expectGenerateButtonVisible(): Promise<void> {
    await expect(this.generateButton).toBeVisible();
  }

  async clickGenerateWithoutSelection(): Promise<void> {
    await this.generateButton.click();
  }

  async expectValidationAlert(): Promise<void> {
    // O app usa alert() para validação
    this.page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Selecione');
      await dialog.accept();
    });
  }

  async waitForStrategyResult(): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 120000 });
  }

  async expectStrategyResult(): Promise<void> {
    await expect(this.strategyResult).toBeVisible({ timeout: 10000 });
  }

  async expectError(message?: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
}
