const { proposeLinks, applyDecisions, dryRun } = require('../link-accounts');
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
          // `.select('id')` depois do `.eq` desde a revisão final (M8).
          return { update: () => ({ eq: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'boom' } }) }) }) };
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

  // Revisão final da spec 014 (M8): uma decisão só de perfil para um userId
  // que não existe fazia UPDATE de 0 linhas sem erro e contava como aplicada.
  test('applyDecisions: decisão só de perfil para usuário inexistente é skipped, não applied', async () => {
    const { client, store } = createFakeSupabase({ users: users.map((u) => ({ ...u, profile: 'atleta' })), athletes });
    const res = await applyDecisions(client, { 'u-inexistente': { profile: 'professor' }, u1: { profile: 'nutricionista' } });
    expect(res.applied).toBe(1);
    expect(res.skipped).toEqual([{ userId: 'u-inexistente', reason: 'usuário u-inexistente não encontrado' }]);
    expect(store.get('users').find((u) => u.id === 'u1').profile).toBe('nutricionista');
  });

  test('dryRun propõe a partir das duas leituras', async () => {
    const { client } = createFakeSupabase({ users: users.map((u) => ({ ...u, created_at: '2026-01-01' })), athletes });
    const out = await dryRun(client);
    expect(out.find((r) => r.userId === 'u1').proposal).toBe('a1');
  });

  // M8: erro de leitura no dry-run não pode virar tabela vazia (que se lê
  // como "ninguém tem ficha") — lança, e `main` sai com código 1.
  test.each(['users', 'athletes'])('dryRun lança quando a leitura de %s falha', async (failing) => {
    const { client } = createFakeSupabase({ users, athletes });
    const failure = Promise.resolve({ data: null, error: { code: 'XX000', message: 'down' } });
    const spyClient = {
      from(table) {
        if (table !== failing) return client.from(table);
        return { select: () => (table === 'users' ? { order: () => failure } : failure) };
      },
    };
    await expect(dryRun(spyClient)).rejects.toThrow(`Falha ao ler ${failing} (XX000): down`);
  });
});
