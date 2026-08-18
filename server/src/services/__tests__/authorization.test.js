/**
 * SPEC-005 — testes de unidade do seam de política, sem Express (R1).
 */
jest.mock('../../config/supabase', () => ({ supabase: {}, supabaseAdmin: {} }));
jest.mock('../../models/User');

const User = require('../../models/User');
const { resolveScope, authorize } = require('../authorization');

describe('authorization.resolveScope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('admin: retorna todos os IDs do grupo via User.getGroupUserIds', async () => {
    User.getGroupUserIds.mockResolvedValue(['admin-1', 'user-1', 'user-2']);

    await expect(resolveScope({ id: 'admin-1', role: 'admin' })).resolves.toEqual([
      'admin-1',
      'user-1',
      'user-2',
    ]);
    expect(User.getGroupUserIds).toHaveBeenCalledWith('admin-1');
  });

  it('usuário comum: retorna apenas o próprio id, sem consultar o grupo', async () => {
    await expect(resolveScope({ id: 'user-1', role: 'user' })).resolves.toEqual(['user-1']);
    expect(User.getGroupUserIds).not.toHaveBeenCalled();
  });

  it('ator sem role: trata como usuário comum', async () => {
    await expect(resolveScope({ id: 'user-1' })).resolves.toEqual(['user-1']);
    expect(User.getGroupUserIds).not.toHaveBeenCalled();
  });
});

describe('authorization.authorize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite quando o userId do recurso está no escopo do ator', async () => {
    const actor = { id: 'user-1', role: 'user' };
    await expect(authorize(actor, 'read', { userId: 'user-1' })).resolves.toBe(true);
  });

  it('nega quando o userId do recurso está fora do escopo do ator', async () => {
    const actor = { id: 'user-1', role: 'user' };
    await expect(authorize(actor, 'read', { userId: 'user-2' })).resolves.toBe(false);
  });

  it('admin: permite recurso de qualquer membro do grupo resolvido', async () => {
    User.getGroupUserIds.mockResolvedValue(['admin-1', 'user-1']);
    const actor = { id: 'admin-1', role: 'admin' };
    await expect(authorize(actor, 'write', { userId: 'user-1' })).resolves.toBe(true);
  });

  it('nega quando o recurso não tem userId', async () => {
    const actor = { id: 'user-1', role: 'user' };
    await expect(authorize(actor, 'read', {})).resolves.toBe(false);
  });
});
