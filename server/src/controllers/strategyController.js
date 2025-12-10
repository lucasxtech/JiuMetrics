// Controlador para Estratégias Táticas
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const FightAnalysis = require('../models/FightAnalysis');
const { generateTacticalStrategy } = require('../services/geminiService');
const { processPersonAnalyses } = require('../utils/athleteStatsUtils');
const StrategyService = require('../services/strategyService');

/**
 * POST /api/strategy/compare - Compara atleta vs adversário e gera estratégia com IA
 * Body: { athleteId, opponentId }
 */
/**
 * Prepara dados da pessoa para IA
 */
function preparePersonData(person, analyses) {
  const attributes = processPersonAnalyses(analyses, person);
  return {
    name: person.name,
    resumo: person.aiSummary || 'Sem resumo disponível - sem análises de vídeo ainda.',
    atributos: attributes
  };
}

exports.compareAndStrategy = async (req, res) => {
  try {
    const { athleteId, opponentId } = req.body;

    if (!athleteId || !opponentId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId e opponentId são obrigatórios',
      });
    }

    // Buscar dados
    const athlete = Athlete.getById(athleteId);
    const opponent = Opponent.getById(opponentId);

    if (!athlete) {
      return res.status(404).json({ success: false, error: 'Atleta não encontrado' });
    }
    if (!opponent) {
      return res.status(404).json({ success: false, error: 'Adversário não encontrado' });
    }

    // Buscar análises e preparar dados
    const athleteAnalyses = FightAnalysis.getByPersonId(athleteId);
    const opponentAnalyses = FightAnalysis.getByPersonId(opponentId);
    
    const athleteData = preparePersonData(athlete, athleteAnalyses);
    const opponentData = preparePersonData(opponent, opponentAnalyses);

    // Gerar estratégia com IA
    const strategy = await generateTacticalStrategy(athleteData, opponentData);

    res.json({
      success: true,
      data: {
        athlete: {
          id: athlete.id,
          name: athlete.name,
          attributes: athleteData.atributos,
          totalAnalyses: athleteAnalyses.length
        },
        opponent: {
          id: opponent.id,
          name: opponent.name,
          attributes: opponentData.atributos,
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
