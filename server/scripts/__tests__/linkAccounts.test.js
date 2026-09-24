const { proposeLinks, applyDecisions } = require('../link-accounts');
const { createFakeSupabase } = require('../../src/__tests__/authorization/support/fakeSupabase');

describe('Spec 014 — link-accounts (R13)', () => {
  const users = [
    { id: 'u1', name: 'Mica', email: 'mica@x.com' },
    { id: 'u2', name: 'Lucas', email: 'lucas@x.com' },
    { id: 'u3', name: 'Ana', email: 'ana@x.com' },
  ];
  const athletes = [
    { id: 'a1', user_id: 'u1', name: 'mica', account_user_id: null },
    { id: 'a2', user_id: 'u2', name: 'Lucas', account_user_id: null },
    { id: 'a3', user_id: 'u2', name: 'Outro', account_user_id: null },
  ];

  test('propõe só quando há exatamente uma ficha da conta com o mesmo nome (sem acento/caixa)', () => {
    const out = proposeLinks(users, athletes);
    expect(out.find((r) => r.userId === 'u1').proposal).toBe('a1');
    expect(out.find((r) => r.userId === 'u2').proposal).toBe('a2');
    expect(out.find((r) => r.userId === 'u3')).toMatchObject({ proposal: null, reason: 'sem ficha' });
  });

  test('applyDecisions só toca contas listadas e recusa ficha já vinculada', async () => {
    const { client, store } = createFakeSupabase({ users: users.map((u) => ({ ...u, profile: 'atleta' })), athletes: [...athletes, { id: 'a9', user_id: 'u3', name: 'x', account_user_id: 'u1' }] });
    const res = await applyDecisions(client, { u2: { athleteId: 'a2', profile: 'professor' }, u3: { athleteId: 'a9', profile: 'fisioterapeuta' } });
    expect(res.applied).toBe(1);
    expect(res.skipped).toEqual([{ userId: 'u3', reason: 'ficha a9 já vinculada a u1' }]);
    expect(store.get('users').find((u) => u.id === 'u2').profile).toBe('professor');
    expect(store.get('athletes').find((a) => a.id === 'a2').account_user_id).toBe('u2');
    expect(store.get('users').find((u) => u.id === 'u1').profile).toBe('atleta'); // não listado, intocado
    expect(store.get('athletes').find((a) => a.id === 'a1').account_user_id).toBeNull(); // não listado, intocado
    expect(store.get('athletes').find((a) => a.id === 'a3').account_user_id).toBeNull(); // não listado, intocado
  });

  test('applyDecisions reporta aplicação parcial quando o vínculo da ficha grava mas o perfil falha (revisão T11, achado 1)', async () => {
    const { client, store } = createFakeSupabase({ users: users.map((u) => ({ ...u, profile: 'atleta' })), athletes });
    // Espiona só a tabela `users`: a ficha (`athletes`) usa o fake de verdade
    // e grava normalmente; só a escrita de `profile` falha — é exatamente o
    // cenário de não-atomicidade entre as duas escritas.
    const spyClient = {
      from(table) {
        if (table === 'users') {
          return { update: () => ({ eq: () => Promise.resolve({ error: { message: 'boom' } }) }) };
        }
        return client.from(table);
      },
    };
    const res = await applyDecisions(spyClient, { u2: { athleteId: 'a2', profile: 'professor' } });
    expect(res.applied).toBe(0);
    expect(res.skipped).toEqual([{ userId: 'u2', reason: 'parcial: ficha vinculada, perfil não aplicado — boom' }]);
    expect(store.get('athletes').find((a) => a.id === 'a2').account_user_id).toBe('u2');
  });

  test('applyDecisions distingue erro de leitura da ficha de "não encontrada" (revisão T11, H1)', async () => {
    const { client } = createFakeSupabase({ users: users.map((u) => ({ ...u, profile: 'atleta' })), athletes });
    const spyClient = {
      from(table) {
        if (table === 'athletes') {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ error: { code: 'XX', message: 'down' } }) }) }) };
        }
        return client.from(table);
      },
    };
    const res = await applyDecisions(spyClient, { u2: { athleteId: 'a2', profile: 'professor' } });
    expect(res.applied).toBe(0);
    expect(res.skipped).toEqual([{ userId: 'u2', reason: 'erro ao ler ficha a2: down' }]);
  });
});
