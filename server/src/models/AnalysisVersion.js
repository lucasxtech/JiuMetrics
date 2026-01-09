// Modelo de dados para Versões de Análises
const { supabase } = require('../config/supabase');

class AnalysisVersion {
  /**
   * Cria uma nova versão de uma análise
   * @param {Object} versionData - Dados da versão
   * @returns {Promise<Object>} Versão criada
   */
  static async create(versionData) {
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

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Busca todas as versões de uma análise
   * @param {string} analysisId - ID da análise
   * @param {string} analysisType - 'fight' ou 'tactical'
   * @returns {Promise<Array>} Lista de versões ordenadas
   */
  static async getByAnalysisId(analysisId, analysisType) {
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
   * @returns {Promise<Object|null>} Versão atual ou null
   */
  static async getCurrentVersion(analysisId, analysisType) {
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
   * @returns {Promise<Object|null>} Versão encontrada ou null
   */
  static async getByVersionNumber(analysisId, analysisType, versionNumber) {
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
   * @returns {Promise<number>} Número de versões
   */
  static async countVersions(analysisId, analysisType) {
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
   * @returns {Promise<Object>} Versão atualizada
   */
  static async setAsCurrent(versionId, analysisId, analysisType) {
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
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
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
