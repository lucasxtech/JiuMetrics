// Modelo de dados para Versões de Perfil Técnico com Supabase
const { supabaseAdmin } = require('../config/supabase');

class ProfileVersion {
  /**
   * Cria uma nova versão do perfil técnico
   */
  static async create(versionData) {
    const { personId, personType, userId, content, editedBy, editReason } = versionData;

    // Buscar próximo número de versão
    const { data: lastVersion } = await supabaseAdmin
      .from('profile_versions')
      .select('version_number')
      .eq('person_id', personId)
      .eq('person_type', personType)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

    // Desmarcar versões anteriores como não-atuais
    await supabaseAdmin
      .from('profile_versions')
      .update({ is_current: false })
      .eq('person_id', personId)
      .eq('person_type', personType);

    // Criar nova versão
    const { data, error } = await supabaseAdmin
      .from('profile_versions')
      .insert([{
        person_id: personId,
        person_type: personType,
        user_id: userId,
        version_number: nextVersionNumber,
        content: content,
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
   * Busca todas as versões de um perfil
   */
  static async getByPersonId(personId, personType, userId) {
    const { data, error } = await supabaseAdmin
      .from('profile_versions')
      .select('*')
      .eq('person_id', personId)
      .eq('person_type', personType)
      .eq('user_id', userId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.parseFromDB);
  }

  /**
   * Busca uma versão específica pelo número
   */
  static async getByVersionNumber(personId, personType, versionNumber, userId) {
    const { data, error } = await supabaseAdmin
      .from('profile_versions')
      .select('*')
      .eq('person_id', personId)
      .eq('person_type', personType)
      .eq('version_number', versionNumber)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this.parseFromDB(data) : null;
  }

  /**
   * Marca uma versão como atual
   */
  static async setAsCurrent(versionId, personId, personType, userId) {
    // Desmarcar todas como não-atuais
    await supabaseAdmin
      .from('profile_versions')
      .update({ is_current: false })
      .eq('person_id', personId)
      .eq('person_type', personType)
      .eq('user_id', userId);

    // Marcar a versão específica como atual
    const { error } = await supabaseAdmin
      .from('profile_versions')
      .update({ is_current: true })
      .eq('id', versionId);

    if (error) throw error;
  }

  /**
   * Converte dados do DB para formato da aplicação
   */
  static parseFromDB(data) {
    return {
      id: data.id,
      personId: data.person_id,
      personType: data.person_type,
      userId: data.user_id,
      versionNumber: data.version_number,
      content: data.content,
      editedBy: data.edited_by,
      editReason: data.edit_reason,
      isCurrent: data.is_current,
      createdAt: data.created_at
    };
  }
}

module.exports = ProfileVersion;
