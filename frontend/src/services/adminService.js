import api from './api';

export const adminService = {
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  changeRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deactivateUser: (id) => api.delete(`/admin/users/${id}`),
  reactivateUser: (id) => api.post(`/admin/users/${id}/reactivate`),
};
