import api from './api';
import { normalizeAnalysisResponse } from './normalizers';

/**
 * Busca todas as análises de lutas
 */
export async function getAllAnalyses() {
  const response = await api.get('/fight-analysis');
  return normalizeAnalysisResponse(response.data);
}

/**
 * Busca análises de uma pessoa específica (atleta ou adversário)
 */
export async function getAnalysesByPerson(personId) {
  const response = await api.get(`/fight-analysis/person/${personId}`);
  return normalizeAnalysisResponse(response.data);
}

/**
 * Busca análise por ID
 */
export async function getAnalysisById(id) {
  const response = await api.get(`/fight-analysis/${id}`);
  return normalizeAnalysisResponse(response.data);
}

/**
 * Cria nova análise de luta
 */
export async function createAnalysis(analysisData) {
  const response = await api.post('/fight-analysis', analysisData);
  return normalizeAnalysisResponse(response.data);
}

/**
 * Deleta análise
 */
export async function deleteAnalysis(id) {
  const response = await api.delete(`/fight-analysis/${id}`);
  return response.data;
}
