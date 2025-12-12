import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as strategyService from '../strategyService';
import api from '../api';

vi.mock('../api');

describe('strategyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStrategies', () => {
    it('should fetch all strategies successfully', async () => {
      const mockStrategies = [
        { id: 1, name: 'Strategy 1', description: 'Test strategy' },
        { id: 2, name: 'Strategy 2', description: 'Another strategy' }
      ];

      api.get.mockResolvedValue({ data: mockStrategies });

      const result = await strategyService.getStrategies();

      expect(api.get).toHaveBeenCalledWith('/strategy');
      expect(result).toEqual(mockStrategies);
    });

    it('should handle errors when fetching strategies', async () => {
      const mockError = new Error('Network error');
      api.get.mockRejectedValue(mockError);

      await expect(strategyService.getStrategies()).rejects.toThrow('Network error');
    });
  });

  describe('getStrategyById', () => {
    it('should fetch strategy by id successfully', async () => {
      const mockStrategy = { 
        id: 1, 
        name: 'Strategy 1', 
        description: 'Test strategy',
        techniques: ['Armbar', 'Triangle']
      };

      api.get.mockResolvedValue({ data: mockStrategy });

      const result = await strategyService.getStrategyById(1);

      expect(api.get).toHaveBeenCalledWith('/strategy/1');
      expect(result).toEqual(mockStrategy);
    });

    it('should handle errors when fetching strategy by id', async () => {
      const mockError = new Error('Not found');
      api.get.mockRejectedValue(mockError);

      await expect(strategyService.getStrategyById(999)).rejects.toThrow('Not found');
    });
  });

  describe('createStrategy', () => {
    it('should create strategy successfully', async () => {
      const newStrategy = { 
        name: 'New Strategy', 
        description: 'A new strategy',
        techniques: ['Guard pass']
      };
      const createdStrategy = { id: 3, ...newStrategy };

      api.post.mockResolvedValue({ data: createdStrategy });

      const result = await strategyService.createStrategy(newStrategy);

      expect(api.post).toHaveBeenCalledWith('/strategy', newStrategy);
      expect(result).toEqual(createdStrategy);
    });

    it('should handle validation errors when creating strategy', async () => {
      const invalidStrategy = { name: '' };
      const mockError = new Error('Validation error: Name is required');
      api.post.mockRejectedValue(mockError);

      await expect(strategyService.createStrategy(invalidStrategy)).rejects.toThrow('Validation error');
    });
  });

  describe('updateStrategy', () => {
    it('should update strategy successfully', async () => {
      const updatedData = { 
        name: 'Updated Strategy',
        description: 'Updated description'
      };
      const updatedStrategy = { id: 1, ...updatedData };

      api.put.mockResolvedValue({ data: updatedStrategy });

      const result = await strategyService.updateStrategy(1, updatedData);

      expect(api.put).toHaveBeenCalledWith('/strategy/1', updatedData);
      expect(result).toEqual(updatedStrategy);
    });

    it('should handle errors when updating strategy', async () => {
      const mockError = new Error('Update failed');
      api.put.mockRejectedValue(mockError);

      await expect(strategyService.updateStrategy(1, {})).rejects.toThrow('Update failed');
    });
  });

  describe('deleteStrategy', () => {
    it('should delete strategy successfully', async () => {
      api.delete.mockResolvedValue({ data: { success: true } });

      const result = await strategyService.deleteStrategy(1);

      expect(api.delete).toHaveBeenCalledWith('/strategy/1');
      expect(result).toEqual({ success: true });
    });

    it('should handle errors when deleting strategy', async () => {
      const mockError = new Error('Delete failed');
      api.delete.mockRejectedValue(mockError);

      await expect(strategyService.deleteStrategy(1)).rejects.toThrow('Delete failed');
    });
  });

  describe('getStrategiesByOpponent', () => {
    it('should fetch strategies for specific opponent', async () => {
      const mockStrategies = [
        { id: 1, opponentId: 5, name: 'Counter Strategy' }
      ];

      api.get.mockResolvedValue({ data: mockStrategies });

      const result = await strategyService.getStrategiesByOpponent(5);

      expect(api.get).toHaveBeenCalledWith('/strategy/opponent/5');
      expect(result).toEqual(mockStrategies);
    });
  });
});
