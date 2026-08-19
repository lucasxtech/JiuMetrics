/**
 * Chat de IA — edição e versionamento de análise de luta.
 *
 * Extraído de `chatController.js` pela spec 006. É onde viviam 4 dos 6
 * vazamentos de posse do sistema (AZ-2..AZ-5 de docs/AUTHORIZATION.md).
 */
const { resolveScope } = require('../services/authorization');
const ChatSession = require('../models/ChatSession');
const AnalysisVersion = require('../models/AnalysisVersion');
const FightAnalysis = require('../models/FightAnalysis');

const { handleError } = require('../utils/errorHandler');
const { ensureOriginalVersion, createAnalysisVersion } = require('../utils/versionManager');

/**
 * Aplica sugestão de edição da IA à análise
 * POST /api/chat/apply-edit
 */
exports.applyEdit = async (req, res) => {
  try {
    const { sessionId, analysisId, editSuggestion } = req.body;
    const userId = req.userId;

    if (!analysisId || !editSuggestion) {
      return res.status(400).json({
        success: false,
        error: 'analysisId e editSuggestion são obrigatórios'
      });
    }

    // Buscar análise atual (com grupo do usuário para garantir ownership)
    const allowedUserIds = await resolveScope(req.actor);
    const analysis = await FightAnalysis.getByIdAndUser(analysisId, allowedUserIds);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    // Garantir versão original antes de editar
    const newVersionNumber = await ensureOriginalVersion(analysisId, analysis, userId);

    // Preparar dados de atualização baseado na sugestão
    const updateData = {};
    const { field, newValue } = editSuggestion;

    if (!newValue) {
      return res.status(400).json({
        success: false,
        error: 'Sugestão de edição não contém novo valor'
      });
    }

    if (field === 'summary') {
      updateData.summary = newValue;
    } else if (field === 'charts') {
      updateData.charts = newValue;
    } else if (field === 'technical_stats') {
      updateData.technicalStats = newValue;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campo inválido na sugestão'
      });
    }

    // Atualizar análise
    const updatedAnalysis = await FightAnalysis.update(analysisId, updateData);

    // Criar nova versão
    await createAnalysisVersion({
      analysisId,
      versionNumber: newVersionNumber,
      analysis: updatedAnalysis,
      editReason: editSuggestion.reason || 'Sugestão da IA aplicada',
      userId
    });

    // Atualizar contexto da sessão de chat (se houver)
    if (sessionId) {
      await ChatSession.updateContextSnapshot(sessionId, updatedAnalysis);
    }

    res.json({
      success: true,
      data: {
        analysis: updatedAnalysis,
        versionNumber: newVersionNumber
      }
    });
  } catch (error) {
    handleError(res, 'aplicar edição', error);
  }
};

/**
 * Salva edição manual do usuário
 * POST /api/chat/manual-edit
 */
exports.manualEdit = async (req, res) => {
  try {
    const { analysisId, field, newValue, reason } = req.body;
    const userId = req.userId;

    if (!analysisId || !field || newValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'analysisId, field e newValue são obrigatórios'
      });
    }

    // Buscar análise atual
    const analysis = await FightAnalysis.getById(analysisId);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    // Garantir versão original antes de editar
    const newVersionNumber = await ensureOriginalVersion(analysisId, analysis, userId);

    // Preparar dados de atualização
    const updateData = {};
    if (field === 'summary') {
      updateData.summary = newValue;
    } else if (field === 'charts') {
      updateData.charts = newValue;
    } else if (field === 'technical_stats') {
      updateData.technicalStats = newValue;
    }

    // Atualizar análise
    const updatedAnalysis = await FightAnalysis.update(analysisId, updateData);

    // Criar nova versão
    await createAnalysisVersion({
      analysisId,
      versionNumber: newVersionNumber,
      analysis: updatedAnalysis,
      editReason: reason || 'Edição manual do usuário',
      userId
    });

    res.json({
      success: true,
      data: {
        analysis: updatedAnalysis,
        versionNumber: newVersionNumber
      }
    });
  } catch (error) {
    handleError(res, 'salvar edição manual', error);
  }
};

/**
 * Busca histórico de versões de uma análise
 * GET /api/chat/versions/:analysisId
 */
exports.getVersions = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { type = 'fight' } = req.query;

    const versions = await AnalysisVersion.getByAnalysisId(analysisId, type);

    res.json({
      success: true,
      data: versions,
      count: versions.length
    });
  } catch (error) {
    handleError(res, 'buscar versões', error);
  }
};

/**
 * Restaura uma versão específica
 * POST /api/chat/restore-version
 */
exports.restoreVersion = async (req, res) => {
  try {
    const { analysisId, versionNumber } = req.body;

    if (!analysisId || !versionNumber) {
      return res.status(400).json({
        success: false,
        error: 'analysisId e versionNumber são obrigatórios'
      });
    }

    // Buscar versão específica
    const version = await AnalysisVersion.getByVersionNumber(analysisId, 'fight', versionNumber);
    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Versão não encontrada'
      });
    }

    // Restaurar conteúdo - version.content pode ser o conteúdo direto ou ter subcampos
    const content = version.content || {};
    const updateData = {};

    // Tentar extrair campos do content
    if (content.summary !== undefined) updateData.summary = content.summary;
    if (content.charts !== undefined) updateData.charts = content.charts;
    if (content.technicalStats !== undefined) updateData.technicalStats = content.technicalStats;
    if (content.technical_stats !== undefined) updateData.technicalStats = content.technical_stats;

    // Se updateData está vazio mas content tem dados, usar content diretamente como summary
    if (Object.keys(updateData).length === 0 && typeof content === 'string') {
      updateData.summary = content;
    }

    // Só fazer update se houver dados
    let updatedAnalysis;
    if (Object.keys(updateData).length > 0) {
      updatedAnalysis = await FightAnalysis.update(analysisId, updateData);
    } else {
      // Buscar análise atual se não há nada para atualizar
      updatedAnalysis = await FightAnalysis.getById(analysisId);
    }

    // Marcar esta versão como atual
    await AnalysisVersion.setAsCurrent(version.id, analysisId, 'fight');

    res.json({
      success: true,
      data: {
        analysis: updatedAnalysis,
        restoredVersion: versionNumber
      }
    });
  } catch (error) {
    handleError(res, 'restaurar versão', error);
  }
};
