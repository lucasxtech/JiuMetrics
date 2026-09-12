/**
 * Testes E2E - Geração de Estratégia
 */

import { test, expect } from '../../fixtures';
import { StrategyPage } from '../../pages';

test.describe('Estratégia', () => {
  
  test.describe('Página', () => {
    test('deve exibir página de estratégia', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      await strategyPage.expectPageVisible();
    });

    test('deve exibir seletores de atleta e oponente', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      await strategyPage.expectSelectorsVisible();
    });

    test('deve exibir botão de gerar estratégia', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      await strategyPage.expectGenerateButtonVisible();
    });
  });

  test.describe('Seleção', () => {
    test('deve permitir selecionar atleta', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      
      // VALIDAÇÃO REAL: Seletor DEVE estar visível
      await expect(strategyPage.athleteSelect).toBeVisible();
      await strategyPage.athleteSelect.click();
      
      // VALIDAÇÃO REAL: DEVE ter opções disponíveis
      const options = authenticatedPage.getByRole('option');
      await expect(options.first()).toBeVisible({ timeout: 5000 });
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
      
      // Seleciona primeira opção
      await options.first().click();
      
      // Verifica que foi selecionado
      const selectedValue = await strategyPage.athleteSelect.inputValue().catch(() => '');
      expect(selectedValue).toBeTruthy();
    });

    test('deve permitir selecionar oponente', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      
      // VALIDAÇÃO REAL: Seletor DEVE estar visível
      await expect(strategyPage.opponentSelect).toBeVisible();
      await strategyPage.opponentSelect.click();
      
      // VALIDAÇÃO REAL: DEVE ter opções disponíveis
      const options = authenticatedPage.getByRole('option');
      await expect(options.first()).toBeVisible({ timeout: 5000 });
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
      
      // Seleciona primeira opção
      await options.first().click();
      
      // Verifica que foi selecionado
      const selectedValue = await strategyPage.opponentSelect.inputValue().catch(() => '');
      expect(selectedValue).toBeTruthy();
    });
  });

  test.describe('Geração de Estratégia', () => {
    test('deve gerar estratégia completa após selecionar atleta e oponente', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      
      // Seleciona atleta
      await expect(strategyPage.athleteSelect).toBeVisible();
      await strategyPage.athleteSelect.click();
      const athleteOptions = authenticatedPage.getByRole('option');
      await expect(athleteOptions.first()).toBeVisible({ timeout: 5000 });
      await athleteOptions.first().click();
      
      // Aguarda um pouco para o select fechar
      await authenticatedPage.waitForTimeout(500);
      
      // Seleciona oponente
      await expect(strategyPage.opponentSelect).toBeVisible();
      await strategyPage.opponentSelect.click();
      const opponentOptions = authenticatedPage.getByRole('option');
      await expect(opponentOptions.first()).toBeVisible({ timeout: 5000 });
      await opponentOptions.first().click();
      
      // Clica em gerar estratégia
      await expect(strategyPage.generateButton).toBeVisible();
      await expect(strategyPage.generateButton).toBeEnabled();
      await strategyPage.generateButton.click();
      
      // VALIDAÇÃO REAL: Aguarda loading aparecer
      const loadingIndicator = authenticatedPage.locator('[data-testid="loading"], .loading, .spinner').first();
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
      
      // VALIDAÇÃO REAL: Aguarda estratégia ser gerada (pode demorar)
      const strategyResult = authenticatedPage.locator('[data-testid="strategy-result"], .strategy-content, .strategy-result').first();
      await expect(strategyResult).toBeVisible({ timeout: 60000 }); // 60s para IA responder
      
      // VALIDAÇÃO REAL: Estratégia DEVE ter conteúdo
      const strategyText = await strategyResult.textContent();
      expect(strategyText).toBeTruthy();
      expect(strategyText!.length).toBeGreaterThan(50); // Estratégia real tem conteúdo
    });

    test('deve mostrar indicador de carregamento durante geração', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      
      // Seleciona atleta
      await strategyPage.athleteSelect.click();
      const athleteOptions = authenticatedPage.getByRole('option');
      await athleteOptions.first().click();
      await authenticatedPage.waitForTimeout(500);
      
      // Seleciona oponente
      await strategyPage.opponentSelect.click();
      const opponentOptions = authenticatedPage.getByRole('option');
      await opponentOptions.first().click();
      
      // Clica em gerar
      await strategyPage.generateButton.click();
      
      // VALIDAÇÃO REAL: Loading DEVE aparecer
      const loadingIndicator = authenticatedPage.locator('[data-testid="loading"], .loading, .spinner, [role="progressbar"]').first();
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
      
      // VALIDAÇÃO REAL: Botão DEVE ficar desabilitado durante geração
      await expect(strategyPage.generateButton).toBeDisabled({ timeout: 1000 });
    });

    test('deve exibir erro se não selecionar atleta ou oponente', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      
      // Tenta gerar sem selecionar nada
      await strategyPage.generateButton.click();
      
      // VALIDAÇÃO REAL: DEVE mostrar mensagem de erro ou validação
      const errorMessage = authenticatedPage.locator('[data-testid="error"], .error-message, .alert-error, [role="alert"]').first();
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    });
  });
});
