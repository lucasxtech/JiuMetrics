/**
 * VideoAnalysisPage - Página de análise de vídeo
 */

import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class VideoAnalysisPage extends BasePage {
  readonly pageTitle: Locator;
  readonly videoUrlInput: Locator;
  readonly analyzeButton: Locator;
  readonly analysisResult: Locator;
  readonly personTypeSelect: Locator;
  readonly personSelect: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.pageTitle = page.getByRole('heading', { name: /análise|vídeo/i, level: 1 });
    this.videoUrlInput = page.getByPlaceholder(/youtube|url|link|vídeo/i);
    this.analyzeButton = page.getByRole('button', { name: /analisar/i });
    this.analysisResult = page.locator('[data-testid="analysis-result"], .analysis-result');
    this.personTypeSelect = page.getByText(/atleta|adversário/i).locator('..');
    this.personSelect = page.locator('[data-testid="person-select"]');
  }

  protected get route(): string {
    return '/analyze-video';
  }

  async expectPageVisible(): Promise<void> {
    await expect(this.analyzeButton).toBeVisible({ timeout: 10000 });
  }

  async expectPersonSelectorVisible(): Promise<void> {
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
    await this.loadingSpinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 120000 });
  }

  async expectAnalysisResult(): Promise<void> {
    await expect(this.analysisResult).toBeVisible();
  }

  async expectUrlValidation(): Promise<void> {
    const invalidInput = this.page.locator('input:invalid');
    const errorText = this.page.getByText(/url|inválid|obrigatório/i);
    await expect(invalidInput.or(errorText).first()).toBeVisible({ timeout: 5000 });
  }

  async expectLoadingIndicator(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible({ timeout: 10000 });
  }
}
