import api from './api';

/**
 * Obtém o modelo de IA selecionado pelo usuário
 */
const getSelectedModel = () => {
  return localStorage.getItem('ai_model') || 'gemini-2.0-flash';
};

/**
 * Compara atleta vs adversário e gera estratégia tática
 */
export async function compareAndGenerateStrategy(athleteId, opponentId) {
  console.log('🎯 Gerando estratégia:', { athleteId, opponentId });
  const model = getSelectedModel();
  const response = await api.post('/strategy/compare', {
    athleteId,
    opponentId,
    model
  });
  return response.data;
}

/**
 * Encontra o melhor atleta para enfrentar um adversário específico
 */
export async function findBestMatchup(opponentId) {
  const response = await api.get(`/strategy/best-matchup/${opponentId}`);
  return response.data;
}
