/**
 * StrategyPage - Página de geração de estratégias
 */

import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class StrategyPage extends BasePage {
  readonly pageTitle: Locator;
  readonly athleteSelect: Locator;
  readonly opponentSelect: Locator;
  readonly generateButton: Locator;
  readonly strategyResult: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: /estratégia|simulação/i, level: 1 });
    this.athleteSelect = page.locator('[data-testid="athlete-select"]').or(page.getByText(/selecione.*atleta/i).locator('..'));
    this.opponentSelect = page.locator('[data-testid="opponent-select"]').or(page.getByText(/selecione.*adversário/i).locator('..'));
    this.generateButton = page.getByRole('button', { name: /gerar|simular|estratégia/i });
    this.strategyResult = page.locator('[data-testid="strategy-result"], .strategy-result, .ai-strategy');
  }

  protected get route(): string {
    return '/strategy';
  }

  async expectPageVisible(): Promise<void> {
    await expect(this.generateButton).toBeVisible({ timeout: 10000 });
  }

  async expectSelectorsVisible(): Promise<void> {
    await expect(this.page.getByText(/atleta/i).first()).toBeVisible();
    await expect(this.page.getByText(/adversário/i).first()).toBeVisible();
  }

  async expectGenerateButtonVisible(): Promise<void> {
    await expect(this.generateButton).toBeVisible();
  }

  async clickGenerateWithoutSelection(): Promise<void> {
    await this.generateButton.click();
  }

  async waitForStrategyResult(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 120000 });
  }

  async expectStrategyResult(): Promise<void> {
    await expect(this.strategyResult).toBeVisible({ timeout: 10000 });
  }
}
