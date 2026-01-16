/**
 * Page Object Model - Página de Análise de Vídeo
 * 
 * Encapsula interações com a página de análise de vídeos
 */

import { Page, Locator, expect } from '@playwright/test';

export class VideoAnalysisPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly videoUrlInput: Locator;
  readonly analyzeButton: Locator;
  readonly analysisResult: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;
  readonly athleteSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /análise|vídeo/i });
    this.videoUrlInput = page.getByLabel(/url|link|vídeo/i);
    this.analyzeButton = page.getByRole('button', { name: /analisar/i });
    this.analysisResult = page.locator('[data-testid="analysis-result"], .analysis-result');
    this.loadingIndicator = page.locator('[data-testid="analyzing"], .analyzing, .loading');
    this.errorMessage = page.locator('[role="alert"], .error-message');
    this.athleteSelect = page.getByLabel(/atleta/i);
  }

  /**
   * Navega para a página de análise de vídeo
   */
  async goto(): Promise<void> {
    await this.page.goto('/video-analysis');
  }

  /**
   * Submete URL de vídeo para análise
   */
  async analyzeVideo(url: string, athleteName?: string): Promise<void> {
    if (athleteName) {
      await this.athleteSelect.selectOption({ label: athleteName });
    }
    await this.videoUrlInput.fill(url);
    await this.analyzeButton.click();
  }

  /**
   * Aguarda análise completar
   */
  async waitForAnalysis(): Promise<void> {
    // Primeiro aguarda aparecer o loading
    await this.loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    // Depois aguarda ele desaparecer (análise completa)
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 120000 });
  }

  /**
   * Verifica se resultado da análise está visível
   */
  async expectAnalysisResult(): Promise<void> {
    await expect(this.analysisResult).toBeVisible();
  }

  /**
   * Verifica mensagem de erro
   */
  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  /**
   * Verifica se URL é inválida
   */
  async expectInvalidUrlError(): Promise<void> {
    await this.expectError(/url inválid|link inválid|formato inválido/i);
  }
}
