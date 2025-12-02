const axios = require('axios');
const { analyzeFrame, consolidateAnalyses } = require('../services/geminiService');

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) {
        return u.searchParams.get('v');
      }
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.split('/')[2];
      }
    }
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace('/', '');
    }
    return null;
  } catch (_) {
    return null;
  }
}

async function fetchImageAsBase64(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  const base64 = Buffer.from(res.data).toString('base64');
  const mimeType = res.headers['content-type'] || 'image/jpeg';
  return { base64, mimeType };
}

exports.analyzeLink = async (req, res) => {
  try {
    const { url, athleteName, giColor } = req.body || {};
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL é obrigatória' });
    }

    const frameContext = {
      athleteName: athleteName?.trim(),
      giColor: giColor?.trim(),
    };

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'Apenas links do YouTube são suportados nesta versão' });
    }

    // YouTube thumbnails em diferentes resoluções
    const thumbUrls = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/0.jpg`,
      `https://img.youtube.com/vi/${videoId}/1.jpg`,
      `https://img.youtube.com/vi/${videoId}/2.jpg`,
      `https://img.youtube.com/vi/${videoId}/3.jpg`,
    ];

    // Busca 6 imagens válidas e transforma em base64
    const framesBase64 = [];
    for (const t of thumbUrls) {
      try {
        const { base64, mimeType } = await fetchImageAsBase64(t);
        framesBase64.push({ base64, mimeType });
        if (framesBase64.length >= 6) break;
      } catch (_) {
        // ignora thumbs inexistentes
      }
    }

    if (framesBase64.length === 0) {
      return res.status(400).json({ success: false, error: 'Não foi possível obter thumbnails do YouTube para este link' });
    }

    // Analisa cada frame com Gemini
    const analyses = [];
    for (const { base64, mimeType } of framesBase64) {
      const result = await analyzeFrame(base64, mimeType, frameContext);
      analyses.push(result);
    }

    const consolidated = consolidateAnalyses(analyses);
    return res.json({ success: true, data: consolidated, framesAnalyzed: framesBase64.length });
  } catch (err) {
    console.error('analyzeLink error:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao analisar link' });
  }
};

module.exports = exports;