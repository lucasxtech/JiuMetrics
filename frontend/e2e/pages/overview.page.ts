/**
 * Page Object Model - Página de Overview/Dashboard
 */

import { Page, Locator, expect } from '@playwright/test';

export class OverviewPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly welcomeText: Locator;
  readonly featureCards: Locator;
  readonly athletesLink: Locator;
  readonly opponentsLink: Locator;
  readonly strategyLink: Locator;
  readonly analyzeVideoLink: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    // O heading principal é "JiuMetrics"
    this.heading = page.getByRole('heading', { name: /jiumetrics/i, level: 1 });
    this.welcomeText = page.getByText(/bem-vindo/i);
    this.featureCards = page.locator('article');
    // Links de navegação do menu (usar first() pois há links duplicados no conteúdo)
    this.athletesLink = page.getByRole('link', { name: 'Atletas', exact: true }).first();
    this.opponentsLink = page.getByRole('link', { name: 'Adversários', exact: true }).first();
    this.strategyLink = page.getByRole('link', { name: 'Estratégia', exact: true }).first();
    this.analyzeVideoLink = page.getByRole('link', { name: 'IA', exact: true }).first();
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], .loading');
  }

  async goto(): Promise<void> {
    // A home é a raiz /JiuMetrics/
    await this.page.goto('/');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    // Aguardar o conteúdo carregar
    await this.welcomeText.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  async expectPageVisible(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.welcomeText).toBeVisible();
  }

  async expectFeaturesVisible(): Promise<void> {
    const count = await this.featureCards.count();
    expect(count).toBeGreaterThan(0);
  }

  async navigateToAthletes(): Promise<void> {
    await this.athletesLink.click();
    await expect(this.page).toHaveURL(/athletes/);
  }

  async navigateToOpponents(): Promise<void> {
    await this.opponentsLink.click();
    await expect(this.page).toHaveURL(/opponents/);
  }

  async navigateToStrategy(): Promise<void> {
    await this.strategyLink.click();
    await expect(this.page).toHaveURL(/strategy/);
  }

  async navigateToVideoAnalysis(): Promise<void> {
    await this.analyzeVideoLink.click();
    await expect(this.page).toHaveURL(/analyze-video/);
  }
}
