import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as aiService from '../aiService';
import api from '../api';

vi.mock('../api');

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateStrategy', () => {
    it('should generate AI strategy successfully', async () => {
      const opponentData = {
        name: 'John Doe',
        weight: 75,
        height: 180,
        strengths: ['Guard', 'Submissions'],
        weaknesses: ['Takedowns']
      };

      const mockResponse = {
        success: true,
        strategy: {
          recommendations: ['Focus on takedowns', 'Avoid bottom position'],
          techniques: ['Double leg', 'Single leg'],
          gameplan: 'Aggressive top game'
        }
      };

      api.post.mockResolvedValue({ data: mockResponse });

      const result = await aiService.generateStrategy(opponentData);

      expect(api.post).toHaveBeenCalledWith('/ai/strategy', opponentData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when generating strategy', async () => {
      const opponentData = { name: 'John Doe' };
      const mockError = new Error('AI generation failed');
      api.post.mockRejectedValue(mockError);

      await expect(aiService.generateStrategy(opponentData)).rejects.toThrow('AI generation failed');
    });

    it('should handle incomplete opponent data', async () => {
      const incompleteData = { name: 'John Doe' };
      const mockError = new Error('Insufficient data for strategy generation');
      api.post.mockRejectedValue(mockError);

      await expect(aiService.generateStrategy(incompleteData)).rejects.toThrow('Insufficient data');
    });
  });

  describe('analyzeVideo', () => {
    it('should analyze video successfully', async () => {
      const videoData = {
        videoUrl: 'https://example.com/video.mp4',
        analysisType: 'technique'
      };

      const mockResponse = {
        success: true,
        analysis: {
          techniques: ['Armbar', 'Triangle'],
          positions: ['Closed guard', 'Mount'],
          insights: 'Strong guard game'
        }
      };

      api.post.mockResolvedValue({ data: mockResponse });

      const result = await aiService.analyzeVideo(videoData);

      expect(api.post).toHaveBeenCalledWith('/ai/analyze-video', videoData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle video analysis errors', async () => {
      const videoData = { videoUrl: 'invalid-url' };
      const mockError = new Error('Invalid video format');
      api.post.mockRejectedValue(mockError);

      await expect(aiService.analyzeVideo(videoData)).rejects.toThrow('Invalid video format');
    });
  });

  describe('getTechniqueRecommendations', () => {
    it('should get technique recommendations successfully', async () => {
      const athleteData = {
        athleteId: 1,
        preferredStyle: 'guard',
        weaknesses: ['takedowns']
      };

      const mockResponse = {
        success: true,
        recommendations: [
          { technique: 'Scissor sweep', priority: 'high' },
          { technique: 'Flower sweep', priority: 'medium' }
        ]
      };

      api.post.mockResolvedValue({ data: mockResponse });

      const result = await aiService.getTechniqueRecommendations(athleteData);

      expect(api.post).toHaveBeenCalledWith('/ai/technique-recommendations', athleteData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when getting recommendations', async () => {
      const mockError = new Error('Recommendation failed');
      api.post.mockRejectedValue(mockError);

      await expect(aiService.getTechniqueRecommendations({})).rejects.toThrow('Recommendation failed');
    });
  });

  describe('analyzeFightPatterns', () => {
    it('should analyze fight patterns successfully', async () => {
      const fightData = {
        athleteId: 1,
        fights: [
          { id: 1, result: 'win', techniques: ['Armbar'] },
          { id: 2, result: 'win', techniques: ['Triangle'] }
        ]
      };

      const mockResponse = {
        success: true,
        patterns: {
          winningTechniques: ['Armbar', 'Triangle'],
          preferredPositions: ['Guard'],
          successRate: 0.8
        }
      };

      api.post.mockResolvedValue({ data: mockResponse });

      const result = await aiService.analyzeFightPatterns(fightData);

      expect(api.post).toHaveBeenCalledWith('/ai/analyze-patterns', fightData);
      expect(result).toEqual(mockResponse);
    });
  });
});
