// Modelo de dados para Análise de Lutas (histórico de vídeos analisados)
const { v4: uuidv4 } = require('uuid');

// Armazena histórico de análises de lutas
let fightAnalyses = [];

class FightAnalysis {
  /**
   * Busca todas as análises
   */
  static getAll() {
    return fightAnalyses;
  }

  /**
   * Busca análises por tipo de pessoa (athlete ou opponent)
   */
  static getByPersonId(personId) {
    return fightAnalyses.filter((a) => a.personId === personId);
  }

  /**
   * Busca uma análise por ID
   */
  static getById(id) {
    return fightAnalyses.find((a) => a.id === id);
  }

  /**
   * Cria uma nova análise de luta
   */
  static create(data) {
    const newAnalysis = {
      id: uuidv4(),
      personId: data.personId, // ID do atleta ou adversário
      personType: data.personType, // 'athlete' ou 'opponent'
      videoUrl: data.videoUrl, // Link da luta
      videoName: data.videoName || '',
      
      // Dados da análise do Gemini
      charts: data.charts || [],
      summary: data.summary || '',
      
      // Perfil técnico consolidado
      technicalProfile: {
        personality: data.technicalProfile?.personality || {},
        initialBehavior: data.technicalProfile?.initialBehavior || {},
        guardGame: data.technicalProfile?.guardGame || {},
        passingGame: data.technicalProfile?.passingGame || {},
      },
      
      framesAnalyzed: data.framesAnalyzed || 0,
      createdAt: new Date(),
    };
    
    fightAnalyses.push(newAnalysis);
    return newAnalysis;
  }

  /**
   * Atualiza uma análise
   */
  static update(id, data) {
    const index = fightAnalyses.findIndex((a) => a.id === id);
    if (index === -1) return null;

    fightAnalyses[index] = {
      ...fightAnalyses[index],
      ...data,
      updatedAt: new Date(),
    };
    return fightAnalyses[index];
  }

  /**
   * Deleta uma análise
   */
  static delete(id) {
    const index = fightAnalyses.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const deleted = fightAnalyses[index];
    fightAnalyses.splice(index, 1);
    return deleted;
  }

  /**
   * Deleta todas as análises de uma pessoa
   */
  static deleteByPersonId(personId) {
    const deleted = fightAnalyses.filter((a) => a.personId === personId);
    fightAnalyses = fightAnalyses.filter((a) => a.personId !== personId);
    return deleted;
  }
}

module.exports = FightAnalysis;
