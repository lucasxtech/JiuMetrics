/**
 * Ponto único de decisão de autorização (SPEC-005).
 *
 * `actor` é um objeto simples `{ id, role, tenantId }` — nunca o `req` do
 * Express. Este módulo não importa Express e nunca lê `req`; a extração do
 * ator a partir do request é responsabilidade do middleware de auth
 * (`middleware/auth.js`, que popula `req.actor`).
 *
 * `tenantId` existe no shape mas não é usado pela implementação atual —
 * `resolveScope` resolve o grupo a partir de `actor.id` via
 * `models/User.getGroupUserIds`, exatamente como o `getScopeIds` que este
 * módulo substitui. O campo fica reservado para as dimensões futuras
 * (papel profissional, relacionamento, escopo de campo — ver
 * JIU_METRICS_REFACTORING_PLAN.md §6 e o ADR desta spec).
 *
 * Única dependência de domínio permitida: `models/User` (precisa compor o
 * grupo/tenant). Este módulo nunca importa controller nem outro model.
 */
const User = require('../models/User');

/**
 * Devolve os `user_id` que o ator alcança:
 * - `role === 'admin'`: todos os IDs do grupo (mesmo tenant)
 * - qualquer outro caso (incluindo ausência de role): apenas o próprio id
 *
 * @param {{id: string, role?: string, tenantId?: string|null}} actor
 * @returns {Promise<string[]>}
 */
async function resolveScope(actor) {
  if (actor?.role === 'admin') {
    return User.getGroupUserIds(actor.id);
  }
  return [actor.id];
}

/**
 * Assinatura estável para decisões de autorização por ação/recurso.
 *
 * Implementação inicial (SPEC-005): equivalente a `resolveScope` — só
 * checa se `resource.userId` está dentro do escopo do ator. `action` não é
 * usado ainda; existe para que as dimensões futuras (permissão por ação,
 * relacionamento profissional↔atleta) tenham uma assinatura já estável
 * para morar, em vez de voltar para os controllers.
 *
 * @param {{id: string, role?: string, tenantId?: string|null}} actor
 * @param {string} action - ex.: 'read', 'write' (reservado, não avaliado ainda)
 * @param {{userId?: string}} resource - recurso com o `userId` do dono
 * @returns {Promise<boolean>}
 */
async function authorize(actor, action, resource) {
  const scope = await resolveScope(actor);
  return Boolean(resource?.userId) && scope.includes(resource.userId);
}

module.exports = { resolveScope, authorize };
