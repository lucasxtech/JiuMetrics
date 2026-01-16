/**
 * Page Object Model - Página de Login
 * 
 * Encapsula interações com a página de login para reutilização
 */

import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Senha');
    this.submitButton = page.getByRole('button', { name: /entrar/i });
    this.errorMessage = page.locator('[role="alert"], .error-message');
    this.registerLink = page.getByRole('link', { name: /cadastr/i });
  }

  /**
   * Navega para a página de login
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /**
   * Realiza login com credenciais
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Verifica se está na página de login
   */
  async expectToBeOnLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Verifica mensagem de erro
   */
  async expectErrorMessage(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  /**
   * Realiza login e aguarda redirecionamento
   */
  async loginAndWaitForRedirect(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.page.waitForURL(/\/(overview|dashboard|athletes)/);
  }
}
