/**
 * OpponentsPage - Página de gerenciamento de adversários
 */

import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class OpponentsPage extends BasePage {
  readonly pageTitle: Locator;
  readonly addOpponentButton: Locator;
  readonly opponentCards: Locator;
  readonly modal: Locator;
  readonly emptyState: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: /central de adversários/i, level: 1 });
    this.addOpponentButton = page.getByRole('button', { name: /novo adversário/i });
    this.opponentCards = page.locator('.grid > div, [data-testid="opponent-card"]');
    this.modal = page.getByRole('heading', { name: /cadastrar novo adversário/i });
    this.emptyState = page.getByText(/nenhum adversário|sem adversários|lista vazia/i);
  }

  protected get route(): string {
    return '/opponents';
  }

  async waitForLoad(): Promise<void> {
    await super.waitForLoad();
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

  async fillOpponentForm(data: { name: string; academy?: string }): Promise<void> {
    await this.page.getByPlaceholder(/joão silva/i).fill(data.name);
  }

  async submitForm(): Promise<void> {
    await this.page.getByRole('button', { name: /salvar/i }).click();
  }

  async clickOpponent(name: string): Promise<void> {
    await this.page.getByText(name).first().click();
  }

  async expectOpponentInList(name: string): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }
}
