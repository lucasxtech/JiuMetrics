// Controlador para Estratégias Táticas
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const FightAnalysis = require('../models/FightAnalysis');
const { generateTacticalStrategy } = require('../services/geminiService');
const { processPersonAnalyses } = require('../utils/athleteStatsUtils');

/**
 * POST /api/strategy/compare - Compara atleta vs adversário e gera estratégia com IA
 * Body: { athleteId, opponentId }
 */
exports.compareAndStrategy = async (req, res) => {
  try {
    const { athleteId, opponentId } = req.body;

    if (!athleteId || !opponentId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId e opponentId são obrigatórios',
      });
    }

    console.log(`🎯 Gerando estratégia: Atleta ${athleteId} vs Adversário ${opponentId}`);

    // Buscar dados do atleta
    const athlete = Athlete.getById(athleteId);
    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Atleta não encontrado',
      });
    }

    // Buscar dados do adversário
    const opponent = Opponent.getById(opponentId);
    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'Adversário não encontrado',
      });
    }

    // Buscar análises
    const athleteAnalyses = FightAnalysis.getByPersonId(athleteId);
    const opponentAnalyses = FightAnalysis.getByPersonId(opponentId);

    console.log(`📊 Atleta: ${athleteAnalyses.length} análises | Adversário: ${opponentAnalyses.length} análises`);

    // Calcular atributos
    const athleteAttributes = processPersonAnalyses(athleteAnalyses, athlete);
    const opponentAttributes = processPersonAnalyses(opponentAnalyses, opponent);

    // Preparar dados para o Gemini
    const athleteData = {
      name: athlete.name,
      resumo: athlete.aiSummary || 'Sem resumo disponível - atleta sem análises de vídeo ainda.',
      atributos: athleteAttributes
    };

    const opponentData = {
      name: opponent.name,
      resumo: opponent.aiSummary || 'Sem resumo disponível - adversário sem análises de vídeo ainda.',
      atributos: opponentAttributes
    };

    // Gerar estratégia com IA
    const strategy = await generateTacticalStrategy(athleteData, opponentData);

    res.json({
      success: true,
      data: {
        athlete: {
          id: athlete.id,
          name: athlete.name,
          attributes: athleteAttributes,
          totalAnalyses: athleteAnalyses.length
        },
        opponent: {
          id: opponent.id,
          name: opponent.name,
          attributes: opponentAttributes,
          totalAnalyses: opponentAnalyses.length
        },
        strategy,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar estratégia:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/strategy/best-matchup/:opponentId - Encontra melhor atleta para enfrentar adversário
 */
exports.findBestMatchup = async (req, res) => {
  try {
    const { opponentId } = req.params;

    if (!opponentId) {
      return res.status(400).json({
        success: false,
        error: 'opponentId é obrigatório',
      });
    }

    const result = StrategyService.findBestMatchup(opponentId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = exports;
