/**
 * Guarda de orçamento de IA (spec 009, R3).
 *
 * O problema que isto resolve: **um usuário autenticado podia gerar gasto
 * ilimitado de API, e ninguém veria no painel.** Não era hipótese — bastava um
 * laço de retry no cliente. O registro de custo existia e funcionava, mas era
 * só observação, sem nenhum ponto de decisão que barrasse.
 *
 * Duas propriedades deste desenho importam:
 *
 * 1. **Barra ANTES de gastar.** Um erro depois da inferência não devolve o
 *    dinheiro.
 * 2. **Conta o gasto persistido em `api_usage`, não um contador em memória.**
 *    É o que faz o limite valer em ambiente serverless, onde cada instância
 *    tem sua própria memória — a mesma razão pela qual o rate limiting atual
 *    (`MemoryStore`) não funciona em produção.
 */
const ApiUsage = require('../models/ApiUsage');
const User = require('../models/User');
const { AI_BUDGET } = require('../config/ai');
const { BudgetExceededError } = require('../utils/errors');

/**
 * Primeiro instante do mês corrente, em ISO.
 * @param {Date} [agora]
 * @returns {string}
 */
function inicioDoMes(agora = new Date()) {
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1)).toISOString();
}

/**
 * Verifica se o grupo do ator ainda tem orçamento de IA no mês.
 *
 * ⚠️ Usa `User.getGroupUserIds`, **não** `resolveScope`, e a diferença é
 * deliberada: `resolveScope` responde "que dados este ator pode VER" — para um
 * usuário comum, só os próprios. Orçamento é do GRUPO (decisão P8), então o
 * consumo de todos os membros conta para todos, inclusive para quem não vê o
 * dado dos outros.
 *
 * @param {{id: string, role?: string}} actor - `req.actor`
 * @returns {Promise<{limitUsd: number, spentUsd: number, enabled: boolean}>}
 * @throws {BudgetExceededError} quando o orçamento do período está esgotado
 */
async function assertWithinBudget(actor) {
  const limitUsd = AI_BUDGET.monthlyUsdPerTenant;

  // 0 (ou valor inválido) desativa a verificação — escape hatch explícito.
  if (!Number.isFinite(limitUsd) || limitUsd <= 0) {
    return { limitUsd: 0, spentUsd: 0, enabled: false };
  }

  const tenantUserIds = await User.getGroupUserIds(actor.id);
  const registros = await ApiUsage.getUsageStats(tenantUserIds, inicioDoMes());

  // `getUsageStats` devolve `null` quando a consulta falha (e qualquer coisa
  // não-array se for mockado ou mudar de contrato). Nesse caso a decisão é
  // PERMITIR: derrubar a operação do usuário porque não conseguimos ler a
  // tabela de custo seria trocar um risco financeiro por uma
  // indisponibilidade certa. O evento fica no log.
  if (!Array.isArray(registros)) {
    console.error('⚠️ [orçamento] não foi possível ler api_usage — operação liberada sem verificação');
    return { limitUsd, spentUsd: 0, enabled: false };
  }

  const spentUsd = registros.reduce((total, r) => total + (Number(r.estimated_cost_usd) || 0), 0);

  if (spentUsd >= limitUsd) {
    throw new BudgetExceededError(
      `Orçamento de IA do grupo esgotado neste mês (US$ ${spentUsd.toFixed(2)} de US$ ${limitUsd.toFixed(2)}).`
    );
  }

  const percentUsado = (spentUsd / limitUsd) * 100;
  if (percentUsado >= AI_BUDGET.warnAtPercent) {
    console.warn(
      `⚠️ [orçamento] grupo em ${percentUsado.toFixed(0)}% do limite mensal de IA (US$ ${spentUsd.toFixed(2)}/US$ ${limitUsd.toFixed(2)}).`
    );
  }

  return { limitUsd, spentUsd, enabled: true };
}

module.exports = { assertWithinBudget, inicioDoMes };
