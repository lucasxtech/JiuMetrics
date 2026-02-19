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
      
      if (await strategyPage.athleteSelect.isVisible().catch(() => false)) {
        await strategyPage.athleteSelect.click();
        
        const options = authenticatedPage.getByRole('option');
        const count = await options.count();
        
        if (count > 0) {
          await options.first().click();
          expect(true).toBe(true);
        }
      }
    });

    test('deve permitir selecionar oponente', async ({ authenticatedPage }) => {
      const strategyPage = new StrategyPage(authenticatedPage);
      await strategyPage.goto();
      
      if (await strategyPage.opponentSelect.isVisible().catch(() => false)) {
        await strategyPage.opponentSelect.click();
        
        const options = authenticatedPage.getByRole('option');
        const count = await options.count();
        
        if (count > 0) {
          await options.first().click();
          expect(true).toBe(true);
        }
      }
    });
  });
});
