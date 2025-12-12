import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as opponentService from '../opponentService';
import api from '../api';

vi.mock('../api');

describe('opponentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOpponents', () => {
    it('should fetch all opponents successfully', async () => {
      const mockOpponents = [
        { id: 1, name: 'Opponent 1', weight: 75 },
        { id: 2, name: 'Opponent 2', weight: 80 }
      ];

      api.get.mockResolvedValue({ data: mockOpponents });

      const result = await opponentService.getOpponents();

      expect(api.get).toHaveBeenCalledWith('/opponents');
      expect(result).toEqual(mockOpponents);
    });

    it('should handle errors when fetching opponents', async () => {
      const mockError = new Error('Network error');
      api.get.mockRejectedValue(mockError);

      await expect(opponentService.getOpponents()).rejects.toThrow('Network error');
    });
  });

  describe('getOpponentById', () => {
    it('should fetch opponent by id successfully', async () => {
      const mockOpponent = { id: 1, name: 'Opponent 1', weight: 75 };

      api.get.mockResolvedValue({ data: mockOpponent });

      const result = await opponentService.getOpponentById(1);

      expect(api.get).toHaveBeenCalledWith('/opponents/1');
      expect(result).toEqual(mockOpponent);
    });

    it('should handle errors when fetching opponent by id', async () => {
      const mockError = new Error('Not found');
      api.get.mockRejectedValue(mockError);

      await expect(opponentService.getOpponentById(999)).rejects.toThrow('Not found');
    });
  });

  describe('createOpponent', () => {
    it('should create opponent successfully', async () => {
      const newOpponent = { name: 'New Opponent', weight: 70 };
      const createdOpponent = { id: 3, ...newOpponent };

      api.post.mockResolvedValue({ data: createdOpponent });

      const result = await opponentService.createOpponent(newOpponent);

      expect(api.post).toHaveBeenCalledWith('/opponents', newOpponent);
      expect(result).toEqual(createdOpponent);
    });

    it('should handle validation errors when creating opponent', async () => {
      const invalidOpponent = { name: '' };
      const mockError = new Error('Validation error');
      api.post.mockRejectedValue(mockError);

      await expect(opponentService.createOpponent(invalidOpponent)).rejects.toThrow('Validation error');
    });
  });

  describe('updateOpponent', () => {
    it('should update opponent successfully', async () => {
      const updatedData = { name: 'Updated Opponent' };
      const updatedOpponent = { id: 1, ...updatedData };

      api.put.mockResolvedValue({ data: updatedOpponent });

      const result = await opponentService.updateOpponent(1, updatedData);

      expect(api.put).toHaveBeenCalledWith('/opponents/1', updatedData);
      expect(result).toEqual(updatedOpponent);
    });
  });

  describe('deleteOpponent', () => {
    it('should delete opponent successfully', async () => {
      api.delete.mockResolvedValue({ data: { success: true } });

      const result = await opponentService.deleteOpponent(1);

      expect(api.delete).toHaveBeenCalledWith('/opponents/1');
      expect(result).toEqual({ success: true });
    });

    it('should handle errors when deleting opponent', async () => {
      const mockError = new Error('Delete failed');
      api.delete.mockRejectedValue(mockError);

      await expect(opponentService.deleteOpponent(1)).rejects.toThrow('Delete failed');
    });
  });
});
