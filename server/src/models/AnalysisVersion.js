// @ts-check
// Modelo de dados para Versões de Análises
//
// ⚠️ ESTA TABELA NÃO TEM DONO. `analysis_versions` (migration 010) não tem
// coluna `user_id`, e por isso nenhum método deste model filtrava por
// usuário — era o vazamento AZ-3: qualquer usuário autenticado lia o
// `content` completo de qualquer versão de qualquer tenant.
//
// DECISÃO P4 (spec 006): a autorização deriva da ANÁLISE PAI, verificada em
// duas etapas na aplicação. Não por coluna `user_id` denormalizada e não por
// JOIN no PostgREST:
//
//   - denormalizar exigiria migration + backfill, e criaria uma segunda
//     fonte de verdade de posse que pode divergir da análise pai;
//   - JOIN embedado do PostgREST (`select('*, fight_analyses(user_id)')`)
//     é IMPOSSÍVEL aqui: `analysis_id` é polimórfico (aponta para
//     `fight_analyses` ou `tactical_analyses` conforme `analysis_type`) e
//     não tem foreign key — e o PostgREST só embeda relação declarada.
//
// A verificação em duas etapas custa uma query extra por chamada. É
// deliberado: correção antes de latência, e reversível sem tocar em dado.
const { supabase } = require('../config/supabase');
const FightAnalysis = require('./FightAnalysis');
const TacticalAnalysis = require('./TacticalAnalysis');
const { requireScope } = require('../utils/scopeGuard');
const { ValidationError, AuthorizationError } = require('../utils/errors');

/**
 * A análise pai está no escopo de posse do ator?
 *
 * @param {string} analysisId
 * @param {string} analysisType - 'fight' ou 'tactical' (CHECK da migration 010)
 * @param {string[]} ids - escopo já normalizado
 * @returns {Promise<boolean>}
 * @throws {ValidationError} para `analysis_type` fora do CHECK — melhor falhar
 *   visível do que devolver lista vazia e parecer "sem versões"
 */
async function isParentInScope(analysisId, analysisType, ids) {
  if (analysisType === 'fight') {
    return Boolean(await FightAnalysis.getByIdAndUser(analysisId, ids));
  }
  if (analysisType === 'tactical') {
    return Boolean(await TacticalAnalysis.getById(analysisId, ids));
  }
  throw new ValidationError(`analysis_type inválido: "${analysisType}". Use "fight" ou "tactical".`);
}

class AnalysisVersion {
  /**
   * A análise pai está no escopo de posse do ator?
   *
   * Exposto para que o controller possa devolver **404** antes de consultar as
   * versões (não vazar existência) sem duplicar o dispatch por
   * `analysis_type`. Os métodos abaixo repetem a verificação por conta
   * própria: o controller decide o status HTTP, o model garante o isolamento
   * mesmo se um chamador futuro esquecer de checar.
   *
   * @param {string} analysisId
   * @param {string} analysisType - 'fight' ou 'tactical'
   * @param {string|string[]} allowedUserIds - escopo de posse (obrigatório)
   * @returns {Promise<boolean>}
   */
  static async isAnalysisInScope(analysisId, analysisType, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'AnalysisVersion.isAnalysisInScope');
    return isParentInScope(analysisId, analysisType, ids);
  }

  /**
   * Cria uma nova versão de uma análise
   * @param {Object} versionData - Dados da versão (inclui `allowedUserIds`)
   * @returns {Promise<Object>} Versão criada
   */
  static async create(versionData) {
    const ids = requireScope(versionData.allowedUserIds, 'AnalysisVersion.create');
    if (!await isParentInScope(versionData.analysisId, versionData.analysisType, ids)) {
      throw new AuthorizationError('Análise não pertence ao escopo do usuário');
    }

    // Se esta é a versão atual, desmarcar versões anteriores
    if (versionData.isCurrent) {
      await supabase
        .from('analysis_versions')
        .update({ is_current: false })
        .eq('analysis_id', versionData.analysisId)
        .eq('analysis_type', versionData.analysisType);
    }

    const insertData = {
      analysis_id: versionData.analysisId,
      analysis_type: versionData.analysisType,
      version_number: versionData.versionNumber,
      content: versionData.content,
      edited_by: versionData.editedBy,
      edit_reason: versionData.editReason || null,
      is_current: versionData.isCurrent || false,
      chat_session_id: versionData.chatSessionId || null
    };

    const { data, error } = await supabase
      .from('analysis_versions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro no Supabase:', error);
      throw error;
    }

    return this.parseFromDB(data);
  }

  /**
   * Busca todas as versões de uma análise
   * @param {string} analysisId - ID da análise
   * @param {string} analysisType - 'fight' ou 'tactical'
   * @param {string|string[]} allowedUserIds - escopo de posse (obrigatório)
   * @returns {Promise<Array>} Lista de versões ordenadas (vazia se a análise
   *   pai está fora do escopo — o chamador deve ter devolvido 404 antes)
   */
  static async getByAnalysisId(analysisId, analysisType, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'AnalysisVersion.getByAnalysisId');
    if (!await isParentInScope(analysisId, analysisType, ids)) return [];

    const { data, error } = await supabase
      .from('analysis_versions')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('analysis_type', analysisType)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return (data || []).map(version => this.parseFromDB(version));
  }

  /**
   * Busca a versão atual de uma análise
   * @param {string} analysisId - ID da análise
   * @param {string} analysisType - 'fight' ou 'tactical'
   * @param {string|string[]} allowedUserIds - escopo de posse (obrigatório)
   * @returns {Promise<Object|null>} Versão atual ou null
   */
  static async getCurrentVersion(analysisId, analysisType, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'AnalysisVersion.getCurrentVersion');
    if (!await isParentInScope(analysisId, analysisType, ids)) return null;

    const { data, error } = await supabase
      .from('analysis_versions')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('analysis_type', analysisType)
      .eq('is_current', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return this.parseFromDB(data);
  }

  /**
   * Busca versão específica por número
   * @param {string} analysisId - ID da análise
   * @param {string} analysisType - 'fight' ou 'tactical'
   * @param {number} versionNumber - Número da versão
   * @param {string|string[]} allowedUserIds - escopo de posse (obrigatório)
   * @returns {Promise<Object|null>} Versão encontrada ou null
   */
  static async getByVersionNumber(analysisId, analysisType, versionNumber, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'AnalysisVersion.getByVersionNumber');
    if (!await isParentInScope(analysisId, analysisType, ids)) return null;

    const { data, error } = await supabase
      .from('analysis_versions')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('analysis_type', analysisType)
      .eq('version_number', versionNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.parseFromDB(data);
  }

  /**
   * Conta versões de uma análise
   * @param {string} analysisId - ID da análise
   * @param {string} analysisType - 'fight' ou 'tactical'
   * @param {string|string[]} allowedUserIds - escopo de posse (obrigatório)
   * @returns {Promise<number>} Número de versões
   */
  static async countVersions(analysisId, analysisType, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'AnalysisVersion.countVersions');
    if (!await isParentInScope(analysisId, analysisType, ids)) return 0;

    const { count, error } = await supabase
      .from('analysis_versions')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_id', analysisId)
      .eq('analysis_type', analysisType);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Define uma versão como atual (e desmarca as outras)
   * @param {string} versionId - ID da versão
   * @param {string} analysisId - ID da análise
   * @param {string} analysisType - 'fight' ou 'tactical'
   * @param {string|string[]} allowedUserIds - escopo de posse (obrigatório)
   * @returns {Promise<Object>} Versão atualizada
   */
  static async setAsCurrent(versionId, analysisId, analysisType, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'AnalysisVersion.setAsCurrent');
    if (!await isParentInScope(analysisId, analysisType, ids)) {
      throw new AuthorizationError('Análise não pertence ao escopo do usuário');
    }

    // Desmarcar todas as versões desta análise
    await supabase
      .from('analysis_versions')
      .update({ is_current: false })
      .eq('analysis_id', analysisId)
      .eq('analysis_type', analysisType);

    // Marcar a versão específica como atual
    const { data, error } = await supabase
      .from('analysis_versions')
      .update({ is_current: true })
      .eq('id', versionId)
      .eq('analysis_id', analysisId)
      .select();

    if (error) throw error;

    // Retornar a primeira versão (ou null se não encontrou)
    return data && data.length > 0 ? this.parseFromDB(data[0]) : null;
  }

  /**
   * Converte dados do banco para formato da aplicação
   * @param {Object} dbData - Dados do Supabase
   * @returns {Object} Dados formatados
   */
  static parseFromDB(dbData) {
    if (!dbData) return null;

    return {
      id: dbData.id,
      analysisId: dbData.analysis_id,
      analysisType: dbData.analysis_type,
      versionNumber: dbData.version_number,
      content: dbData.content,
      editedBy: dbData.edited_by,
      editReason: dbData.edit_reason,
      isCurrent: dbData.is_current,
      chatSessionId: dbData.chat_session_id,
      createdAt: dbData.created_at
    };
  }
}

module.exports = AnalysisVersion;
