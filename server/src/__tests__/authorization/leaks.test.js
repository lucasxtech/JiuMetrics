/**
 * SPEC-004 — Testes de vazamento (R1): devem FALHAR hoje, comprovando os 6
 * pontos sem verificação de posse listados em docs/AUTHORIZATION.md e na
 * spec (specs/004-authorization-safety-net/spec.md). Nenhuma correção é
 * feita nesta spec — a correção é escopo da spec 006.
 *
 * Usamos `test.failing()` (suportado desde o Jest 29): o Jest reporta cada
 * um desses testes como "falha esperada" e o `npm test` continua saindo com
 * código 0, então o CI (bloqueante desde a spec 003) não trava. Se algum
 * destes começar a PASSAR sem que a spec 006 tenha rodado, `test.failing`
 * vira o sinal — o teste passa a ser reportado como falho, porque a falha
 * deixou de acontecer. Nunca use `skip` aqui: um teste pulado é invisível.
 *
 * Nível: API real (supertest) + fake de PostgREST (decisão P2) + models e
 * utils/tenantScope REAIS — os mesmos que os testes de controller existentes
 * mockam, o que é exatamente por que eles nunca pegariam esses bugs.
 */
jest.mock('../../config/supabase', () => require('./support/supabaseMock'));
jest.mock('../../services/geminiService');
jest.mock('../../services/strategyService');
jest.mock('../../models/ApiUsage');
jest.mock('../../utils/apiUsageLogger');

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');
const geminiService = require('../../services/geminiService');
const StrategyService = require('../../services/strategyService');

const app = loadApp();

describe('SPEC-004 — vazamentos de autorização (devem FALHAR hoje)', () => {
  let fx;

  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));

    geminiService.analyzeFrame.mockResolvedValue({
      analysis: { summary: 'Análise fictícia', charts: [], technical_stats: null },
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20, modelName: 'gemini-test' },
    });
    geminiService.consolidateAnalyses.mockReturnValue({
      charts: [],
      summary: 'Consolidado fictício',
      technical_stats: null,
    });
    geminiService.generateAthleteSummary.mockResolvedValue({
      summary: 'Resumo fictício',
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10, modelName: 'gemini-test' },
    });
    StrategyService.consolidateAnalyses.mockResolvedValue({ resumo: 'ok', analysesCount: 1 });
  });

  // AZ-2 — docs/AUTHORIZATION.md — chatController.manualEdit usa
  // FightAnalysis.getById/update, nenhum dos dois filtra por usuário.
  test('AZ-2 — POST /api/chat/manual-edit não deve sobrescrever análise de outro tenant', async () => {
    const res = await request(app)
      .post('/api/chat/manual-edit')
      .set('Authorization', authHeader(fx.tenantA.user))
      .send({
        analysisId: fx.tenantB.fightAnalysis.id,
        field: 'summary',
        newValue: 'HACKED — editado por usuário de outro tenant',
      });

    expect(res.status).toBe(404);

    const stored = supabaseMock
      .__getFake()
      .store.get('fight_analyses')
      .find((a) => a.id === fx.tenantB.fightAnalysis.id);
    expect(stored.summary).toBe(fx.tenantB.fightAnalysis.summary);
  });

  // AZ-3 — chatController.getVersions chama AnalysisVersion.getByAnalysisId
  // sem checar a quem a análise pai pertence (a tabela nem tem user_id).
  test('AZ-3 — GET /api/chat/versions/:analysisId não deve ler versões de análise de outro tenant', async () => {
    const res = await request(app)
      .get(`/api/chat/versions/${fx.tenantB.fightAnalysis.id}`)
      .set('Authorization', authHeader(fx.tenantA.user));

    expect(res.status).toBe(404);
  });

  // AZ-4 — chatController.restoreVersion não verifica posse antes de
  // restaurar/escrever na análise.
  test('AZ-4 — POST /api/chat/restore-version não deve reverter análise de outro tenant', async () => {
    const res = await request(app)
      .post('/api/chat/restore-version')
      .set('Authorization', authHeader(fx.tenantA.user))
      .send({
        analysisId: fx.tenantB.fightAnalysis.id,
        versionNumber: fx.tenantB.version.version_number,
      });

    expect(res.status).toBe(404);
  });

  // AZ-5 — chatController.applyEdit escopa `analysisId` corretamente (via
  // getScopeIds + getByIdAndUser) mas confia cegamente em `sessionId`:
  // ChatSession.updateContextSnapshot não recebe nem filtra por userId.
  test('AZ-5 — POST /api/chat/apply-edit não deve alterar context_snapshot de sessão de outro tenant', async () => {
    const res = await request(app)
      .post('/api/chat/apply-edit')
      .set('Authorization', authHeader(fx.tenantA.user))
      .send({
        analysisId: fx.tenantA.fightAnalysis.id, // a própria análise de A — só o sessionId é alheio
        sessionId: fx.tenantB.chatSession.id,
        editSuggestion: { field: 'summary', newValue: 'sugestão de IA aplicada por A' },
      });

    expect(res.status).toBe(200); // a edição da própria análise deve funcionar

    const session = supabaseMock
      .__getFake()
      .store.get('ai_chat_sessions')
      .find((s) => s.id === fx.tenantB.chatSession.id);
    expect(session.context_snapshot).toEqual(fx.tenantB.chatSession.context_snapshot);
  });

  // AZ-6 — linkController.analyzeLink cria a FightAnalysis com o personId
  // recebido no corpo sem checar se ele pertence ao escopo do requisitante.
  test('AZ-6 — POST /api/ai/analyze-link não deve criar análise vinculada a atleta de outro tenant', async () => {
    const res = await request(app)
      .post('/api/ai/analyze-link')
      .set('Authorization', authHeader(fx.tenantA.user))
      .send({
        videos: [{ url: 'https://youtube.com/watch?v=fixture-leak-test' }],
        personId: fx.tenantB.athlete.id,
        personType: 'athlete',
      });

    expect(res.status).toBe(404);

    const leaked = supabaseMock
      .__getFake()
      .store.get('fight_analyses')
      .find((a) => a.person_id === fx.tenantB.athlete.id && a.user_id === fx.tenantA.user.id);
    expect(leaked).toBeUndefined();
  });

  // AZ-7 — aiController.generateAthleteSummary aceita `athleteData` bruto do
  // corpo, sem personId nem noção de posse — não há "dado alheio" a ler,
  // o próprio contrato do endpoint é o problema.
  test.failing('AZ-7 — POST /api/ai/athlete-summary não deve aceitar corpo arbitrário sem posse', async () => {
    const res = await request(app)
      .post('/api/ai/athlete-summary')
      .set('Authorization', authHeader(fx.tenantA.user))
      .send({ athleteData: { name: 'Atleta fabricado no corpo da requisição', belt: 'Preta' } });

    expect(res.status).toBe(400);
  });
});
