/**
 * SPEC-006 (R6) — escopo nos caminhos de chat de perfil (AZ-10).
 *
 * Três handlers passavam o `userId` escalar do requisitante onde o resto do
 * sistema passa o escopo resolvido. O efeito não era vazamento — era o
 * contrário: o **admin perdia o acesso** ao dado do próprio grupo, sem
 * nenhum sinal, porque a query simplesmente não casava linha.
 *
 * Nas fixtures, o atleta pertence ao USUÁRIO COMUM do tenant, nunca ao admin —
 * é o que torna estes testes capazes de detectar a regressão.
 */
jest.mock('../../config/supabase', () => require('./support/supabaseMock'));
jest.mock('../../services/geminiService');
jest.mock('../../utils/apiUsageLogger');

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');

const app = loadApp();

describe('SPEC-006 — escopo no chat de perfil técnico', () => {
  let fx;

  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
  });

  describe('POST /api/chat/profile-session', () => {
    it('admin abre sessão de perfil de atleta de membro do grupo', async () => {
      const res = await request(app)
        .post('/api/chat/profile-session')
        .set('Authorization', authHeader(fx.tenantA.admin))
        .send({
          personId: fx.tenantA.athlete.id,
          personType: 'athlete',
          currentSummary: 'resumo atual',
        });

      expect(res.status).toBe(201);
    });

    it('usuário comum não abre sessão de perfil de atleta de outro tenant', async () => {
      const res = await request(app)
        .post('/api/chat/profile-session')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          personId: fx.tenantB.athlete.id,
          personType: 'athlete',
          currentSummary: 'resumo atual',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/chat/profile-save', () => {
    it('admin salva resumo de atleta de membro do grupo SEM transferir a posse', async () => {
      const res = await request(app)
        .post('/api/chat/profile-save')
        .set('Authorization', authHeader(fx.tenantA.admin))
        .send({
          personId: fx.tenantA.athlete.id,
          personType: 'athlete',
          newSummary: 'resumo escrito pelo admin do grupo',
        });

      expect(res.status).toBe(200);

      const stored = supabaseMock.__getFake().store.get('athletes')
        .find(a => a.id === fx.tenantA.athlete.id);
      expect(stored.technical_summary).toBe('resumo escrito pelo admin do grupo');
      // A posse continua com o membro, não migra para o admin que editou
      expect(stored.user_id).toBe(fx.tenantA.user.id);
    });

    it('usuário comum não salva resumo de atleta de outro tenant', async () => {
      const res = await request(app)
        .post('/api/chat/profile-save')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          personId: fx.tenantB.athlete.id,
          personType: 'athlete',
          newSummary: 'invadido',
        });

      expect(res.status).toBe(404);

      const stored = supabaseMock.__getFake().store.get('athletes')
        .find(a => a.id === fx.tenantB.athlete.id);
      expect(stored.technical_summary).toBeNull();
    });
  });

  describe('POST /api/chat/profile-restore', () => {
    it('devolve 404 de pessoa (não erro cru do banco) para atleta de outro tenant', async () => {
      const res = await request(app)
        .post('/api/chat/profile-restore')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          personId: fx.tenantB.athlete.id,
          personType: 'athlete',
          versionNumber: 1,
        });

      expect(res.status).toBe(404);
    });
  });
});
