// Modelo de dados para Análise de Lutas com Supabase
const { supabase } = require('../config/supabase');
const { parseAnalysisFromDB, parseAnalysesFromDB } = require('../utils/dbParsers');

class FightAnalysis {
  /**
   * Busca todas as análises
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return parseAnalysesFromDB(data);
  }

  /**
   * Busca análises por tipo de pessoa (athlete ou opponent)
   */
  static async getByPersonId(personId, userId = null) {
    console.log('🔎 FightAnalysis.getByPersonId:', { personId, userId });
    
    let query = supabase
      .from('fight_analyses')
      .select('*')
      .eq('person_id', personId);
    
    // Filtrar por user_id se fornecido
    if (userId) {
      console.log('🔒 Filtrando por userId:', userId);
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar análises:', error);
      throw error;
    }
    
    console.log('📊 Dados retornados do Supabase:', data?.length || 0, 'registros');
    if (data && data.length > 0) {
      console.log('🔍 Primeira análise:', {
        id: data[0].id,
        person_id: data[0].person_id,
        user_id: data[0].user_id,
        created_at: data[0].created_at
      });
    }
    
    return parseAnalysesFromDB(data);
  }

  /**
   * Busca uma análise por ID
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return parseAnalysisFromDB(data);
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
      frames_analyzed: analysisData.framesAnalyzed || 0,
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
   * Atualiza uma análise
   */
  static async update(id, analysisData) {
    const updateData = {};
    
    if (analysisData.videoUrl !== undefined) updateData.video_url = analysisData.videoUrl;
    if (analysisData.charts !== undefined) updateData.charts = analysisData.charts;
    if (analysisData.summary !== undefined) updateData.summary = analysisData.summary;
    if (analysisData.technicalProfile !== undefined) updateData.technical_profile = analysisData.technicalProfile;
    if (analysisData.framesAnalyzed !== undefined) updateData.frames_analyzed = analysisData.framesAnalyzed;

    const { data, error } = await supabase
      .from('fight_analyses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return parseAnalysisFromDB(data);
  }

  /**
   * Deleta uma análise
   */
  static async delete(id) {
    const { data, error } = await supabase
      .from('fight_analyses')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return parseAnalysisFromDB(data);
  }
}

module.exports = FightAnalysis;
