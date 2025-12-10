import api from './api';

/**
 * Faz upload de vídeos e retorna análise
 * @param {Object} payload
 * @param {Array} payload.videos - Array de objetos {file, giColor}
 * @param {string} [payload.personId]
 * @param {string} [payload.personType]
 * @param {string} payload.athleteName - Nome do atleta focal
 */
export async function uploadVideo({ videos, personId = null, personType = null, athleteName }) {
  const formData = new FormData();
  
  // Adicionar cada vídeo com sua cor de kimono
  videos.forEach((video, index) => {
    formData.append('videos', video.file);
    formData.append(`giColors[${index}]`, video.giColor);
  });

  // Se informações de pessoa forem fornecidas, adicionar ao form
  if (personId) {
    formData.append('personId', personId);
  }
  if (personType) {
    formData.append('personType', personType);
  }
  if (athleteName) {
    formData.append('athleteName', athleteName);
  }

  const response = await api.post('/video/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Valida se é um arquivo de vídeo
 */
export function isValidVideoFile(file) {
  const validTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ];

  return file && validTypes.includes(file.type);
}
