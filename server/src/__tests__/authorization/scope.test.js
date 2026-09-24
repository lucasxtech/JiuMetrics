jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures } = require('./support/fixtures');
const { resolveScope, STAFF_PROFILES, PROFILES } = require('../../services/authorization');

const actorOf = (u) => ({ id: u.id, role: u.role, profile: u.profile, tenantId: null });

describe('Spec 014 — resolveScope por role × profile (R3)', () => {
  let fx, groupA;
  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
    groupA = [fx.tenantA.admin, fx.tenantA.user, fx.tenantA.athlete2, fx.tenantA.physio].map((u) => u.id).sort();
  });

  test('enum de perfis é o da spec', () => {
    expect(PROFILES).toEqual(['atleta', 'professor', 'nutricionista', 'fisioterapeuta', 'preparador_fisico']);
    expect(STAFF_PROFILES).toEqual(['professor', 'nutricionista', 'fisioterapeuta', 'preparador_fisico']);
  });

  test('admin vê o tenant', async () => {
    expect((await resolveScope(actorOf(fx.tenantA.admin))).sort()).toEqual(groupA);
  });

  test.each(STAFF_PROFILES)('staff %s com role=user vê o tenant', async (profile) => {
    const actor = { ...actorOf(fx.tenantA.physio), profile };
    expect((await resolveScope(actor)).sort()).toEqual(groupA);
  });

  test('atleta com role=user vê só a si', async () => {
    expect(await resolveScope(actorOf(fx.tenantA.athlete2))).toEqual([fx.tenantA.athlete2.id]);
  });

  test('sem profile e sem role admin vê só a si', async () => {
    expect(await resolveScope({ id: fx.tenantA.user.id })).toEqual([fx.tenantA.user.id]);
  });
});
