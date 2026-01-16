/**
 * Page Object Model - Página de Oponentes
 */

import { Page, Locator, expect } from '@playwright/test';

export class OpponentsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly addOpponentButton: Locator;
  readonly opponentCards: Locator;
  readonly loadingSpinner: Locator;
  readonly modal: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /central de adversários/i, level: 1 });
    this.addOpponentButton = page.getByRole('button', { name: /novo adversário/i });
    this.opponentCards = page.locator('.grid > div, [data-testid="opponent-card"]');
    this.loadingSpinner = page.locator('.loading-spinner, [data-testid="loading"]');
    this.modal = page.locator('[role="dialog"], .modal');
    this.emptyState = page.getByText(/nenhum adversário|sem adversários|lista vazia/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/opponents');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  async expectPageVisible(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
  }

  async expectAddButtonVisible(): Promise<void> {
    await expect(this.addOpponentButton).toBeVisible();
  }

  async openAddOpponentForm(): Promise<void> {
    await this.addOpponentButton.click();
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  async clickOpponent(name: string): Promise<void> {
    await this.page.getByText(name).first().click();
  }

  async fillOpponentForm(data: { name: string; academy?: string }): Promise<void> {
    await this.page.getByPlaceholder(/nome completo/i).fill(data.name);
    if (data.academy) {
      await this.page.getByPlaceholder(/academia/i).fill(data.academy);
    }
  }

  async submitForm(): Promise<void> {
    await this.page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click();
  }

  async expectOpponentInList(name: string): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async expectFormValidationError(): Promise<void> {
    const invalidField = this.page.locator(':invalid');
    await expect(invalidField.first()).toBeVisible({ timeout: 3000 });
  }
}
