/**
 * Spec 014 (identity) — R4/R5: prova de que os endpoints existentes herdam
 * o escopo resolvido em `resolveScope(req.actor)` (tasks 3 e 4 desta spec).
 *
 * Não é esperado código de produção novo: se algum destes testes falhar, o
 * endpoint correspondente tem um caminho que não passa por `resolveScope` e
 * precisa ser corrigido no controller (ver CLAUDE.md, seção Authorization).
 *
 * Rotas reais usadas (confirmadas em `server/src/routes/*.js` e
 * `server/index.js` antes de escrever este teste, não as do rascunho da
 * brief):
 *  - GET /api/athletes            → controllers/personController.js#getAll
 *  - GET /api/athletes/:id        → controllers/personController.js#getById
 *  - GET /api/fight-analysis/person/:personId
 *      → controllers/fightAnalysisController.js#getAnalysesByPerson
 *  - GET /api/strategy/analyses   → controllers/strategyController.js#listAnalyses
 *      (NÃO `/api/strategy` — essa rota não existe; ver routes/strategy.js)
 *  - GET /api/admin/users         → routes/admin.js (authMiddleware + adminMiddleware)
 *
 * Revisão final da spec 014 (I5) — R4 cobre também versões e chat. Rotas
 * reais, de `routes/chatRoutes.js` (montado em `/api/chat`):
 *  - GET /api/chat/versions/:analysisId            → chatAnalysisController#getVersions
 *      (posse derivada da análise pai; fora do escopo → 404)
 *  - GET /api/chat/session/:id                     → chatSessionController#getSession
 *      (`ChatSession.getById(id, req.userId)`; de outro → 404)
 *  - GET /api/chat/sessions/:contextType/:contextId → chatSessionController#getSessionsByContext
 *      (filtra por `req.userId`; de outro → 200 com lista vazia, nunca 404)
 *  - GET /api/chat/profile-versions/:personType/:personId → chatProfileController#getProfileVersions
 *      (filtra por `req.userId`; de outro → 200 com lista vazia, nunca 404)
 * Os dois últimos NÃO devolvem 404 — o status é fixado no comportamento real,
 * como no teste de `/api/fight-analysis/person` acima; o que se prova é que a
 * linha semeada do outro atleta não aparece.
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

const app = loadApp();

describe('Spec 014 — atleta vs staff nos endpoints existentes (R4, R5)', () => {
  let fx;
  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
  });

  test('atleta lista só as próprias fichas', async () => {
    const res = await request(app).get('/api/athletes').set('Authorization', authHeader(fx.tenantA.athlete2));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((a) => a.id);
    expect(ids).toEqual([fx.tenantA.athlete2Row.id]);
  });

  test('atleta recebe 404 na ficha de outro atleta do mesmo tenant', async () => {
    const res = await request(app)
      .get(`/api/athletes/${fx.tenantA.athlete.id}`)
      .set('Authorization', authHeader(fx.tenantA.athlete2));
    expect(res.status).toBe(404);
  });

  // fightAnalysisController.getAnalysesByPerson (server/src/controllers/
  // fightAnalysisController.js:82-90) não valida se `personId` está no
  // escopo — resolve o escopo e delega o filtro a
  // FightAnalysis.getByPersonId(personId, allowedUserIds), que faz
  // `.eq('person_id', personId).in('user_id', ids)` (models/FightAnalysis.js:56-73).
  // Como a análise fixture pertence a `fx.tenantA.user` (não a `athlete2`),
  // o filtro por `user_id` não bate e o resultado é uma lista vazia com 200,
  // nunca 404. Por isso o status é fixado em 200, não `[200, 404]`.
  test('atleta não vê análises de vídeo de outro atleta do mesmo tenant', async () => {
    const res = await request(app)
      .get(`/api/fight-analysis/person/${fx.tenantA.athlete.id}`)
      .set('Authorization', authHeader(fx.tenantA.athlete2));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('atleta não lista estratégias de outro atleta do mesmo tenant', async () => {
    const res = await request(app)
      .get('/api/strategy/analyses')
      .set('Authorization', authHeader(fx.tenantA.athlete2));
    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map((s) => s.id);
    expect(ids).not.toContain(fx.tenantA.tacticalAnalysis.id);
  });

  test('fisioterapeuta com role=user lista as fichas do tenant inteiro', async () => {
    const res = await request(app).get('/api/athletes').set('Authorization', authHeader(fx.tenantA.physio));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((a) => a.id).sort();
    expect(ids).toEqual([fx.tenantA.athlete.id, fx.tenantA.athlete2Row.id].sort());
    expect(ids).not.toContain(fx.tenantB.athlete.id);
  });

  test('fisioterapeuta com role=user não acessa /api/admin/users', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', authHeader(fx.tenantA.physio));
    expect(res.status).toBe(403);
  });

  // ─── R4 em versões e chat (revisão final, I5) ─────────────────────────────
  test('atleta recebe 404 nas versões de uma análise de outro atleta do mesmo tenant', async () => {
    const res = await request(app)
      .get(`/api/chat/versions/${fx.tenantA.fightAnalysis.id}`)
      .set('Authorization', authHeader(fx.tenantA.athlete2));
    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();
  });

  test('controle: staff do tenant lê as versões da mesma análise (o 404 acima é escopo, não rota quebrada)', async () => {
    const res = await request(app)
      .get(`/api/chat/versions/${fx.tenantA.fightAnalysis.id}`)
      .set('Authorization', authHeader(fx.tenantA.physio));
    expect(res.status).toBe(200);
    expect(res.body.data.map((v) => v.id)).toEqual([fx.tenantA.version.id]);
  });

  test('atleta recebe 404 na sessão de chat de outro atleta do mesmo tenant', async () => {
    const res = await request(app)
      .get(`/api/chat/session/${fx.tenantA.chatSession.id}`)
      .set('Authorization', authHeader(fx.tenantA.athlete2));
    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();
  });

  test('atleta não lista as sessões de chat da análise de outro atleta do mesmo tenant', async () => {
    const res = await request(app)
      .get(`/api/chat/sessions/analysis/${fx.tenantA.fightAnalysis.id}`)
      .set('Authorization', authHeader(fx.tenantA.athlete2));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('atleta não lê as versões de perfil técnico de outro atleta do mesmo tenant', async () => {
    const pvDoUser = {
      id: 'pv-do-user', person_id: fx.tenantA.athlete.id, person_type: 'athlete', user_id: fx.tenantA.user.id,
      version_number: 1, content: 'perfil', is_current: true, created_at: new Date().toISOString(),
    };
    supabaseMock.__setFake(createFakeSupabase({ ...fx.seedRows, profile_versions: [pvDoUser] }));

    const res = await request(app)
      .get(`/api/chat/profile-versions/athlete/${fx.tenantA.athlete.id}`)
      .set('Authorization', authHeader(fx.tenantA.athlete2));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);

    // controle: o dono vê a linha semeada — a lista vazia acima é escopo
    const own = await request(app)
      .get(`/api/chat/profile-versions/athlete/${fx.tenantA.athlete.id}`)
      .set('Authorization', authHeader(fx.tenantA.user));
    expect(own.status).toBe(200);
    expect(own.body.data).toHaveLength(1);
  });
});
