/**
 * Alvo de `jest.mock('../../../config/supabase', () => require('./support/supabaseMock'))`.
 *
 * Um único cliente (`supabase`), espelhando o cliente único de produção
 * desde a spec 008. Delega para o fake "atual" (setado por `__setFake` em
 * cada `beforeEach`).
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
  __setFake,
  __getFake,
};
