const { assertWithinBudget } = require('../services/costGuard');
const { BudgetExceededError } = require('../utils/errors');

/**
 * Barra a requisição quando o orçamento de IA do grupo está esgotado
 * (spec 009, R3).
 *
 * Aplicado **por rota**, não no router inteiro: as rotas de `/api/strategy`
 * incluem listagens e leituras, e gastar orçamento não tem nada a ver com
 * ler o histórico. Só o que dispara inferência é gatilhado.
 *
 * Depende de `req.actor` — precisa vir depois do `authMiddleware`.
 */
async function requireBudget(req, res, next) {
  try {
    await assertWithinBudget(req.actor);
    return next();
  } catch (error) {
    if (error instanceof BudgetExceededError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    return next(error);
  }
}

module.exports = { requireBudget };
