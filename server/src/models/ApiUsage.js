// @ts-check
const { supabase } = require('../config/supabase');

// Constantes
const TOKENS_PER_MILLION = 1000000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Preços do Google Gemini (USD por 1 milhão de tokens)
 * Fonte: https://ai.google.dev/pricing
 * @constant {Object}
 */
// Limite de faixa de preço, comum ao 2.5-pro e aos 3.x-pro-preview
const TIER_THRESHOLD = 200000;

/**
 * Preços do Google Gemini (USD por 1 milhão de tokens)
 * Fonte: https://ai.google.dev/pricing
 * Modelos com tiered pricing usam { tiers: [{threshold, input, output}] }
 */
const PRICING = {
  'gemini-2.0-flash': {
    input: 0.075,   // $0.075 por 1M tokens
    output: 0.30    // $0.30 por 1M tokens
  },
  'gemini-2.5-flash': {
    input: 0.30,    // $0.30 por 1M tokens
    output: 2.50    // $2.50 por 1M tokens
  },
  // O 2.5-pro TAMBÉM cobra por faixa, e isso passou despercebido até a
  // auditoria de 2026-09-02: 3 das 9 análises de vídeo mais recentes tinham
  // 198K–227K tokens de entrada, ou seja, caíam na faixa cara. Enquanto só a
  // faixa barata existia aqui, o custo dessas análises foi registrado pela
  // metade — subestimando o gasto real e, por tabela, o consumo do orçamento
  // mensal por tenant (services/costGuard.js).
  'gemini-2.5-pro': {
    tiers: [
      { threshold: TIER_THRESHOLD, input: 1.25, output: 10.00 },  // até 200K tokens
      { threshold: Infinity,       input: 2.50, output: 15.00 }   // acima de 200K tokens
    ]
  },
  // Gemini 3 Pro Preview e 3.1 Pro Preview — mesmo preço, faixas por contexto.
  // O 3-pro-preview saiu da allow-list (descontinuado pelo provedor), mas o
  // preço FICA: linhas históricas de api_usage referenciam este nome e
  // precisam continuar precificáveis.
  'gemini-3-pro-preview': {
    tiers: [
      { threshold: TIER_THRESHOLD, input: 2.00, output: 12.00 },  // até 200K tokens
      { threshold: Infinity,       input: 4.00, output: 18.00 }   // acima de 200K tokens
    ]
  },
  'gemini-3.1-pro-preview': {
    tiers: [
      { threshold: TIER_THRESHOLD, input: 2.00, output: 12.00 },
      { threshold: Infinity,       input: 4.00, output: 18.00 }
    ]
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

  const pricing = PRICING[modelName];

  if (!pricing) {
    // Antes isto caía no preço do flash EM SILÊNCIO. Combinado com
    // `resolveModel`, que aceitava qualquer string do cliente, dava para usar
    // um modelo caro e registrar o custo de um barato (spec 009).
    //
    // A allow-list fecha a porta de entrada, então isto aqui virou o que
    // deveria ter sido desde o começo: um sinal. Continua caindo no default
    // porque registrar custo ZERO seria pior — subestimar o gasto é o defeito
    // que já existe em 55 das 173 linhas históricas.
    console.warn(
      `⚠️ Modelo sem preço em PRICING: "${modelName}" — custo estimado pelo preço de ${DEFAULT_MODEL}. O valor registrado é um piso, não o real.`
    );
    return computeCost(PRICING[DEFAULT_MODEL], promptTokens, completionTokens);
  }

  return computeCost(pricing, promptTokens, completionTokens);
}

/**
 * Aplica uma entrada de PRICING (simples ou em faixas) aos tokens.
 * @param {Object} pricing
 * @param {number} promptTokens
 * @param {number} completionTokens
 * @returns {number} custo em USD
 */
function computeCost(pricing, promptTokens, completionTokens) {
  // Precificação em faixas (tiered) — usa a faixa baseada no total de tokens do prompt
  if (pricing.tiers) {
    const tier = pricing.tiers.find(t => promptTokens <= t.threshold);
    const inputCost  = (promptTokens      / TOKENS_PER_MILLION) * tier.input;
    const outputCost = (completionTokens  / TOKENS_PER_MILLION) * tier.output;
    return inputCost + outputCost;
  }

  const inputCost  = (promptTokens     / TOKENS_PER_MILLION) * pricing.input;
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
 * @param {string|string[]} userIdOrIds - ID do usuário ou array de IDs (escopo do grupo)
 * @param {string|null} startDate - Data inicial (ISO string)
 * @param {string|null} endDate - Data final (ISO string)
 * @returns {Promise<Array|null>} Registros de uso ou null em caso de erro
 */
async function getUsageStats(userIdOrIds, startDate = null, endDate = null) {
  try {
    const ids = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
    if (!ids.length) return [];

    let query = supabase
      .from('api_usage')
      .select('*')
      .in('user_id', ids);

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
    // Recalcula o custo com o preço atual (corrige registros históricos com $0)
    const recordCost = calculateCost(
      record.model_name,
      record.prompt_tokens || 0,
      record.completion_tokens || 0
    );

    stats.totalCost += recordCost;
    stats.totalTokens += record.total_tokens || 0;

    // Por modelo
    if (!stats.byModel[record.model_name]) {
      stats.byModel[record.model_name] = {
        tokens: 0,
        cost: 0,
        count: 0
      };
    }
    stats.byModel[record.model_name].tokens += record.total_tokens || 0;
    stats.byModel[record.model_name].cost += recordCost;
    stats.byModel[record.model_name].count += 1;

    // Por operação
    if (!stats.byOperation[record.operation_type]) {
      stats.byOperation[record.operation_type] = {
        tokens: 0,
        cost: 0,
        count: 0
      };
    }
    stats.byOperation[record.operation_type].tokens += record.total_tokens || 0;
    stats.byOperation[record.operation_type].cost += recordCost;
    stats.byOperation[record.operation_type].count += 1;
  });

  return stats;
}

// Alias para compatibilidade com logApiUsage (que passa endpoint em vez de operationType)
// totalTokens é desestruturado de propósito para NÃO cair em ...rest (e daí em
// metadata); logUsage o recalcula. O alias _ satisfaz o lint preservando isso.
async function create({ userId, endpoint, model: modelName, promptTokens, completionTokens, totalTokens: _totalTokens, ...rest }) {
  const operationType = endpoint
    ? endpoint.replace(/^\/api\//, '').replace(/\//g, '_')
    : 'unknown';
  return logUsage({ userId, modelName, operationType, promptTokens, completionTokens, metadata: rest });
}

module.exports = {
  logUsage,
  create,
  getUsageStats,
  aggregateStats,
  calculateCost,
  PRICING
};
