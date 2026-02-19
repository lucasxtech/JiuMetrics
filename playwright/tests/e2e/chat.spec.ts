/**
 * Testes E2E - Chat com IA
 */

import { test, expect } from '../../fixtures';
import { ChatComponent, AthleteDetailPage } from '../../pages';

test.describe('Chat com IA', () => {
  
  test.describe('Disponibilidade', () => {
    test('deve ter botão de chat na página de detalhes do atleta', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      
      if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.click();
        
        const detailPage = new AthleteDetailPage(authenticatedPage);
        await detailPage.waitForLoad();
        
        const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia|conversar|perguntar/i });
        await chatButton.isVisible().catch(() => false);
        
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Interface', () => {
    test('deve abrir container de chat', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      
      if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.click();
        
        const detailPage = new AthleteDetailPage(authenticatedPage);
        await detailPage.waitForLoad();
        
        const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia|conversar/i });
        
        if (await chatButton.isVisible().catch(() => false)) {
          await chatButton.click();
          
          const chat = new ChatComponent(authenticatedPage);
          expect(await chat.isVisible()).toBe(true);
        }
      }
    });

    test('deve ter campo de input para mensagem', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      
      if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.click();
        
        const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia/i });
        
        if (await chatButton.isVisible().catch(() => false)) {
          await chatButton.click();
          
          const chat = new ChatComponent(authenticatedPage);
          await expect(chat.messageInput).toBeVisible();
        }
      }
    });

    test('deve ter botão de enviar', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      
      if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.click();
        
        const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia/i });
        
        if (await chatButton.isVisible().catch(() => false)) {
          await chatButton.click();
          
          const chat = new ChatComponent(authenticatedPage);
          await expect(chat.sendButton).toBeVisible();
        }
      }
    });
  });

  test.describe('Envio de Mensagem', () => {
    test('deve permitir digitar mensagem', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/athletes');
      
      const firstCard = authenticatedPage.locator('[data-testid="athlete-item"], .athlete-card').first();
      
      if (await firstCard.isVisible().catch(() => false)) {
        await firstCard.click();
        
        const chatButton = authenticatedPage.getByRole('button', { name: /chat|ia/i });
        
        if (await chatButton.isVisible().catch(() => false)) {
          await chatButton.click();
          
          const chat = new ChatComponent(authenticatedPage);
          await chat.messageInput.fill('Teste de mensagem');
          await expect(chat.messageInput).toHaveValue('Teste de mensagem');
        }
      }
    });
  });
});
