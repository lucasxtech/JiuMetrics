const { resolveScope } = require('../services/authorization');

/**
 * @deprecated Use `resolveScope(actor)` de `../services/authorization.js`.
 * Mantido como wrapper de transição (SPEC-005) — nenhum call site interno
 * usa mais esta função; remoção prevista numa limpeza posterior.
 *
 * O segundo parâmetro (`User`) não é mais necessário — `resolveScope`
 * importa o model diretamente — e é ignorado se algum chamador antigo
 * ainda o passar.
 *
 * @param {Object} req - Request do Express (requer req.user e req.userId)
 * @returns {Promise<string[]>} Array de user IDs para filtrar queries
 */
async function getScopeIds(req) {
  return resolveScope({ id: req.userId, role: req.user?.role, tenantId: null });
}

module.exports = { getScopeIds };
