/**
 * SPEC-009 (R3) — guarda de orçamento de IA.
 *
 * O problema: **um usuário autenticado podia gerar gasto ilimitado, e ninguém
 * veria no painel.** O registro de custo funcionava, mas era só observação —
 * não havia ponto de decisão que barrasse.
 *
 * Por isso as asserções críticas aqui não são sobre o status HTTP: são sobre a
 * IA **não ter sido chamada**. Um 429 depois da inferência não devolve o
 * dinheiro.
 *
 * Decisão P8: orçamento **por tenant**. Os testes de grupo abaixo são o que
 * prova isso — o gasto de um membro conta para o outro.
 */
jest.mock('../config/supabase', () => require('./authorization/support/supabaseMock'));
jest.mock('../services/geminiService');
jest.mock('../services/strategyService');
jest.mock('../utils/apiUsageLogger');

const request = require('supertest');
const supabaseMock = require('./authorization/support/supabaseMock');
const { createFakeSupabase } = require('./authorization/support/fakeSupabase');
const { buildFixtures, authHeader } = require('./authorization/support/fixtures');
const { loadApp } = require('./authorization/support/loadApp');
const geminiService = require('../services/geminiService');
const StrategyService = require('../services/strategyService');
const { AI_BUDGET } = require('../config/ai');

const app = loadApp();

/** Uma linha de api_usage com o custo pedido, no mês corrente. */
const gasto = (userId, custoUsd) => ({
  id: `usage-${userId}-${custoUsd}`,
  user_id: userId,
  model_name: 'gemini-2.5-pro',
  operation_type: 'video_analysis',
  prompt_tokens: 1000,
  completion_tokens: 500,
  estimated_cost_usd: custoUsd,
  created_at: new Date().toISOString(),
});

describe('SPEC-009 (R3) — orçamento de IA por tenant', () => {
  let fx;

  beforeEach(() => {
    jest.clearAllMocks();
    fx = buildFixtures();
    geminiService.analyzeFrame.mockResolvedValue({
      analysis: { summary: 'ok', charts: [], technical_stats: null },
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, modelName: 'gemini-test' },
    });
    geminiService.consolidateAnalyses.mockReturnValue({ charts: [], summary: 'ok', technical_stats: null });
    geminiService.generateAthleteSummary.mockResolvedValue({
      summary: 'ok',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, modelName: 'gemini-test' },
    });
    StrategyService.consolidateAnalyses.mockResolvedValue({ resumo: 'ok', analysesCount: 1 });
    StrategyService.generateStrategy.mockResolvedValue({
      strategy: { resumo_rapido: {} },
      metadata: { athlete: { analysesCount: 1 }, opponent: { analysesCount: 1 }, usage: null, generatedAt: 'x' },
    });
  });

  const semear = (linhasDeGasto = []) => {
    supabaseMock.__setFake(createFakeSupabase({ ...fx.seedRows, api_usage: linhasDeGasto }));
  };

  const analisar = (user) =>
    request(app)
      .post('/api/ai/analyze-link')
      .set('Authorization', authHeader(user))
      .send({
        videos: [{ url: 'https://youtube.com/watch?v=abc' }],
        personId: fx.tenantA.athlete.id,
        personType: 'athlete',
      });

  it('libera quando o gasto do mês está abaixo do limite', async () => {
    semear([gasto(fx.tenantA.user.id, 1.5)]);

    const res = await analisar(fx.tenantA.user);

    expect(res.status).toBe(200);
    expect(geminiService.analyzeFrame).toHaveBeenCalled();
  });

  it('BARRA com 429 quando o limite é atingido — e a IA NÃO é chamada', async () => {
    semear([gasto(fx.tenantA.user.id, AI_BUDGET.monthlyUsdPerTenant)]);

    const res = await analisar(fx.tenantA.user);

    expect(res.status).toBe(429);
    // A asserção que importa: um 429 depois de gastar não resolveria nada.
    expect(geminiService.analyzeFrame).not.toHaveBeenCalled();
  });

  it('o gasto de um MEMBRO do grupo conta para os outros (P8: por tenant)', async () => {
    // O gasto está na conta do usuário comum; quem tenta operar é o admin.
    // Se o orçamento fosse por usuário, o admin passaria.
    semear([gasto(fx.tenantA.user.id, AI_BUDGET.monthlyUsdPerTenant + 10)]);

    const res = await analisar(fx.tenantA.admin);

    expect(res.status).toBe(429);
    expect(geminiService.analyzeFrame).not.toHaveBeenCalled();
  });

  it('o gasto de OUTRO tenant não afeta este grupo', async () => {
    semear([gasto(fx.tenantB.user.id, AI_BUDGET.monthlyUsdPerTenant * 5)]);

    const res = await analisar(fx.tenantA.user);

    expect(res.status).toBe(200);
  });

  it('gasto de meses anteriores não conta no período corrente', async () => {
    const antigo = gasto(fx.tenantA.user.id, AI_BUDGET.monthlyUsdPerTenant * 3);
    antigo.created_at = '2025-01-15T10:00:00.000Z';
    semear([antigo]);

    const res = await analisar(fx.tenantA.user);

    expect(res.status).toBe(200);
  });

  it('barra também os outros endpoints que disparam IA', async () => {
    semear([gasto(fx.tenantA.user.id, AI_BUDGET.monthlyUsdPerTenant)]);

    const resumo = await request(app)
      .post('/api/ai/athlete-summary')
      .set('Authorization', authHeader(fx.tenantA.user))
      .send({ athleteId: fx.tenantA.athlete.id });

    const estrategia = await request(app)
      .post('/api/strategy/compare')
      .set('Authorization', authHeader(fx.tenantA.user))
      .send({ athleteId: fx.tenantA.athlete.id, opponentId: fx.tenantA.opponent.id });

    expect(resumo.status).toBe(429);
    expect(estrategia.status).toBe(429);
    expect(geminiService.generateAthleteSummary).not.toHaveBeenCalled();
    expect(StrategyService.generateStrategy).not.toHaveBeenCalled();
  });

  it('NÃO barra leitura — listar histórico não gasta orçamento', async () => {
    semear([gasto(fx.tenantA.user.id, AI_BUDGET.monthlyUsdPerTenant * 10)]);

    const res = await request(app)
      .get('/api/strategy/analyses')
      .set('Authorization', authHeader(fx.tenantA.user));

    expect(res.status).toBe(200);
  });

  describe('quando o orçamento não pode ser verificado', () => {
    it('libera a operação em vez de derrubá-la', async () => {
      // Sem a tabela `api_usage` no fake, a consulta falha. Preferir
      // indisponibilidade certa a risco financeiro seria a troca errada.
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
      jest.spyOn(console, 'error').mockImplementation();

      const res = await analisar(fx.tenantA.user);

      expect(res.status).toBe(200);
    });
  });
});
