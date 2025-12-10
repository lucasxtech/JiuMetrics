import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeVideoLink } from '../videoAnalysisService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('videoAnalysisService', () => {
  beforeEach(() => {
    api.post.mockReset();
  });

  it('envia a URL e o contexto correto para o backend', async () => {
    const payload = {
      videos: ['https://youtube.com/watch?v=abc'],
      personId: '123',
      personType: 'athlete',
      athleteName: 'João Silva',
    };

    api.post.mockResolvedValue({ data: { success: true } });

    const response = await analyzeVideoLink(payload);

    expect(api.post).toHaveBeenCalledWith('/ai/analyze-link', payload);
    expect(response).toEqual({ success: true });
  });

  it('propaga erros do axios', async () => {
    const error = new Error('request failed');
    api.post.mockRejectedValue(error);

    await expect(
      analyzeVideoLink({ url: 'https://ex.com', athleteName: 'A', giColor: 'branco' })
    ).rejects.toThrow('request failed');
  });
});
