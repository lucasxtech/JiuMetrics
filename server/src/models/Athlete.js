// Modelo de dados para Atleta (em produção usar Supabase/Firebase)
const { v4: uuidv4 } = require('uuid');

// Simulando um banco em memória para desenvolvimento
let athletes = [
  {
    id: '1',
    name: 'João Silva',
    age: 28,
    weight: 85,
    belt: 'Roxa',
    style: 'Guarda',
    strongAttacks: 'Raspagem, Armlock, Estrangulação',
    weaknesses: 'Defesa de queda, Movimentação rápida',
    cardio: 85,
    videoUrl: 'https://youtube.com/watch?v=example',
    
    // Perfil técnico consolidado (baseado em análises de lutas)
    technicalProfile: {
      // Estilo de jogo predominante
      gameStyle: 'Guarda', // Guarda, Passagem, Balanced
      
      // Posições mais usadas
      mostUsedPositions: ['Guarda Fechada', 'Spider Guard', 'De La Riva'],
      
      // Melhores posições (pontos fortes)
      strongPositions: ['Guarda Fechada', 'Triângulo', 'Armbar'],
      
      // Posições fracas
      weakPositions: ['Passagem de Guarda', 'Defesa de queda', 'Side Control (por baixo)'],
      
      // Preferência: melhor na guarda ou passagem?
      preference: 'guard', // 'guard', 'passing', 'balanced'
      
      // Personalidade (baseado em análises IA)
      personality: {
        aggressive: 45,
        explosive: 25,
        calm: 20,
        tactical: 10,
      },
      
      // Comportamento inicial
      initialBehavior: {
        pullGuard: 55,
        takedown: 30,
        standup: 15,
      },
      
      // Jogo de guarda
      guardGame: {
        closedGuard: 50,
        sweep: 30,
        leglock: 20,
      },
      
      // Jogo de passagem
      passingGame: {
        pressure: 50,
        sidePass: 30,
        toreada: 20,
      },
    },
    
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Maria Santos',
    age: 26,
    weight: 62,
    belt: 'Azul',
    style: 'Passagem',
    strongAttacks: 'Passagem de guarda, Knee slice',
    weaknesses: 'Resistência em rounds longos',
    cardio: 75,
    videoUrl: '',
    
    // Perfil técnico consolidado
    technicalProfile: {
      gameStyle: 'Passagem',
      mostUsedPositions: ['Top Position', 'Knee Slice', 'Side Control'],
      strongPositions: ['Passagem de Guarda', 'Knee Slice', 'Mount'],
      weakPositions: ['Defesa de Raspagem', 'Guarda (por baixo)'],
      preference: 'passing',
      personality: {
        aggressive: 60,
        explosive: 30,
        calm: 5,
        tactical: 5,
      },
      initialBehavior: {
        pullGuard: 10,
        takedown: 70,
        standup: 20,
      },
      guardGame: {
        closedGuard: 30,
        sweep: 40,
        leglock: 30,
      },
      passingGame: {
        pressure: 60,
        sidePass: 30,
        toreada: 10,
      },
    },
    
    createdAt: new Date(),
  },
];

class Athlete {
  /**
   * Busca todos os atletas
   */
  static getAll() {
    return athletes;
  }

  /**
   * Busca um atleta por ID
   */
  static getById(id) {
    return athletes.find((a) => a.id === id);
  }

  /**
   * Cria um novo atleta
   */
  static create(data) {
    const newAthlete = {
      id: uuidv4(),
      ...data,
      createdAt: new Date(),
    };
    athletes.push(newAthlete);
    return newAthlete;
  }

  /**
   * Atualiza um atleta
   */
  static update(id, data) {
    const index = athletes.findIndex((a) => a.id === id);
    if (index === -1) return null;

    athletes[index] = {
      ...athletes[index],
      ...data,
      updatedAt: new Date(),
    };
    return athletes[index];
  }

  /**
   * Deleta um atleta
   */
  static delete(id) {
    const index = athletes.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const deleted = athletes[index];
    athletes.splice(index, 1);
    return deleted;
  }

  /**
   * Atualiza perfil técnico baseado em análises de lutas
   */
  static updateTechnicalProfile(id, analysisData) {
    const athlete = this.getById(id);
    if (!athlete) return null;

    // Mesclar dados de análise com perfil existente
    const updatedProfile = {
      ...athlete.technicalProfile,
      ...analysisData,
    };

    return this.update(id, { technicalProfile: updatedProfile });
  }
}

module.exports = Athlete;
