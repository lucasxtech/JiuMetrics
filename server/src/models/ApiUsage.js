const { supabase } = require('../config/supabase');

// Constantes
const TOKENS_PER_MILLION = 1000000;
const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Preços do Google Gemini (USD por 1 milhão de tokens)
 * Fonte: https://ai.google.dev/pricing
 * @constant {Object}
 */
const PRICING = {
  'gemini-2.0-flash': {
    input: 0.075,   // $0.075 por 1M tokens
    output: 0.30    // $0.30 por 1M tokens
  },
  'gemini-2.5-pro': {
    input: 1.25,    // $1.25 por 1M tokens
    output: 5.00    // $5.00 por 1M tokens
  },
  'gemini-3-pro-preview': {
    input: 0,       // Grátis durante preview
    output: 0
  }
};

/**
 * Calcula o custo estimado baseado nos tokens e modelo
 * @param {string} modelName - Nome do modelo Gemini
 * @param {number} promptTokens - Tokens do prompt
 * @param {number} completionTokens - Tokens da resposta
 * @returns {number} Custo total em USD
 */
function calculateCost(modelName, promptTokens, completionTokens) {
  if (!modelName || promptTokens < 0 || completionTokens < 0) {
    return 0;
  }
  
  const pricing = PRICING[modelName] || PRICING[DEFAULT_MODEL];
  const inputCost = (promptTokens / TOKENS_PER_MILLION) * pricing.input;
  const outputCost = (completionTokens / TOKENS_PER_MILLION) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Registra uso da API Gemini no banco de dados
 * @param {Object} params - Parâmetros do registro
 * @param {string} params.userId - ID do usuário
 * @param {string} params.modelName - Nome do modelo usado
 * @param {string} params.operationType - Tipo de operação (strategy, summary, analysis)
 * @param {number} params.promptTokens - Tokens do prompt
 * @param {number} params.completionTokens - Tokens da resposta
 * @param {Object} params.metadata - Dados adicionais
 * @returns {Promise<Object|null>} Registro criado ou null em caso de erro
 */
async function logUsage({ userId, modelName, operationType, promptTokens, completionTokens, metadata = {} }) {
  try {
    if (!userId || !modelName || !operationType) {
      console.warn('⚠️ Parâmetros inválidos para logUsage - registro ignorado');
      return null;
    }

    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = calculateCost(modelName, promptTokens, completionTokens);

    const { data, error } = await supabase
      .from('api_usage')
      .insert({
        user_id: userId,
        model_name: modelName,
        operation_type: operationType,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCost,
        metadata
      })
      .select();

    if (error) {
      console.error('❌ Falha ao salvar uso da API:', error.message);
      return null;
    }

    return data?.[0] || null;
  } catch (err) {
    console.error('❌ Erro inesperado ao registrar uso:', err.message);
    return null;
  }
}

/**
 * Busca estatísticas de uso por período
 * @param {string} userId - ID do usuário
 * @param {string|null} startDate - Data inicial (ISO string)
 * @param {string|null} endDate - Data final (ISO string)
 * @returns {Promise<Array|null>} Registros de uso ou null em caso de erro
 */
async function getUsageStats(userId, startDate = null, endDate = null) {
  try {
    if (!userId) {
      return [];
    }

    let query = supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar estatísticas:', error.message);
      return null;
    }

    return data || [];
  } catch (err) {
    console.error('❌ Erro inesperado ao buscar estatísticas:', err.message);
    return null;
  }
}

/**
 * Calcula estatísticas agregadas de registros de uso
 * @param {Array} usageRecords - Array de registros de uso da API
 * @returns {Object} Estatísticas agregadas (custo total, tokens, por modelo, por operação)
 */
function aggregateStats(usageRecords) {
  if (!usageRecords || usageRecords.length === 0) {
    return {
      totalCost: 0,
      totalTokens: 0,
      byModel: {},
      byOperation: {},
      count: 0
    };
  }

  const stats = {
    totalCost: 0,
    totalTokens: 0,
    byModel: {},
    byOperation: {},
    count: usageRecords.length
  };

  usageRecords.forEach(record => {
    stats.totalCost += parseFloat(record.estimated_cost_usd || 0);
    stats.totalTokens += record.total_tokens || 0;

    // Por modelo
    if (!stats.byModel[record.model_name]) {
      stats.byModel[record.model_name] = {
        tokens: 0,
        cost: 0,
        count: 0
      };
    }
    stats.byModel[record.model_name].tokens += record.total_tokens;
    stats.byModel[record.model_name].cost += parseFloat(record.estimated_cost_usd);
    stats.byModel[record.model_name].count += 1;

    // Por operação
    if (!stats.byOperation[record.operation_type]) {
      stats.byOperation[record.operation_type] = {
        tokens: 0,
        cost: 0,
        count: 0
      };
    }
    stats.byOperation[record.operation_type].tokens += record.total_tokens;
    stats.byOperation[record.operation_type].cost += parseFloat(record.estimated_cost_usd);
    stats.byOperation[record.operation_type].count += 1;
  });

  return stats;
}

module.exports = {
  logUsage,
  getUsageStats,
  aggregateStats,
  calculateCost,
  PRICING
};
