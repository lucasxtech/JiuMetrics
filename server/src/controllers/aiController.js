// Controlador de IA - Análise de vídeos com Gemini Vision
const { analyzeFrame, consolidateAnalyses, generateAthleteSummary } = require('../services/geminiService');

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

/**
 * POST /api/ai/athlete-summary - Gera resumo técnico profissional do atleta via Gemini
 */
exports.generateAthleteSummary = async (req, res) => {
  try {
    const { athleteData } = req.body;

    if (!athleteData) {
      return res.status(400).json({
        success: false,
        error: 'Dados do atleta são obrigatórios'
      });
    }

    const summary = await generateAthleteSummary(athleteData);

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Erro ao gerar resumo do atleta:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar resumo do atleta'
    });
  }
};

module.exports = exports;
