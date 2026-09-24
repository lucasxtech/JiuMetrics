import api from './api';

export const adminService = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  changeRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  changeProfile: (id, profile) => api.patch(`/admin/users/${id}/profile`, { profile }),
  linkAthlete: (id, athleteId) => api.patch(`/admin/users/${id}/athlete`, { athleteId }),
  deactivateUser: (id) => api.delete(`/admin/users/${id}`),
  reactivateUser: (id) => api.post(`/admin/users/${id}/reactivate`),
  // Exclusão sem transferência (spec 014, R7/R-13): o backend rejeita
  // `transferToUserId` com 400 — nunca envie um segundo argumento aqui.
  deleteUser: (id) => api.delete(`/admin/users/${id}/permanent`, { data: {} }),
};
