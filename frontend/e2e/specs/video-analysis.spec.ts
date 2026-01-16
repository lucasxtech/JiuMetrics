/**
 * Testes E2E - Análise de Vídeo
 */

import { test, expect } from '../fixtures';
import { VideoAnalysisPage } from '../pages';

test.describe('Análise de Vídeo', () => {
  test.describe('Formulário', () => {
    test('deve exibir página de análise corretamente', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      await expect(videoPage.videoUrlInput).toBeVisible();
      await expect(videoPage.analyzeButton).toBeVisible();
    });

    test('deve validar URL inválida', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      await videoPage.analyzeVideo('url-invalida');
      
      await videoPage.expectInvalidUrlError();
    });

    test('deve aceitar URL do YouTube válida', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      // Preenche URL válida
      await videoPage.videoUrlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      // Verifica que botão está habilitado
      await expect(videoPage.analyzeButton).toBeEnabled();
    });

    test('deve aceitar diferentes formatos de URL do YouTube', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      const validUrls = [
        'https://www.youtube.com/watch?v=abc123',
        'https://youtu.be/abc123',
        'https://youtube.com/watch?v=abc123',
      ];
      
      for (const url of validUrls) {
        await videoPage.videoUrlInput.fill(url);
        await expect(videoPage.analyzeButton).toBeEnabled();
        await videoPage.videoUrlInput.clear();
      }
    });
  });

  test.describe('Seleção de Atleta', () => {
    test('deve permitir selecionar atleta para análise', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      // Verifica que select de atleta existe
      await expect(videoPage.athleteSelect).toBeVisible();
      
      // Verifica que tem opções
      const options = videoPage.athleteSelect.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // Testes de análise real (skip por padrão pois são lentos)
  test.describe('Análise Completa', () => {
    test.skip('deve realizar análise de vídeo completa', async ({ authenticatedPage }) => {
      const videoPage = new VideoAnalysisPage(authenticatedPage);
      await videoPage.goto();
      
      // Submete análise
      await videoPage.analyzeVideo('https://www.youtube.com/watch?v=exemplo_real');
      
      // Aguarda conclusão (pode demorar até 2 minutos)
      await videoPage.waitForAnalysis();
      
      // Verifica resultado
      await videoPage.expectAnalysisResult();
    });
  });
});
