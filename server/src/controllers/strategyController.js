const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const StrategyService = require('../services/strategyService');
const ApiUsage = require('../models/ApiUsage');

/**
 * POST /api/strategy/compare
 * Compara atleta vs adversário e gera estratégia tática com IA
 * Usa consolidação de TODAS as análises de cada lutador
 * @param {string} req.body.athleteId - ID do atleta
 * @param {string} req.body.opponentId - ID do adversário
 * @param {string} req.body.model - Modelo Gemini (opcional)
 */
exports.compareAndStrategy = async (req, res) => {
  try {
    const { athleteId, opponentId, model } = req.body;
    const userId = req.userId;

    if (!athleteId || !opponentId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId e opponentId são obrigatórios'
      });
    }

    // Buscar dados básicos
    const [athlete, opponent] = await Promise.all([
      Athlete.getById(athleteId, userId),
      Opponent.getById(opponentId, userId)
    ]);

    if (!athlete) {
      return res.status(404).json({ success: false, error: 'Atleta não encontrado' });
    }
    if (!opponent) {
      return res.status(404).json({ success: false, error: 'Adversário não encontrado' });
    }

    // Gerar estratégia usando consolidação de todas as análises
    const result = await StrategyService.generateStrategy(athleteId, opponentId, userId, model);
    
    // Salvar uso da API (consolidação + estratégia)
    if (userId && result.metadata.usage) {
      await ApiUsage.logUsage({
        userId,
        modelName: result.metadata.strategyModel,
        operationType: 'strategy',
        promptTokens: result.metadata.usage.promptTokens,
        completionTokens: result.metadata.usage.completionTokens,
        metadata: {
          athleteId,
          athleteName: athlete.name,
          athleteAnalysesCount: result.metadata.athlete.analysesCount,
          opponentId,
          opponentName: opponent.name,
          opponentAnalysesCount: result.metadata.opponent.analysesCount,
          consolidationModel: result.metadata.athlete.consolidationModel
        }
      });
    }

    res.json({
      success: true,
      data: {
        athlete: {
          id: athlete.id,
          name: athlete.name,
          analysesCount: result.metadata.athlete.analysesCount,
          usedConsolidation: result.metadata.athlete.analysesCount > 1
        },
        opponent: {
          id: opponent.id,
          name: opponent.name,
          analysesCount: result.metadata.opponent.analysesCount,
          usedConsolidation: result.metadata.opponent.analysesCount > 1
        },
        strategy: result.strategy,
        generatedAt: result.metadata.generatedAt
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar estratégia:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar estratégia tática'
    });
  }
};

module.exports = exports;