// Serviço para gerenciar IA e estratégias
import api from './api';

/**
 * Solicita estratégia de luta para um atleta contra um adversário
 */
export const getStrategy = async (athleteId, opponentId) => {
  const response = await api.post('/ai/strategy', {
    athleteId,
    opponentId,
  });
  return response.data;
};

/**
 * Solicita análise de estratégia com dados brutos
 */
export const analyzeStrategy = async (athleteData, opponentData) => {
  const response = await api.post('/ai/strategy', {
    athlete: athleteData,
    opponent: opponentData,
  });
  return response.data;
};

/**
 * Gera resumo técnico de um atleta usando IA
 */
export const generateAthleteSummary = async (athleteId) => {
  const response = await api.post(`/ai/athlete-summary/${athleteId}`);
  return response.data;
};
