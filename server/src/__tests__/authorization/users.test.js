jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');

const app = loadApp();
const store = (t) => supabaseMock.__getFake().store.get(t);

describe('Spec 014 — gestão de contas pelo admin (R6, R9, R11)', () => {
  let fx, admin;
  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
    admin = authHeader(fx.tenantA.admin);
  });

  test('GET /users traz profile, ficha vinculada e lastLogin', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', admin);
    expect(res.status).toBe(200);
    const u = res.body.data.find((x) => x.id === fx.tenantA.athlete2.id);
    expect(u).toMatchObject({ profile: 'atleta', athleteId: fx.tenantA.athlete2Row.id, athleteName: fx.tenantA.athlete2Row.name });
    expect(res.body.data.map((x) => x.id)).not.toContain(fx.tenantB.admin.id);
  });

  test('POST /users cria com perfil, admin opcional, ficha vinculada e must_change_password', async () => {
    const res = await request(app).post('/api/admin/users').set('Authorization', admin)
      .send({ name: 'Nova', email: 'nova@x.com', password: 'abcdef', profile: 'atleta', isAdmin: false, createAthlete: true, athlete: { belt: 'Branca' } });
    expect(res.status).toBe(201);
    const row = store('users').find((u) => u.email === 'nova@x.com');
    expect(row).toMatchObject({ profile: 'atleta', role: 'user', must_change_password: true, tenant_id: fx.tenantA.admin.id });
    const ficha = store('athletes').find((a) => a.account_user_id === row.id);
    expect(ficha).toMatchObject({ user_id: row.id, belt: 'Branca', name: 'Nova' });
    expect(res.body.data).toMatchObject({ profile: 'atleta', athleteId: ficha.id });
  });

  test('POST /users com isAdmin cria role=admin', async () => {
    const res = await request(app).post('/api/admin/users').set('Authorization', admin)
      .send({ name: 'Prof', email: 'prof@x.com', password: 'abcdef', profile: 'professor', isAdmin: true });
    expect(res.status).toBe(201);
    expect(store('users').find((u) => u.email === 'prof@x.com').role).toBe('admin');
  });

  test('PATCH /users/:id/profile altera, invalida token e é 404 fora do tenant', async () => {
    const before = store('users').find((u) => u.id === fx.tenantA.physio.id).token_version;
    const ok = await request(app).patch(`/api/admin/users/${fx.tenantA.physio.id}/profile`).set('Authorization', admin).send({ profile: 'nutricionista' });
    expect(ok.status).toBe(200);
    const after = store('users').find((u) => u.id === fx.tenantA.physio.id);
    expect(after.profile).toBe('nutricionista');
    expect(after.token_version).toBe(before + 1);

    const cross = await request(app).patch(`/api/admin/users/${fx.tenantB.physio.id}/profile`).set('Authorization', admin).send({ profile: 'professor' });
    expect(cross.status).toBe(404);
  });

  test('PATCH /users/:id/athlete vincula, é idempotente, recusa ficha alheia e de outro tenant', async () => {
    const link = await request(app).patch(`/api/admin/users/${fx.tenantA.physio.id}/athlete`).set('Authorization', admin).send({ athleteId: fx.tenantA.athlete.id });
    expect(link.status).toBe(409); // athlete já é da conta fx.tenantA.user

    // desvincula do dono atual e vincula ao fisio
    const unlink = await request(app).patch(`/api/admin/users/${fx.tenantA.user.id}/athlete`).set('Authorization', admin).send({ athleteId: null });
    expect(unlink.status).toBe(200);
    const link2 = await request(app).patch(`/api/admin/users/${fx.tenantA.physio.id}/athlete`).set('Authorization', admin).send({ athleteId: fx.tenantA.athlete.id });
    expect(link2.status).toBe(200);
    expect(store('athletes').find((a) => a.id === fx.tenantA.athlete.id).account_user_id).toBe(fx.tenantA.physio.id);

    const same = await request(app).patch(`/api/admin/users/${fx.tenantA.physio.id}/athlete`).set('Authorization', admin).send({ athleteId: fx.tenantA.athlete.id });
    expect(same.status).toBe(200); // idempotente

    const cross = await request(app).patch(`/api/admin/users/${fx.tenantA.physio.id}/athlete`).set('Authorization', admin).send({ athleteId: fx.tenantB.athlete2Row.id });
    expect(cross.status).toBe(404);
  });

  test('PATCH /users/:id/role não rebaixa o último admin ativo nem a si mesmo', async () => {
    const self = await request(app).patch(`/api/admin/users/${fx.tenantA.admin.id}/role`).set('Authorization', admin).send({ role: 'user' });
    expect(self.status).toBe(400);
    // promove physio, rebaixa admin original via physio: agora physio é o único admin → não pode se rebaixar; e admin original pode ser rebaixado por physio
    await request(app).patch(`/api/admin/users/${fx.tenantA.physio.id}/role`).set('Authorization', admin).send({ role: 'admin' });
    const physioAdmin = authHeader({ ...fx.tenantA.physio, token_version: store('users').find((u) => u.id === fx.tenantA.physio.id).token_version });
    const demoteOriginal = await request(app).patch(`/api/admin/users/${fx.tenantA.admin.id}/role`).set('Authorization', physioAdmin).send({ role: 'user' });
    expect(demoteOriginal.status).toBe(200);
    const adminTok = authHeader({ ...fx.tenantA.admin, role: 'user', token_version: store('users').find((u) => u.id === fx.tenantA.admin.id).token_version });
    const lastOne = await request(app).patch(`/api/admin/users/${fx.tenantA.physio.id}/role`).set('Authorization', adminTok).send({ role: 'user' });
    expect(lastOne.status).toBe(403); // não é mais admin
  });
});
