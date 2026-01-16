/**
 * Utilitário para registrar uso da API de forma centralizada
 */

const ApiUsage = require('../models/ApiUsage');

/**
 * Registra uso da API de IA de forma segura (não lança erro se falhar)
 * @param {Object} params - Parâmetros do registro
 * @param {string} params.userId - ID do usuário
 * @param {string} params.endpoint - Endpoint utilizado
 * @param {Object} params.usage - Objeto de uso retornado pela IA
 * @param {Object} params.metadata - Metadados adicionais (opcional)
 */
async function logApiUsage({ userId, endpoint, usage, metadata = {} }) {
  if (!usage || !userId) return;

  try {
    await ApiUsage.create({
      userId,
      endpoint,
      model: usage.modelName || 'unknown',
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      totalTokens: usage.totalTokens || 0,
      ...metadata
    });
  } catch (error) {
    console.warn('⚠️ Erro ao registrar uso da API:', error.message);
  }
}

/**
 * Registra uso da API com operationType para o modelo ApiUsage.logUsage
 * @param {Object} params - Parâmetros do registro
 * @param {string} params.userId - ID do usuário
 * @param {string} params.operationType - Tipo de operação
 * @param {Object} params.usage - Objeto de uso retornado pela IA
 * @param {Object} params.metadata - Metadados adicionais (opcional)
 */
async function logApiUsageWithType({ userId, operationType, usage, metadata = {} }) {
  if (!usage || !userId) return;

  try {
    await ApiUsage.logUsage({
      userId,
      modelName: usage.modelName || 'unknown',
      operationType,
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      metadata
    });
  } catch (error) {
    console.warn('⚠️ Erro ao registrar uso da API:', error.message);
  }
}

module.exports = { logApiUsage, logApiUsageWithType };
