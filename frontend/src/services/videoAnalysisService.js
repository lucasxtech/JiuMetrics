import api from './api';
import { getSelectedModel } from '../utils/aiConfig';

/**
 * Envia links de vídeos para análise pela IA
 * @param {Object} payload
 * @param {Array} payload.videos - Array de objetos {url, giColor}
 * @param {string} payload.athleteName - Nome do atleta alvo
 * @param {string} payload.personId - ID do atleta/adversário
 * @param {string} payload.personType - 'athlete' ou 'opponent'
 * @param {string} payload.matchResult - Resultado da luta (opcional)
 * @param {string} payload.belt - Faixa do atleta (opcional)
 * @returns {Promise} Resposta da IA com análise
 */
export async function analyzeVideoLink({ videos, athleteName, personId, personType, matchResult, belt }) {
  const model = getSelectedModel();

  try {
    const response = await api.post('/ai/analyze-link', {
      videos,
      athleteName,
      personId,
      personType,
      model,
      matchResult,
      belt
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao analisar vídeos:', error);
    throw error;
  }
}

/**
 * Valida se a URL do vídeo é válida
 * @param {string} url - URL a validar
 * @returns {boolean} True se válida
 */
/**
 * Hosts do YouTube aceitos — comparação EXATA, não `includes`.
 *
 * O backend só suporta YouTube (`extractYouTubeId`), então aceitar Vimeo e
 * Drive aqui prometia ao usuário algo que a análise ia recusar depois.
 */
const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be'
];

export function isValidVideoUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);

    // `hostname.includes('youtube.com')` deixava passar
    // `youtube.com.attacker.net`, e `url.includes('video')` deixava passar
    // QUALQUER URL contendo a palavra "video" (F11). Comparação exata fecha
    // as duas portas.
    if (protocol !== 'http:' && protocol !== 'https:') return false;

    return YOUTUBE_HOSTS.includes(hostname.toLowerCase());
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
