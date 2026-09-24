jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures } = require('./support/fixtures');
const { can, PROFILES } = require('../../services/authorization');

// Matriz da spec 014 (§Autorização). Colunas: [own, sameTenantOther, otherTenant]
// para role=user. A última linha da tabela é para role=admin.
const M = {
  'person:read':                  { atleta: [1,0,0], professor: [1,1,0], nutricionista: [1,1,0], fisioterapeuta: [1,1,0], preparador_fisico: [1,1,0] },
  'person:write':                 { atleta: [1,0,0], professor: [1,1,0], nutricionista: [1,1,0], fisioterapeuta: [1,1,0], preparador_fisico: [1,1,0] },
  'own-athlete:write':            { atleta: [1,0,0], professor: [1,0,0], nutricionista: [1,0,0], fisioterapeuta: [1,0,0], preparador_fisico: [1,0,0] },
  'training:read':                { atleta: [1,0,0], professor: [1,1,0], nutricionista: [1,1,0], fisioterapeuta: [1,1,0], preparador_fisico: [1,1,0] },
  'training:write':               { atleta: [1,0,0], professor: [1,0,0], nutricionista: [1,1,0], fisioterapeuta: [1,1,0], preparador_fisico: [1,1,0] },
  'schedule:write':               { atleta: [0,0,0], professor: [1,1,0], nutricionista: [0,0,0], fisioterapeuta: [0,0,0], preparador_fisico: [0,0,0] },
  'competition:write':            { atleta: [1,0,0], professor: [1,1,0], nutricionista: [0,0,0], fisioterapeuta: [0,0,0], preparador_fisico: [0,0,0] },
  'competition:team-event:write': { atleta: [1,1,0], professor: [1,1,0], nutricionista: [0,0,0], fisioterapeuta: [0,0,0], preparador_fisico: [0,0,0] },
  'health:read':                  { atleta: [1,0,0], professor: [1,1,0], nutricionista: [1,1,0], fisioterapeuta: [1,1,0], preparador_fisico: [1,1,0] },
  'health:write':                 { atleta: [1,0,0], professor: [1,1,0], nutricionista: [1,1,0], fisioterapeuta: [1,1,0], preparador_fisico: [1,1,0] },
  'users:manage':                 { atleta: [0,0,0], professor: [0,0,0], nutricionista: [0,0,0], fisioterapeuta: [0,0,0], preparador_fisico: [0,0,0] },
};

describe('Spec 014 — matriz de capacidades (R8)', () => {
  let fx;
  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
  });

  const cases = [];
  for (const action of Object.keys(M)) for (const profile of PROFILES) cases.push([action, profile]);

  test.each(cases)('%s × %s', async (action, profile) => {
    const me = fx.tenantA.physio; // role=user; o perfil é sobrescrito abaixo
    const actor = { id: me.id, role: 'user', profile, tenantId: null };
    const own = { userId: me.id, accountUserId: me.id };
    const sameTenantOther = { userId: fx.tenantA.user.id, accountUserId: fx.tenantA.user.id };
    const otherTenant = { userId: fx.tenantB.user.id, accountUserId: fx.tenantB.user.id };
    const got = [await can(actor, action, own), await can(actor, action, sameTenantOther), await can(actor, action, otherTenant)].map(Number);
    expect(got).toEqual(M[action][profile]);
  });

  test('admin com qualquer perfil: users:manage permitido; o resto segue o perfil', async () => {
    const admin = { id: fx.tenantA.admin.id, role: 'admin', profile: 'atleta', tenantId: null };
    expect(await can(admin, 'users:manage', {})).toBe(true);
    expect(await can(admin, 'schedule:write', { userId: fx.tenantA.user.id })).toBe(false);
    expect(await can(admin, 'person:read', { userId: fx.tenantA.user.id })).toBe(true);
  });

  test('ação desconhecida é negada', async () => {
    const actor = { id: fx.tenantA.admin.id, role: 'admin', profile: 'professor', tenantId: null };
    expect(await can(actor, 'foo:bar', { userId: fx.tenantA.admin.id })).toBe(false);
  });
});
