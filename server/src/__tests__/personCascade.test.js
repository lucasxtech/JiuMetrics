/**
 * SPEC-013 — exclusão em cascata de atleta/adversário.
 *
 * O banco **não tem FK** de `person_id`: apagar a pessoa deixava as análises
 * de vídeo, as versões dessas análises e o histórico de perfil apontando para
 * um id inexistente. A cascata é feita na aplicação, e é este teste que a
 * mantém — se alguém remover o `deleteRelated`, os órfãos voltam em silêncio.
 *
 * Harness da spec 004: supertest sobre o app real, fake de PostgREST, models
 * reais.
 */
jest.mock('../config/supabase', () => require('./authorization/support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./authorization/support/supabaseMock');
const { createFakeSupabase } = require('./authorization/support/fakeSupabase');
const { buildFixtures, authHeader } = require('./authorization/support/fixtures');
const { loadApp } = require('./authorization/support/loadApp');

const app = loadApp();

describe('SPEC-013 — exclusão em cascata', () => {
  let fx;
  let fake;
  const rows = (t) => fake.store.get(t) || [];

  beforeEach(() => {
    fx = buildFixtures();
    fake = createFakeSupabase(fx.seedRows);
    supabaseMock.__setFake(fake);
  });

  test('apagar o atleta apaga as análises, as versões dessas análises e o histórico de perfil', async () => {
    const { athlete, user, fightAnalysis, version } = fx.tenantA;
    // `profile_versions` não vem nas fixtures — semeia direto no store.
    fake.store.set('profile_versions', [{
      id: 'pv-1',
      person_id: athlete.id,
      person_type: 'athlete',
      user_id: user.id,
      version_number: 1,
      content: 'resumo v1',
      edited_by: 'user',
      is_current: true,
      created_at: new Date().toISOString(),
    }]);

    // Estado inicial: tudo presente.
    expect(rows('fight_analyses').some((a) => a.person_id === athlete.id)).toBe(true);
    expect(rows('analysis_versions').some((v) => v.analysis_id === fightAnalysis.id)).toBe(true);
    expect(rows('profile_versions').some((v) => v.person_id === athlete.id)).toBe(true);

    const res = await request(app)
      .delete(`/api/athletes/${athlete.id}`)
      .set('Authorization', authHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.cascadeFailed).toBe(false);
    expect(res.body.deleted).toEqual({ analyses: 1, versions: 1, profileVersions: 1 });

    expect(rows('athletes').some((a) => a.id === athlete.id)).toBe(false);
    expect(rows('fight_analyses').some((a) => a.person_id === athlete.id)).toBe(false);
    expect(rows('analysis_versions').some((v) => v.analysis_id === fightAnalysis.id)).toBe(false);
    expect(rows('profile_versions').some((v) => v.person_id === athlete.id)).toBe(false);
    expect(version.id).toBeDefined(); // a fixture existia mesmo
  });

  test('a estratégia que referencia a pessoa é PRESERVADA (decisão de produto)', async () => {
    const { athlete, user, tacticalAnalysis } = fx.tenantA;

    await request(app).delete(`/api/athletes/${athlete.id}`).set('Authorization', authHeader(user));

    const sobrevivente = rows('tactical_analyses').find((t) => t.id === tacticalAnalysis.id);
    expect(sobrevivente).toBeDefined();
    expect(sobrevivente.athlete_id).toBe(athlete.id);
  });

  test('a cascata não atravessa o tenant', async () => {
    const alvo = fx.tenantA;
    const outro = fx.tenantB;

    await request(app)
      .delete(`/api/athletes/${alvo.athlete.id}`)
      .set('Authorization', authHeader(alvo.user));

    // Nada do tenant B foi tocado.
    expect(rows('athletes').some((a) => a.id === outro.athlete.id)).toBe(true);
    expect(rows('fight_analyses').some((a) => a.person_id === outro.athlete.id)).toBe(true);
    expect(rows('analysis_versions').some((v) => v.analysis_id === outro.fightAnalysis.id)).toBe(true);
  });

  test('apagar um adversário não toca nas análises do atleta de mesmo escopo', async () => {
    const { athlete, opponent, user } = fx.tenantA;

    const res = await request(app)
      .delete(`/api/opponents/${opponent.id}`)
      .set('Authorization', authHeader(user));

    expect(res.status).toBe(200);
    // A fixture só tem análise para o atleta; a do adversário não existe.
    expect(res.body.deleted.analyses).toBe(0);
    expect(rows('fight_analyses').some((a) => a.person_id === athlete.id)).toBe(true);
  });

  test('falha na cascata não vira sucesso silencioso: a resposta declara o estado', async () => {
    const { athlete, user } = fx.tenantA;
    jest.spyOn(console, 'error').mockImplementation();

    const FightAnalysis = require('../models/FightAnalysis');
    const spy = jest
      .spyOn(FightAnalysis, 'deleteByPerson')
      .mockRejectedValue(new Error('PostgREST fora do ar'));

    const res = await request(app)
      .delete(`/api/athletes/${athlete.id}`)
      .set('Authorization', authHeader(user));

    // A pessoa saiu (a exclusão dela vem antes), mas o cliente é informado de
    // que a limpeza não aconteceu — em vez de receber "deletado com sucesso".
    expect(res.status).toBe(200);
    expect(res.body.cascadeFailed).toBe(true);
    expect(res.body.message).toMatch(/limpeza das análises falhou/i);
    expect(rows('athletes').some((a) => a.id === athlete.id)).toBe(false);

    spy.mockRestore();
    console.error.mockRestore();
  });
});
