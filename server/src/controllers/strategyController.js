// Controlador para Estratégias Táticas
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const FightAnalysis = require('../models/FightAnalysis');
const { generateTacticalStrategy } = require('../services/geminiService');
const { processPersonAnalyses } = require('../utils/athleteStatsUtils');
const StrategyService = require('../services/strategyService');
const ApiUsage = require('../models/ApiUsage');

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
    console.log('🎯 Recebendo requisição de estratégia:', req.body);
    const { athleteId, opponentId, model } = req.body;
    const userId = req.userId; // Vem do middleware de autenticação
    const accessToken = req.headers.authorization?.replace('Bearer ', ''); // Token JWT

    if (!athleteId || !opponentId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId e opponentId são obrigatórios',
      });
    }

    // Log do modelo selecionado
    if (model) {
      console.log(`🤖 Modelo selecionado pelo usuário: ${model}`);
    }

    // Buscar dados
    const athlete = await Athlete.getById(athleteId, userId);
    const opponent = await Opponent.getById(opponentId, userId);

    console.log('📊 Dados encontrados:', { 
      athlete: athlete ? athlete.name : 'não encontrado',
      opponent: opponent ? opponent.name : 'não encontrado'
    });

    if (!athlete) {
      console.log('❌ Atleta não encontrado:', athleteId);
      return res.status(404).json({ success: false, error: 'Atleta não encontrado' });
    }
    if (!opponent) {
      console.log('❌ Adversário não encontrado:', opponentId);
      return res.status(404).json({ success: false, error: 'Adversário não encontrado' });
    }

    // Buscar análises e preparar dados
    const athleteAnalyses = await FightAnalysis.getByPersonId(athleteId);
    const opponentAnalyses = await FightAnalysis.getByPersonId(opponentId);
    
    const athleteData = preparePersonData(athlete, athleteAnalyses);
    const opponentData = preparePersonData(opponent, opponentAnalyses);

    // Gerar estratégia com IA (passando o modelo escolhido)
    const result = await generateTacticalStrategy(athleteData, opponentData, model);
    
    // Salvar uso da API (desabilitado temporariamente devido a problemas de RLS)
    /* TEMPORARIAMENTE DESABILITADO
    if (userId && result.usage) {
      await ApiUsage.logUsage({
        userId,
        modelName: result.usage.modelName,
        operationType: 'strategy',
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        accessToken, // Passar o token JWT
        metadata: {
          athleteId,
          athleteName: athlete.name,
          opponentId,
          opponentName: opponent.name
        }
      });
    }
    */

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
