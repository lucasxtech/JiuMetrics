const { resolveScope } = require('../services/authorization');
const { generateAthleteSummary } = require('../services/geminiService');
const StrategyService = require('../services/strategyService');
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const FightAnalysis = require('../models/FightAnalysis');
const { handleError } = require('../utils/errorHandler');
const { logApiUsageWithType } = require('../utils/apiUsageLogger');

/**
 * POST /api/ai/analyze-video
 * Rota descontinuada - use POST /api/ai/analyze-link
 */
exports.analyzeVideo = async (req, res) => {
  res.status(400).json({
    success: false,
    error: 'Rota descontinuada. Use POST /api/ai/analyze-link com a URL do vídeo no YouTube'
  });
};

/**
 * POST /api/ai/athlete-summary
 * Gera resumo técnico profissional do atleta via Gemini
 *
 * AZ-7 (spec 006): este endpoint aceitava `athleteData` INTEIRO do corpo e o
 * serializava direto no prompt — sem noção de posse, sem validação de schema
 * e sem limite além do `express.json` de 10 MB. Era abuso de custo de IA e
 * prompt injection direta, e não havia "dado alheio" a proteger porque o
 * endpoint não buscava nada: o próprio contrato era o problema.
 *
 * Agora recebe `athleteId` e carrega tudo no servidor, dentro do escopo de
 * posse do ator.
 *
 * @param {string} req.body.athleteId - ID do atleta (obrigatório)
 * @param {string} req.body.model - Modelo Gemini (opcional)
 */
exports.generateAthleteSummary = async (req, res) => {
  try {
    const { athleteId, model } = req.body;

    if (!athleteId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId é obrigatório. Este endpoint não aceita mais athleteData no corpo — os dados do atleta são carregados no servidor, dentro do escopo do usuário.'
      });
    }

    const allowedUserIds = await resolveScope(req.actor);
    const athlete = await Athlete.getById(athleteId, allowedUserIds);
    if (!athlete) {
      return res.status(404).json({ success: false, error: 'Atleta não encontrado' });
    }

    const analyses = await FightAnalysis.getByPersonId(athleteId, allowedUserIds);

    // `attributes` é deliberadamente omitido: calculá-lo exigiria escolher
    // entre as DUAS implementações divergentes de `processPersonAnalyses`
    // (frontend e backend), que é a decisão pendente P7, escopo da spec 010.
    // O prompt já trata a ausência ('Nenhum atributo calculado ainda').
    const result = await generateAthleteSummary({ name: athlete.name, analyses }, model);

    // Salvar uso da API
    await logApiUsageWithType({
      userId: req.userId,
      operationType: 'summary',
      usage: result.usage,
      metadata: { athleteId, athleteName: athlete.name }
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
    const allowedUserIds = await resolveScope(req.actor);
    const consolidation = await StrategyService.consolidateAnalyses(personId, allowedUserIds, model);

    // Salvar o resumo consolidado no perfil do atleta/adversário
    const updateData = {
      technicalSummary: consolidation.resumo,
      technicalSummaryUpdatedAt: new Date().toISOString()
    };

    let updatedPerson;
    if (personType === 'athlete') {
      const person = await Athlete.getById(personId, allowedUserIds);
      if (!person) return res.status(404).json({ success: false, error: 'Atleta não encontrado' });
      updatedPerson = await Athlete.update(personId, updateData, person.userId);
    } else {
      const person = await Opponent.getById(personId, allowedUserIds);
      if (!person) return res.status(404).json({ success: false, error: 'Adversário não encontrado' });
      updatedPerson = await Opponent.update(personId, updateData, person.userId);
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
        personName: updatedPerson?.name || null,
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

// NOTA (Fase 1): o endpoint de debug POST /api/ai/debug/compare-analysis
// foi removido junto com o sistema multi-agentes que ele comparava.
