/**
 * Retorna os IDs de escopo de dados para o request:
 * - Admin: todos os IDs do grupo (vê dados de todos os membros)
 * - Usuário comum: apenas o próprio ID (vê só o que criou)
 *
 * @param {Object} req - Request do Express (requer req.user e req.userId)
 * @param {Object} User - Model User (para getGroupUserIds)
 * @returns {Promise<string[]>} Array de user IDs para filtrar queries
 */
async function getScopeIds(req, User) {
  if (req.user?.role === 'admin') {
    return User.getGroupUserIds(req.userId);
  }
  return [req.userId];
}

module.exports = { getScopeIds };
