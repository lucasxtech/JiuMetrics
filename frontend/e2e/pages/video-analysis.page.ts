/**
 * Page Object Model - Página de Análise de Vídeo
 */

import { Page, Locator, expect } from '@playwright/test';

export class VideoAnalysisPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly videoUrlInput: Locator;
  readonly analyzeButton: Locator;
  readonly analysisResult: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly personTypeSelect: Locator;
  readonly personSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /análise|vídeo/i, level: 1 });
    // Input de URL do vídeo
    this.videoUrlInput = page.getByPlaceholder(/youtube|url|link|vídeo/i);
    this.analyzeButton = page.getByRole('button', { name: /analisar/i });
    this.analysisResult = page.locator('[data-testid="analysis-result"], .analysis-result');
    this.loadingIndicator = page.locator('[data-testid="analyzing"], .analyzing, .loading');
    this.errorMessage = page.locator('[role="alert"], .error-message');
    // Seletores de tipo de pessoa e pessoa
    this.personTypeSelect = page.getByText(/atleta|adversário/i).locator('..');
    this.personSelect = page.locator('[data-testid="person-select"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/analyze-video');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  async expectPageVisible(): Promise<void> {
    // Verificar se o botão de analisar está visível
    await expect(this.analyzeButton).toBeVisible({ timeout: 10000 });
  }

  async expectPersonSelectorVisible(): Promise<void> {
    // Deve haver seletor de atleta/adversário
    await expect(this.page.getByText(/atleta|adversário/i).first()).toBeVisible();
  }

  async fillVideoUrl(url: string): Promise<void> {
    await this.videoUrlInput.fill(url);
  }

  async clickAnalyze(): Promise<void> {
    await this.analyzeButton.click();
  }

  async analyzeVideo(url: string): Promise<void> {
    await this.fillVideoUrl(url);
    await this.clickAnalyze();
  }

  async waitForAnalysis(): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 120000 });
  }

  async expectAnalysisResult(): Promise<void> {
    await expect(this.analysisResult).toBeVisible();
  }

  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectInvalidUrlError(): Promise<void> {
    // Erro de URL inválida
    await expect(this.errorMessage.or(this.page.getByText(/url inválid|link inválid|formato inválido/i))).toBeVisible({ timeout: 5000 });
  }

  async expectUrlValidation(): Promise<void> {
    // O input pode ter validação HTML5 ou mensagem customizada
    const invalidInput = this.page.locator('input:invalid');
    const errorText = this.page.getByText(/url|inválid|obrigatório/i);
    await expect(invalidInput.or(errorText).first()).toBeVisible({ timeout: 5000 });
  }

  async expectLoadingIndicator(): Promise<void> {
    await expect(this.loadingIndicator).toBeVisible({ timeout: 10000 });
  }
}
