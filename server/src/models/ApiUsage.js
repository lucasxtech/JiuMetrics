const { supabase } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

/**
 * Cria um cliente Supabase autenticado com o token do usuário
 */
function getAuthenticatedClient(accessToken) {
  if (!accessToken) return supabase;
  
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}

/**
 * Preços do Google Gemini (USD por 1 milhão de tokens)
 * Fonte: https://ai.google.dev/pricing
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
 */
function calculateCost(modelName, promptTokens, completionTokens) {
  const pricing = PRICING[modelName] || PRICING['gemini-2.0-flash'];
  
  const inputCost = (promptTokens / 1000000) * pricing.input;
  const outputCost = (completionTokens / 1000000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Registra uso da API Gemini
 */
async function logUsage({ userId, modelName, operationType, promptTokens, completionTokens, metadata = {}, accessToken = null }) {
  try {
    const totalTokens = promptTokens + completionTokens;
    const estimatedCost = calculateCost(modelName, promptTokens, completionTokens);

    // Usar cliente autenticado se tiver token
    const client = getAuthenticatedClient(accessToken);
    
    console.log('📊 Tentando salvar uso da API:', {
      userId,
      modelName,
      operationType,
      totalTokens,
      estimatedCost,
      hasToken: !!accessToken
    });

    const { data, error } = await client
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
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao salvar api_usage:', error);
      console.error('💡 Sugestão: Verifique se a tabela api_usage foi criada e as policies RLS estão corretas no Supabase');
      // Não lançar erro - apenas logar e continuar
      return null;
    }

    console.log(`💰 Uso registrado: ${modelName} - ${totalTokens} tokens - $${estimatedCost.toFixed(6)}`);
    return data;
  } catch (err) {
    console.error('❌ Erro ao registrar uso da API:', err.message);
    // Não lançar erro - apenas logar e continuar
    return null;
  }
}

/**
 * Busca estatísticas de uso por período
 */
async function getUsageStats(userId, startDate = null, endDate = null) {
  try {
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
      console.error('❌ Erro ao buscar usage stats:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('❌ Erro ao buscar estatísticas:', err);
    return null;
  }
}

/**
 * Calcula estatísticas agregadas
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
