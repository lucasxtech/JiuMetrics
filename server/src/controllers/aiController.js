const { generateAthleteSummary } = require('../services/geminiService');
const ApiUsage = require('../models/ApiUsage');

/**
 * POST /api/ai/analyze-video
 * Rota descontinuada - use POST /api/video/upload
 */
exports.analyzeVideo = async (req, res) => {
  res.status(400).json({
    success: false,
    error: 'Use POST /api/video/upload para enviar um vídeo para análise'
  });
};

/**
 * POST /api/ai/athlete-summary
 * Gera resumo técnico profissional do atleta via Gemini
 * @param {Object} req.body.athleteData - Dados do atleta
 * @param {string} req.body.model - Modelo Gemini (opcional)
 */
exports.generateAthleteSummary = async (req, res) => {
  try {
    const { athleteData, model } = req.body;

    if (!athleteData) {
      return res.status(400).json({
        success: false,
        error: 'Dados do atleta são obrigatórios'
      });
    }

    const result = await generateAthleteSummary(athleteData, model);
    
    // Salvar uso da API
    if (req.userId && result.usage) {
      await ApiUsage.logUsage({
        userId: req.userId,
        modelName: result.usage.modelName,
        operationType: 'summary',
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        metadata: { athleteName: athleteData.name }
      });
    }

    res.json({
      success: true,
      summary: result.summary
    });
  } catch (error) {
    console.error('❌ Erro ao gerar resumo:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar resumo do atleta'
    });
  }
};

module.exports = exports;
