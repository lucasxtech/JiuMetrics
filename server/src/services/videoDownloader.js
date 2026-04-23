const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { VIDEO_DOWNLOAD } = require('../config/ai');
const { VideoDownloadError } = require('../utils/errors');

// Em serverless (Vercel), usar /tmp; localmente, usar uploads/
const UPLOADS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'video-uploads')
  : path.join(__dirname, '../../uploads');

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
 * Baixa um vídeo do YouTube usando yt-dlp (binário)
 * @param {string} url - URL do YouTube
 * @returns {Promise<{filePath: string, cleanup: Function}>}
 */
async function downloadWithYtDlp(url) {
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

  console.log(`⬇️  Baixando vídeo do YouTube (yt-dlp)...`);
  console.log(`   URL: ${url}`);

  return new Promise((resolve, reject) => {
    execFile('yt-dlp', args, {
      timeout: VIDEO_DOWNLOAD.DOWNLOAD_TIMEOUT_MS,
    }, (error, stdout, stderr) => {
      if (error) {
        try { fs.unlinkSync(filePath); } catch (_) {}

        if (error.killed) {
          return reject(new Error(`Download excedeu o timeout de ${VIDEO_DOWNLOAD.DOWNLOAD_TIMEOUT_MS / 1000}s`));
        }
        return reject(new Error(`Falha ao baixar vídeo: ${stderr || error.message}`));
      }

      if (!fs.existsSync(filePath)) {
        return reject(new Error('Arquivo de vídeo não foi gerado após download'));
      }

      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`✅ Vídeo baixado (yt-dlp): ${sizeMB}MB → ${fileName}`);

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

/**
 * Baixa um vídeo do YouTube usando @distube/ytdl-core (JS puro - fallback para Vercel)
 * @param {string} url - URL do YouTube
 * @returns {Promise<{filePath: string, cleanup: Function}>}
 */
async function downloadWithYtdlCore(url) {
  const ytdl = require('@distube/ytdl-core');

  const fileName = `video_${crypto.randomBytes(8).toString('hex')}.mp4`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  console.log(`⬇️  Baixando vídeo do YouTube (ytdl-core)...`);
  console.log(`   URL: ${url}`);

  // Criar agente com cookie jar para reduzir bot detection do YouTube
  const agent = ytdl.createAgent();

  const info = await ytdl.getInfo(url, { agent });
  const format = ytdl.chooseFormat(info.formats, {
    quality: 'highest',
    filter: (f) => f.container === 'mp4' && f.hasVideo && f.hasAudio && (f.height || 0) <= VIDEO_DOWNLOAD.MAX_HEIGHT
  }) || ytdl.chooseFormat(info.formats, {
    quality: 'highest',
    filter: (f) => f.hasVideo && f.hasAudio && (f.height || 0) <= VIDEO_DOWNLOAD.MAX_HEIGHT
  });

  if (!format) {
    throw new Error('Nenhum formato de vídeo compatível encontrado');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn) => { if (!settled) { settled = true; fn(); } };

    const stream = ytdl.downloadFromInfo(info, { format, agent });
    const writeStream = fs.createWriteStream(filePath);
    let downloadedBytes = 0;
    const maxBytes = VIDEO_DOWNLOAD.MAX_FILE_SIZE_MB * 1024 * 1024;

    const cleanupFile = () => { try { fs.unlinkSync(filePath); } catch (_) {} };

    const timeout = setTimeout(() => {
      stream.destroy();
      writeStream.destroy();
      cleanupFile();
      settle(() => reject(new Error(`Download excedeu o timeout de ${VIDEO_DOWNLOAD.DOWNLOAD_TIMEOUT_MS / 1000}s`)));
    }, VIDEO_DOWNLOAD.DOWNLOAD_TIMEOUT_MS);

    stream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (downloadedBytes > maxBytes) {
        clearTimeout(timeout);
        stream.destroy();
        writeStream.destroy();
        cleanupFile();
        settle(() => reject(new Error(`Vídeo excede o tamanho máximo de ${VIDEO_DOWNLOAD.MAX_FILE_SIZE_MB}MB`)));
      }
    });

    stream.pipe(writeStream);

    writeStream.on('finish', () => {
      clearTimeout(timeout);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`✅ Vídeo baixado (ytdl-core): ${sizeMB}MB → ${fileName}`);

      settle(() => resolve({
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
      }));
    });

    stream.on('error', (err) => {
      clearTimeout(timeout);
      cleanupFile();
      settle(() => reject(new Error(`Falha ao baixar vídeo: ${err.message}`)));
    });

    writeStream.on('error', (err) => {
      clearTimeout(timeout);
      cleanupFile();
      settle(() => reject(new Error(`Falha ao salvar vídeo: ${err.message}`)));
    });
  });
}

/**
 * Valida se o arquivo baixado é um vídeo válido (não vazio, tamanho mínimo)
 * @param {string} filePath - Caminho do arquivo
 * @returns {{valid: boolean, reason?: string}}
 */
function validateDownloadedFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: 'Arquivo não existe após download' };
  }

  const stats = fs.statSync(filePath);
  const MIN_VIDEO_SIZE = 50 * 1024; // 50KB mínimo para um vídeo válido

  if (stats.size < MIN_VIDEO_SIZE) {
    return { valid: false, reason: `Arquivo muito pequeno (${(stats.size / 1024).toFixed(1)}KB) - pode estar corrompido` };
  }

  return { valid: true };
}

/**
 * Baixa um vídeo do YouTube com fallback automático e retry.
 * 
 * Estratégia:
 * 1. Tenta yt-dlp (binário) se disponível — melhor qualidade e estabilidade
 * 2. Fallback para ytdl-core (JS puro) — funciona em qualquer ambiente (Vercel, etc.)
 * 3. Se yt-dlp falhar em runtime, tenta ytdl-core antes de desistir
 * 
 * @param {string} url - URL do YouTube
 * @returns {Promise<{filePath: string, cleanup: Function, downloadMethod: string}>}
 */
async function downloadYouTubeVideo(url) {
  const hasYtDlp = await checkYtDlp();
  let ytdlpError = null;

  if (hasYtDlp) {
    try {
      console.log('🔧 Usando yt-dlp (binário) para download');
      const result = await downloadWithYtDlp(url);

      const validation = validateDownloadedFile(result.filePath);
      if (!validation.valid) {
        console.warn(`⚠️ yt-dlp: ${validation.reason}. Tentando ytdl-core...`);
        result.cleanup();
        throw new Error(validation.reason);
      }

      result.downloadMethod = 'yt-dlp';
      console.log(`✅ Download concluído com sucesso via yt-dlp`);
      return result;
    } catch (err) {
      ytdlpError = err;
      console.warn(`⚠️ yt-dlp falhou: ${err.message}`);
      console.log('🔄 Tentando fallback com ytdl-core...');
    }
  } else {
    console.log('🔧 yt-dlp não disponível, usando ytdl-core (JS)');
  }

  // Fallback: ytdl-core (JS puro)
  try {
    const result = await downloadWithYtdlCore(url);

    const validation = validateDownloadedFile(result.filePath);
    if (!validation.valid) {
      result.cleanup();
      throw new Error(validation.reason);
    }

    result.downloadMethod = 'ytdl-core';
    console.log(`✅ Download concluído com sucesso via ytdl-core`);
    return result;
  } catch (ytdlCoreError) {
    // Ambos falharam — criar erro estruturado
    const methodUsed = ytdlpError ? 'ambos (yt-dlp + ytdl-core)' : 'ytdl-core';
    const technicalDetail = ytdlpError 
      ? `yt-dlp: ${ytdlpError.message} | ytdl-core: ${ytdlCoreError.message}`
      : ytdlCoreError.message;

    // Classificar erro para mensagem amigável
    const userMessage = classifyDownloadError(ytdlCoreError, ytdlpError);

    const error = new VideoDownloadError(userMessage, {
      method: methodUsed,
      url,
      technicalError: technicalDetail,
      phase: 'download',
    });
    error.logDebug();
    throw error;
  }
}

/**
 * Classifica o erro técnico em uma mensagem amigável para o usuário
 * @param {Error} primaryError - Erro principal (ytdl-core)
 * @param {Error|null} secondaryError - Erro secundário (yt-dlp)
 * @returns {string} Mensagem amigável
 */
function classifyDownloadError(primaryError, secondaryError) {
  const msg = (primaryError.message + ' ' + (secondaryError?.message || '')).toLowerCase();

  if (msg.includes('sign in to confirm') || msg.includes('confirm you') || msg.includes('not a bot')) {
    return 'O YouTube bloqueou o download por detecção de bot. Tente novamente em alguns minutos ou use outro link do mesmo vídeo.';
  }
  if (msg.includes('private') || msg.includes('login') || msg.includes('sign in')) {
    return 'Este vídeo é privado ou requer login. Verifique se o vídeo está público no YouTube.';
  }
  if (msg.includes('not available') || msg.includes('unavailable') || msg.includes('removed') || msg.includes('does not exist')) {
    return 'Vídeo não encontrado. Verifique se o link está correto e o vídeo ainda existe no YouTube.';
  }
  if (msg.includes('age-restrict') || msg.includes('age_restrict') || msg.includes('age gate') || msg.includes('age verif')) {
    return 'Este vídeo tem restrição de idade e não pode ser baixado automaticamente.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'O download demorou demais. O vídeo pode ser muito longo ou a conexão está lenta. Tente novamente.';
  }
  if (msg.includes('max-filesize') || msg.includes('tamanho máximo') || msg.includes('file size')) {
    return `O vídeo é muito grande (máximo ${VIDEO_DOWNLOAD.MAX_FILE_SIZE_MB}MB). Tente um vídeo mais curto.`;
  }
  if (msg.includes('formato') || msg.includes('format') || msg.includes('no video')) {
    return 'Não foi possível encontrar um formato de vídeo compatível. Tente outro link.';
  }
  if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('fetch')) {
    return 'Erro de conexão ao baixar o vídeo. Verifique a conexão do servidor e tente novamente.';
  }
  if (msg.includes('copyright') || msg.includes('blocked')) {
    return 'Este vídeo está bloqueado por direitos autorais e não pode ser baixado.';
  }
  if (msg.includes('live') || msg.includes('premiering')) {
    return 'Não é possível analisar transmissões ao vivo ou vídeos em estreia. Aguarde o vídeo ficar disponível.';
  }

  return 'Não foi possível baixar o vídeo do YouTube. Verifique se o link está correto e tente novamente.';
}

module.exports = { downloadYouTubeVideo, checkYtDlp };
