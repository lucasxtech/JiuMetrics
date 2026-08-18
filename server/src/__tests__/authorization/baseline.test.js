/**
 * SPEC-004 — Testes de baseline (R2): comportamento correto de escopo que
 * JÁ existe hoje e que as specs 005/006 não podem quebrar. Ver
 * specs/004-authorization-safety-net/spec.md.
 *
 * Nível: API real (supertest sobre o app) + fake de PostgREST (P2) + models
 * e utils/tenantScope REAIS (nada de mock nesses três) — é o único jeito de
 * observar ownership de verdade, ao contrário dos testes de controller
 * existentes, que mockam o model e por isso nunca provariam nada aqui.
 */
jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');

const app = loadApp();

describe('SPEC-004 — baseline de autorização (devem PASSAR hoje e continuar passando)', () => {
  let fx;

  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
  });

  test('B1 — usuário comum lê apenas os próprios dados em endpoints de listagem', async () => {
    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', authHeader(fx.tenantA.user));

    expect(res.status).toBe(200);
    const ids = res.body.data.map((a) => a.id);
    expect(ids).toContain(fx.tenantA.athlete.id);
    expect(ids).not.toContain(fx.tenantB.athlete.id);
  });

  test('B2 — admin lê dados de todos os membros do próprio tenant', async () => {
    // athleteA pertence ao USUÁRIO comum de A, não ao admin — prova que o
    // admin enxerga o grupo, não só o que ele mesmo criou.
    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', authHeader(fx.tenantA.admin));

    expect(res.status).toBe(200);
    const ids = res.body.data.map((a) => a.id);
    expect(ids).toContain(fx.tenantA.athlete.id);
  });

  test('B3 — admin não lê dados de outro tenant', async () => {
    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', authHeader(fx.tenantA.admin));

    expect(res.status).toBe(200);
    const ids = res.body.data.map((a) => a.id);
    expect(ids).not.toContain(fx.tenantB.athlete.id);
  });

  test('B4 — admin escreve sobre dado de membro do próprio grupo (comportamento que a spec 006 pode quebrar)', async () => {
    // athleteA pertence ao usuário comum de A; o admin de A o edita.
    const res = await request(app)
      .put(`/api/athletes/${fx.tenantA.athlete.id}`)
      .set('Authorization', authHeader(fx.tenantA.admin))
      .send({ name: 'Atleta A — editado pelo admin do grupo' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Atleta A — editado pelo admin do grupo');
  });

  test('B5 — recurso fora do escopo devolve 404, não 403', async () => {
    const res = await request(app)
      .get(`/api/athletes/${fx.tenantB.athlete.id}`)
      .set('Authorization', authHeader(fx.tenantA.user));

    expect(res.status).toBe(404);
  });
});
