/**
 * Testes E2E - Análise de Vídeo
 */

import { test, expect } from '../../fixtures';
import { VideoAnalysisPage } from '../../pages';
import { TestDataBuilder } from '../../fixtures/TestDataBuilder';

test.describe('Análise de Vídeo', () => {
  
  test.describe('Formulário', () => {
    test('deve exibir página de análise', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      await videoPage.expectPageVisible();
    });

    test('deve exibir seletor de atleta/oponente', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      await videoPage.expectPersonSelectorVisible();
    });

    test('deve validar URL vazia', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      await videoPage.clickAnalyze();
      await videoPage.expectUrlValidation();
    });

    test('deve aceitar URL do YouTube', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      await videoPage.fillVideoUrl(TestDataBuilder.VIDEO_URLS.youtube);
      await expect(videoPage.videoUrlInput).toHaveValue(/youtube/);
    });

    test('deve aceitar URL curta do YouTube', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      await videoPage.fillVideoUrl(TestDataBuilder.VIDEO_URLS.youtubeShort);
      await expect(videoPage.videoUrlInput).toHaveValue(/youtu\.be/);
    });
  });

  test.describe('Múltiplos Vídeos', () => {
    test('deve permitir adicionar mais vídeos', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const addButton = authenticatedPage.getByRole('button', { name: /adicionar|mais|novo vídeo|\+/i });
      
      // VALIDAÇÃO REAL: Botão DEVE existir
      await expect(addButton).toBeVisible();
      await addButton.click();
      
      // VALIDAÇÃO REAL: DEVE ter 2+ inputs de URL após adicionar
      const urlInputs = authenticatedPage.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="link" i]');
      await expect(urlInputs).toHaveCount(2, { timeout: 2000 });
    });

    test('deve permitir remover vídeo adicionado', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const addButton = authenticatedPage.getByRole('button', { name: /adicionar|mais|\+/i });
      await expect(addButton).toBeVisible();
      await addButton.click();
      
      // VALIDAÇÃO REAL: Botão de remover DEVE aparecer
      const removeButton = authenticatedPage.getByRole('button', { name: /remover|excluir|x/i }).first();
      await expect(removeButton).toBeVisible();
      
      // Conta quantos inputs tem antes
      const urlInputsBefore = authenticatedPage.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="link" i]');
      const countBefore = await urlInputsBefore.count();
      
      // Remove
      await removeButton.click();
      
      // VALIDAÇÃO REAL: DEVE ter um input a menos
      const urlInputsAfter = authenticatedPage.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="link" i]');
      await expect(urlInputsAfter).toHaveCount(countBefore - 1);
    });
  });

  test.describe('Seleção de Cor do Kimono', () => {
    test('deve permitir selecionar cor do kimono', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const colorSelect = authenticatedPage.getByLabel(/cor|kimono|gi/i)
        .or(authenticatedPage.locator('[data-testid="gi-color"]'));
      
      // VALIDAÇÃO REAL: Seletor DEVE existir
      await expect(colorSelect.first()).toBeVisible();
      await colorSelect.first().click();
      
      // VALIDAÇÃO REAL: DEVE ter opções de cor
      const options = authenticatedPage.getByRole('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
      
      // Seleciona uma cor
      await options.first().click();
    });
  });

  test.describe('Vinculação a Atleta/Oponente', () => {
    test('deve exigir seleção de pessoa para análise', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      // Preenche URL mas não seleciona pessoa
      await videoPage.videoUrlInput.fill(TestDataBuilder.VIDEO_URLS.youtube);
      await videoPage.analyzeButton.click();
      
      // VALIDAÇÃO REAL: DEVE mostrar erro de validação
      const errorMessage = authenticatedPage.locator('[data-testid="error"], .error-message, [role="alert"]').first();
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    });

    test('deve permitir cadastro rápido de novo atleta', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const quickAddButton = authenticatedPage.getByRole('button', { name: /cadastrar|novo|criar|\+/i });
      
      // VALIDAÇÃO REAL: Botão DEVE existir
      await expect(quickAddButton.first()).toBeVisible();
      await quickAddButton.first().click();
      
      // VALIDAÇÃO REAL: Modal/formulário DEVE abrir
      const modal = authenticatedPage.getByRole('dialog').or(authenticatedPage.locator('.modal, .quick-add'));
      await expect(modal.first()).toBeVisible();
    });
  });

  test.describe('Análise Real de Vídeo', () => {
    test('deve analisar vídeo e exibir resultados', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      // Seleciona pessoa para vincular análise
      const personSelect = authenticatedPage.locator('[data-testid="person-select"]').first();
      await expect(personSelect).toBeVisible();
      await personSelect.click();
      
      const personOptions = authenticatedPage.getByRole('option');
      await expect(personOptions.first()).toBeVisible({ timeout: 5000 });
      await personOptions.first().click();
      
      // Preenche URL do vídeo
      await videoPage.videoUrlInput.fill(TestDataBuilder.VIDEO_URLS.youtube);
      
      // Clica em analisar
      await expect(videoPage.analyzeButton).toBeEnabled();
      await videoPage.analyzeButton.click();
      
      // VALIDAÇÃO REAL: Loading DEVE aparecer
      const loadingIndicator = authenticatedPage.locator('[data-testid="loading"], .loading, .spinner, [role="progressbar"]').first();
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
      
      // VALIDAÇÃO REAL: Botão DEVE ficar desabilitado durante análise
      await expect(videoPage.analyzeButton).toBeDisabled({ timeout: 1000 });
      
      // VALIDAÇÃO REAL: Resultado da análise DEVE aparecer (pode demorar)
      const analysisResult = authenticatedPage.locator('[data-testid="analysis-result"], .analysis-content, .video-analysis-result').first();
      await expect(analysisResult).toBeVisible({ timeout: 90000 }); // 90s para análise de vídeo
      
      // VALIDAÇÃO REAL: Resultado DEVE ter conteúdo
      const resultText = await analysisResult.textContent();
      expect(resultText).toBeTruthy();
      expect(resultText!.length).toBeGreaterThan(50); // Análise real tem conteúdo
    });

    test('deve mostrar indicador de carregamento durante análise', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      // Seleciona pessoa
      const personSelect = authenticatedPage.locator('[data-testid="person-select"]').first();
      await expect(personSelect).toBeVisible();
      await personSelect.click();
      await authenticatedPage.getByRole('option').first().click();
      
      // Preenche e envia
      await videoPage.videoUrlInput.fill(TestDataBuilder.VIDEO_URLS.youtube);
      await videoPage.analyzeButton.click();
      
      // VALIDAÇÃO REAL: Indicador de progresso DEVE aparecer
      const progressIndicator = authenticatedPage.locator('[data-testid="loading"], .loading, .progress, [role="progressbar"]').first();
      await expect(progressIndicator).toBeVisible({ timeout: 2000 });
    });
  });
});
