/**
 * Testes E2E - Gestão de Atletas
 */

import { test, expect } from '../fixtures';
import { AthletesPage } from '../pages';

test.describe('Atletas', () => {
  
  test.describe('Listagem', () => {
    test('deve exibir página de atletas', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      await athletesPage.expectPageVisible();
    });

    test('deve exibir botão de adicionar atleta', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      await athletesPage.expectAddButtonVisible();
    });
  });

  test.describe('Criar Atleta', () => {
    test('deve abrir formulário de novo atleta', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      await athletesPage.openAddAthleteForm();
      
      // Verifica se modal abriu
      await expect(athletesPage.modal).toBeVisible();
    });

    test('deve validar campo nome obrigatório', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      await athletesPage.openAddAthleteForm();
      
      // Tenta submeter sem preencher nome
      await athletesPage.submitForm();
      
      // Deve mostrar validação (campo :invalid ou mensagem)
      await athletesPage.expectFormValidationError();
    });

    test('deve criar novo atleta com sucesso', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      await athletesPage.openAddAthleteForm();
      
      const uniqueName = `Atleta E2E ${Date.now()}`;
      await athletesPage.fillAthleteForm({ name: uniqueName, academy: 'Academia Teste' });
      await athletesPage.submitForm();
      
      // Aguarda modal fechar e atleta aparecer na lista
      await athletesPage.modal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await athletesPage.waitForLoad();
      await athletesPage.expectAthleteInList(uniqueName);
    });
  });
});
