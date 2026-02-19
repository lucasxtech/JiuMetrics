const { generateAthleteSummary } = require('../services/geminiService');
const StrategyService = require('../services/strategyService');
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const { handleError } = require('../utils/errorHandler');
const { logApiUsageWithType } = require('../utils/apiUsageLogger');

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
    await logApiUsageWithType({
      userId: req.userId,
      operationType: 'summary',
      usage: result.usage,
      metadata: { athleteName: athleteData.name }
    });

    res.json({
      success: true,
      summary: result.summary
    });
  } catch (error) {
    handleError(res, 'gerar resumo do atleta', error);
  }
};

/**
 * POST /api/ai/consolidate-profile
 * Consolida todas as análises de um lutador e salva no perfil
 * USA: StrategyService.consolidateAnalyses (com gráficos e stats narrativos)
 * @param {string} req.body.personId - ID do atleta ou adversário
 * @param {string} req.body.personType - 'athlete' ou 'opponent'
 * @param {string} req.body.model - Modelo Gemini (opcional)
 */
exports.consolidateProfile = async (req, res) => {
  try {
    const { personId, personType, model } = req.body;
    const userId = req.userId;

    if (!personId || !personType) {
      return res.status(400).json({
        success: false,
        error: 'personId e personType são obrigatórios'
      });
    }

    console.log('🔄 Consolidando perfil:', { personId, personType, model });

    // Buscar pessoa para validar que existe e pertence ao usuário
    let person;
    if (personType === 'athlete') {
      person = await Athlete.getById(personId, userId);
    } else if (personType === 'opponent') {
      person = await Opponent.getById(personId, userId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'personType deve ser "athlete" ou "opponent"'
      });
    }

    if (!person) {
      return res.status(404).json({
        success: false,
        error: `${personType === 'athlete' ? 'Atleta' : 'Adversário'} não encontrado`
      });
    }

    // Consolidar análises usando StrategyService (com gráficos e stats)
    const consolidation = await StrategyService.consolidateAnalyses(personId, userId, model);

    console.log('✅ Consolidação concluída:', {
      resumoLength: consolidation.resumo?.length,
      analysesCount: consolidation.analysesCount,
      chartsCount: consolidation.charts?.length,
      model: consolidation.model
    });

    // Salvar o resumo consolidado no perfil do atleta/adversário
    const updateData = {
      technicalSummary: consolidation.resumo,
      technicalSummaryUpdatedAt: new Date().toISOString()
    };

    let updatedPerson;
    if (personType === 'athlete') {
      updatedPerson = await Athlete.update(personId, updateData, userId);
    } else {
      updatedPerson = await Opponent.update(personId, updateData, userId);
    }

    console.log('💾 Perfil atualizado com resumo consolidado');

    // Salvar uso da API
    await logApiUsageWithType({
      userId,
      operationType: 'consolidate_profile',
      usage: {
        modelName: consolidation.model || model || 'gemini-2.0-flash',
        promptTokens: consolidation.usage?.promptTokens || 0,
        completionTokens: consolidation.usage?.completionTokens || 0
      },
      metadata: {
        personId,
        personType,
        personName: person.name,
        analysesCount: consolidation.analysesCount
      }
    });

    res.json({
      success: true,
      data: {
        resumo: consolidation.resumo,
        technical_stats: consolidation.technical_stats,
        charts: consolidation.charts,
        analysesCount: consolidation.analysesCount,
        model: consolidation.model,
        updatedAt: updateData.technicalSummaryUpdatedAt
      }
    });

  } catch (error) {
    handleError(res, 'consolidar perfil', error);
  }
};
