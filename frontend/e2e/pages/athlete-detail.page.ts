/**
 * Page Object Model - Página de Detalhes do Atleta
 */

import { Page, Locator, expect } from '@playwright/test';

export class AthleteDetailPage {
  readonly page: Page;
  readonly athleteName: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly analysesList: Locator;
  readonly chartsSection: Locator;
  readonly summarySection: Locator;
  readonly loadingSpinner: Locator;
  readonly backButton: Locator;
  readonly tabAnalyses: Locator;
  readonly tabSummary: Locator;
  readonly chatButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.athleteName = page.locator('[data-testid="athlete-name"], .athlete-name, h1');
    this.editButton = page.getByRole('button', { name: /editar/i });
    this.deleteButton = page.getByRole('button', { name: /excluir|deletar|remover/i });
    this.analysesList = page.locator('[data-testid="analyses-list"], .analyses-list');
    this.chartsSection = page.locator('[data-testid="charts-section"], .charts-section, .charts');
    this.summarySection = page.locator('[data-testid="summary-section"], .summary-section');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .loading');
    this.backButton = page.getByRole('button', { name: /voltar/i }).or(page.getByRole('link', { name: /voltar/i }));
    this.tabAnalyses = page.getByRole('tab', { name: /análises/i });
    this.tabSummary = page.getByRole('tab', { name: /resumo|perfil/i });
    this.chatButton = page.getByRole('button', { name: /chat|conversar|ia/i });
  }

  async goto(athleteId: string): Promise<void> {
    await this.page.goto(`/athletes/${athleteId}`);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  async expectAthleteName(name: string): Promise<void> {
    await expect(this.athleteName).toContainText(name);
  }

  async openEditForm(): Promise<void> {
    await this.editButton.click();
  }

  async deleteAthlete(): Promise<void> {
    await this.deleteButton.click();
    // Confirmar no modal
    await this.page.getByRole('button', { name: /confirmar|sim|excluir/i }).click();
  }

  async getAnalysesCount(): Promise<number> {
    const items = this.analysesList.locator('[data-testid="analysis-item"], .analysis-item');
    return await items.count();
  }

  async expectChartsVisible(): Promise<void> {
    await expect(this.chartsSection).toBeVisible();
  }

  async goToAnalysesTab(): Promise<void> {
    await this.tabAnalyses.click();
  }

  async goToSummaryTab(): Promise<void> {
    await this.tabSummary.click();
  }

  async openChat(): Promise<void> {
    await this.chatButton.click();
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
    await expect(this.page).toHaveURL(/athletes$/);
  }
}
