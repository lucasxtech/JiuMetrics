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

    // Consolidar análises usando StrategyService (com gráficos e stats)
    const consolidation = await StrategyService.consolidateAnalyses(personId, userId, model);

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

/**
 * POST /api/ai/debug/compare-analysis
 * Endpoint de debug: compara análise monolítica vs multi-agentes
 * ⚠️ TEMPORÁRIO: Para testes e validação do sistema multi-agentes
 * @param {string} req.body.frameData - Base64 do frame ou URL
 * @param {Object} req.body.context - Contexto da análise
 */
exports.compareAnalysis = async (req, res) => {
  try {
    const { frameData, context } = req.body;

    if (!frameData) {
      return res.status(400).json({
        success: false,
        error: 'frameData é obrigatório (base64 ou URL)'
      });
    }

    console.log('[DEBUG] Iniciando comparação monolítico vs multi-agentes...');

    const { analyzeFrame } = require('../services/geminiService');
    const startTime = Date.now();

    // Executar ambos sistemas em paralelo
    const [monolithic, multiAgent] = await Promise.allSettled([
      analyzeFrame(frameData, context || {}, null, false), // Sistema monolítico
      analyzeFrame(frameData, context || {}, null, true)   // Sistema multi-agentes
    ]);

    const elapsedTime = Date.now() - startTime;

    // Preparar resposta
    const comparison = {
      elapsedTime: `${(elapsedTime / 1000).toFixed(2)}s`,
      monolithic: {
        status: monolithic.status,
        ...(monolithic.status === 'fulfilled' ? {
          summary: monolithic.value.analysis?.summary || 'N/A',
          charts: monolithic.value.analysis?.charts || [],
          usage: monolithic.value.usage,
          hasData: !!monolithic.value.analysis
        } : {
          error: monolithic.reason?.message || 'Falha desconhecida'
        })
      },
      multiAgent: {
        status: multiAgent.status,
        ...(multiAgent.status === 'fulfilled' ? {
          summary: multiAgent.value.analysis?.summary || 'N/A',
          charts: multiAgent.value.analysis?.charts || [],
          usage: multiAgent.value.usage,
          metadata: multiAgent.value.metadata,
          totalUsage: multiAgent.value.totalUsage,
          hasData: !!multiAgent.value.analysis,
          agentResults: multiAgent.value.agentResults?.map(r => ({
            agentName: r.agentName,
            confidence: r.confidence,
            hasError: !!r.error
          }))
        } : {
          error: multiAgent.reason?.message || 'Falha desconhecida'
        })
      }
    };

    // Comparação de métricas
    if (monolithic.status === 'fulfilled' && multiAgent.status === 'fulfilled') {
      comparison.metrics = {
        tokensComparison: {
          monolithic: monolithic.value.usage.totalTokens,
          multiAgent: multiAgent.value.usage.totalTokens,
          difference: multiAgent.value.usage.totalTokens - monolithic.value.usage.totalTokens,
          percentageIncrease: (
            ((multiAgent.value.usage.totalTokens - monolithic.value.usage.totalTokens) / 
            monolithic.value.usage.totalTokens) * 100
          ).toFixed(2) + '%'
        },
        costComparison: multiAgent.value.totalUsage ? {
          monolithicEstimate: '$' + (
            (monolithic.value.usage.promptTokens * 0.075 / 1_000_000) +
            (monolithic.value.usage.completionTokens * 0.30 / 1_000_000)
          ).toFixed(4),
          multiAgentEstimate: '$' + multiAgent.value.totalUsage.estimatedCost.toFixed(4),
          difference: '$' + (
            multiAgent.value.totalUsage.estimatedCost - 
            ((monolithic.value.usage.promptTokens * 0.075 / 1_000_000) +
             (monolithic.value.usage.completionTokens * 0.30 / 1_000_000))
          ).toFixed(4)
        } : null,
        summaryLengthComparison: {
          monolithic: monolithic.value.analysis?.summary?.length || 0,
          multiAgent: multiAgent.value.analysis?.summary?.length || 0
        }
      };
    }

    console.log('[DEBUG] Comparação concluída');
    console.log(`[DEBUG] Monolítico: ${monolithic.status}`);
    console.log(`[DEBUG] Multi-Agentes: ${multiAgent.status}`);

    res.json({
      success: true,
      comparison
    });

  } catch (error) {
    console.error('[DEBUG] Erro na comparação:', error);
    handleError(res, 'comparar análises', error);
  }
};
