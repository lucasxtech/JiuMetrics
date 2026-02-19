/**
 * Testes E2E - Gestão de Atletas
 */

import { test, expect } from '../../fixtures';
import { AthletesPage } from '../../pages';
import { TestDataBuilder } from '../../fixtures/TestDataBuilder';

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
      
      await expect(athletesPage.modal).toBeVisible();
    });

    test('deve criar novo atleta com sucesso', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      await athletesPage.openAddAthleteForm();
      
      const athleteData = TestDataBuilder.athlete();
      await athletesPage.fillAthleteForm({ name: athleteData.name });
      await athletesPage.submitForm();
      
      await athletesPage.modal.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await athletesPage.waitForLoad();
      await athletesPage.expectAthleteInList(athleteData.name);
    });
  });
});
