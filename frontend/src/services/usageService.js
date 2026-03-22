import api from './api';

export async function getUsageStats(period = 'month') {
  const response = await api.get(`/usage/stats?period=${period}`);
  return response.data;
}
