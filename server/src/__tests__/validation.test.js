/**
 * SPEC-007 (item 4, R7/R8) — validação de entrada nos endpoints de IA.
 *
 * O que estes testes protegem é dinheiro e prompt: cada vídeo em `videos[]` é
 * uma chamada de IA paga, num laço que não tinha teto, e `athlete-summary`
 * serializava o corpo inteiro no prompt.
 *
 * Por isso as asserções não param no status: verificam que a IA **não foi
 * chamada**. Um 400 depois de gastar tokens não resolveria o problema.
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
const { MAX_VIDEOS_POR_ANALISE } = require('../schemas/requests/ai');

const app = loadApp();

const videoValido = (i) => ({ url: `https://youtube.com/watch?v=video${i}`, giColor: 'preto' });

describe('SPEC-007 — validação de entrada', () => {
  let fx;

  beforeEach(() => {
    // Sem isto, as contagens de chamada acumulam entre casos e as asserções
    // "a IA NÃO foi chamada" viram falso-negativo.
    jest.clearAllMocks();
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
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
  });

  describe('R8 — teto de vídeos por análise', () => {
    it(`rejeita ${MAX_VIDEOS_POR_ANALISE + 1} vídeos com 400 e SEM chamar a IA`, async () => {
      const videos = Array.from({ length: MAX_VIDEOS_POR_ANALISE + 1 }, (_, i) => videoValido(i));

      const res = await request(app)
        .post('/api/ai/analyze-link')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ videos, personId: fx.tenantA.athlete.id, personType: 'athlete' });

      expect(res.status).toBe(400);
      expect(geminiService.analyzeFrame).not.toHaveBeenCalled();
      expect(res.body.issues[0].campo).toBe('videos');
      expect(res.body.issues[0].mensagem).toMatch(/chamada de IA paga/);
    });

    it(`aceita exatamente ${MAX_VIDEOS_POR_ANALISE} vídeos`, async () => {
      const videos = Array.from({ length: MAX_VIDEOS_POR_ANALISE }, (_, i) => videoValido(i));

      const res = await request(app)
        .post('/api/ai/analyze-link')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ videos, personId: fx.tenantA.athlete.id, personType: 'athlete' });

      expect(res.status).toBe(200);
      expect(geminiService.analyzeFrame).toHaveBeenCalledTimes(MAX_VIDEOS_POR_ANALISE);
    });

    it('rejeita videos[] vazio sem chamar a IA', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-link')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ videos: [] });

      expect(res.status).toBe(400);
      expect(geminiService.analyzeFrame).not.toHaveBeenCalled();
    });

    it('rejeita vídeo sem url', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-link')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ videos: [{ giColor: 'azul' }] });

      expect(res.status).toBe(400);
      expect(res.body.issues[0].campo).toBe('videos.0.url');
      expect(geminiService.analyzeFrame).not.toHaveBeenCalled();
    });
  });

  describe('campos não declarados são removidos antes do controller', () => {
    it('athlete-summary: `athleteData` do formato antigo não sobrevive ao schema', async () => {
      const res = await request(app)
        .post('/api/ai/athlete-summary')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          athleteId: fx.tenantA.athlete.id,
          athleteData: { name: 'INJETADO', analyses: [{ summary: 'conteúdo do cliente' }] },
        });

      expect(res.status).toBe(200);
      const [athleteData] = geminiService.generateAthleteSummary.mock.calls[0];
      expect(JSON.stringify(athleteData)).not.toContain('INJETADO');
      expect(JSON.stringify(athleteData)).not.toContain('conteúdo do cliente');
    });

    it('analyze-link: campo desconhecido não chega ao controller', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-link')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          videos: [videoValido(1)],
          personId: fx.tenantA.athlete.id,
          personType: 'athlete',
          userId: fx.tenantB.user.id, // tentativa de forjar o dono
        });

      expect(res.status).toBe(200);
      const analises = supabaseMock.__getFake().store.get('fight_analyses');
      const criada = analises.find((a) => a.person_id === fx.tenantA.athlete.id && a.summary === 'ok');
      expect(criada.user_id).toBe(fx.tenantA.user.id);
    });
  });

  describe('formato do erro', () => {
    it('devolve campo e mensagem, sem stack nem detalhe interno', async () => {
      const res = await request(app)
        .post('/api/ai/consolidate-profile')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ personId: fx.tenantA.athlete.id, personType: 'inventado' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'Dados inválidos',
        issues: [{ campo: 'personType', mensagem: 'personType deve ser "athlete" ou "opponent"' }],
      });
      expect(JSON.stringify(res.body)).not.toMatch(/stack|node_modules/i);
    });

    it('consolidate-profile sem personId → 400 antes de qualquer consulta', async () => {
      const res = await request(app)
        .post('/api/ai/consolidate-profile')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ personType: 'athlete' });

      expect(res.status).toBe(400);
      expect(StrategyService.consolidateAnalyses).not.toHaveBeenCalled();
    });
  });
});
