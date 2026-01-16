/**
 * Page Object Model - Página de Atletas
 * 
 * Encapsula interações com a página de listagem e gestão de atletas
 */

import { Page, Locator, expect } from '@playwright/test';

export class AthletesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addAthleteButton: Locator;
  readonly athleteList: Locator;
  readonly searchInput: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /atletas/i });
    this.addAthleteButton = page.getByRole('button', { name: /adicionar|novo atleta/i });
    this.athleteList = page.locator('[data-testid="athlete-list"], .athlete-list');
    this.searchInput = page.getByPlaceholder(/buscar|pesquisar/i);
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .loading');
  }

  /**
   * Navega para a página de atletas
   */
  async goto(): Promise<void> {
    await this.page.goto('/athletes');
    await this.waitForLoad();
  }

  /**
   * Aguarda carregamento da página
   */
  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Busca atleta por nome
   */
  async searchAthlete(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await this.waitForLoad();
  }

  /**
   * Clica em um atleta da lista
   */
  async clickAthlete(name: string): Promise<void> {
    await this.page.getByText(name).first().click();
  }

  /**
   * Abre formulário de adicionar atleta
   */
  async openAddAthleteForm(): Promise<void> {
    await this.addAthleteButton.click();
  }

  /**
   * Retorna número de atletas na lista
   */
  async getAthleteCount(): Promise<number> {
    const items = this.athleteList.locator('[data-testid="athlete-item"], .athlete-item, .athlete-card');
    return await items.count();
  }

  /**
   * Verifica se atleta está na lista
   */
  async expectAthleteInList(name: string): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  /**
   * Verifica se a página está vazia
   */
  async expectEmptyState(): Promise<void> {
    const emptyMessage = this.page.getByText(/nenhum atleta|sem atletas|lista vazia/i);
    await expect(emptyMessage).toBeVisible();
  }
}
