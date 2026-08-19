// Modelo de dados para Análise de Lutas com Supabase
//
// ⚠️ Desde a spec 006, TODO método deste model exige escopo de posse na
// assinatura. Chamada sem escopo lança `MissingScopeError` — não devolve
// `null` nem lista vazia, que seriam indistinguíveis de "não encontrado".
// Não adicione um método que aceite `id` sem escopo.
const { supabase } = require('../config/supabase');
const { parseAnalysisFromDB, parseAnalysesFromDB } = require('../utils/dbParsers');
const { requireScope } = require('../utils/scopeGuard');

class FightAnalysis {
  /**
   * Busca todas as análises dentro do grupo permitido
   * @param {string[]} allowedUserIds
   */
  static async getAll(allowedUserIds) {
    requireScope(allowedUserIds, 'FightAnalysis.getAll');

    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .in('user_id', allowedUserIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Buscar nomes dos criadores (só quando há mais de um usuário no grupo)
    const creatorMap = {};
    if (allowedUserIds.length > 1) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', allowedUserIds);
      if (usersData) usersData.forEach(u => { creatorMap[u.id] = u.name; });
    }

    const analysesWithCreator = (data || []).map(a => ({
      ...a,
      creator_name: creatorMap[a.user_id] || null,
    }));

    return parseAnalysesFromDB(analysesWithCreator);
  }

  /**
   * Busca análises por pessoa dentro do grupo permitido
   *
   * O parâmetro de escopo tinha default `null`, que desligava o filtro por
   * completo. Nenhum chamador usava esse default (verificado na spec 006),
   * mas ele era exatamente a armadilha que esta spec fecha.
   *
   * @param {string} personId
   * @param {string|string[]} allowedUserIds - userId ou array de IDs (obrigatório)
   */
  static async getByPersonId(personId, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'FightAnalysis.getByPersonId');

    const query = supabase
      .from('fight_analyses')
      .select('*')
      .eq('person_id', personId)
      .in('user_id', ids);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar análises:', error);
      throw error;
    }

    return parseAnalysesFromDB(data);
  }

  // NOTA (spec 006): existia aqui um `getById(id)` SEM filtro de usuário — a
  // variante que `manual-edit` e `restore-version` usavam, e a causa direta
  // dos vazamentos AZ-2 e AZ-4. Foi REMOVIDO, não renomeado: depois de
  // corrigir os dois call sites, ele ficou sem nenhum uso legítimo. Use
  // `getByIdAndUser`.

  /**
   * Busca análise por ID garantindo que pertence ao usuário (ou é admin)
   */
  static async getByIdAndUser(id, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'FightAnalysis.getByIdAndUser');

    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .eq('id', id)
      .in('user_id', ids)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return parseAnalysisFromDB({ ...data, creator_name: null });
  }

  /**
   * Cria uma nova análise de luta
   */
  static async create(analysisData) {
    const insertData = {
      person_id: analysisData.personId,
      person_type: analysisData.personType,
      video_url: analysisData.videoUrl || '',
      charts: analysisData.charts || [],
      summary: analysisData.summary || '',
      technical_profile: analysisData.technicalProfile || '',
      technical_stats: analysisData.technicalStats || null,
      frames_analyzed: analysisData.framesAnalyzed || 0,
      current_version: 1,
      is_edited: false,
    };
    
    // Adicionar user_id se fornecido
    if (analysisData.userId) {
      insertData.user_id = analysisData.userId;
    }
    
    const { data, error } = await supabase
      .from('fight_analyses')
      .insert([insertData])
      .select()
      .single();
    
    if (error) throw error;
    return parseAnalysisFromDB(data);
  }

  /**
   * Atualiza uma análise, restrita ao escopo de posse do ator.
   *
   * Diferente de `Athlete.update`/`Opponent.update`, que filtram pelo
   * `user_id` do REGISTRO (`.eq`), aqui o filtro é o escopo inteiro
   * (`.in`). Os dois preservam o acesso do admin ao dado do grupo — o
   * escopo já contém o `user_id` do dono quando o ator pode alcançá-lo —,
   * e usar o escopo direto dispensa buscar o registro só para descobrir o
   * dono.
   *
   * @param {string} id
   * @param {Object} analysisData
   * @param {string|string[]} allowedUserIds - obrigatório
   */
  static async update(id, analysisData, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'FightAnalysis.update');
    const updateData = {};
    
    if (analysisData.videoUrl !== undefined) updateData.video_url = analysisData.videoUrl;
    if (analysisData.charts !== undefined) updateData.charts = analysisData.charts;
    if (analysisData.summary !== undefined) updateData.summary = analysisData.summary;
    if (analysisData.technicalProfile !== undefined) updateData.technical_profile = analysisData.technicalProfile;
    if (analysisData.technicalStats !== undefined) updateData.technical_stats = analysisData.technicalStats;
    if (analysisData.framesAnalyzed !== undefined) updateData.frames_analyzed = analysisData.framesAnalyzed;
    if (analysisData.currentVersion !== undefined) updateData.current_version = analysisData.currentVersion;
    if (analysisData.isEdited !== undefined) updateData.is_edited = analysisData.isEdited;
    if (analysisData.originalSummary !== undefined) updateData.original_summary = analysisData.originalSummary;
    if (analysisData.originalCharts !== undefined) updateData.original_charts = analysisData.originalCharts;

    // Se não há nada para atualizar, apenas buscar e retornar
    if (Object.keys(updateData).length === 0) {
      return this.getByIdAndUser(id, ids);
    }

    const { data, error } = await supabase
      .from('fight_analyses')
      .update(updateData)
      .eq('id', id)
      .in('user_id', ids)
      .select();

    if (error) throw error;

    // Retornar primeira linha ou null
    return data && data.length > 0 ? parseAnalysisFromDB(data[0]) : null;
  }

  /**
   * Deleta uma análise, restrita ao escopo de posse do ator.
   * @param {string} id
   * @param {string|string[]} allowedUserIds - obrigatório
   */
  static async delete(id, allowedUserIds) {
    const ids = requireScope(allowedUserIds, 'FightAnalysis.delete');

    const { data, error } = await supabase
      .from('fight_analyses')
      .delete()
      .eq('id', id)
      .in('user_id', ids)
      .select();

    if (error) throw error;
    return data && data.length > 0 ? parseAnalysisFromDB(data[0]) : null;
  }
}

module.exports = FightAnalysis;
