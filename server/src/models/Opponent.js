// Modelo de dados para Adversário
const { v4: uuidv4 } = require('uuid');

// Simulando um banco em memória
let opponents = [
  {
    id: '1',
    name: 'Pedro Ramos',
    age: 30,
    weight: 90,
    belt: 'Marrom',
    style: 'Pressão',
    strongAttacks: 'Passagem de guarda, Smash pass',
    weaknesses: 'Movimentação rápida lateral',
    cardio: 80,
    videoUrl: 'https://youtube.com/watch?v=opponent1',
    
    // Perfil técnico consolidado (baseado em análises de lutas)
    technicalProfile: {
      gameStyle: 'Passagem',
      mostUsedPositions: ['Top Position', 'Smash Pass', 'Side Control'],
      strongPositions: ['Passagem de Guarda', 'Pressão', 'Mount'],
      weakPositions: ['Defesa de Raspagem', 'Movimentação Lateral'],
      preference: 'passing',
      personality: {
        aggressive: 70,
        explosive: 20,
        calm: 5,
        tactical: 5,
      },
      initialBehavior: {
        pullGuard: 5,
        takedown: 80,
        standup: 15,
      },
      guardGame: {
        closedGuard: 20,
        sweep: 30,
        leglock: 50,
      },
      passingGame: {
        pressure: 70,
        sidePass: 20,
        toreada: 10,
      },
    },
    
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Ana Costa',
    age: 27,
    weight: 65,
    belt: 'Roxa',
    style: 'Explosão',
    strongAttacks: 'Raspagem explosiva, Queda dinâmica',
    weaknesses: 'Defesa contra posições de controle',
    cardio: 90,
    videoUrl: '',
    
    // Perfil técnico consolidado
    technicalProfile: {
      gameStyle: 'Balanced',
      mostUsedPositions: ['Spider Guard', 'Raspagem', 'Queda'],
      strongPositions: ['Raspagem', 'Queda', 'Explosão'],
      weakPositions: ['Defesa de Controle', 'Jogo Lento'],
      preference: 'balanced',
      personality: {
        aggressive: 50,
        explosive: 40,
        calm: 5,
        tactical: 5,
      },
      initialBehavior: {
        pullGuard: 40,
        takedown: 50,
        standup: 10,
      },
      guardGame: {
        closedGuard: 30,
        sweep: 50,
        leglock: 20,
      },
      passingGame: {
        pressure: 40,
        sidePass: 40,
        toreada: 20,
      },
    },
    
    createdAt: new Date(),
  },
];

class Opponent {
  /**
   * Busca todos os adversários
   */
  static getAll() {
    return opponents;
  }

  /**
   * Busca um adversário por ID
   */
  static getById(id) {
    return opponents.find((o) => o.id === id);
  }

  /**
   * Cria um novo adversário
   */
  static create(data) {
    const newOpponent = {
      id: uuidv4(),
      ...data,
      createdAt: new Date(),
    };
    opponents.push(newOpponent);
    return newOpponent;
  }

  /**
   * Atualiza um adversário
   */
  static update(id, data) {
    const index = opponents.findIndex((o) => o.id === id);
    if (index === -1) return null;

    opponents[index] = {
      ...opponents[index],
      ...data,
      updatedAt: new Date(),
    };
    return opponents[index];
  }

  /**
   * Deleta um adversário
   */
  static delete(id) {
    const index = opponents.findIndex((o) => o.id === id);
    if (index === -1) return null;

    const deleted = opponents[index];
    opponents.splice(index, 1);
    return deleted;
  }

  /**
   * Atualiza perfil técnico baseado em análises de lutas
   */
  static updateTechnicalProfile(id, analysisData) {
    const opponent = this.getById(id);
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
