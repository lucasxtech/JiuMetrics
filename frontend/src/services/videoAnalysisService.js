import api from './api';

/**
 * Envia um link de vídeo para análise pela IA
 * @param {Object} payload
 * @param {string} payload.url - URL do vídeo
 * @param {string} payload.athleteName - Nome do atleta alvo
 * @param {string} payload.giColor - Cor do kimono do atleta alvo
 * @returns {Promise} Resposta da IA com análise
 */
export async function analyzeVideoLink({ url, athleteName, giColor }) {
  console.log('Analisando vídeo:', url, athleteName, giColor);

  try {
    const response = await api.post('/ai/analyze-link', {
      url,
      athleteName,
      giColor,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao analisar vídeo:', error);
    throw error;
  }
}

/**
 * Valida se a URL do vídeo é válida
 * @param {string} url - URL a validar
 * @returns {boolean} True se válida
 */
export function isValidVideoUrl(url) {
  try {
    const videoUrl = new URL(url);
    // Aceita YouTube, Vimeo e URLs diretas
    const validHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'drive.google.com'];
    return validHosts.some(host => videoUrl.hostname.includes(host)) || url.includes('video');
  } catch {
    return false;
  }
}

/**
 * Extrai ID do vídeo YouTube
 * @param {string} url - URL do YouTube
 * @returns {string} ID do vídeo
 */
export function extractYoutubeId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
