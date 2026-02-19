/**
 * AthletesPage - Página de gerenciamento de atletas
 */

import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AthletesPage extends BasePage {
  readonly pageTitle: Locator;
  readonly addAthleteButton: Locator;
  readonly athleteCards: Locator;
  readonly modal: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: /central de atletas/i, level: 1 });
    this.addAthleteButton = page.getByRole('button', { name: /novo atleta/i });
    this.athleteCards = page.locator('.grid > div, [data-testid="athlete-card"]');
    this.modal = page.getByRole('heading', { name: /cadastrar novo atleta/i });
  }

  protected get route(): string {
    return '/athletes';
  }

  async waitForLoad(): Promise<void> {
    await super.waitForLoad();
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  async expectPageVisible(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
  }

  async expectAddButtonVisible(): Promise<void> {
    await expect(this.addAthleteButton).toBeVisible();
  }

  async openAddAthleteForm(): Promise<void> {
    await this.addAthleteButton.click();
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  async fillAthleteForm(data: { name: string; academy?: string }): Promise<void> {
    await this.page.getByPlaceholder(/joão silva/i).fill(data.name);
  }

  async submitForm(): Promise<void> {
    await this.page.getByRole('button', { name: /salvar atleta/i }).click();
  }

  async clickAthlete(name: string): Promise<void> {
    await this.page.getByText(name).first().click();
  }

  async expectAthleteInList(name: string): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    const emptyMessage = this.page.getByText(/nenhum atleta|sem atletas|lista vazia/i);
    await expect(emptyMessage).toBeVisible();
  }
}
