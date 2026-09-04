/**
 * SPEC-013 — contrato HTTP de atletas e adversários.
 *
 * Nível: API real (supertest) + fake de PostgREST + models REAIS (nada de
 * mock em `models/*`), no mesmo harness da spec 004. Cada teste roda para as
 * duas rotas: a implementação é uma só (`personModel` + `personController`),
 * e o teste é o que garante que continue sendo — se alguém voltar a copiar
 * um arquivo e divergir, um dos dois lados quebra aqui.
 */
jest.mock('../config/supabase', () => require('./authorization/support/supabaseMock'));

const request = require('supertest');
const supabaseMock = require('./authorization/support/supabaseMock');
const { createFakeSupabase } = require('./authorization/support/fakeSupabase');
const { buildFixtures, authHeader } = require('./authorization/support/fixtures');
const { loadApp } = require('./authorization/support/loadApp');

const app = loadApp();

const ROTAS = [
  { path: '/api/athletes', table: 'athletes', personType: 'athlete', fixture: 'athlete' },
  { path: '/api/opponents', table: 'opponents', personType: 'opponent', fixture: 'opponent' },
];

describe.each(ROTAS)('SPEC-013 — $path', ({ path, table, personType, fixture }) => {
  let fx;
  let fake;
  let auth;

  beforeEach(() => {
    fx = buildFixtures();
    fake = createFakeSupabase(fx.seedRows);
    supabaseMock.__setFake(fake);
    auth = authHeader(fx.tenantA.user);
  });

  describe('POST — contrato e validação', () => {
    test('devolve o registro em camelCase (antes devolvia a linha crua do banco)', async () => {
      const res = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send({ name: 'Novo', belt: 'Azul' });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(expect.objectContaining({
        name: 'Novo',
        belt: 'Azul',
        userId: fx.tenantA.user.id,
        technicalProfile: {},
        technicalSummary: null,
      }));
      expect(res.body.data).not.toHaveProperty('user_id');
      expect(res.body.data).not.toHaveProperty('technical_profile');
    });

    test('campo numérico omitido é null, não default inventado', async () => {
      const res = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send({ name: 'Só nome e faixa', belt: 'Branca' });

      expect(res.status).toBe(201);
      expect(res.body.data.age).toBeNull();
      expect(res.body.data.weight).toBeNull();
      expect(res.body.data.cardio).toBeNull();
      expect(res.body.data.style).toBeNull();
    });

    test('cardio 0 é preservado (antes `Number(cardio) || 50` virava 50)', async () => {
      const res = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send({ name: 'Zerado', belt: 'Branca', cardio: 0 });

      expect(res.status).toBe(201);
      expect(res.body.data.cardio).toBe(0);
    });

    test('string numérica é coerçada; texto não numérico é 400, não 500', async () => {
      const ok = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send({ name: 'Coerção', belt: 'Roxa', age: '30', weight: '80.5' });
      expect(ok.status).toBe(201);
      expect(ok.body.data.age).toBe(30);
      expect(ok.body.data.weight).toBe(80.5);

      const ruim = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send({ name: 'NaN', belt: 'Roxa', age: 'abc' });
      expect(ruim.status).toBe(400);
      expect(ruim.body.issues.map(i => i.campo)).toContain('age');
    });

    test('sem nome → 400', async () => {
      const res = await request(app).post(path).set('Authorization', auth).send({ belt: 'Azul' });
      expect(res.status).toBe(400);
      expect(res.body.issues.map(i => i.campo)).toContain('name');
    });

    test('faixa fora do enum → 400 (faixa desconhecida desligaria as regras IBJJF)', async () => {
      const res = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send({ name: 'Faixa inválida', belt: 'Coral' });
      expect(res.status).toBe(400);
      expect(res.body.issues.map(i => i.campo)).toContain('belt');
    });

    test('faixa omitida → 400 (é obrigatória na criação)', async () => {
      const res = await request(app).post(path).set('Authorization', auth).send({ name: 'Sem faixa' });
      expect(res.status).toBe(400);
      expect(res.body.issues.map(i => i.campo)).toContain('belt');
    });

    test('campo não declarado no schema não chega ao banco', async () => {
      const res = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send({ name: 'Extra', belt: 'Preta', technicalSummary: 'injetado', user_id: 'outro' });

      expect(res.status).toBe(201);
      const row = fake.store.get(table).find(r => r.id === res.body.data.id);
      expect(row.technical_summary ?? null).toBeNull();
      expect(row.user_id).toBe(fx.tenantA.user.id);
    });
  });

  describe('PUT — só o que o cliente pode escrever', () => {
    test('trocar a faixa não toca no resumo técnico (corrida com a regeneração em background)', async () => {
      const id = fx.tenantA[fixture].id;
      // A regeneração em background gravou um resumo novo depois de a tela carregar.
      fake.store.get(table).find(r => r.id === id).technical_summary = 'RESUMO NOVO';

      // A tela antiga mandava o objeto inteiro, com o resumo velho em memória.
      const res = await request(app)
        .put(`${path}/${id}`)
        .set('Authorization', auth)
        .send({ belt: 'Marrom', technicalSummary: 'RESUMO VELHO', technicalProfile: { x: 1 } });

      expect(res.status).toBe(200);
      expect(res.body.data.belt).toBe('Marrom');
      expect(res.body.data.technicalSummary).toBe('RESUMO NOVO');
    });

    test('corpo vazio → 400', async () => {
      const res = await request(app)
        .put(`${path}/${fx.tenantA[fixture].id}`)
        .set('Authorization', auth)
        .send({});
      expect(res.status).toBe(400);
    });

    test('campo ausente no PUT não é apagado; null explícito apaga', async () => {
      const id = fx.tenantA[fixture].id;
      const antes = fake.store.get(table).find(r => r.id === id);
      expect(antes.weight).toBeGreaterThan(0);

      const soNome = await request(app)
        .put(`${path}/${id}`)
        .set('Authorization', auth)
        .send({ name: 'Renomeado' });
      expect(soNome.status).toBe(200);
      expect(soNome.body.data.weight).toBe(antes.weight);

      const limpa = await request(app)
        .put(`${path}/${id}`)
        .set('Authorization', auth)
        .send({ weight: null });
      expect(limpa.status).toBe(200);
      expect(limpa.body.data.weight).toBeNull();
    });

    test('fora do escopo → 404, sem escrita', async () => {
      const res = await request(app)
        .put(`${path}/${fx.tenantB[fixture].id}`)
        .set('Authorization', auth)
        .send({ name: 'Invasão' });
      expect(res.status).toBe(404);
      expect(fake.store.get(table).find(r => r.id === fx.tenantB[fixture].id).name).not.toBe('Invasão');
    });
  });

  describe('GET — agregados', () => {
    test('analysesCount conta só análises do próprio person_type', async () => {
      const id = fx.tenantA[fixture].id;
      const outroTipo = personType === 'athlete' ? 'opponent' : 'athlete';
      const analyses = fake.store.get('fight_analyses');
      const base = analyses.find(a => a.person_id === id) || { user_id: fx.tenantA.user.id };
      // Mesma pessoa, tipo trocado — não deve contar.
      analyses.push({ ...base, id: 'fake-outro-tipo', person_id: id, person_type: outroTipo });

      const res = await request(app).get(path).set('Authorization', auth);
      expect(res.status).toBe(200);
      const row = res.body.data.find(r => r.id === id);
      const esperado = analyses.filter(a => a.person_id === id && a.person_type === personType).length;
      expect(row.analysesCount).toBe(esperado);
    });
  });

  describe('DELETE', () => {
    test('apaga e devolve o registro em camelCase', async () => {
      const id = fx.tenantA[fixture].id;
      const res = await request(app).delete(`${path}/${id}`).set('Authorization', auth);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
      expect(res.body.data).toHaveProperty('userId');
      expect(fake.store.get(table).find(r => r.id === id)).toBeUndefined();
    });
  });
});
