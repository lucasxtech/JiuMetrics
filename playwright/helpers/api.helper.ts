/**
 * API Helper - Utilitários para interação com API nos testes
 */

import { Page, APIRequestContext } from '@playwright/test';

export class ApiHelper {
  private request: APIRequestContext;
  private baseUrl: string;

  constructor(request: APIRequestContext, baseUrl: string = 'http://localhost:5050') {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  /**
   * Cria um atleta via API
   */
  async createAthlete(data: Record<string, unknown>, token?: string): Promise<unknown> {
    const response = await this.request.post(`${this.baseUrl}/api/athletes`, {
      data,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.json();
  }

  /**
   * Cria um oponente via API
   */
  async createOpponent(data: Record<string, unknown>, token?: string): Promise<unknown> {
    const response = await this.request.post(`${this.baseUrl}/api/opponents`, {
      data,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.json();
  }

  /**
   * Deleta um atleta via API
   */
  async deleteAthlete(id: string, token?: string): Promise<void> {
    await this.request.delete(`${this.baseUrl}/api/athletes/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  /**
   * Deleta um oponente via API
   */
  async deleteOpponent(id: string, token?: string): Promise<void> {
    await this.request.delete(`${this.baseUrl}/api/opponents/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  /**
   * Aguarda resposta específica da API
   */
  static async waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 10000): Promise<void> {
    await page.waitForResponse(
      response => {
        const url = response.url();
        return typeof urlPattern === 'string'
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout }
    );
  }
}
