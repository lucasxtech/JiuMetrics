const { GoogleAIFileManager, FileState } = require('@google/generative-ai/server');

const apiKey = process.env.GEMINI_API_KEY;
let fileManager = null;

/**
 * Retorna instância do GoogleAIFileManager (lazy init)
 */
function getFileManager() {
  if (!fileManager && apiKey) {
    fileManager = new GoogleAIFileManager(apiKey);
  }
  if (!fileManager) {
    throw new Error('GEMINI_API_KEY não configurada — File API indisponível');
  }
  return fileManager;
}

/**
 * Faz upload de um vídeo para a Gemini File API
 * @param {string} filePath - Caminho do arquivo local
 * @param {string} mimeType - MIME type (ex: 'video/mp4')
 * @param {string} displayName - Nome de exibição (opcional)
 * @returns {Promise<{uri: string, name: string, mimeType: string}>}
 */
async function uploadVideoToGemini(filePath, mimeType = 'video/mp4', displayName = 'fight-video') {
  const fm = getFileManager();

  console.log(`📤 Enviando vídeo para Gemini File API...`);
  console.log(`   Arquivo: ${filePath}`);

  const uploadResult = await fm.uploadFile(filePath, {
    mimeType,
    displayName,
  });

  const file = uploadResult.file;
  console.log(`📤 Upload concluído: ${file.name} (estado: ${file.state})`);

  // Aguardar processamento se necessário
  if (file.state === FileState.PROCESSING) {
    const readyFile = await waitForProcessing(file.name);
    return {
      uri: readyFile.uri,
      name: readyFile.name,
      mimeType: readyFile.mimeType,
    };
  }

  if (file.state === FileState.FAILED) {
    throw new Error(`File API rejeitou o vídeo: processamento falhou (${file.name})`);
  }

  return {
    uri: file.uri,
    name: file.name,
    mimeType: file.mimeType,
  };
}

/**
 * Aguarda até que o arquivo esteja no estado ACTIVE
 * @param {string} fileName - Nome do arquivo na File API
 * @param {number} maxWaitMs - Tempo máximo de espera (ms)
 * @returns {Promise<Object>} Arquivo pronto
 */
async function waitForProcessing(fileName, maxWaitMs = 120000) {
  const fm = getFileManager();
  const startTime = Date.now();
  let pollInterval = 2000; // Começa com 2s

  console.log(`⏳ Aguardando processamento do vídeo...`);

  while (Date.now() - startTime < maxWaitMs) {
    const result = await fm.getFile(fileName);

    if (result.state === FileState.ACTIVE) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Vídeo pronto para análise (${elapsed}s)`);
      return result;
    }

    if (result.state === FileState.FAILED) {
      throw new Error(`Processamento do vídeo falhou na File API (${fileName})`);
    }

    // Backoff: 2s → 3s → 4s → 5s (cap)
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    pollInterval = Math.min(pollInterval + 1000, 5000);
  }

  throw new Error(`Timeout: vídeo não ficou pronto em ${maxWaitMs / 1000}s`);
}

/**
 * Remove um arquivo da Gemini File API
 * @param {string} fileName - Nome do arquivo
 */
async function deleteFileFromGemini(fileName) {
  try {
    const fm = getFileManager();
    await fm.deleteFile(fileName);
    console.log(`🗑️  Arquivo removido da File API: ${fileName}`);
  } catch (err) {
    console.warn(`⚠️  Não foi possível remover da File API: ${err.message}`);
  }
}

module.exports = { uploadVideoToGemini, deleteFileFromGemini, waitForProcessing };
