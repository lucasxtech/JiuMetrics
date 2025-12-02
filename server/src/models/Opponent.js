// Modelo de dados para Adversário com Supabase
const supabase = require('../config/supabase');
const { parseAthleteFromDB, parseAthletesFromDB } = require('../utils/dbParsers'); // Reutiliza parsers

class Opponent {
  /**
   * Busca todos os adversários
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('opponents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return parseAthletesFromDB(data);
  }

  /**
   * Busca um adversário por ID
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('opponents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Cria um novo adversário
   */
  static async create(opponentData) {
    const { data, error } = await supabase
      .from('opponents')
      .insert([{
        name: opponentData.name,
        belt: opponentData.belt,
        weight: opponentData.weight,
        height: opponentData.height,
        age: opponentData.age,
        style: opponentData.style,
        strong_attacks: opponentData.strongAttacks,
        weaknesses: opponentData.weaknesses,
        video_url: opponentData.videoUrl,
        cardio: opponentData.cardio,
        technical_profile: opponentData.technicalProfile || {},
      }])
      .select()
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Atualiza um adversário
   */
  static async update(id, opponentData) {
    const updateData = {};
    
    if (opponentData.name !== undefined) updateData.name = opponentData.name;
    if (opponentData.belt !== undefined) updateData.belt = opponentData.belt;
    if (opponentData.weight !== undefined) updateData.weight = opponentData.weight;
    if (opponentData.height !== undefined) updateData.height = opponentData.height;
    if (opponentData.age !== undefined) updateData.age = opponentData.age;
    if (opponentData.style !== undefined) updateData.style = opponentData.style;
    if (opponentData.strongAttacks !== undefined) updateData.strong_attacks = opponentData.strongAttacks;
    if (opponentData.weaknesses !== undefined) updateData.weaknesses = opponentData.weaknesses;
    if (opponentData.videoUrl !== undefined) updateData.video_url = opponentData.videoUrl;
    if (opponentData.cardio !== undefined) updateData.cardio = opponentData.cardio;
    if (opponentData.technicalProfile !== undefined) updateData.technical_profile = opponentData.technicalProfile;

    const { data, error } = await supabase
      .from('opponents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Deleta um adversário
   */
  static async delete(id) {
    const { data, error } = await supabase
      .from('opponents')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Atualiza perfil técnico baseado em análises de lutas
   */
  static async updateTechnicalProfile(id, analysisData) {
    const opponent = await this.getById(id);
    if (!opponent) return null;

    // Mesclar dados de análise com perfil existente
    const updatedProfile = {
      ...opponent.technicalProfile,
      ...analysisData,
    };

    return this.update(id, { technicalProfile: updatedProfile });
  }
}

module.exports = Opponent;
