jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');
const User = require('../../models/User');

const app = loadApp();
const store = (t) => supabaseMock.__getFake().store.get(t) || [];

/**
 * Guarda de sanidade do seed (achado B, revisão T10 r3): `athletes.account_user_id`
 * é UNIQUE em produção (`athletes_account_user_id_key`, migration 025) — duas
 * fichas vinculadas à mesma conta são um seed impossível, e o fake não recusa
 * isso como o banco recusaria. Chame antes de todo `createFakeSupabase(seed)`
 * desta suíte, para essa classe de erro de seed não voltar a passar em
 * silêncio (já aconteceu duas vezes: achado 5 e achado B).
 * @param {Array<{id: string, account_user_id?: string|null}>} athletes
 */
function assertUniqueAccountLinks(athletes) {
  const seen = new Map();
  for (const a of athletes) {
    if (!a.account_user_id) continue;
    const prev = seen.get(a.account_user_id);
    if (prev) {
      throw new Error(`Seed inválido: account_user_id ${a.account_user_id} vinculado a duas fichas (${prev} e ${a.id}) — violaria athletes_account_user_id_key`);
    }
    seen.set(a.account_user_id, a.id);
  }
}

describe('Spec 014 — exclusão total da conta (R7, revisão T10)', () => {
  let fx, admin, target;
  let fichaDeOutro, fichaDeTerceiroVinculada, analiseDaFichaReparentada;
  let profileVersionDoAdversario, analiseDoAdversario;
  let opponentDoAdmin, chatSessionDoAdmin, tacticalDoAdmin, fightAnalysisDoAthlete2;
  let pvOpponentByAdmin, pvFichaDeOutroByAdmin, pvAthlete2ByAdminBystander;

  beforeEach(() => {
    fx = buildFixtures();
    target = fx.tenantA.user;

    // achado 5: o seed original violava UNIQUE(account_user_id) — tenantA.athlete
    // e fichaDeOutro tinham os dois account_user_id = target. A ficha continua
    // sendo apagada mesmo assim, via user_id = target.
    fx.tenantA.athlete.account_user_id = null;

    // ficha vinculada à conta alvo, GERIDA pelo admin — apagada junto (cenário original).
    fichaDeOutro = { ...fx.tenantA.athlete2Row, id: 'ficha-do-admin-para-user', user_id: fx.tenantA.admin.id, account_user_id: target.id, name: 'Ficha criada pelo admin' };
    const analiseDaFicha = { ...fx.tenantA.fightAnalysis, id: 'analise-da-ficha-do-admin', person_id: fichaDeOutro.id, user_id: fx.tenantA.admin.id };

    // ruling do controller: ficha GERIDA pelo alvo mas VINCULADA a outra conta viva
    // — reparenta em vez de apagar. Vinculada ao FÍSIO (não ao atleta2, que já
    // tem sua própria ficha vinculada — achado B: duas fichas vinculadas ao
    // mesmo atleta2 violariam athletes_account_user_id_key).
    fichaDeTerceiroVinculada = { ...fx.tenantA.athlete2Row, id: 'ficha-gerida-pelo-alvo-vinculada-a-outro', user_id: target.id, account_user_id: fx.tenantA.physio.id, name: 'Ficha gerida pelo alvo, vinculada ao físio' };
    analiseDaFichaReparentada = { ...fx.tenantA.fightAnalysis, id: 'analise-da-ficha-reparentada', person_id: fichaDeTerceiroVinculada.id, person_type: 'athlete', user_id: target.id };

    // achado 4: lado do adversário — profile_version e fight_analysis do
    // ADVERSÁRIO do alvo, a segunda escrita por outro membro do tenant.
    profileVersionDoAdversario = { id: 'pv-adversario', person_id: fx.tenantA.opponent.id, person_type: 'opponent', user_id: target.id, version_number: 1, content: 'y', is_current: true };
    analiseDoAdversario = { ...fx.tenantA.fightAnalysis, id: 'analise-do-adversario', person_id: fx.tenantA.opponent.id, person_type: 'opponent', user_id: fx.tenantA.admin.id };

    // achado 5: bystanders do MESMO tenant, do admin — não podem ser tocados.
    opponentDoAdmin = { ...fx.tenantA.opponent, id: 'opponent-do-admin', user_id: fx.tenantA.admin.id, name: 'Adversário do admin' };
    chatSessionDoAdmin = { ...fx.tenantA.chatSession, id: 'chat-do-admin', user_id: fx.tenantA.admin.id, context_id: fx.tenantA.fightAnalysis.id };
    tacticalDoAdmin = { ...fx.tenantA.tacticalAnalysis, id: 'tactical-do-admin', user_id: fx.tenantA.admin.id };
    fightAnalysisDoAthlete2 = { ...fx.tenantA.fightAnalysis, id: 'analise-do-athlete2', person_id: fx.tenantA.athlete2Row.id, person_type: 'athlete', user_id: fx.tenantA.admin.id };

    // achado C2: profile_versions escritas pelo ADMIN (não pelo alvo) para o
    // adversário e para fichaDeOutro do alvo — exercitam pv2/pv3 de verdade
    // (sem elas, remover pv2/pv3 ainda passaria, porque as únicas linhas
    // vinculadas eram TAMBÉM escritas pelo alvo e já caíam por pv1/own).
    // Mais um bystander do admin para athlete2Row, que tem que sobreviver.
    pvOpponentByAdmin = { id: 'pv-adversario-do-admin', person_id: fx.tenantA.opponent.id, person_type: 'opponent', user_id: fx.tenantA.admin.id, version_number: 1, content: 'z', is_current: true };
    pvFichaDeOutroByAdmin = { id: 'pv-ficha-de-outro-do-admin', person_id: fichaDeOutro.id, person_type: 'athlete', user_id: fx.tenantA.admin.id, version_number: 1, content: 'w', is_current: true };
    pvAthlete2ByAdminBystander = { id: 'pv-athlete2-bystander', person_id: fx.tenantA.athlete2Row.id, person_type: 'athlete', user_id: fx.tenantA.admin.id, version_number: 1, content: 'v', is_current: true };

    const seed = {
      ...fx.seedRows,
      athletes: [...fx.seedRows.athletes, fichaDeOutro, fichaDeTerceiroVinculada],
      opponents: [...fx.seedRows.opponents, opponentDoAdmin],
      fight_analyses: [...fx.seedRows.fight_analyses, analiseDaFicha, analiseDaFichaReparentada, analiseDoAdversario, fightAnalysisDoAthlete2],
      ai_chat_sessions: [...fx.seedRows.ai_chat_sessions, chatSessionDoAdmin],
      tactical_analyses: [...fx.seedRows.tactical_analyses, tacticalDoAdmin],
      profile_versions: [
        { id: 'pv1', person_id: fx.tenantA.athlete.id, person_type: 'athlete', user_id: target.id, version_number: 1, content: 'x', is_current: true },
        profileVersionDoAdversario,
        pvOpponentByAdmin,
        pvFichaDeOutroByAdmin,
        pvAthlete2ByAdminBystander,
      ],
      api_usage: [{ id: 'au1', user_id: target.id, model_name: 'm', operation_type: 'strategy', total_tokens: 1, estimated_cost_usd: 0.01 }],
    };
    assertUniqueAccountLinks(seed.athletes);
    supabaseMock.__setFake(createFakeSupabase(seed));
    admin = authHeader(fx.tenantA.admin);
  });

  test('transferToUserId no corpo é 400', async () => {
    const res = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', admin).send({ transferToUserId: fx.tenantA.admin.id });
    expect(res.status).toBe(400);
    expect(store('users').some((u) => u.id === target.id)).toBe(true);
  });

  test('apaga tudo da conta, reparenta ficha de terceiro, cobre adversário, sem tocar bystanders nem outro tenant', async () => {
    const tenantBUserIds = [fx.tenantB.admin.id, fx.tenantB.user.id, fx.tenantB.athlete2.id, fx.tenantB.physio.id];
    const tenantBCountBefore = {
      users: store('users').filter((u) => tenantBUserIds.includes(u.id)).length,
      athletes: store('athletes').filter((r) => tenantBUserIds.includes(r.user_id)).length,
      opponents: store('opponents').filter((r) => tenantBUserIds.includes(r.user_id)).length,
      fight_analyses: store('fight_analyses').filter((r) => tenantBUserIds.includes(r.user_id)).length,
      ai_chat_sessions: store('ai_chat_sessions').filter((r) => tenantBUserIds.includes(r.user_id)).length,
      tactical_analyses: store('tactical_analyses').filter((r) => tenantBUserIds.includes(r.user_id)).length,
    };

    const res = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', admin).send({});
    expect(res.status).toBe(200);
    expect(res.body.deleted).toMatchObject({
      athletes: 2, fightAnalyses: 3, analysisVersions: 1, profileVersions: 4,
      chatSessions: 1, tacticalAnalyses: 1, opponents: 1, reparentedAthletes: 1,
    });

    expect(store('users').some((u) => u.id === target.id)).toBe(false);
    expect(store('athletes').some((a) => a.user_id === target.id || a.account_user_id === target.id)).toBe(false);
    expect(store('fight_analyses').some((f) => f.user_id === target.id || f.person_id === fichaDeOutro.id)).toBe(false);
    expect(store('analysis_versions').some((v) => v.analysis_id === fx.tenantA.fightAnalysis.id)).toBe(false);
    expect(store('ai_chat_sessions').some((c) => c.user_id === target.id)).toBe(false);
    expect(store('tactical_analyses').some((t) => t.user_id === target.id)).toBe(false);
    expect(store('opponents').some((o) => o.user_id === target.id)).toBe(false);
    expect(store('profile_versions').some((p) => p.id === 'pv1' || p.id === 'pv-adversario')).toBe(false);

    // achado 4: lado do adversário realmente apagado
    expect(store('fight_analyses').some((f) => f.id === analiseDoAdversario.id)).toBe(false);
    expect(store('profile_versions').some((p) => p.id === profileVersionDoAdversario.id)).toBe(false);

    // achado C2: profile_versions escritas pelo ADMIN para fichas/adversário
    // do alvo também são apagadas — não sobrevivem só porque não foram
    // escritas pelo próprio alvo.
    expect(store('profile_versions').some((p) => p.id === pvOpponentByAdmin.id)).toBe(false);
    expect(store('profile_versions').some((p) => p.id === pvFichaDeOutroByAdmin.id)).toBe(false);
    // bystander do admin para uma ficha NÃO relacionada ao alvo sobrevive
    expect(store('profile_versions').some((p) => p.id === pvAthlete2ByAdminBystander.id)).toBe(true);

    // ruling do controller: ficha de terceiro gerida pelo alvo foi REAPARENTADA, não apagada
    const fichaReparentada = store('athletes').find((a) => a.id === fichaDeTerceiroVinculada.id);
    expect(fichaReparentada).toBeDefined();
    expect(fichaReparentada.user_id).toBe(fx.tenantA.physio.id);
    const analiseReparentada = store('fight_analyses').find((f) => f.id === analiseDaFichaReparentada.id);
    expect(analiseReparentada).toBeDefined();
    expect(analiseReparentada.user_id).toBe(fx.tenantA.physio.id);

    // intocados: api_usage, outro tenant
    expect(store('api_usage')).toHaveLength(1);
    expect(store('athletes').some((a) => a.id === fx.tenantB.athlete.id)).toBe(true);
    expect(store('fight_analyses').some((f) => f.id === fx.tenantB.fightAnalysis.id)).toBe(true);
    expect(store('users').some((u) => u.id === fx.tenantB.user.id)).toBe(true);

    // achado 5: bystanders do mesmo tenant sobrevivem
    expect(store('opponents').some((o) => o.id === opponentDoAdmin.id)).toBe(true);
    expect(store('ai_chat_sessions').some((c) => c.id === chatSessionDoAdmin.id)).toBe(true);
    expect(store('tactical_analyses').some((t) => t.id === tacticalDoAdmin.id)).toBe(true);
    expect(store('fight_analyses').some((f) => f.id === fightAnalysisDoAthlete2.id)).toBe(true);
    expect(store('users').some((u) => u.id === fx.tenantA.admin.id)).toBe(true);
    expect(store('users').some((u) => u.id === fx.tenantA.athlete2.id)).toBe(true);
    expect(store('users').some((u) => u.id === fx.tenantA.physio.id)).toBe(true);
    expect(store('athletes').some((a) => a.id === fx.tenantA.athlete2Row.id)).toBe(true);

    // nenhuma tabela do tenant B perdeu ou ganhou linha
    const tenantBCountAfter = {
      users: store('users').filter((u) => tenantBUserIds.includes(u.id)).length,
      athletes: store('athletes').filter((r) => tenantBUserIds.includes(r.user_id)).length,
      opponents: store('opponents').filter((r) => tenantBUserIds.includes(r.user_id)).length,
      fight_analyses: store('fight_analyses').filter((r) => tenantBUserIds.includes(r.user_id)).length,
      ai_chat_sessions: store('ai_chat_sessions').filter((r) => tenantBUserIds.includes(r.user_id)).length,
      tactical_analyses: store('tactical_analyses').filter((r) => tenantBUserIds.includes(r.user_id)).length,
    };
    expect(tenantBCountAfter).toEqual(tenantBCountBefore);
  });

  test('admin de outro tenant recebe 404 e nada é apagado', async () => {
    const res = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', authHeader(fx.tenantB.admin)).send({});
    expect(res.status).toBe(404);
    expect(store('users').some((u) => u.id === target.id)).toBe(true);
  });

  // achado 1: o model tem que recusar sozinho, sem depender do controller
  test('User.purgeAccount recusa userId fora do escopo do chamador (NOT_FOUND), nada é apagado', async () => {
    const scopeA = [fx.tenantA.admin.id, fx.tenantA.user.id, fx.tenantA.athlete2.id, fx.tenantA.physio.id];

    await expect(User.purgeAccount(fx.tenantB.user.id, scopeA)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(store('users').some((u) => u.id === fx.tenantB.user.id)).toBe(true);
    expect(store('athletes').some((a) => a.id === fx.tenantB.athlete.id)).toBe(true);
    expect(store('fight_analyses').some((f) => f.id === fx.tenantB.fightAnalysis.id)).toBe(true);
    expect(store('opponents').some((o) => o.id === fx.tenantB.opponent.id)).toBe(true);
    expect(store('ai_chat_sessions').some((c) => c.id === fx.tenantB.chatSession.id)).toBe(true);
    expect(store('tactical_analyses').some((t) => t.id === fx.tenantB.tacticalAnalysis.id)).toBe(true);
    expect(store('analysis_versions').some((v) => v.id === fx.tenantB.version.id)).toBe(true);
  });

  // achado 2: raiz do tenant não pode ser excluída enquanto houver outros membros
  test('não é possível excluir a raiz do tenant enquanto houver outros membros (409), nada é apagado', async () => {
    // promove o físio a admin diretamente no fake (mutação em vivo — o mesmo array
    // que o fake lê), sem passar pela guarda do último admin (irrelevante aqui).
    const physioRow = store('users').find((u) => u.id === fx.tenantA.physio.id);
    physioRow.role = 'admin';
    const asPhysio = authHeader(fx.tenantA.physio);

    const res = await request(app).delete(`/api/admin/users/${fx.tenantA.admin.id}/permanent`).set('Authorization', asPhysio).send({});

    expect(res.status).toBe(409);
    expect(res.body.deleted).toBeUndefined();
    // nada do tenant A foi tocado
    expect(store('users').some((u) => u.id === fx.tenantA.admin.id)).toBe(true);
    expect(store('users').some((u) => u.id === target.id)).toBe(true);
    expect(store('athletes').some((a) => a.id === fx.tenantA.athlete.id)).toBe(true);
    expect(store('athletes').some((a) => a.id === fichaDeOutro.id)).toBe(true);
    expect(store('fight_analyses').some((f) => f.id === fx.tenantA.fightAnalysis.id)).toBe(true);
    expect(store('opponents').some((o) => o.id === fx.tenantA.opponent.id)).toBe(true);
  });

  // achado 3: a causa da falha vai para o log do servidor, nunca para o cliente
  test('falha no meio loga a causa e devolve step + contagens parciais, sem vazar mensagem', async () => {
    const fake = supabaseMock.__getFake();
    const realFrom = fake.client.from.bind(fake.client);
    const failure = { code: 'FAKE_FAIL', message: 'Falha simulada em opponents' };
    const fromSpy = jest.spyOn(fake.client, 'from').mockImplementation((table) => {
      const real = realFrom(table);
      if (table === 'opponents') {
        return {
          ...real,
          delete: () => ({
            eq: () => ({ select: () => Promise.resolve({ data: null, error: failure }) }),
          }),
        };
      }
      return real;
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', admin).send({});

    expect(res.status).toBe(500);
    expect(res.body.step).toBe('opponents');
    expect(res.body.deleted.chatSessions).toBe(1);
    expect(res.body.message).toBeUndefined();
    expect(res.body.error).toBeDefined();

    const loggedCause = errorSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === 'string' && a.includes('opponents') && a.includes('FAKE_FAIL'))
    );
    expect(loggedCause).toBe(true);

    // conta NÃO foi removida (falhou antes do passo 'user')
    expect(store('users').some((u) => u.id === target.id)).toBe(true);

    fromSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // achado A: uma leitura da fase de coleta (antes de qualquer escrita)
  // também precisa devolver step/partial — não pode lançar cru.
  test('falha numa leitura da coleta devolve step=collect e contagens zeradas, nada é escrito', async () => {
    const fake = supabaseMock.__getFake();
    const realFrom = fake.client.from.bind(fake.client);
    const failure = { code: 'FAKE_READ_FAIL', message: 'Falha simulada na leitura de profile_versions' };
    const fromSpy = jest.spyOn(fake.client, 'from').mockImplementation((table) => {
      const real = realFrom(table);
      if (table === 'profile_versions') {
        return {
          ...real,
          // só a leitura "própria" (um único .eq) falha — pv2/pv3 usam
          // .in(...).eq(...) e nunca são alcançadas, porque a própria já lança.
          select: () => ({ eq: () => Promise.resolve({ data: null, error: failure }) }),
        };
      }
      return real;
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', admin).send({});

    expect(res.status).toBe(500);
    expect(res.body.step).toBe('collect');
    expect(res.body.deleted).toEqual({
      athletes: 0, opponents: 0, fightAnalyses: 0, analysisVersions: 0,
      profileVersions: 0, tacticalAnalyses: 0, chatSessions: 0, reparentedAthletes: 0,
    });
    expect(res.body.message).toBeUndefined();

    const loggedCause = errorSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === 'string' && a.includes('collect') && a.includes('FAKE_READ_FAIL'))
    );
    expect(loggedCause).toBe(true);

    // nada foi escrito: nem apagado, nem reparentado
    expect(store('users').some((u) => u.id === target.id)).toBe(true);
    expect(store('ai_chat_sessions').some((c) => c.user_id === target.id)).toBe(true);
    const fichaAindaDoAlvo = store('athletes').find((a) => a.id === fichaDeTerceiroVinculada.id);
    expect(fichaAindaDoAlvo.user_id).toBe(target.id);

    fromSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // achado C1: uma ficha vinculada a uma conta FORA do escopo do chamador não
  // pode reparentar para lá — ficaria fora do alcance de quem chamou. Cai na
  // exclusão como qualquer outra ficha da conta, em vez de "escapar" intacta
  // (o que aconteceria se ela nem reparentasse nem fosse apagada).
  test('C1: ficha vinculada a conta fora do escopo do chamador não reparenta, é apagada', async () => {
    // achado B: fx.tenantB.user.id JÁ é o account_user_id de fx.tenantB.athlete
    // (fixtures) — usar de novo violaria UNIQUE(account_user_id). O físio de
    // outro tenant não tem ficha própria, continua fora do escopo do admin A.
    const contaForaDoEscopo = fx.tenantB.physio.id;
    const fichaForaDeEscopo = { ...fx.tenantA.athlete2Row, id: 'ficha-vinculada-fora-do-escopo', user_id: target.id, account_user_id: contaForaDoEscopo, name: 'Ficha vinculada a conta de outro tenant' };
    const seed = { ...fx.seedRows, athletes: [...fx.seedRows.athletes, fichaForaDeEscopo] };
    assertUniqueAccountLinks(seed.athletes);
    supabaseMock.__setFake(createFakeSupabase(seed));

    const scopeA = [fx.tenantA.admin.id, fx.tenantA.user.id, fx.tenantA.athlete2.id, fx.tenantA.physio.id];
    const deleted = await User.purgeAccount(target.id, scopeA);

    expect(deleted).toMatchObject({ reparentedAthletes: 0, athletes: 2 });
    // apagada — não ficou intacta (o que indicaria reparent) nem sobrou órfã
    expect(store('athletes').some((a) => a.id === fichaForaDeEscopo.id)).toBe(false);
  });

  // achado H1: uma retentativa depois de uma falha NO MEIO do reparent (na
  // escrita da própria ficha, depois dos filhos já terem migrado) tem que
  // terminar reparentando de verdade — não apagar os filhos órfãos nem
  // deixar a ficha para trás.
  test('H1: retentativa após falha na escrita da ficha do reparent termina reparentando (não apagando)', async () => {
    const fake = supabaseMock.__getFake();
    const realFrom = fake.client.from.bind(fake.client);
    const failure = { code: 'FAKE_ATHLETE_UPDATE_FAIL', message: 'Falha simulada ao escrever a ficha do reparent' };
    const fromSpy = jest.spyOn(fake.client, 'from').mockImplementation((table) => {
      const real = realFrom(table);
      if (table === 'athletes') {
        // só a chamada de UPDATE falha — as duas SELECTs da coleta (managedRows,
        // rLinked) e o DELETE da exclusão continuam reais via `real`.
        return { ...real, update: () => ({ eq: () => Promise.resolve({ data: null, error: failure }) }) };
      }
      return real;
    });

    const res1 = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', admin).send({});
    expect(res1.status).toBe(500);
    expect(res1.body.step).toBe('reparent');

    fromSpy.mockRestore();

    // filhos primeiro (achado H1): a análise da ficha já migrou...
    const analiseParcial = store('fight_analyses').find((f) => f.id === analiseDaFichaReparentada.id);
    expect(analiseParcial.user_id).toBe(fx.tenantA.physio.id);
    // ...mas a ficha em si ainda não (a escrita que falhou), então a próxima
    // chamada ainda a encontra em `managedRows` como candidata a reparent.
    const fichaParcial = store('athletes').find((a) => a.id === fichaDeTerceiroVinculada.id);
    expect(fichaParcial.user_id).toBe(target.id);
    expect(store('users').some((u) => u.id === target.id)).toBe(true); // conta ainda existe

    // retentativa — mesma chamada, sem o spy
    const res2 = await request(app).delete(`/api/admin/users/${target.id}/permanent`).set('Authorization', admin).send({});
    expect(res2.status).toBe(200);
    expect(res2.body.deleted.reparentedAthletes).toBe(1);

    const fichaFinal = store('athletes').find((a) => a.id === fichaDeTerceiroVinculada.id);
    expect(fichaFinal).toBeDefined();
    expect(fichaFinal.user_id).toBe(fx.tenantA.physio.id);
    const analiseFinal = store('fight_analyses').find((f) => f.id === analiseDaFichaReparentada.id);
    expect(analiseFinal).toBeDefined();
    expect(analiseFinal.user_id).toBe(fx.tenantA.physio.id);
  });
});
