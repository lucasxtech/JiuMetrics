// Serviço para gerenciar IA e estratégias
import api from './api';

/**
 * Gera resumo técnico de um atleta usando IA
 */
export const generateAthleteSummary = async (athleteData) => {
  const response = await api.post('/ai/athlete-summary', { athleteData });
  return response.data;
};
