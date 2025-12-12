import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fightAnalysisService from '../fightAnalysisService';
import api from '../api';

vi.mock('../api');

describe('fightAnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAnalyses', () => {
    it('should fetch all fight analyses successfully', async () => {
      const mockAnalyses = [
        { id: 1, athleteId: 1, date: '2025-01-01', result: 'win' },
        { id: 2, athleteId: 2, date: '2025-01-02', result: 'loss' }
      ];

      api.get.mockResolvedValue({ data: mockAnalyses });

      const result = await fightAnalysisService.getAnalyses();

      expect(api.get).toHaveBeenCalledWith('/fight-analysis');
      expect(result).toEqual(mockAnalyses);
    });

    it('should handle errors when fetching analyses', async () => {
      const mockError = new Error('Network error');
      api.get.mockRejectedValue(mockError);

      await expect(fightAnalysisService.getAnalyses()).rejects.toThrow('Network error');
    });
  });

  describe('getAnalysisById', () => {
    it('should fetch fight analysis by id successfully', async () => {
      const mockAnalysis = { 
        id: 1, 
        athleteId: 1,
        date: '2025-01-01',
        result: 'win',
        techniques: ['Armbar', 'Triangle'],
        notes: 'Great performance'
      };

      api.get.mockResolvedValue({ data: mockAnalysis });

      const result = await fightAnalysisService.getAnalysisById(1);

      expect(api.get).toHaveBeenCalledWith('/fight-analysis/1');
      expect(result).toEqual(mockAnalysis);
    });

    it('should handle errors when fetching analysis by id', async () => {
      const mockError = new Error('Not found');
      api.get.mockRejectedValue(mockError);

      await expect(fightAnalysisService.getAnalysisById(999)).rejects.toThrow('Not found');
    });
  });

  describe('createAnalysis', () => {
    it('should create fight analysis successfully', async () => {
      const newAnalysis = { 
        athleteId: 1,
        date: '2025-01-15',
        result: 'win',
        techniques: ['Guard pass'],
        notes: 'Dominated from top position'
      };
      const createdAnalysis = { id: 3, ...newAnalysis };

      api.post.mockResolvedValue({ data: createdAnalysis });

      const result = await fightAnalysisService.createAnalysis(newAnalysis);

      expect(api.post).toHaveBeenCalledWith('/fight-analysis', newAnalysis);
      expect(result).toEqual(createdAnalysis);
    });

    it('should handle validation errors when creating analysis', async () => {
      const invalidAnalysis = { athleteId: null };
      const mockError = new Error('Validation error: Athlete ID is required');
      api.post.mockRejectedValue(mockError);

      await expect(fightAnalysisService.createAnalysis(invalidAnalysis)).rejects.toThrow('Validation error');
    });
  });

  describe('updateAnalysis', () => {
    it('should update fight analysis successfully', async () => {
      const updatedData = { 
        result: 'loss',
        notes: 'Updated notes'
      };
      const updatedAnalysis = { id: 1, athleteId: 1, ...updatedData };

      api.put.mockResolvedValue({ data: updatedAnalysis });

      const result = await fightAnalysisService.updateAnalysis(1, updatedData);

      expect(api.put).toHaveBeenCalledWith('/fight-analysis/1', updatedData);
      expect(result).toEqual(updatedAnalysis);
    });

    it('should handle errors when updating analysis', async () => {
      const mockError = new Error('Update failed');
      api.put.mockRejectedValue(mockError);

      await expect(fightAnalysisService.updateAnalysis(1, {})).rejects.toThrow('Update failed');
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete fight analysis successfully', async () => {
      api.delete.mockResolvedValue({ data: { success: true } });

      const result = await fightAnalysisService.deleteAnalysis(1);

      expect(api.delete).toHaveBeenCalledWith('/fight-analysis/1');
      expect(result).toEqual({ success: true });
    });

    it('should handle errors when deleting analysis', async () => {
      const mockError = new Error('Delete failed');
      api.delete.mockRejectedValue(mockError);

      await expect(fightAnalysisService.deleteAnalysis(1)).rejects.toThrow('Delete failed');
    });
  });

  describe('getAnalysesByAthlete', () => {
    it('should fetch analyses for specific athlete', async () => {
      const mockAnalyses = [
        { id: 1, athleteId: 5, result: 'win' },
        { id: 2, athleteId: 5, result: 'win' }
      ];

      api.get.mockResolvedValue({ data: mockAnalyses });

      const result = await fightAnalysisService.getAnalysesByAthlete(5);

      expect(api.get).toHaveBeenCalledWith('/fight-analysis/athlete/5');
      expect(result).toEqual(mockAnalyses);
    });
  });

  describe('getStatistics', () => {
    it('should fetch fight statistics successfully', async () => {
      const mockStats = {
        totalFights: 10,
        wins: 7,
        losses: 3,
        winRate: 0.7,
        mostUsedTechniques: ['Armbar', 'Triangle']
      };

      api.get.mockResolvedValue({ data: mockStats });

      const result = await fightAnalysisService.getStatistics();

      expect(api.get).toHaveBeenCalledWith('/fight-analysis/statistics');
      expect(result).toEqual(mockStats);
    });
  });
});
