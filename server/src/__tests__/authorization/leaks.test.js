/**
 * Testes de vazamento de autorização — os 6 pontos sem verificação de posse
 * que a auditoria encontrou (AZ-2..AZ-7 de docs/AUTHORIZATION.md).
 *
 * ✅ Todos PASSAM desde a spec 006, que fechou os 6 vazamentos. Foram escritos
 * na spec 004 com `test.failing()` e **verificados falhando** antes de
 * qualquer correção existir — é por isso que provam algo: um teste que nunca
 * falhou não prova nada. Cada correção da spec 006 inverteu o seu
 * `test.failing` para `test` no mesmo commit.
 *
 * São, daqui para a frente, testes de REGRESSÃO: se algum voltar a falhar, um
 * vazamento cross-tenant foi reintroduzido. Eles bloqueiam merge (o job
 * `backend-tests` não tem `continue-on-error` desde a spec 003).
 *
 * Nível: API real (supertest) + fake de PostgREST (decisão P2) + models e
 * services/authorization REAIS — os mesmos que os testes de controller
 * existentes mockam, o que é exatamente por que eles nunca pegariam esses bugs.
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

describe('Vazamentos de autorização — fechados na spec 006 (regressão)', () => {
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

  // AZ-2 — manualEdit usava FightAnalysis.getById (variante SEM filtro de
  // usuário) e um update que também não filtrava. Fechado na spec 006.
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

  // AZ-3 — getVersions chamava AnalysisVersion.getByAnalysisId sem checar a
  // quem a análise pai pertencia (a tabela não tem user_id). A spec 006 fez a
  // autorização derivar da análise pai (decisão P4).
  test('AZ-3 — GET /api/chat/versions/:analysisId não deve ler versões de análise de outro tenant', async () => {
    const res = await request(app)
      .get(`/api/chat/versions/${fx.tenantB.fightAnalysis.id}`)
      .set('Authorization', authHeader(fx.tenantA.user));

    expect(res.status).toBe(404);
  });

  // AZ-4 — restoreVersion não verificava posse em ponto algum, e escreve
  // duas vezes (a análise e o ponteiro de versão atual).
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

  // AZ-5 — applyEdit escopava `analysisId` corretamente mas confiava
  // cegamente no `sessionId` do corpo: updateContextSnapshot não recebia nem
  // filtrava por userId. Hoje exige o dono, e um sessionId alheio é ignorado
  // com aviso — sem desfazer a edição da própria análise.
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

  // AZ-6 — analyzeLink criava a FightAnalysis com o personId recebido no
  // corpo sem checar se pertencia ao escopo do requisitante. Hoje a validação
  // acontece ANTES das chamadas de IA.
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

  // AZ-7 — generateAthleteSummary aceitava `athleteData` bruto do corpo, sem
  // noção de posse: não havia "dado alheio" a ler porque o endpoint não
  // buscava nada — o próprio contrato era o problema. Hoje recebe `athleteId`
  // e carrega no servidor. Contrato completo em athleteSummary.test.js.
  test('AZ-7 — POST /api/ai/athlete-summary não deve aceitar corpo arbitrário sem posse', async () => {
    const res = await request(app)
      .post('/api/ai/athlete-summary')
      .set('Authorization', authHeader(fx.tenantA.user))
      .send({ athleteData: { name: 'Atleta fabricado no corpo da requisição', belt: 'Preta' } });

    expect(res.status).toBe(400);
  });
});
