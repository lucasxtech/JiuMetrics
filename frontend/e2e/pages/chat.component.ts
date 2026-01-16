/**
 * Page Object Model - Componente de Chat com IA
 */

import { Page, Locator, expect } from '@playwright/test';

export class ChatComponent {
  readonly page: Page;
  readonly container: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messagesList: Locator;
  readonly loadingIndicator: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="chat-container"], .chat-container, .chat-box');
    this.messageInput = page.getByPlaceholder(/mensagem|pergunt|digite/i).or(page.locator('textarea, input[type="text"]').last());
    this.sendButton = page.getByRole('button', { name: /enviar/i }).or(page.locator('button[type="submit"]'));
    this.messagesList = page.locator('[data-testid="messages-list"], .messages-list, .chat-messages');
    this.loadingIndicator = page.locator('[data-testid="chat-loading"], .chat-loading, .typing-indicator');
    this.closeButton = page.getByRole('button', { name: /fechar|x/i });
  }

  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  async sendMessage(message: string): Promise<void> {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  async waitForResponse(): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 60000 });
  }

  async getMessagesCount(): Promise<number> {
    const messages = this.messagesList.locator('[data-testid="message"], .message, .chat-message');
    return await messages.count();
  }

  async getLastMessage(): Promise<string> {
    const messages = this.messagesList.locator('[data-testid="message"], .message, .chat-message');
    const lastMessage = messages.last();
    return await lastMessage.textContent() || '';
  }

  async expectResponseContains(text: string | RegExp): Promise<void> {
    const lastMessage = await this.getLastMessage();
    if (typeof text === 'string') {
      expect(lastMessage.toLowerCase()).toContain(text.toLowerCase());
    } else {
      expect(lastMessage).toMatch(text);
    }
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
