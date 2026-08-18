/**
 * Alvo de `jest.mock('../../../config/supabase', () => require('./support/supabaseMock'))`.
 *
 * `supabase` e `supabaseAdmin` apontam para o MESMO proxy: delegam para o
 * fake "atual" (setado por `__setFake` em cada `beforeEach`). Isso espelha a
 * produção o suficiente para este teste — RLS está desligado nas tabelas de
 * domínio (docs/AUTHORIZATION.md §6), então os dois clientes reais já se
 * comportam de forma equivalente para o que aqui se observa.
 */
let current = null;

const proxy = {
  from(table) {
    if (!current) {
      throw new Error('supabaseMock: nenhum fake setado — chame __setFake(createFakeSupabase(...)) no beforeEach');
    }
    return current.client.from(table);
  },
};

function __setFake(fake) {
  current = fake;
}

function __getFake() {
  return current;
}

module.exports = {
  supabase: proxy,
  supabaseAdmin: proxy,
  __setFake,
  __getFake,
};
