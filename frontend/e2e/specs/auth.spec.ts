/**
 * Testes E2E - Fluxo de Autenticação
 */

import { test, expect } from '../fixtures';
import { LoginPage } from '../pages';

test.describe('Autenticação', () => {
  test.describe('Login', () => {
    test('deve exibir página de login corretamente', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.expectToBeOnLoginPage();
    });

    test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      await loginPage.login('email@invalido.com', 'senhaerrada');
      
      await loginPage.expectErrorMessage(/credenciais|inválid|incorret/i);
    });

    test('deve validar campo de email', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      await loginPage.emailInput.fill('emailinvalido');
      await loginPage.passwordInput.fill('qualquersenha');
      await loginPage.submitButton.click();
      
      // Verifica validação HTML5 ou mensagem customizada
      const isInvalid = await loginPage.emailInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      );
      expect(isInvalid).toBe(true);
    });

    test('deve exigir senha', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      await loginPage.emailInput.fill('test@example.com');
      await loginPage.submitButton.click();
      
      // Verifica que não redirecionou
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Logout', () => {
    test('deve fazer logout corretamente', async ({ authenticatedPage }) => {
      // Procura e clica no botão de logout (pode estar em menu)
      const logoutButton = authenticatedPage.getByRole('button', { name: /sair|logout/i });
      
      // Se não encontrar direto, tenta abrir menu do usuário primeiro
      const userMenu = authenticatedPage.locator('[data-testid="user-menu"], .user-menu');
      if (await userMenu.isVisible()) {
        await userMenu.click();
      }
      
      await logoutButton.click();
      
      // Deve redirecionar para login
      await expect(authenticatedPage).toHaveURL(/login/);
    });
  });

  test.describe('Proteção de Rotas', () => {
    test('deve redirecionar usuário não autenticado para login', async ({ page }) => {
      // Tenta acessar página protegida
      await page.goto('/athletes');
      
      // Deve redirecionar para login
      await expect(page).toHaveURL(/login/);
    });

    test('deve redirecionar para página original após login', async ({ page }) => {
      // Tenta acessar página protegida
      await page.goto('/athletes');
      
      // Deve estar no login
      await expect(page).toHaveURL(/login/);
      
      // Faz login
      const loginPage = new LoginPage(page);
      await loginPage.loginAndWaitForRedirect(
        process.env.TEST_USER_EMAIL || 'test@example.com',
        process.env.TEST_USER_PASSWORD || 'testpassword123'
      );
      
      // Deve ir para athletes (ou redirect original)
      await expect(page).toHaveURL(/athletes|overview/);
    });
  });
});
