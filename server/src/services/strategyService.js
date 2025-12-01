// Serviço de Comparação e Estratégia Tática
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const FightAnalysis = require('../models/FightAnalysis');

class StrategyService {
  /**
   * Compara atleta vs adversário e gera estratégia
   */
  static compareAndGenerateStrategy(athleteId, opponentId) {
    const athlete = Athlete.getById(athleteId);
    const opponent = Opponent.getById(opponentId);

    if (!athlete || !opponent) {
      throw new Error('Atleta ou adversário não encontrado');
    }

    // Buscar análises recentes
    const athleteAnalyses = FightAnalysis.getByPersonId(athleteId);
    const opponentAnalyses = FightAnalysis.getByPersonId(opponentId);

    // Perfis técnicos
    const athleteProfile = athlete.technicalProfile || {};
    const opponentProfile = opponent.technicalProfile || {};

    // Análise de matchup
    const matchupAnalysis = this.analyzeMatchup(athleteProfile, opponentProfile);

    // Gerar recomendações estratégicas
    const strategy = this.generateStrategy(athlete, opponent, matchupAnalysis);

    return {
      athlete: {
        id: athlete.id,
        name: athlete.name,
        profile: athleteProfile,
        totalAnalyses: athleteAnalyses.length,
      },
      opponent: {
        id: opponent.id,
        name: opponent.name,
        profile: opponentProfile,
        totalAnalyses: opponentAnalyses.length,
      },
      matchupAnalysis,
      strategy,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Analisa o confronto entre perfis técnicos
   */
  static analyzeMatchup(athleteProfile, opponentProfile) {
    const analysis = {
      advantages: [],
      disadvantages: [],
      neutralZones: [],
      keyPoints: [],
    };

    // Comparar preferências (guarda vs passagem)
    if (athleteProfile.preference === 'guard' && opponentProfile.preference === 'passing') {
      analysis.keyPoints.push('Confronto clássico: Guardeiro vs Passador');
      analysis.disadvantages.push('Adversário prefere jogo de passagem (zona de perigo)');
    } else if (athleteProfile.preference === 'passing' && opponentProfile.preference === 'guard') {
      analysis.keyPoints.push('Confronto favorável: Seu jogo de passagem vs guarda dele');
      analysis.advantages.push('Você joga por cima, adversário joga por baixo');
    } else if (athleteProfile.preference === opponentProfile.preference) {
      analysis.neutralZones.push('Ambos preferem o mesmo estilo de jogo');
    }

    // Comparar personalidade
    const athleteAggression = athleteProfile.personality?.aggressive || 0;
    const opponentAggression = opponentProfile.personality?.aggressive || 0;

    if (athleteAggression > opponentAggression + 20) {
      analysis.advantages.push('Você é mais agressivo que o adversário');
    } else if (opponentAggression > athleteAggression + 20) {
      analysis.disadvantages.push('Adversário é mais agressivo');
      analysis.keyPoints.push('Prepare-se para pressão constante');
    }

    // Comparar comportamento inicial
    const athletePullGuard = athleteProfile.initialBehavior?.pullGuard || 0;
    const opponentPullGuard = opponentProfile.initialBehavior?.pullGuard || 0;

    if (athletePullGuard > 50 && opponentPullGuard > 50) {
      analysis.keyPoints.push('Ambos tendem a puxar guarda - trabalhe quedas');
    } else if (athletePullGuard < 30 && opponentPullGuard < 30) {
      analysis.keyPoints.push('Ambos buscam quedas - prepare jogo em pé');
    }

    // Posições fortes vs fracas
    const athleteStrong = athleteProfile.strongPositions || [];
    const opponentWeak = opponentProfile.weakPositions || [];
    const athleteWeak = athleteProfile.weakPositions || [];
    const opponentStrong = opponentProfile.strongPositions || [];

    // Encontrar oportunidades (pontos fortes do atleta vs pontos fracos do adversário)
    athleteStrong.forEach((pos) => {
      if (opponentWeak.includes(pos)) {
        analysis.advantages.push(`Seu ponto forte (${pos}) é ponto fraco do adversário`);
      }
    });

    // Encontrar perigos (pontos fracos do atleta vs pontos fortes do adversário)
    athleteWeak.forEach((pos) => {
      if (opponentStrong.includes(pos)) {
        analysis.disadvantages.push(`Seu ponto fraco (${pos}) é ponto forte do adversário`);
      }
    });

    return analysis;
  }

  /**
   * Gera recomendações estratégicas
   */
  static generateStrategy(athlete, opponent, matchupAnalysis) {
    const strategy = {
      gameplan: [],
      priorities: [],
      avoid: [],
      techniques: [],
      mentalPreparation: [],
    };

    const athleteProfile = athlete.technicalProfile || {};
    const opponentProfile = opponent.technicalProfile || {};

    // Plano de jogo baseado em preferências
    if (athleteProfile.preference === 'guard' && opponentProfile.preference === 'passing') {
      strategy.gameplan.push('Desenvolva sua guarda ativa e movimentada');
      strategy.gameplan.push('Não deixe o adversário estabelecer controle');
      strategy.priorities.push('Raspagens rápidas');
      strategy.priorities.push('Ataques de guarda (triângulo, omoplata)');
      strategy.avoid.push('Deixar adversário consolidar pressão');
    } else if (athleteProfile.preference === 'passing' && opponentProfile.preference === 'guard') {
      strategy.gameplan.push('Busque a queda e trabalhe passagem de guarda');
      strategy.gameplan.push('Use seu jogo de pressão');
      strategy.priorities.push('Estabelecer top position');
      strategy.priorities.push('Passagem de guarda sistemática');
      strategy.avoid.push('Ficar preso na guarda dele');
    }

    // Estratégia baseada em personalidade
    const opponentAggression = opponentProfile.personality?.aggressive || 0;
    const opponentCalm = opponentProfile.personality?.calm || 0;

    if (opponentAggression > 60) {
      strategy.mentalPreparation.push('Adversário é agressivo - mantenha a calma');
      strategy.gameplan.push('Use a agressividade dele contra ele (contra-ataques)');
      strategy.techniques.push('Preparar contra-ataques e transições rápidas');
    }

    if (opponentCalm > 50) {
      strategy.mentalPreparation.push('Adversário é controlador - seja proativo');
      strategy.gameplan.push('Não deixe o adversário ditar o ritmo');
      strategy.priorities.push('Tome iniciativa desde o início');
    }

    // Baseado em pontos fracos do adversário
    const opponentWeak = opponentProfile.weakPositions || [];
    if (opponentWeak.length > 0) {
      strategy.priorities.push(`Explorar pontos fracos: ${opponentWeak.join(', ')}`);
      opponentWeak.forEach((weakness) => {
        if (weakness.toLowerCase().includes('guarda')) {
          strategy.techniques.push('Trabalhe passagens de guarda variadas');
        }
        if (weakness.toLowerCase().includes('queda')) {
          strategy.techniques.push('Invista em quedas e takedowns');
        }
        if (weakness.toLowerCase().includes('raspagem')) {
          strategy.techniques.push('Cuidado ao jogar por cima - boa base');
        }
      });
    }

    // Evitar pontos fortes do adversário
    const opponentStrong = opponentProfile.strongPositions || [];
    if (opponentStrong.length > 0) {
      strategy.avoid.push(`Evitar: ${opponentStrong.join(', ')}`);
    }

    // Cardio comparison
    if (athlete.cardio && opponent.cardio) {
      if (athlete.cardio > opponent.cardio + 10) {
        strategy.gameplan.push('Você tem melhor condicionamento - aumente o ritmo');
        strategy.mentalPreparation.push('Mantenha pressão constante para cansar adversário');
      } else if (opponent.cardio > athlete.cardio + 10) {
        strategy.gameplan.push('Adversário tem melhor cardio - economize energia');
        strategy.mentalPreparation.push('Seja eficiente, não desperdice movimentos');
      }
    }

    return strategy;
  }

  /**
   * Busca melhor atleta para enfrentar um adversário
   */
  static findBestMatchup(opponentId) {
    const opponent = Opponent.getById(opponentId);
    if (!opponent) {
      throw new Error('Adversário não encontrado');
    }

    const allAthletes = Athlete.getAll();
    const matchups = [];

    allAthletes.forEach((athlete) => {
      try {
        const comparison = this.compareAndGenerateStrategy(athlete.id, opponentId);
        
        // Calcular score de vantagem
        const advantageScore = comparison.matchupAnalysis.advantages.length;
        const disadvantageScore = comparison.matchupAnalysis.disadvantages.length;
        const netScore = advantageScore - disadvantageScore;

        matchups.push({
          athlete: {
            id: athlete.id,
            name: athlete.name,
            belt: athlete.belt,
          },
          score: netScore,
          advantages: advantageScore,
          disadvantages: disadvantageScore,
        });
      } catch (error) {
        console.error(`Erro ao comparar ${athlete.name}:`, error.message);
      }
    });

    // Ordenar por melhor score
    matchups.sort((a, b) => b.score - a.score);

    return {
      opponent: {
        id: opponent.id,
        name: opponent.name,
        belt: opponent.belt,
      },
      recommendations: matchups,
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = StrategyService;
