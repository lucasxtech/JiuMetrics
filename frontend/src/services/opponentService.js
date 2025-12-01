// Serviço para gerenciar adversários
import api from './api';

/**
 * Busca lista de todos os adversários
 */
export const getAllOpponents = async () => {
  const response = await api.get('/opponents');
  return response.data;
};

/**
 * Busca um adversário pelo ID
 */
export const getOpponentById = async (id) => {
  const response = await api.get(`/opponents/${id}`);
  return response.data;
};

/**
 * Cria um novo adversário
 */
export const createOpponent = async (data) => {
  const response = await api.post('/opponents', data);
  return response.data;
};

/**
 * Atualiza um adversário existente
 */
export const updateOpponent = async (id, data) => {
  const response = await api.put(`/opponents/${id}`, data);
  return response.data;
};

/**
 * Deleta um adversário
 */
export const deleteOpponent = async (id) => {
  const response = await api.delete(`/opponents/${id}`);
  return response.data;
};
