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
  static async getByPersonId(personId) {
    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .eq('person_id', personId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('fight_analyses')
      .insert([{
        person_id: analysisData.personId,
        person_type: analysisData.personType,
        video_url: analysisData.videoUrl || '',
        charts: analysisData.charts || [],
        summary: analysisData.summary || '',
        technical_profile: analysisData.technicalProfile || '',
        frames_analyzed: analysisData.framesAnalyzed || 0,
      }])
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
