const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

/**
 * Extrai frames do vídeo em intervalos regulares
 */
async function extractFrames(videoPath, numFrames = 8) {
  return new Promise((resolve, reject) => {
    const videoDir = path.dirname(videoPath);
    const frameDir = path.join(videoDir, 'frames');
    
    // Criar diretório de frames se não existir
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }

    const frames = [];

    ffmpeg(videoPath)
      .screenshots({
        count: numFrames,
        folder: frameDir,
        filename: 'frame-%i.png'
      })
      .on('error', (err) => {
        console.error('Erro ao extrair frames:', err);
        reject(err);
      })
      .on('end', () => {
        // Listar todos os frames extraídos
        try {
          const files = fs.readdirSync(frameDir).filter(f => f.startsWith('frame-'));
          files.forEach(file => {
            frames.push(path.join(frameDir, file));
          });
          frames.sort();
          console.log(`✅ ${frames.length} frames extraídos com sucesso`);
          resolve(frames);
        } catch (err) {
          reject(err);
        }
      });
  });
}

module.exports = { extractFrames };
