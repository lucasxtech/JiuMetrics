jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const request = require('supertest');
const bcrypt = require('bcrypt');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');

const app = loadApp();

describe('Spec 014 — troca de senha (R10)', () => {
  let fx, hash;
  beforeEach(async () => {
    fx = buildFixtures();
    hash = await bcrypt.hash('provisoria1', 4);
    const users = fx.seedRows.users.map((u) => (u.id === fx.tenantA.athlete2.id ? { ...u, password_hash: hash, must_change_password: true } : u));
    supabaseMock.__setFake(createFakeSupabase({ ...fx.seedRows, users }));
  });

  test('login devolve profile e mustChangePassword', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: fx.tenantA.athlete2.email, password: 'provisoria1' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ profile: 'atleta', mustChangePassword: true });
  });

  test('change-password exige a atual, zera a flag, invalida o token antigo e devolve token novo', async () => {
    const oldTok = authHeader(fx.tenantA.athlete2);
    const bad = await request(app).post('/api/auth/change-password').set('Authorization', oldTok).send({ currentPassword: 'errada', newPassword: 'novaSenha1' });
    expect(bad.status).toBe(401);

    const ok = await request(app).post('/api/auth/change-password').set('Authorization', oldTok).send({ currentPassword: 'provisoria1', newPassword: 'novaSenha1' });
    expect(ok.status).toBe(200);
    expect(typeof ok.body.token).toBe('string');
    const row = supabaseMock.__getFake().store.get('users').find((u) => u.id === fx.tenantA.athlete2.id);
    expect(row.must_change_password).toBe(false);
    expect(await bcrypt.compare('novaSenha1', row.password_hash)).toBe(true);

    const stale = await request(app).get('/api/auth/validate').set('Authorization', oldTok);
    expect(stale.status).toBe(401);
    const fresh = await request(app).get('/api/auth/validate').set('Authorization', `Bearer ${ok.body.token}`);
    expect(fresh.status).toBe(200);
    expect(fresh.body.mustChangePassword).toBe(false);
  });

  // M2 (revisão final): "trocar" pela mesma senha zeraria must_change_password
  // sem a provisória deixar de valer.
  test('change-password recusa nova senha igual à atual (400), sem mexer na conta', async () => {
    const tok = authHeader(fx.tenantA.athlete2);
    const res = await request(app).post('/api/auth/change-password').set('Authorization', tok).send({ currentPassword: 'provisoria1', newPassword: 'provisoria1' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'A nova senha precisa ser diferente da atual.' });
    const row = supabaseMock.__getFake().store.get('users').find((u) => u.id === fx.tenantA.athlete2.id);
    expect(row.must_change_password).toBe(true);
    expect(row.token_version).toBe(fx.tenantA.athlete2.token_version);
    expect(row.password_hash).toBe(hash);
  });
});
