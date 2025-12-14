const ApiUsage = require('../models/ApiUsage');

// Constantes de período
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const DECIMAL_PLACES = 6;
const MAX_RECENT_RECORDS = 10;

/**
 * Calcula data inicial baseada no período solicitado
 * @param {string} period - Período (today, week, month, all)
 * @returns {Date|null} Data inicial ou null para 'all'
 */
function calculateStartDate(period) {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      return new Date(now.getTime() - DAYS_PER_WEEK * MILLISECONDS_PER_DAY);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'all':
    default:
      return null;
  }
}

/**
 * GET /api/usage/stats
 * Retorna estatísticas de uso da API Gemini
 * @param {Object} req.query.period - Período: today, week, month, all (default: month)
 */
exports.getStats = async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const { period = 'month' } = req.query;
    const startDate = calculateStartDate(period);
    const now = new Date();

    // Buscar registros de uso
    const usageRecords = await ApiUsage.getUsageStats(userId, startDate?.toISOString(), null);

    if (!usageRecords) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas de uso'
      });
    }

    // Agregar estatísticas
    const stats = ApiUsage.aggregateStats(usageRecords);

    const response = {
      success: true,
      period,
      startDate: startDate?.toISOString() || null,
      endDate: now.toISOString(),
      stats: {
        totalCost: parseFloat(stats.totalCost.toFixed(DECIMAL_PLACES)),
        totalTokens: stats.totalTokens,
        requestsCount: stats.count,
        byModel: Object.entries(stats.byModel).map(([model, data]) => ({
          model,
          tokens: data.tokens,
          cost: parseFloat(data.cost.toFixed(DECIMAL_PLACES)),
          count: data.count
        })),
        byOperation: Object.entries(stats.byOperation).map(([operation, data]) => ({
          operation,
          tokens: data.tokens,
          cost: parseFloat(data.cost.toFixed(DECIMAL_PLACES)),
          count: data.count
        })),
        recentUsage: usageRecords.slice(0, MAX_RECENT_RECORDS).map(record => ({
          id: record.id,
          model: record.model_name,
          operation: record.operation_type,
          tokens: record.total_tokens,
          cost: parseFloat(record.estimated_cost_usd),
          createdAt: record.created_at
        }))
      }
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas de uso'
    });
  }
};

/**
 * GET /api/usage/pricing
 * Retorna tabela de preços dos modelos Gemini
 */
exports.getPricing = async (req, res) => {
  try {
    res.json({
      success: true,
      pricing: ApiUsage.PRICING,
      currency: 'USD',
      unit: 'per 1M tokens'
    });
  } catch (error) {
    console.error('❌ Erro ao buscar preços:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

module.exports = exports;
