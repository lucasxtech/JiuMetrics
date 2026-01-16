const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const StrategyService = require('../services/strategyService');
const TacticalAnalysis = require('../models/TacticalAnalysis');
const ApiUsage = require('../models/ApiUsage');
const StrategyVersion = require('../models/StrategyVersion');

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
    
    // Salvar análise tática no histórico
    let savedAnalysis = null;
    if (userId) {
      try {
        console.log('💾 Tentando salvar análise tática no histórico...');
        savedAnalysis = await TacticalAnalysis.create({
          userId,
          athleteId,
          athleteName: athlete.name,
          opponentId,
          opponentName: opponent.name,
          strategyData: result.strategy,
          metadata: result.metadata
        });
        console.log('✅ Análise tática salva com sucesso! ID:', savedAnalysis.id);

        // Criar versão inicial
        try {
          await StrategyVersion.createInitial(savedAnalysis.id, userId, result.strategy);
          console.log('📜 Versão inicial criada no histórico');
        } catch (versionError) {
          console.error('⚠️ Erro ao criar versão inicial:', versionError.message);
        }
      } catch (saveError) {
        console.error('⚠️ Erro ao salvar análise tática:', saveError);
        console.error('Detalhes do erro:', saveError.message);
        console.error('Stack:', saveError.stack);
        // Não falhar a request se salvar no histórico falhar
      }
    } else {
      console.log('⚠️ userId não disponível, análise não será salva');
    }
    
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
          consolidationModel: result.metadata.athlete.consolidationModel,
          savedAnalysisId: savedAnalysis?.id
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
        generatedAt: result.metadata.generatedAt,
        analysisId: savedAnalysis?.id // ID para acessar depois
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

/**
 * GET /api/strategy/analyses
 * Lista todas as análises táticas salvas do usuário
 */
exports.listAnalyses = async (req, res) => {
  try {
    const userId = req.userId;
    const { athleteId, opponentId, limit, offset } = req.query;

    console.log('📋 listAnalyses chamado:', { userId, athleteId, opponentId, limit, offset });

    const analyses = await TacticalAnalysis.getAll(userId, {
      athleteId,
      opponentId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    const total = await TacticalAnalysis.count(userId);

    console.log('📊 Resultado:', { totalEncontradas: analyses.length, total });

    res.json({
      success: true,
      data: analyses,
      total,
      page: offset ? Math.floor(offset / (limit || 50)) + 1 : 1
    });

  } catch (error) {
    console.error('❌ Erro ao listar análises:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar análises táticas'
    });
  }
};

/**
 * GET /api/strategy/analyses/:id
 * Busca uma análise tática específica
 */
exports.getAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const analysis = await TacticalAnalysis.getById(id, userId);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ Erro ao buscar análise:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar análise tática'
    });
  }
};

/**
 * DELETE /api/strategy/analyses/:id
 * Deleta uma análise tática
 */
exports.deleteAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await TacticalAnalysis.delete(id, userId);

    res.json({
      success: true,
      message: 'Análise deletada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao deletar análise:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar análise tática'
    });
  }
};

/**
 * PATCH /api/strategy/analyses/:id
 * Atualiza uma análise tática (ex: strategy_data editado pela IA)
 */
exports.updateAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { strategy_data, edited_field, edit_reason, edited_by } = req.body;

    if (!strategy_data) {
      return res.status(400).json({
        success: false,
        error: 'strategy_data é obrigatório'
      });
    }

    // Verificar se a análise existe e pertence ao usuário
    const analysis = await TacticalAnalysis.getById(id, userId);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }
    
    // Atualizar
    const updated = await TacticalAnalysis.update(id, userId, { strategy_data });

    // Criar versão do histórico (não falhar se der erro)
    try {
      await StrategyVersion.create({
        analysisId: id,
        userId,
        content: strategy_data,
        editedField: edited_field || null,
        editedBy: edited_by || 'ai',
        editReason: edit_reason || 'Edição aplicada via chat com IA'
      });
    } catch (versionError) {
      // Log silencioso - criar versão não é crítico
    }
    
    res.json({
      success: true,
      data: updated,
      message: 'Análise atualizada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar análise:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar análise tática',
      details: error.message
    });
  }
};

module.exports = exports;