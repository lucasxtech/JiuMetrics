const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const FightAnalysis = require('../models/FightAnalysis');
const { generateTacticalStrategy } = require('../services/geminiService');
const { processPersonAnalyses } = require('../utils/athleteStatsUtils');
const ApiUsage = require('../models/ApiUsage');

/**
 * Prepara dados da pessoa (atleta ou adversário) para IA
 * @param {Object} person - Dados da pessoa
 * @param {Array} analyses - Análises de vídeo
 * @returns {Object} Dados formatados para IA
 */
function preparePersonData(person, analyses) {
  const attributes = processPersonAnalyses(analyses, person);
  return {
    name: person.name,
    resumo: person.aiSummary || 'Sem resumo disponível - sem análises de vídeo ainda.',
    atributos: attributes
  };
}

/**
 * POST /api/strategy/compare
 * Compara atleta vs adversário e gera estratégia tática com IA
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

    // Buscar dados
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

    // Buscar análises e preparar dados
    const [athleteAnalyses, opponentAnalyses] = await Promise.all([
      FightAnalysis.getByPersonId(athleteId),
      FightAnalysis.getByPersonId(opponentId)
    ]);
    
    const athleteData = preparePersonData(athlete, athleteAnalyses);
    const opponentData = preparePersonData(opponent, opponentAnalyses);

    // Gerar estratégia com IA
    const result = await generateTacticalStrategy(athleteData, opponentData, model);
    
    // Salvar uso da API
    if (userId && result.usage) {
      await ApiUsage.logUsage({
        userId,
        modelName: result.usage.modelName,
        operationType: 'strategy',
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        metadata: {
          athleteId,
          athleteName: athlete.name,
          opponentId,
          opponentName: opponent.name
        }
      });
    }

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
        strategy: result.strategy,
        generatedAt: new Date().toISOString()
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