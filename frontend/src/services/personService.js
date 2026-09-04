// Serviço único de atletas/adversários (spec 013). `athleteService.js` e
// `opponentService.js` eram cópias que só diferiam no path; continuam
// existindo como fachadas nomeadas para não quebrar quem as importa.
import api from './api';
import { personLabels } from '../constants/persons';

export function personService(type) {
  const base = personLabels(type).apiPath;
  return {
    getAll: async () => (await api.get(base)).data,
    getById: async (id) => (await api.get(`${base}/${id}`)).data,
    create: async (data) => (await api.post(base, data)).data,
    update: async (id, data) => (await api.put(`${base}/${id}`, data)).data,
    remove: async (id) => (await api.delete(`${base}/${id}`)).data,
  };
}
