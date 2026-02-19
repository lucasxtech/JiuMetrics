/**
 * LoginPage - Página de autenticação
 */

import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;

  constructor(page: import('@playwright/test').Page) {
    super(page);
    this.emailInput = page.getByPlaceholder('seu@email.com');
    this.passwordInput = page.getByPlaceholder('••••••••');
    this.submitButton = page.getByRole('button', { name: /entrar/i });
    this.registerLink = page.getByRole('link', { name: /cadastr/i });
  }

  protected get route(): string {
    return '/login';
  }

  async expectPageVisible(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
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
   * Realiza login e aguarda redirecionamento
   */
  async loginAndWaitForRedirect(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await this.page.waitForURL(/\/(overview|dashboard|athletes)/);
  }

  /**
   * Verifica mensagem de erro de login
   */
  async expectErrorMessage(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }
}
