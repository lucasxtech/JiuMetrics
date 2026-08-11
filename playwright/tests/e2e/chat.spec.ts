/**
 * Testes E2E - Chat com IA
 */

import { test, expect } from '../../fixtures';
import { ChatComponent, AthleteDetailPage } from '../../pages';

test.describe('Chat com IA', () => {
  
  test.describe('Disponibilidade', () => {
    test('deve ter botão de chat na página de detalhes do atleta', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      // Deve ter atletas para clicar
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      
      await firstCard.click();
      
      const detailPage = new AthleteDetailPage(authenticatedPage);
      await detailPage.waitForLoad();
      
      // VALIDAÇÃO REAL: O botão de chat DEVE existir
      const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia|conversar|perguntar/i });
      await expect(chatButton).toBeVisible();
    });
  });

  test.describe('Interface', () => {
    test('deve abrir container de chat ao clicar no botão', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();
      
      const detailPage = new AthleteDetailPage(authenticatedPage);
      await detailPage.waitForLoad();
      
      const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia|conversar/i });
      await expect(chatButton).toBeVisible();
      await chatButton.click();
      
      // VALIDAÇÃO REAL: Chat DEVE abrir
      const chat = new ChatComponent(authenticatedPage);
      await expect(chat.container).toBeVisible();
    });

    test('deve ter campo de input para mensagem', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();
      
      const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia/i });
      await expect(chatButton).toBeVisible();
      await chatButton.click();
      
      // VALIDAÇÃO REAL: Input DEVE estar visível
      const chat = new ChatComponent(authenticatedPage);
      await expect(chat.messageInput).toBeVisible();
      await expect(chat.messageInput).toBeEnabled();
    });

    test('deve ter botão de enviar', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();
      
      const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia/i });
      await expect(chatButton).toBeVisible();
      await chatButton.click();
      
      // VALIDAÇÃO REAL: Botão de enviar DEVE existir
      const chat = new ChatComponent(authenticatedPage);
      await expect(chat.sendButton).toBeVisible();
      await expect(chat.sendButton).toBeEnabled();
    });
  });

  test.describe('Interação com IA', () => {
    test('deve enviar mensagem e receber resposta da IA', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();
      
      const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia/i });
      await expect(chatButton).toBeVisible();
      await chatButton.click();
      
      const chat = new ChatComponent(authenticatedPage);
      await expect(chat.messageInput).toBeVisible();
      
      // Envia mensagem
      const testMessage = 'Qual é o estilo de luta deste atleta?';
      await chat.messageInput.fill(testMessage);
      await expect(chat.messageInput).toHaveValue(testMessage);
      
      // Clica em enviar
      await chat.sendButton.click();
      
      // VALIDAÇÃO REAL: Aguarda resposta da IA (timeout maior pois é API externa)
      const messages = authenticatedPage.locator('[data-testid="chat-message"], .chat-message, .message');
      await expect(messages).toHaveCount(2, { timeout: 30000 }); // 1 pergunta + 1 resposta
      
      // Verifica que a mensagem do usuário apareceu
      await expect(messages.first()).toContainText(testMessage);
      
      // Verifica que a IA respondeu (não pode ser vazio)
      const aiResponse = messages.last();
      await expect(aiResponse).toBeVisible();
      const responseText = await aiResponse.textContent();
      expect(responseText).toBeTruthy();
      expect(responseText!.length).toBeGreaterThan(10); // Resposta com conteúdo real
    });

    test('deve desabilitar botão durante envio', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();
      
      const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia/i });
      await expect(chatButton).toBeVisible();
      await chatButton.click();
      
      const chat = new ChatComponent(authenticatedPage);
      
      await chat.messageInput.fill('Teste');
      await chat.sendButton.click();
      
      // VALIDAÇÃO REAL: Botão deve ficar desabilitado durante o processamento
      await expect(chat.sendButton).toBeDisabled({ timeout: 1000 });
    });
  });
});
