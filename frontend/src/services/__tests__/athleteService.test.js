import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllAthletes,
  getAthleteById,
  createAthlete,
  updateAthlete,
  deleteAthlete,
} from '../athleteService';
import api from '../api';

vi.mock('../api');

describe('athleteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAthletes', () => {
    it('deve retornar lista de atletas', async () => {
      const mockAthletes = [
        { id: '1', name: 'João Silva', belt: 'Faixa Preta' },
        { id: '2', name: 'Maria Santos', belt: 'Faixa Marrom' },
      ];

      api.get.mockResolvedValue({ data: mockAthletes });

      const result = await getAllAthletes();

      expect(api.get).toHaveBeenCalledWith('/athletes');
      expect(result).toEqual(mockAthletes);
    });

    it('deve propagar erro em caso de falha', async () => {
      const error = new Error('Network error');
      api.get.mockRejectedValue(error);

      await expect(getAllAthletes()).rejects.toThrow('Network error');
    });
  });

  describe('getAthleteById', () => {
    it('deve retornar atleta específico', async () => {
      const mockAthlete = { id: '123', name: 'João Silva', belt: 'Faixa Preta' };

      api.get.mockResolvedValue({ data: mockAthlete });

      const result = await getAthleteById('123');

      expect(api.get).toHaveBeenCalledWith('/athletes/123');
      expect(result).toEqual(mockAthlete);
    });

    it('deve lidar com ID inválido', async () => {
      const error = new Error('Athlete not found');
      api.get.mockRejectedValue(error);

      await expect(getAthleteById('invalid-id')).rejects.toThrow('Athlete not found');
    });
  });

  describe('createAthlete', () => {
    it('deve criar novo atleta com sucesso', async () => {
      const newAthlete = {
        name: 'João Silva',
        belt: 'Faixa Preta',
        weight: 85,
        height: 180,
      };

      const createdAthlete = { id: '123', ...newAthlete };

      api.post.mockResolvedValue({ data: createdAthlete });

      const result = await createAthlete(newAthlete);

      expect(api.post).toHaveBeenCalledWith('/athletes', newAthlete);
      expect(result).toEqual(createdAthlete);
      expect(result.id).toBeDefined();
    });

    it('deve validar dados obrigatórios', async () => {
      const error = new Error('Nome é obrigatório');
      api.post.mockRejectedValue(error);

      await expect(createAthlete({})).rejects.toThrow('Nome é obrigatório');
    });
  });

  describe('updateAthlete', () => {
    it('deve atualizar atleta existente', async () => {
      const updateData = { name: 'João Silva Updated', weight: 90 };
      const updatedAthlete = { id: '123', ...updateData };

      api.put.mockResolvedValue({ data: updatedAthlete });

      const result = await updateAthlete('123', updateData);

      expect(api.put).toHaveBeenCalledWith('/athletes/123', updateData);
      expect(result).toEqual(updatedAthlete);
    });

    it('deve lidar com erro ao atualizar', async () => {
      const error = new Error('Update failed');
      api.put.mockRejectedValue(error);

      await expect(updateAthlete('123', {})).rejects.toThrow('Update failed');
    });
  });

  describe('deleteAthlete', () => {
    it('deve deletar atleta com sucesso', async () => {
      const response = { success: true, message: 'Atleta deletado' };

      api.delete.mockResolvedValue({ data: response });

      const result = await deleteAthlete('123');

      expect(api.delete).toHaveBeenCalledWith('/athletes/123');
      expect(result).toEqual(response);
    });

    it('deve lidar com erro ao deletar', async () => {
      const error = new Error('Delete failed');
      api.delete.mockRejectedValue(error);

      await expect(deleteAthlete('123')).rejects.toThrow('Delete failed');
    });
  });
});
