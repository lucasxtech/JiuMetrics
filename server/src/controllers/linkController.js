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

    // Analisa cada frame com Gemini
    const analyses = [];
    const result = await analyzeFrame(frameContext);
    analyses.push(result);

    const consolidated = consolidateAnalyses(analyses);
    return res.json({ success: true, data: consolidated,});
  } catch (err) {
    console.error('analyzeLink error:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao analisar link' });
  }
};

module.exports = exports;