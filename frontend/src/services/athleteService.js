// Serviço para gerenciar atletas
import api from './api';

/**
 * Busca lista de todos os atletas
 */
export const getAllAthletes = async () => {
  const response = await api.get('/athletes');
  return response.data;
};

/**
 * Busca um atleta pelo ID
 */
export const getAthleteById = async (id) => {
  const response = await api.get(`/athletes/${id}`);
  return response.data;
};

/**
 * Cria um novo atleta
 */
export const createAthlete = async (data) => {
  const response = await api.post('/athletes', data);
  return response.data;
};

/**
 * Atualiza um atleta existente
 */
export const updateAthlete = async (id, data) => {
  const response = await api.put(`/athletes/${id}`, data);
  return response.data;
};

/**
 * Deleta um atleta
 */
export const deleteAthlete = async (id) => {
  const response = await api.delete(`/athletes/${id}`);
  return response.data;
};
