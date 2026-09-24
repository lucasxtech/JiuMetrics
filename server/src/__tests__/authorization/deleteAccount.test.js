jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');

const app = loadApp();
const store = (t) => supabaseMock.__getFake().store.get(t) || [];

describe('Spec 014 — exclusão total da conta (R7)', () => {
  let fx, admin, target, fichaDeOutro;
  beforeEach(() => {
    fx = buildFixtures();
    target = fx.tenantA.user;
    // ficha criada pelo admin do tenant mas vinculada à conta alvo (Review Focus 4)
    fichaDeOutro = { ...fx.tenantA.athlete2Row, id: 'ficha-do-admin-para-user', user_id: fx.tenantA.admin.id, account_user_id: target.id, name: 'Ficha criada pelo admin' };
    const analiseDaFicha = { ...fx.tenantA.fightAnalysis, id: 'analise-da-ficha-do-admin', person_id: fichaDeOutro.id, user_id: fx.tenantA.admin.id };
    const seed = {
      ...fx.seedRows,
      athletes: [...fx.seedRows.athletes, fichaDeOutro],
      fight_analyses: [...fx.seedRows.fight_analyses, analiseDaFicha],
      profile_versions: [{ id: 'pv1', person_id: fx.tenantA.athlete.id, person_type: 'athlete', user_id: target.id, version_number: 1, content: 'x', is_current: true }],
      api_usage: [{ id: 'au1', user_id: target.id, model_name: 'm', operation_type: 'strategy', total_tokens: 1, estimated_cost_usd: 0.01 }],
    };
    supabaseMock.__setFake(createFakeSupabase(seed));
    admin = authHeader(fx.tenantA.admin);
  });

  test('transferToUserId no corpo é 400', async () => {
    const res = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', admin).send({ transferToUserId: fx.tenantA.admin.id });
    expect(res.status).toBe(400);
    expect(store('users').some((u) => u.id === target.id)).toBe(true);
  });

  test('apaga tudo da conta, inclusive ficha vinculada criada por outro, sem tocar outro tenant nem api_usage', async () => {
    const res = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', admin).send({});
    expect(res.status).toBe(200);
    expect(res.body.deleted).toMatchObject({ athletes: 2, fightAnalyses: 2, analysisVersions: 1, profileVersions: 1, chatSessions: 1, tacticalAnalyses: 1, opponents: 1 });

    expect(store('users').some((u) => u.id === target.id)).toBe(false);
    expect(store('athletes').some((a) => a.user_id === target.id || a.account_user_id === target.id)).toBe(false);
    expect(store('fight_analyses').some((f) => f.user_id === target.id || f.person_id === fichaDeOutro.id)).toBe(false);
    expect(store('analysis_versions').some((v) => v.analysis_id === fx.tenantA.fightAnalysis.id)).toBe(false);
    expect(store('ai_chat_sessions').some((c) => c.user_id === target.id)).toBe(false);
    expect(store('tactical_analyses').some((t) => t.user_id === target.id)).toBe(false);
    expect(store('opponents').some((o) => o.user_id === target.id)).toBe(false);
    expect(store('profile_versions')).toHaveLength(0);

    // intocados
    expect(store('api_usage')).toHaveLength(1);
    expect(store('athletes').some((a) => a.id === fx.tenantB.athlete.id)).toBe(true);
    expect(store('fight_analyses').some((f) => f.id === fx.tenantB.fightAnalysis.id)).toBe(true);
    expect(store('users').some((u) => u.id === fx.tenantB.user.id)).toBe(true);
  });

  test('admin de outro tenant recebe 404 e nada é apagado', async () => {
    const res = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', authHeader(fx.tenantB.admin)).send({});
    expect(res.status).toBe(404);
    expect(store('users').some((u) => u.id === target.id)).toBe(true);
  });
});
