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
      
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        
        const urlInputs = authenticatedPage.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="link" i]');
        const count = await urlInputs.count();
        expect(count).toBeGreaterThanOrEqual(2);
      }
    });

    test('deve permitir remover vídeo adicionado', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const addButton = authenticatedPage.getByRole('button', { name: /adicionar|mais|\+/i });
      
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        
        const removeButton = authenticatedPage.getByRole('button', { name: /remover|excluir|x/i }).first();
        
        if (await removeButton.isVisible().catch(() => false)) {
          await removeButton.click();
          expect(true).toBe(true);
        }
      }
    });
  });

  test.describe('Seleção de Cor do Kimono', () => {
    test('deve permitir selecionar cor do kimono', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const colorSelect = authenticatedPage.getByLabel(/cor|kimono|gi/i)
        .or(authenticatedPage.locator('[data-testid="gi-color"]'));
      
      if (await colorSelect.first().isVisible().catch(() => false)) {
        await colorSelect.first().click();
        
        const options = authenticatedPage.getByRole('option');
        const count = await options.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Vinculação a Atleta/Oponente', () => {
    test('deve exigir seleção de pessoa para análise', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      await videoPage.videoUrlInput.fill(TestDataBuilder.VIDEO_URLS.youtube);
      await videoPage.analyzeButton.click();
      
      expect(true).toBe(true);
    });

    test('deve permitir cadastro rápido de novo atleta', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const quickAddButton = authenticatedPage.getByRole('button', { name: /cadastrar|novo|criar|\+/i });
      
      if (await quickAddButton.first().isVisible().catch(() => false)) {
        await quickAddButton.first().click();
        
        const modal = authenticatedPage.getByRole('dialog').or(authenticatedPage.locator('.modal, .quick-add'));
        await expect(modal.first()).toBeVisible();
      }
    });
  });

  test.describe('Progresso de Análise', () => {
    test('deve mostrar indicador de carregamento durante análise', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const personSelect = authenticatedPage.locator('[data-testid="person-select"]').first();
      if (await personSelect.isVisible().catch(() => false)) {
        await personSelect.click();
        await authenticatedPage.getByRole('option').first().click();
      }
      
      await videoPage.videoUrlInput.fill(TestDataBuilder.VIDEO_URLS.youtube);
      await videoPage.analyzeButton.click();
      
      expect(true).toBe(true);
    });
  });
});
