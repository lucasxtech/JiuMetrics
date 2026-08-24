/**
 * SPEC-004 (R3) — baseline de `getScopeIds`: admin → todos os IDs do grupo;
 * usuário comum → apenas o próprio ID. As specs 005/006 usam este teste
 * como prova de equivalência ao trocar a implementação.
 */
// config/supabase precisa de um mock ainda que trivial: models/User.js o
// importa no topo do arquivo, e jest.mock('../../models/User') sem factory
// carrega o módulo real uma vez (para gerar o automock), o que executaria o
// throw de "Supabase credentials not configured" sem isto.
jest.mock('../../config/supabase', () => ({ supabase: {} }));
jest.mock('../../models/User');

const User = require('../../models/User');
const { getScopeIds } = require('../tenantScope');

describe('tenantScope.getScopeIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('admin: retorna todos os IDs do grupo via User.getGroupUserIds', async () => {
    User.getGroupUserIds.mockResolvedValue(['admin-1', 'user-1', 'user-2']);
    const req = { user: { role: 'admin' }, userId: 'admin-1' };

    await expect(getScopeIds(req, User)).resolves.toEqual(['admin-1', 'user-1', 'user-2']);
    expect(User.getGroupUserIds).toHaveBeenCalledWith('admin-1');
  });

  it('usuário comum: retorna apenas o próprio ID, sem consultar o grupo', async () => {
    const req = { user: { role: 'user' }, userId: 'user-1' };

    await expect(getScopeIds(req, User)).resolves.toEqual(['user-1']);
    expect(User.getGroupUserIds).not.toHaveBeenCalled();
  });

  it('sem req.user (ex.: middleware não rodou): trata como não-admin', async () => {
    const req = { userId: 'user-1' };

    await expect(getScopeIds(req, User)).resolves.toEqual(['user-1']);
    expect(User.getGroupUserIds).not.toHaveBeenCalled();
  });
});
