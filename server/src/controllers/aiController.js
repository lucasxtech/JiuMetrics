// Controlador de IA - Análise de vídeos com Gemini Vision
const { analyzeFrame, consolidateAnalyses } = require('../services/geminiService');

/**
 * POST /api/ai/analyze-video - Analisa vídeo enviado (via upload com FFmpeg + Gemini Vision)
 * Nota: Esta rota é chamada pelo videoController após extrair frames
 * Mantida aqui para compatibilidade com rotas existentes
 */
exports.analyzeVideo = async (req, res) => {
  res.status(400).json({
    success: false,
    error: 'Use POST /api/video/upload para enviar um vídeo para análise com frames extraídos',
    info: 'A análise por URL direto (link) é feita no videoAnalysisService do frontend'
  });
};

module.exports = exports;
