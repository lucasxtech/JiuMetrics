// Controlador para Estratégias Táticas
const StrategyService = require('../services/strategyService');

/**
 * POST /api/strategy/compare - Compara atleta vs adversário e gera estratégia
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

    const result = StrategyService.compareAndGenerateStrategy(athleteId, opponentId);

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
