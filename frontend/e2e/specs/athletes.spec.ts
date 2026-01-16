/**
 * Testes E2E - Gestão de Atletas
 */

import { test, expect } from '../fixtures';
import { AthletesPage } from '../pages';

test.describe('Atletas', () => {
  // Usa página autenticada para todos os testes deste bloco
  test.use({ storageState: undefined }); // Reset para usar authenticatedPage

  test.describe('Listagem', () => {
    test('deve exibir lista de atletas', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      
      await expect(athletesPage.heading).toBeVisible();
    });

    test('deve filtrar atletas por busca', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      
      // Digita no campo de busca
      await athletesPage.searchInput.fill('Marcus');
      
      // Aguarda filtro aplicar
      await athletesPage.waitForLoad();
      
      // Verifica que a busca foi aplicada (URL ou lista filtrada)
      const url = authenticatedPage.url();
      const hasSearchParam = url.includes('search=') || url.includes('q=');
      
      // Ou verifica diretamente na lista
      const listText = await athletesPage.athleteList.textContent();
      
      expect(hasSearchParam || listText?.toLowerCase().includes('marcus')).toBeTruthy();
    });
  });

  test.describe('Adicionar Atleta', () => {
    test('deve abrir formulário de novo atleta', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      
      await athletesPage.openAddAthleteForm();
      
      // Verifica se modal/formulário abriu
      const form = authenticatedPage.locator('form, [role="dialog"]');
      await expect(form).toBeVisible();
    });

    test('deve criar novo atleta com dados válidos', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      
      await athletesPage.openAddAthleteForm();
      
      // Preenche formulário
      const uniqueName = `Atleta Teste ${Date.now()}`;
      await authenticatedPage.getByLabel(/nome/i).fill(uniqueName);
      await authenticatedPage.getByLabel(/faixa|graduação/i).selectOption('azul');
      await authenticatedPage.getByLabel(/peso/i).fill('85');
      
      // Submete
      await authenticatedPage.getByRole('button', { name: /salvar|criar|adicionar/i }).click();
      
      // Aguarda feedback
      await athletesPage.waitForLoad();
      
      // Verifica se atleta aparece na lista
      await athletesPage.expectAthleteInList(uniqueName);
    });

    test('deve validar campos obrigatórios', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      
      await athletesPage.openAddAthleteForm();
      
      // Tenta submeter sem preencher
      await authenticatedPage.getByRole('button', { name: /salvar|criar|adicionar/i }).click();
      
      // Verifica mensagem de erro
      const errorVisible = await authenticatedPage.locator('.error, [role="alert"], .invalid').first().isVisible();
      expect(errorVisible).toBe(true);
    });
  });

  test.describe('Detalhes do Atleta', () => {
    test('deve navegar para detalhes ao clicar no atleta', async ({ authenticatedPage }) => {
      const athletesPage = new AthletesPage(authenticatedPage);
      await athletesPage.goto();
      
      // Clica no primeiro atleta da lista
      const firstAthlete = athletesPage.athleteList.locator('[data-testid="athlete-item"], .athlete-card').first();
      await firstAthlete.click();
      
      // Deve navegar para página de detalhes
      await expect(authenticatedPage).toHaveURL(/athletes\/[a-zA-Z0-9-]+/);
    });
  });
});
