jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');
const User = require('../../models/User');

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

  // Revisão T8 — achado 1: antes desta revisão, as escritas em `athletes` de
  // `User.linkAthlete` não eram filtradas por escopo — só `assertSameTenant`
  // no controller protegia a rota. Este teste ataca a rota diretamente
  // (unlink e link) contra uma conta de OUTRO tenant, usando uma ficha do
  // tenant A liberada de propósito como isca para o segundo ataque, e prova
  // que nenhuma ficha muda de estado.
  test('PATCH /users/:id/athlete recusa alvo (unlink e link) de outro tenant, sem alterar nenhuma ficha', async () => {
    // libera a ficha de athlete2 (tenantA) para usá-la como isca do ataque de link
    const free = await request(app)
      .patch(`/api/admin/users/${fx.tenantA.athlete2.id}/athlete`)
      .set('Authorization', admin)
      .send({ athleteId: null });
    expect(free.status).toBe(200);
    const before = JSON.parse(JSON.stringify(store('athletes')));

    const crossUnlink = await request(app)
      .patch(`/api/admin/users/${fx.tenantB.user.id}/athlete`)
      .set('Authorization', admin)
      .send({ athleteId: null });
    expect(crossUnlink.status).toBe(404);

    const crossLink = await request(app)
      .patch(`/api/admin/users/${fx.tenantB.user.id}/athlete`)
      .set('Authorization', admin)
      .send({ athleteId: fx.tenantA.athlete2Row.id });
    expect(crossLink.status).toBe(404);

    expect(store('athletes')).toEqual(before);
  });

  // Revisão T8 — achado 1: prova que a defesa vive no MODEL, não só no
  // controller — chama `User.linkAthlete` direto, sem passar por
  // `assertSameTenant`, com um escopo (`allowedUserIds`) que não contém a
  // conta alvo. Sem a checagem `ids.includes(userId)`, este teste passaria a
  // mudar `account_user_id` de fichas do tenant B a partir de um escopo do
  // tenant A.
  test('User.linkAthlete recusa userId fora do allowedUserIds mesmo chamado sem o controller', async () => {
    const scopeA = [fx.tenantA.admin.id, fx.tenantA.user.id, fx.tenantA.athlete2.id, fx.tenantA.physio.id];
    const before = JSON.parse(JSON.stringify(store('athletes')));

    await expect(User.linkAthlete(fx.tenantB.user.id, null, scopeA)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(User.linkAthlete(fx.tenantB.user.id, fx.tenantA.athlete.id, scopeA)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(store('athletes')).toEqual(before);
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

  // Revisão T8 — achado 3: no teste acima, o 403 final vem do `adminMiddleware`
  // (o requisitante já não é admin no banco) — a guarda de último admin dentro
  // de `changeRole` nunca chega a rodar, então apagá-la mantém a suíte verde.
  // Este teste força a guarda a rodar de verdade: o cache de auth do
  // MIDDLEWARE (`middleware/auth.js`, 5 min por instância, chave por userId)
  // guarda o role do requisitante e só é evicted para o ALVO de uma mudança,
  // nunca para quem a fez. Por isso, se o role do próprio admin mudar por uma
  // via que não passe por `evictAuthCache`, o `adminMiddleware` continua
  // deixando-o passar com o role antigo — mas a guarda em si lê
  // `countActiveAdmins`/`getAll` direto do banco, então bloqueia mesmo assim.
  test('changeRole bloqueia o último admin ativo mesmo com o cache de auth do requisitante desatualizado (R9)', async () => {
    // 1) popula o cache de auth do middleware para admin.id como 'admin'
    const warmup = await request(app).get('/api/admin/users').set('Authorization', admin);
    expect(warmup.status).toBe(200);

    // 2) promove physio a admin — `evictAuthCache` só evicta o cache do ALVO
    // (physio); o cache do admin (requisitante) continua servindo a entrada
    // do passo 1.
    const promote = await request(app)
      .patch(`/api/admin/users/${fx.tenantA.physio.id}/role`)
      .set('Authorization', admin)
      .send({ role: 'admin' });
    expect(promote.status).toBe(200);

    // 3) rebaixa o admin original DIRETO no fake store, sem passar por
    // `evictAuthCache` — simula o cache do middleware ficando desatualizado
    // (limitação conhecida e documentada em `userController.js#changeRole`:
    // é leitura-depois-escrita, sem lock nem constraint no banco).
    store('users').find((u) => u.id === fx.tenantA.admin.id).role = 'user';

    // 4) o admin original ainda passa pelo `adminMiddleware` (cache antiga diz
    // 'admin'), mas a guarda do último admin lê o banco fresco — physio é o
    // único admin ATIVO de verdade agora — e bloqueia com 400, não 403.
    const res = await request(app)
      .patch(`/api/admin/users/${fx.tenantA.physio.id}/role`)
      .set('Authorization', admin)
      .send({ role: 'user' });
    expect(res.status).toBe(400);
    expect(store('users').find((u) => u.id === fx.tenantA.physio.id).role).toBe('admin');
  });
});
