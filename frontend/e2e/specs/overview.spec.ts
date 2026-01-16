/**
 * Testes E2E - Overview/Dashboard
 */

import { test, expect } from '../fixtures';
import { OverviewPage } from '../pages';

test.describe('Overview', () => {
  test('deve exibir página de overview após login', async ({ authenticatedPage }) => {
    const overviewPage = new OverviewPage(authenticatedPage);
    // O fixture já faz login e vai para a home
    await overviewPage.expectPageVisible();
  });

  test('deve exibir cards de funcionalidades', async ({ authenticatedPage }) => {
    const overviewPage = new OverviewPage(authenticatedPage);
    await overviewPage.expectFeaturesVisible();
  });

  test('deve navegar para página de atletas', async ({ authenticatedPage }) => {
    const overviewPage = new OverviewPage(authenticatedPage);
    await overviewPage.navigateToAthletes();
  });

  test('deve navegar para página de adversários', async ({ authenticatedPage }) => {
    const overviewPage = new OverviewPage(authenticatedPage);
    await overviewPage.navigateToOpponents();
  });

  test('deve navegar para página de análise de vídeo', async ({ authenticatedPage }) => {
    const overviewPage = new OverviewPage(authenticatedPage);
    await overviewPage.navigateToVideoAnalysis();
  });
});
