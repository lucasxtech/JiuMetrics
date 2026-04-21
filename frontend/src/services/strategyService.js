import api from './api';
import { getSelectedModel } from '../utils/aiConfig';

/**
 * Compara atleta vs adversário e gera estratégia tática
 */
export async function compareAndGenerateStrategy(athleteId, opponentId) {
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
