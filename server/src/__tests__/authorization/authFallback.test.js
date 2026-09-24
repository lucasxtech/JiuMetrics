/**
 * Revisão final da spec 014 (C1): o fallback do `authMiddleware` para os dados
 * do token só vale quando o banco NÃO respondeu (falha de conectividade — erro
 * sem `code`). Quando o banco responde com erro, o middleware não pode fingir
 * que ele está fora do ar:
 *
 *  - `PGRST116` (a linha de `users` não existe — conta excluída) → 401;
 *  - qualquer outro código (`42703` coluna inexistente, `PGRST204`...) → 503,
 *    com o código no log do servidor, e nunca o `role` do JWT;
 *  - sem código (ex.: `ECONNRESET` lançado) → fallback do token, como antes.
 *
 * ⚠️ Limite do fake: `fakeSupabase` IGNORA a lista de colunas do `select`.
 * Uma linha "sem a coluna `profile`" aqui não reproduz o que o PostgREST faz
 * quando a query NOMEIA uma coluna inexistente (responde `42703` e derruba a
 * leitura inteira). Por isso o teste de `42703` abaixo injeta o erro
 * diretamente, e por isso `User.getAuthInfo`/`findByEmail` passaram a usar
 * `select('*')` (C1-a) — é essa mudança, não este teste, que protege o login
 * de um deploy que chegue antes da migration 025.
 */
jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures, authHeader } = require('./support/fixtures');
const { loadApp } = require('./support/loadApp');

const app = loadApp();

/**
 * Faz só a leitura de autenticação em `users` (select → eq → single)
 * responder `result` — ou lançar, se `result` for uma função. As demais
 * tabelas (e as escritas) seguem o fake real.
 */
function failUsersRead(result) {
  const fake = supabaseMock.__getFake();
  const realFrom = fake.client.from.bind(fake.client);
  return jest.spyOn(fake.client, 'from').mockImplementation((table) => {
    const real = realFrom(table);
    if (table !== 'users') return real;
    return {
      ...real,
      select: () => ({
        eq: () => ({
          single: () => (typeof result === 'function' ? result() : Promise.resolve(result)),
        }),
      }),
    };
  });
}

describe('Spec 014 (revisão final, C1) — fallback do authMiddleware só sem resposta do banco', () => {
  let fx, errorSpy;
  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('PGRST116 (linha de users não existe) → 401, sem fallback para o token', async () => {
    failUsersRead({ data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } });

    const res = await request(app).get('/api/auth/validate').set('Authorization', authHeader(fx.tenantA.admin));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Sessão inválida. Faça login novamente.' });
  });

  test('42703 (coluna inexistente — deploy antes da migration) → 503 com o código no log, nunca o role do JWT', async () => {
    failUsersRead({ data: null, error: { code: '42703', message: 'column users.profile does not exist' } });

    // admin: se caísse no fallback, o role 'admin' do JWT abriria /api/admin/*
    const res = await request(app).get('/api/admin/users').set('Authorization', authHeader(fx.tenantA.admin));

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'Serviço temporariamente indisponível.' });
    const logged = errorSpy.mock.calls.some((args) => args.some((a) => typeof a === 'string' && a.includes('42703')));
    expect(logged).toBe(true);
  });

  test('PGRST204 (outro erro com código do PostgREST) → 503', async () => {
    failUsersRead({ data: null, error: { code: 'PGRST204', message: "Could not find the 'profile' column of 'users' in the schema cache" } });

    const res = await request(app).get('/api/auth/validate').set('Authorization', authHeader(fx.tenantA.user));

    expect(res.status).toBe(503);
  });

  test('erro sem código (Error("ECONNRESET") lançado) → fallback do token, como antes', async () => {
    failUsersRead(() => Promise.reject(new Error('ECONNRESET')));

    const res = await request(app).get('/api/auth/validate').set('Authorization', authHeader(fx.tenantA.physio));

    expect(res.status).toBe(200);
    // role do token; profile no mais restritivo — o token não carrega perfil
    expect(res.body.role).toBe('user');
    expect(res.body.profile).toBe('atleta');
  });

  test('erro de rede como o supabase-js devolve (code vazio) → fallback do token', async () => {
    failUsersRead({ data: null, error: { code: '', message: 'TypeError: fetch failed', details: '', hint: '' } });

    const res = await request(app).get('/api/auth/validate').set('Authorization', authHeader(fx.tenantA.user));

    expect(res.status).toBe(200);
    expect(res.body.profile).toBe('atleta');
  });
});
