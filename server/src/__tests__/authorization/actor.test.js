jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');

const app = loadApp();

describe('Spec 014 — ator com perfil (R2)', () => {
  let fx;
  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
  });

  test('GET /api/auth/validate devolve profile e mustChangePassword lidos do banco', async () => {
    const res = await request(app)
      .get('/api/auth/validate')
      .set('Authorization', authHeader(fx.tenantA.physio));
    expect(res.status).toBe(200);
    expect(res.body.profile).toBe('fisioterapeuta');
    expect(res.body.mustChangePassword).toBe(false);
  });

  test('linha sem coluna profile (banco antes da migration) vale como atleta', async () => {
    const legacy = { ...fx.tenantA.user };
    delete legacy.profile;
    delete legacy.must_change_password;
    const rows = { ...fx.seedRows, users: fx.seedRows.users.map((u) => (u.id === legacy.id ? legacy : u)) };
    supabaseMock.__setFake(createFakeSupabase(rows));

    const res = await request(app)
      .get('/api/auth/validate')
      .set('Authorization', authHeader(fx.tenantA.user));
    expect(res.status).toBe(200);
    expect(res.body.profile).toBe('atleta');
    expect(res.body.mustChangePassword).toBe(false);
  });

  test('staff desativado recebe 403 mesmo com token válido', async () => {
    const rows = {
      ...fx.seedRows,
      users: fx.seedRows.users.map((u) => (u.id === fx.tenantA.physio.id ? { ...u, is_active: false } : u)),
    };
    supabaseMock.__setFake(createFakeSupabase(rows));
    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', authHeader(fx.tenantA.physio));
    expect(res.status).toBe(403);
  });
});
