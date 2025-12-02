import api from './api';

/**
 * Faz upload de vídeo e retorna análise
 * @param {Object} payload
 * @param {File} payload.file - Arquivo de vídeo
 * @param {string} [payload.personId]
 * @param {string} [payload.personType]
 * @param {string} payload.athleteName - Nome do atleta focal
 * @param {string} payload.giColor - Cor do kimono do atleta focal
 */
export async function uploadVideo({ file, personId = null, personType = null, athleteName, giColor }) {
  const formData = new FormData();
  formData.append('video', file);

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
  if (giColor) {
    formData.append('giColor', giColor);
  }

  try {
    const response = await api.post('/video/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
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
