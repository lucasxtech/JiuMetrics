const ApiUsage = require('../models/ApiUsage');

/**
 * GET /api/usage/stats
 * Retorna estatísticas de uso da API Gemini
 * Query params: period (today, week, month, all)
 */
exports.getStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const { period = 'month' } = req.query;

    // Calcular datas baseado no período
    let startDate = null;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = null;
    }

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

    // Adicionar informações de período
    const response = {
      success: true,
      period,
      startDate: startDate?.toISOString() || null,
      endDate: now.toISOString(),
      stats: {
        totalCost: parseFloat(stats.totalCost.toFixed(6)),
        totalTokens: stats.totalTokens,
        requestsCount: stats.count,
        byModel: Object.entries(stats.byModel).map(([model, data]) => ({
          model,
          tokens: data.tokens,
          cost: parseFloat(data.cost.toFixed(6)),
          count: data.count
        })),
        byOperation: Object.entries(stats.byOperation).map(([operation, data]) => ({
          operation,
          tokens: data.tokens,
          cost: parseFloat(data.cost.toFixed(6)),
          count: data.count
        })),
        recentUsage: usageRecords.slice(0, 10).map(record => ({
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
    console.error('❌ Erro ao buscar estatísticas de uso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas de uso',
      details: error.message
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
    console.error('❌ Erro ao buscar preços:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar preços'
    });
  }
};

module.exports = exports;
