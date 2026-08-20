import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeVideoLink, isValidVideoUrl } from '../videoAnalysisService';
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

    expect(api.post).toHaveBeenCalledWith('/ai/analyze-link', {
      ...payload,
      model: expect.any(String) // Aceita qualquer modelo
    });
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

describe('isValidVideoUrl (SPEC-010, R8)', () => {
  it.each([
    'https://youtube.com/watch?v=abc',
    'https://www.youtube.com/watch?v=abc',
    'https://m.youtube.com/watch?v=abc',
    'https://youtu.be/abc',
    'https://www.youtube.com/shorts/abc',
  ])('aceita host exato do YouTube: %s', (url) => {
    expect(isValidVideoUrl(url)).toBe(true);
  });

  it.each([
    // `hostname.includes('youtube.com')` deixava estes passarem
    'https://youtube.com.attacker.net/watch?v=abc',
    'https://evil-youtube.com/watch?v=abc',
    'https://notyoutu.be/abc',
    // `url.includes('video')` deixava QUALQUER coisa com "video" passar
    'https://attacker.net/video',
    'https://attacker.net/?x=video',
    // O backend só suporta YouTube — prometer Vimeo/Drive aqui é aceitar
    // algo que a análise recusa depois
    'https://vimeo.com/12345',
    'https://drive.google.com/file/d/abc',
  ])('rejeita %s', (url) => {
    expect(isValidVideoUrl(url)).toBe(false);
  });

  it('rejeita esquema não-http', () => {
    expect(isValidVideoUrl('javascript:alert(1)//youtube.com')).toBe(false);
    expect(isValidVideoUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejeita entrada que não é URL', () => {
    expect(isValidVideoUrl('')).toBe(false);
    expect(isValidVideoUrl('youtube.com/watch?v=abc')).toBe(false);
    expect(isValidVideoUrl(null)).toBe(false);
  });
});
