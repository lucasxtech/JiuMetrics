const fs = require('fs');

/**
 * Converte imagem para base64
 */
function frameToBase64(framePath) {
  try {
    const imageBuffer = fs.readFileSync(framePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Erro ao converter frame para base64:', error);
    throw error;
  }
}

module.exports = { frameToBase64 };
