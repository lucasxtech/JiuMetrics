/**
 * Chat de IA — edição e versionamento de análise de luta.
 *
 * Extraído de `chatController.js` pela spec 006. É onde viviam 4 dos 6
 * vazamentos de posse do sistema (AZ-2..AZ-5 de docs/AUTHORIZATION.md),
 * todos fechados aqui.
 *
 * O padrão obrigatório destes handlers (ver CLAUDE.md § Authorization):
 * resolver o escopo → carregar o recurso JÁ filtrado → 404 se não vier nada →
 * só então escrever, passando o escopo adiante até o model.
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
    const newVersionNumber = await ensureOriginalVersion(analysisId, analysis, allowedUserIds);

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
    const updatedAnalysis = await FightAnalysis.update(analysisId, updateData, allowedUserIds);

    // Criar nova versão
    await createAnalysisVersion({
      analysisId,
      versionNumber: newVersionNumber,
      analysis: updatedAnalysis,
      editReason: editSuggestion.reason || 'Sugestão da IA aplicada',
      allowedUserIds
    });

    // Atualizar contexto da sessão de chat (se houver).
    //
    // AZ-5: este `sessionId` vem cru do corpo da requisição e antes era
    // aplicado sem nenhuma verificação — envenenava o contexto que a IA de
    // outro usuário receberia nos turnos seguintes. Agora o model exige o
    // dono. Um `sessionId` alheio ou inexistente não desfaz a edição da
    // análise, que já foi validada e aplicada: é um efeito colateral de UI,
    // registrado e ignorado.
    if (sessionId) {
      const updatedSession = await ChatSession.updateContextSnapshot(sessionId, updatedAnalysis, userId);
      if (!updatedSession) {
        console.warn('⚠️ context_snapshot não atualizado — sessão inexistente ou de outro usuário:', sessionId);
      }
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

    if (!analysisId || !field || newValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'analysisId, field e newValue são obrigatórios'
      });
    }

    // AZ-2: aqui era `FightAnalysis.getById(analysisId)` — a variante SEM
    // filtro de usuário —, seguido de um `update` que também não filtrava.
    // Qualquer usuário autenticado sobrescrevia a análise de qualquer tenant.
    const allowedUserIds = await resolveScope(req.actor);
    const analysis = await FightAnalysis.getByIdAndUser(analysisId, allowedUserIds);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    // Garantir versão original antes de editar
    const newVersionNumber = await ensureOriginalVersion(analysisId, analysis, allowedUserIds);

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
    const updatedAnalysis = await FightAnalysis.update(analysisId, updateData, allowedUserIds);

    // Criar nova versão
    await createAnalysisVersion({
      analysisId,
      versionNumber: newVersionNumber,
      analysis: updatedAnalysis,
      editReason: reason || 'Edição manual do usuário',
      allowedUserIds
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

    // AZ-3: `analysis_versions` não tem coluna `user_id`, então a posse é a
    // da análise PAI (decisão P4 da spec 006). Verificar antes de consultar
    // garante 404 em vez de lista vazia — 404 não vaza existência, e uma
    // lista vazia seria indistinguível de "essa análise não tem versões".
    const allowedUserIds = await resolveScope(req.actor);
    if (!await AnalysisVersion.isAnalysisInScope(analysisId, type, allowedUserIds)) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    const versions = await AnalysisVersion.getByAnalysisId(analysisId, type, allowedUserIds);

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

    // AZ-4: não havia verificação de posse em ponto algum deste handler, e ele
    // escreve duas vezes (a análise e o ponteiro de versão atual). Era o
    // vazamento mais destrutivo: revertia o conteúdo da análise de outro
    // usuário.
    const allowedUserIds = await resolveScope(req.actor);
    const analysis = await FightAnalysis.getByIdAndUser(analysisId, allowedUserIds);
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    // Buscar versão específica
    const version = await AnalysisVersion.getByVersionNumber(analysisId, 'fight', versionNumber, allowedUserIds);
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
      updatedAnalysis = await FightAnalysis.update(analysisId, updateData, allowedUserIds);
    } else {
      // Nada a atualizar: devolver a análise já carregada acima
      updatedAnalysis = analysis;
    }

    // Marcar esta versão como atual
    await AnalysisVersion.setAsCurrent(version.id, analysisId, 'fight', allowedUserIds);

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
