/**
 * Testes E2E - Gestão de Oponentes
 */

import { test, expect } from '../fixtures';
import { OpponentsPage } from '../pages';

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
      
      // Verifica se modal abriu
      await expect(opponentsPage.modal).toBeVisible();
    });

    test('deve criar novo oponente com sucesso', async ({ authenticatedPage }) => {
      const opponentsPage = new OpponentsPage(authenticatedPage);
      await opponentsPage.goto();
      await opponentsPage.openAddOpponentForm();
      
      const uniqueName = `Oponente E2E ${Date.now()}`;
      await opponentsPage.fillOpponentForm({ name: uniqueName, academy: 'Academia Rival' });
      await opponentsPage.submitForm();
      
      // Aguarda modal fechar
      await opponentsPage.modal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await opponentsPage.waitForLoad();
      await opponentsPage.expectOpponentInList(uniqueName);
    });

    test('deve validar campos obrigatórios', async ({ authenticatedPage }) => {
      const opponentsPage = new OpponentsPage(authenticatedPage);
      await opponentsPage.goto();
      await opponentsPage.openAddOpponentForm();
      
      // Tenta submeter sem preencher
      await opponentsPage.submitForm();
      
      // Deve mostrar validação
      await opponentsPage.expectFormValidationError();
    });
  });
});
