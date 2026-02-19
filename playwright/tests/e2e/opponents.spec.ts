/**
 * Testes E2E - Gestão de Oponentes
 */

import { test, expect } from '../../fixtures';
import { OpponentsPage } from '../../pages';
import { TestDataBuilder } from '../../fixtures/TestDataBuilder';

test.describe('Oponentes', () => {
  
  test.describe('Listagem', () => {
    test('deve exibir página de oponentes', async ({ authenticatedPage }) => {
      const opponentsPage = new OpponentsPage(authenticatedPage);
      await opponentsPage.goto();
      await opponentsPage.expectPageVisible();
    });

    test('deve exibir botão de adicionar oponente', async ({ authenticatedPage }) => {
      const opponentsPage = new OpponentsPage(authenticatedPage);
      await opponentsPage.goto();
      await opponentsPage.expectAddButtonVisible();
    });
  });

  test.describe('Criar Oponente', () => {
    test('deve abrir formulário de novo oponente', async ({ authenticatedPage }) => {
      const opponentsPage = new OpponentsPage(authenticatedPage);
      await opponentsPage.goto();
      await opponentsPage.openAddOpponentForm();
      
      await expect(opponentsPage.modal).toBeVisible();
    });

    test('deve criar novo oponente com sucesso', async ({ authenticatedPage }) => {
      const opponentsPage = new OpponentsPage(authenticatedPage);
      await opponentsPage.goto();
      await opponentsPage.openAddOpponentForm();
      
      const opponentData = TestDataBuilder.opponent();
      await opponentsPage.fillOpponentForm({ name: opponentData.name });
      await opponentsPage.submitForm();
      
      await opponentsPage.modal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await opponentsPage.waitForLoad();
      await opponentsPage.expectOpponentInList(opponentData.name);
    });
  });
});
