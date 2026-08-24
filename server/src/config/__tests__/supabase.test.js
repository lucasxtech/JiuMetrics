/**
 * spec 008 (R2) — o backend deve falhar no boot sem a chave de serviço, e
 * não pode existir fallback silencioso para um cliente anon. Este teste
 * exercita o módulo real (sem mock), únicas variáveis que ele lê.
 */
describe('config/supabase', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  function loadWithEnv(env) {
    jest.resetModules();
    process.env = { ...originalEnv, ...env };
    return () => require('../supabase');
  }

  test('lança sem SUPABASE_URL e sem SUPABASE_SERVICE_ROLE_KEY', () => {
    const load = loadWithEnv({ SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
    expect(load).toThrow(/SUPABASE_URL/);
  });

  test('lança sem SUPABASE_SERVICE_ROLE_KEY mesmo com SUPABASE_URL definida', () => {
    const load = loadWithEnv({
      SUPABASE_URL: 'https://exemplo.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });
    expect(load).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  test('PREVENIR REGRESSÃO: nunca cai de volta para um cliente anon — só existe o export `supabase`', () => {
    const load = loadWithEnv({
      SUPABASE_URL: 'https://exemplo.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'chave-de-servico-fake',
    });
    const mod = load();
    expect(mod.supabase).toBeDefined();
    expect(mod.supabaseAdmin).toBeUndefined();
    expect(Object.keys(mod)).toEqual(['supabase']);
  });

  test('não lança quando as duas variáveis estão presentes', () => {
    const load = loadWithEnv({
      SUPABASE_URL: 'https://exemplo.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'chave-de-servico-fake',
    });
    expect(load).not.toThrow();
  });
});
