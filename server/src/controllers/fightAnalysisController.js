const { getScopeIds } = require('../utils/tenantScope');
// Controlador para Análises de Lutas
const FightAnalysis = require('../models/FightAnalysis');
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const User = require('../models/User');
const StrategyService = require('../services/strategyService');
const { extractTechnicalProfile } = require('../utils/profileUtils');

/**
 * Regenera o resumo técnico de um atleta/adversário em background.
 */
async function refreshTechnicalSummary(personId, personType, userId) {
  try {
    const allowedUserIds = await User.getGroupUserIds(userId);
    // Fetch the record to get the actual owner (cross-member group support)
    const person = personType === 'athlete'
      ? await Athlete.getById(personId, allowedUserIds)
      : await Opponent.getById(personId, allowedUserIds);

    if (!person) {
      console.warn('⚠️ [auto] Pessoa não encontrada para refreshTechnicalSummary —', personType, personId);
      return;
    }

    const consolidation = await StrategyService.consolidateAnalyses(personId, allowedUserIds, null);
    const updateData = {
      technicalSummary: consolidation.resumo,
      technicalSummaryUpdatedAt: new Date().toISOString()
    };
    if (personType === 'athlete') {
      await Athlete.update(personId, updateData, person.userId);
    } else {
      await Opponent.update(personId, updateData, person.userId);
    }
    console.log('✅ [auto] Resumo técnico atualizado —', personType, personId);
  } catch (err) {
    console.error('❌ [auto] Falha ao atualizar resumo técnico —', personType, personId, err.message);
  }
}

/**
 * GET /api/fight-analysis - Lista todas as análises
 */
exports.getAllAnalyses = async (req, res) => {
  try {
    const allowedUserIds = await getScopeIds(req, User);
    const analyses = await FightAnalysis.getAll(allowedUserIds);
    res.json({ success: true, data: analyses });
  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fight-analysis/:id - Busca análise por ID
 */
exports.getAnalysisById = async (req, res) => {
  try {
    const allowedUserIds = await getScopeIds(req, User);
    const analysis = await FightAnalysis.getByIdAndUser(req.params.id, allowedUserIds);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Análise não encontrada' });
    }
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Erro ao buscar análise:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fight-analysis/person/:personId - Lista análises de um atleta/adversário
 */
exports.getAnalysesByPerson = async (req, res) => {
  try {
    const allowedUserIds = await getScopeIds(req, User);
    const analyses = await FightAnalysis.getByPersonId(req.params.personId, allowedUserIds);
    res.json({ success: true, data: analyses });
  } catch (error) {
    console.error('❌ Erro ao buscar análises da pessoa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fight-analysis - Cria nova análise (após análise de vídeo)
 */
exports.createAnalysis = async (req, res) => {
  try {
    const { personId, personType, videoUrl, videoName, charts, summary, framesAnalyzed } = req.body;

    if (!personId || !personType) {
      return res.status(400).json({
        success: false,
        error: 'personId e personType são obrigatórios',
      });
    }

    // Validar se pessoa existe (dentro do grupo do usuário)
    const allowedUserIds = await getScopeIds(req, User);
    if (personType === 'athlete') {
      const athlete = await Athlete.getById(personId, allowedUserIds);
      if (!athlete) {
        return res.status(404).json({ success: false, error: 'Atleta não encontrado' });
      }
    } else if (personType === 'opponent') {
      const opponent = await Opponent.getById(personId, allowedUserIds);
      if (!opponent) {
        return res.status(404).json({ success: false, error: 'Adversário não encontrado' });
      }
    }

    // Processar dados dos gráficos para perfil técnico
    const technicalProfile = extractTechnicalProfile(charts);

    // Criar análise
    const analysis = await FightAnalysis.create({
      personId,
      personType,
      videoUrl,
      videoName,
      charts,
      summary,
      technicalProfile,
      framesAnalyzed,
      userId: req.userId,
    });

    // Atualizar perfil técnico da pessoa
    if (personType === 'athlete') {
      await Athlete.updateTechnicalProfile(personId, technicalProfile);
    } else if (personType === 'opponent') {
      await Opponent.updateTechnicalProfile(personId, technicalProfile);
    }

    res.status(201).json({
      success: true,
      message: 'Análise criada e perfil técnico atualizado',
      data: analysis,
    });

    // Fire-and-forget: regenera o resumo técnico em background após salvar a análise
    refreshTechnicalSummary(personId, personType, req.userId);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/fight-analysis/:id - Deleta uma análise
 */
exports.deleteAnalysis = async (req, res) => {
  try {
    const allowedUserIds = await getScopeIds(req, User);
    const existing = await FightAnalysis.getByIdAndUser(req.params.id, allowedUserIds);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Análise não encontrada' });
    }

    const deleted = await FightAnalysis.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Análise não encontrada' });
    }
    res.json({ success: true, message: 'Análise deletada', data: deleted });

    // Fire-and-forget: regenera ou limpa o resumo técnico após deletar
    const { personId, personType } = deleted;
    if (personId && personType) {
      // Reutiliza allowedUserIds já obtido — evita 2 queries extras ao banco
      const remaining = await FightAnalysis.getByPersonId(personId, allowedUserIds);
      if (remaining.length === 0) {
        // Sem análises restantes — limpa o resumo (usa owner real do registro)
        const person = personType === 'athlete'
          ? await Athlete.getById(personId, allowedUserIds)
          : await Opponent.getById(personId, allowedUserIds);
        if (person) {
          const clearData = { technicalSummary: null, technicalSummaryUpdatedAt: new Date().toISOString() };
          const updateFn = personType === 'athlete'
            ? Athlete.update(personId, clearData, person.userId)
            : Opponent.update(personId, clearData, person.userId);
          updateFn.catch(err => console.error(`❌ [auto] Falha ao limpar resumo — ${personType} ${personId}:`, err.message));
        }
      } else {
        refreshTechnicalSummary(personId, personType, req.userId);
      }
    }
  } catch (error) {
    console.error('Erro ao deletar análise:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = exports;

