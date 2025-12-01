import api from './api';

/**
 * Faz upload de vídeo e retorna análise
 * @param {File} file - Arquivo de vídeo
 * @param {string} personId - ID do atleta ou adversário (opcional)
 * @param {string} personType - 'athlete' ou 'opponent' (opcional)
 */
export async function uploadVideo(file, personId = null, personType = null) {
  const formData = new FormData();
  formData.append('video', file);
  
  // Se informações de pessoa forem fornecidas, adicionar ao form
  if (personId) {
    formData.append('personId', personId);
  }
  if (personType) {
    formData.append('personType', personType);
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
