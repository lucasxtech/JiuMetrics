// Serviço para gerenciar IA e estratégias
import api from './api';
import { getSelectedModel } from '../utils/aiConfig';

/**
 * Gera resumo técnico de um atleta usando IA
 *
 * O contrato mudou na spec 006 (AZ-7): antes esta função enviava o objeto
 * `athleteData` inteiro, que ia direto para o prompt sem verificação de posse.
 * Agora envia só o `athleteId` e o servidor carrega os dados dentro do escopo
 * do usuário.
 *
 * @param {string} athleteId - ID do atleta
 */
export const generateAthleteSummary = async (athleteId) => {
  const model = getSelectedModel();
  const response = await api.post('/ai/athlete-summary', {
    athleteId,
    model
  });
  return response.data;
};

/**
 * Consolida todas as análises de um lutador e salva no perfil
 * USA: StrategyService.consolidateAnalyses (com gráficos e stats narrativos)
 * @param {string} personId - ID do atleta ou adversário
 * @param {string} personType - 'athlete' ou 'opponent'
 */
export const consolidateProfile = async (personId, personType) => {
  const model = getSelectedModel();
  const response = await api.post('/ai/consolidate-profile', { 
    personId,
    personType,
    model 
  });
  return response.data;
};
