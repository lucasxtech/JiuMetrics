// Serviço para gerenciar IA e estratégias
import api from './api';

/**
 * Obtém o modelo de IA selecionado pelo usuário
 */
const getSelectedModel = () => {
  return localStorage.getItem('ai_model') || 'gemini-2.0-flash';
};

/**
 * Gera resumo técnico de um atleta usando IA
 */
export const generateAthleteSummary = async (athleteData) => {
  const model = getSelectedModel();
  const response = await api.post('/ai/athlete-summary', { 
    athleteData,
    model 
  });
  return response.data;
};
