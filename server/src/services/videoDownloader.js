const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { VIDEO_DOWNLOAD } = require('../config/ai');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Garantir que o diretório uploads existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Verifica se yt-dlp está instalado no sistema
 * @returns {Promise<boolean>}
 */
function checkYtDlp() {
  return new Promise((resolve) => {
    execFile('yt-dlp', ['--version'], (error) => {
      resolve(!error);
    });
  });
}

/**
 * Baixa um vídeo do YouTube usando yt-dlp
 * @param {string} url - URL do YouTube
 * @returns {Promise<{filePath: string, cleanup: Function}>}
 */
async function downloadYouTubeVideo(url) {
  const isInstalled = await checkYtDlp();
  if (!isInstalled) {
    throw new Error(
      'yt-dlp não encontrado. Instale com: brew install yt-dlp (macOS) ou pip install yt-dlp'
    );
  }

  const fileName = `video_${crypto.randomBytes(8).toString('hex')}.mp4`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  const args = [
    url,
    '-f', `best[height<=${VIDEO_DOWNLOAD.MAX_HEIGHT}][ext=mp4]/best[height<=${VIDEO_DOWNLOAD.MAX_HEIGHT}]/best[ext=mp4]/best`,
    '--max-filesize', `${VIDEO_DOWNLOAD.MAX_FILE_SIZE_MB}M`,
    '--no-playlist',
    '--no-warnings',
    '-o', filePath,
  ];

  console.log(`⬇️  Baixando vídeo do YouTube...`);
  console.log(`   URL: ${url}`);

  return new Promise((resolve, reject) => {
    const proc = execFile('yt-dlp', args, {
      timeout: VIDEO_DOWNLOAD.DOWNLOAD_TIMEOUT_MS,
    }, (error, stdout, stderr) => {
      if (error) {
        // Limpar arquivo parcial se existir
        try { fs.unlinkSync(filePath); } catch (_) {}

        if (error.killed) {
          return reject(new Error(`Download excedeu o timeout de ${VIDEO_DOWNLOAD.DOWNLOAD_TIMEOUT_MS / 1000}s`));
        }
        return reject(new Error(`Falha ao baixar vídeo: ${stderr || error.message}`));
      }

      // Verificar se o arquivo foi criado
      if (!fs.existsSync(filePath)) {
        return reject(new Error('Arquivo de vídeo não foi gerado após download'));
      }

      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`✅ Vídeo baixado: ${sizeMB}MB → ${fileName}`);

      resolve({
        filePath,
        fileName,
        sizeMB: parseFloat(sizeMB),
        cleanup: () => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`🗑️  Arquivo temporário removido: ${fileName}`);
            }
          } catch (err) {
            console.warn(`⚠️  Não foi possível remover ${fileName}:`, err.message);
          }
        }
      });
    });
  });
}

module.exports = { downloadYouTubeVideo, checkYtDlp };
