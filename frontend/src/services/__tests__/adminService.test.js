import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../adminService';
import api from '../api';

vi.mock('../api');

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('envia profile, isAdmin, createAthlete e athlete.belt (spec 014)', async () => {
      const payload = {
        name: 'João', email: 'joao@example.com', password: 'senha123',
        profile: 'atleta', isAdmin: false, createAthlete: true, athlete: { belt: 'Azul' },
      };
      api.post.mockResolvedValue({ data: { success: true, data: {} } });

      await adminService.createUser(payload);

      expect(api.post).toHaveBeenCalledWith('/admin/users', payload);
    });
  });

  describe('changeProfile', () => {
    it('faz PATCH em /admin/users/:id/profile com { profile }', async () => {
      api.patch.mockResolvedValue({ data: { success: true, data: {} } });

      await adminService.changeProfile('u1', 'professor');

      expect(api.patch).toHaveBeenCalledWith('/admin/users/u1/profile', { profile: 'professor' });
    });
  });

  describe('linkAthlete', () => {
    it('faz PATCH em /admin/users/:id/athlete com { athleteId }', async () => {
      api.patch.mockResolvedValue({ data: { success: true, data: {} } });

      await adminService.linkAthlete('u1', 'a1');

      expect(api.patch).toHaveBeenCalledWith('/admin/users/u1/athlete', { athleteId: 'a1' });
    });

    it('desvincula enviando athleteId: null', async () => {
      api.patch.mockResolvedValue({ data: { success: true, data: {} } });

      await adminService.linkAthlete('u1', null);

      expect(api.patch).toHaveBeenCalledWith('/admin/users/u1/athlete', { athleteId: null });
    });
  });

  describe('deleteUser', () => {
    it('CRÍTICO: envia { data: {} } — nunca transferToUserId (spec 014, R-13, backend rejeita com 400)', async () => {
      api.delete.mockResolvedValue({ data: { success: true, message: 'ok', deleted: {} } });

      await adminService.deleteUser('u1');

      expect(api.delete).toHaveBeenCalledWith('/admin/users/u1/permanent', { data: {} });
      expect(api.delete).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        data: expect.objectContaining({ transferToUserId: expect.anything() }),
      }));
    });

    it('ignora um segundo argumento, se alguém passar um por engano', async () => {
      api.delete.mockResolvedValue({ data: { success: true, message: 'ok', deleted: {} } });

      await adminService.deleteUser('u1', 'u2');

      expect(api.delete).toHaveBeenCalledWith('/admin/users/u1/permanent', { data: {} });
    });
  });
});
