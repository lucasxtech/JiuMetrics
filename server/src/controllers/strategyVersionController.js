// Controller para Versões de Estratégia Tática
const StrategyVersion = require('../models/StrategyVersion');

const strategyVersionController = {
  /**
   * Busca todas as versões de uma análise
   * GET /api/strategy/analyses/:analysisId/versions
   */
  async getVersions(req, res) {
    try {
      const { analysisId } = req.params;
      const userId = req.userId;

      const versions = await StrategyVersion.getByAnalysisId(analysisId, userId);

      res.json({
        success: true,
        count: versions.length,
        versions: versions.map(v => ({
          id: v.id,
          versionNumber: v.versionNumber,
          editedField: v.editedField,
          editedBy: v.editedBy,
          editReason: v.editReason,
          isCurrent: v.isCurrent,
          createdAt: v.createdAt,
          // Incluir o conteúdo completo para preview
          content: v.content,
          // Incluir preview do conteúdo
          preview: getContentPreview(v.content, v.editedField)
        }))
      });
    } catch (error) {
      console.error('❌ [Versions] Erro ao buscar versões:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar versões',
        details: error.message 
      });
    }
  },

  /**
   * Restaura uma versão específica
   * POST /api/strategy/analyses/:analysisId/versions/:versionId/restore
   */
  async restoreVersion(req, res) {
    try {
      const { analysisId, versionId } = req.params;
      const userId = req.userId;

      const result = await StrategyVersion.restore(versionId, analysisId, userId);

      res.json({
        success: true,
        message: 'Versão restaurada com sucesso',
        newVersion: result.version,
        content: result.content
      });
    } catch (error) {
      console.error('❌ [Versions] Erro ao restaurar versão:', error);
      res.status(500).json({ 
        error: 'Erro ao restaurar versão',
        details: error.message 
      });
    }
  }
};

/**
 * Gera um preview do conteúdo baseado no campo editado
 */
function getContentPreview(content, editedField) {
  if (!content) return null;

  // Mapear campos para chaves no objeto
  const fieldMap = {
    'como_vencer': 'como_vencer',
    'strategy': 'strategy',
    'tese_da_vitoria': 'tese_da_vitoria', // Legado
    'plano_tatico_faseado': 'plano_tatico_faseado',
    'cronologia_inteligente': 'cronologia_inteligente',
    'analise_de_matchup': 'analise_de_matchup'
  };

  const fieldNames = {
    'como_vencer': 'Como Vencer Esta Luta',
    'strategy': 'Como Vencer Esta Luta',
    'tese_da_vitoria': 'Como Vencer Esta Luta', // Legado
    'plano_tatico_faseado': 'Plano Tático',
    'cronologia_inteligente': 'Cronologia',
    'analise_de_matchup': 'Análise de Matchup'
  };

  // Se há um campo específico editado, mostrar preview dele
  if (editedField && fieldMap[editedField]) {
    const fieldContent = content[fieldMap[editedField]];
    if (fieldContent) {
      const text = typeof fieldContent === 'string' 
        ? fieldContent 
        : JSON.stringify(fieldContent);
      return {
        field: fieldNames[editedField] || editedField,
        text: text.substring(0, 150) + (text.length > 150 ? '...' : '')
      };
    }
  }

  // Senão, mostrar preview do "Como Vencer" como resumo geral
  const comoVencer = content.resumo_rapido?.como_vencer || content.tese_da_vitoria;
  if (comoVencer) {
    const text = typeof comoVencer === 'string' ? comoVencer : JSON.stringify(comoVencer);
    return {
      field: 'Visão Geral',
      text: text.substring(0, 150) + (text.length > 150 ? '...' : '')
    };
  }

  return null;
}

module.exports = strategyVersionController;
