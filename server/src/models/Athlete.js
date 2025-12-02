// Modelo de dados para Atleta com Supabase
const supabase = require('../config/supabase');
const { parseAthleteFromDB, parseAthletesFromDB } = require('../utils/dbParsers');

class Athlete {
  /**
   * Busca todos os atletas
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return parseAthletesFromDB(data);
  }

  /**
   * Busca um atleta por ID
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Cria um novo atleta
   */
  static async create(athleteData) {
    const { data, error } = await supabase
      .from('athletes')
      .insert([{
        name: athleteData.name,
        belt: athleteData.belt,
        weight: athleteData.weight,
        height: athleteData.height,
        age: athleteData.age,
        style: athleteData.style,
        strong_attacks: athleteData.strongAttacks,
        weaknesses: athleteData.weaknesses,
        video_url: athleteData.videoUrl,
        cardio: athleteData.cardio,
        technical_profile: athleteData.technicalProfile || {},
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Atualiza um atleta
   */
  static async update(id, athleteData) {
    const updateData = {};
    
    if (athleteData.name !== undefined) updateData.name = athleteData.name;
    if (athleteData.belt !== undefined) updateData.belt = athleteData.belt;
    if (athleteData.weight !== undefined) updateData.weight = athleteData.weight;
    if (athleteData.height !== undefined) updateData.height = athleteData.height;
    if (athleteData.age !== undefined) updateData.age = athleteData.age;
    if (athleteData.style !== undefined) updateData.style = athleteData.style;
    if (athleteData.strongAttacks !== undefined) updateData.strong_attacks = athleteData.strongAttacks;
    if (athleteData.weaknesses !== undefined) updateData.weaknesses = athleteData.weaknesses;
    if (athleteData.videoUrl !== undefined) updateData.video_url = athleteData.videoUrl;
    if (athleteData.cardio !== undefined) updateData.cardio = athleteData.cardio;
    if (athleteData.technicalProfile !== undefined) updateData.technical_profile = athleteData.technicalProfile;

    const { data, error } = await supabase
      .from('athletes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return parseAthleteFromDB(data);
  }

  /**
   * Deleta um atleta
   */
  static async delete(id) {
    const { data, error } = await supabase
      .from('athletes')
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
    const athlete = await this.getById(id);
    if (!athlete) return null;

    // Mesclar dados de análise com perfil existente
    const updatedProfile = {
      ...athlete.technical_profile,
      ...analysisData,
    };

    return this.update(id, { technicalProfile: updatedProfile });
  }
}

module.exports = Athlete;
