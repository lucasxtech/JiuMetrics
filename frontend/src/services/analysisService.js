// Serviço para Análises Táticas
import api from './api';

/**
 * Lista todas as análises táticas do usuário
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise} Response com lista de análises
 */
export const getAllAnalyses = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.athleteId) params.append('athleteId', filters.athleteId);
  if (filters.opponentId) params.append('opponentId', filters.opponentId);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const queryString = params.toString();
  const url = `/strategy/analyses${queryString ? `?${queryString}` : ''}`;

  const response = await api.get(url);
  // Backend retorna { success: true, data: [...], total, page }
  // api.get retorna axios response, então precisamos de response.data.data
  return response.data?.data || [];
};

/**
 * Busca uma análise tática específica por ID
 * @param {string} id - ID da análise
 * @returns {Promise} Response com dados da análise
 */
export const getAnalysisById = async (id) => {
  const response = await api.get(`/strategy/analyses/${id}`);
  return response.data?.data || null;
};

/**
 * Atualiza uma análise tática
 * @param {string} id - ID da análise
 * @param {Object} data - Dados a atualizar
 * @returns {Promise} Response com análise atualizada
 */
export const updateAnalysis = async (id, data) => {
  const response = await api.patch(`/strategy/analyses/${id}`, data);
  return response.data?.data || response.data;
};

/**
 * Deleta uma análise tática
 * @param {string} id - ID da análise
 * @returns {Promise} Response
 */
export const deleteAnalysis = async (id) => {
  return api.delete(`/strategy/analyses/${id}`);
};

// ========== VERSÕES DE ESTRATÉGIA ==========

/**
 * Busca todas as versões de uma análise tática
 * @param {string} analysisId - ID da análise
 * @returns {Promise} Response com lista de versões
 */
export const getStrategyVersions = async (analysisId) => {
  const response = await api.get(`/strategy/analyses/${analysisId}/versions`);
  return response.data?.versions || [];
};

/**
 * Restaura uma versão específica da estratégia
 * @param {string} analysisId - ID da análise
 * @param {string} versionId - ID da versão a restaurar
 * @returns {Promise} Response com nova versão e conteúdo restaurado
 */
export const restoreStrategyVersion = async (analysisId, versionId) => {
  const response = await api.post(`/strategy/analyses/${analysisId}/versions/${versionId}/restore`);
  return response.data;
};
