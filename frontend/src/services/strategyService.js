import api from './api';

/**
 * Compara atleta vs adversário e gera estratégia tática
 */
export async function compareAndGenerateStrategy(athleteId, opponentId) {
  const response = await api.post('/strategy/compare', {
    athleteId,
    opponentId,
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
