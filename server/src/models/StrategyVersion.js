// Modelo de dados para Versões de Estratégia Tática com Supabase
const { supabaseAdmin } = require('../config/supabase');

class StrategyVersion {
  /**
   * Cria uma nova versão da estratégia
   */
  static async create(versionData) {
    const { analysisId, userId, content, editedField, editedBy, editReason } = versionData;

    // Buscar próximo número de versão
    const { data: lastVersion } = await supabaseAdmin
      .from('strategy_versions')
      .select('version_number')
      .eq('analysis_id', analysisId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

    // Desmarcar versões anteriores como não-atuais
    await supabaseAdmin
      .from('strategy_versions')
      .update({ is_current: false })
      .eq('analysis_id', analysisId);

    // Criar nova versão
    const { data, error } = await supabaseAdmin
      .from('strategy_versions')
      .insert([{
        analysis_id: analysisId,
        user_id: userId,
        version_number: nextVersionNumber,
        content: content,
        edited_field: editedField || null,
        edited_by: editedBy,
        edit_reason: editReason,
        is_current: true
      }])
      .select()
      .single();

    if (error) throw error;
    return this.parseFromDB(data);
  }

  /**
   * Cria a primeira versão (quando a análise é criada)
   */
  static async createInitial(analysisId, userId, content) {
    return this.create({
      analysisId,
      userId,
      content,
      editedField: null,
      editedBy: 'system',
      editReason: 'Versão inicial da estratégia'
    });
  }

  /**
   * Busca todas as versões de uma análise
   */
  static async getByAnalysisId(analysisId, userId) {
    const { data, error } = await supabaseAdmin
      .from('strategy_versions')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('user_id', userId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.parseFromDB);
  }

  /**
   * Busca uma versão específica pelo número
   */
  static async getByVersionNumber(analysisId, versionNumber, userId) {
    const { data, error } = await supabaseAdmin
      .from('strategy_versions')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('version_number', versionNumber)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.parseFromDB(data) : null;
  }

  /**
   * Busca a versão atual
   */
  static async getCurrent(analysisId, userId) {
    const { data, error } = await supabaseAdmin
      .from('strategy_versions')
      .select('*')
      .eq('analysis_id', analysisId)
      .eq('user_id', userId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.parseFromDB(data) : null;
  }

  /**
   * Restaura uma versão (marca como atual e atualiza a análise)
   */
  static async restore(versionId, analysisId, userId) {
    // Buscar a versão a ser restaurada
    const { data: version, error: fetchError } = await supabaseAdmin
      .from('strategy_versions')
      .select('*')
      .eq('id', versionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!version) throw new Error('Versão não encontrada');

    // Desmarcar todas como não-atuais
    await supabaseAdmin
      .from('strategy_versions')
      .update({ is_current: false })
      .eq('analysis_id', analysisId)
      .eq('user_id', userId);

    // Criar uma nova versão com o conteúdo restaurado
    const newVersion = await this.create({
      analysisId,
      userId,
      content: version.content,
      editedField: null,
      editedBy: 'user',
      editReason: `Restaurado da versão ${version.version_number}`
    });

    // Atualizar a análise principal
    const { error: updateError } = await supabaseAdmin
      .from('tactical_analyses')
      .update({ strategy_data: version.content })
      .eq('id', analysisId);

    if (updateError) throw updateError;

    return {
      version: newVersion,
      content: version.content
    };
  }

  /**
   * Conta total de versões de uma análise
   */
  static async count(analysisId, userId) {
    const { count, error } = await supabaseAdmin
      .from('strategy_versions')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_id', analysisId)
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Converte dados do DB para formato da aplicação
   */
  static parseFromDB(data) {
    return {
      id: data.id,
      analysisId: data.analysis_id,
      userId: data.user_id,
      versionNumber: data.version_number,
      content: data.content,
      editedField: data.edited_field,
      editedBy: data.edited_by,
      editReason: data.edit_reason,
      isCurrent: data.is_current,
      createdAt: data.created_at
    };
  }
}

module.exports = StrategyVersion;
