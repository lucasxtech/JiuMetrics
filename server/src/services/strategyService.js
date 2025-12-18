// Serviço de Comparação e Estratégia Tática
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const FightAnalysis = require('../models/FightAnalysis');
const geminiService = require('./geminiService');

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
    const AGGRESSION_THRESHOLD = 20;
    const PULL_GUARD_HIGH = 50;
    const PULL_GUARD_LOW = 30;

    const analysis = {
      advantages: [],
      disadvantages: [],
      neutralZones: [],
      keyPoints: [],
    };

    // Comparar preferências (guarda vs passagem)
    const athletePref = athleteProfile.preference;
    const opponentPref = opponentProfile.preference;

    if (athletePref === 'guard' && opponentPref === 'passing') {
      analysis.keyPoints.push('Confronto clássico: Guardeiro vs Passador');
      analysis.disadvantages.push('Adversário prefere jogo de passagem (zona de perigo)');
    } else if (athletePref === 'passing' && opponentPref === 'guard') {
      analysis.keyPoints.push('Confronto favorável: Seu jogo de passagem vs guarda dele');
      analysis.advantages.push('Você joga por cima, adversário joga por baixo');
    } else if (athletePref === opponentPref) {
      analysis.neutralZones.push('Ambos preferem o mesmo estilo de jogo');
    }

    // Comparar personalidade
    const athleteAggression = athleteProfile.personality?.aggressive || 0;
    const opponentAggression = opponentProfile.personality?.aggressive || 0;
    const aggressionDiff = athleteAggression - opponentAggression;

    if (aggressionDiff > AGGRESSION_THRESHOLD) {
      analysis.advantages.push('Você é mais agressivo que o adversário');
    } else if (aggressionDiff < -AGGRESSION_THRESHOLD) {
      analysis.disadvantages.push('Adversário é mais agressivo');
      analysis.keyPoints.push('Prepare-se para pressão constante');
    }

    // Comparar comportamento inicial
    const athletePullGuard = athleteProfile.initialBehavior?.pullGuard || 0;
    const opponentPullGuard = opponentProfile.initialBehavior?.pullGuard || 0;

    if (athletePullGuard > PULL_GUARD_HIGH && opponentPullGuard > PULL_GUARD_HIGH) {
      analysis.keyPoints.push('Ambos tendem a puxar guarda - trabalhe quedas');
    } else if (athletePullGuard < PULL_GUARD_LOW && opponentPullGuard < PULL_GUARD_LOW) {
      analysis.keyPoints.push('Ambos buscam quedas - prepare jogo em pé');
    }

    // Posições fortes vs fracas - análise cruzada
    const athleteStrong = athleteProfile.strongPositions || [];
    const opponentWeak = opponentProfile.weakPositions || [];
    const athleteWeak = athleteProfile.weakPositions || [];
    const opponentStrong = opponentProfile.strongPositions || [];

    // Encontrar interseções (oportunidades e perigos)
    const opportunities = athleteStrong.filter(pos => opponentWeak.includes(pos));
    const dangers = athleteWeak.filter(pos => opponentStrong.includes(pos));

    opportunities.forEach(pos => {
      analysis.advantages.push(`Seu ponto forte (${pos}) é ponto fraco do adversário`);
    });

    dangers.forEach(pos => {
      analysis.disadvantages.push(`Seu ponto fraco (${pos}) é ponto forte do adversário`);
    });

    return analysis;
  }

  /**
   * Gera recomendações estratégicas
   */
  static generateStrategy(athlete, opponent, matchupAnalysis) {
    const AGGRESSION_THRESHOLD = 60;
    const CALM_THRESHOLD = 50;
    const CARDIO_DIFFERENCE = 10;

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

    if (opponentAggression > AGGRESSION_THRESHOLD) {
      strategy.mentalPreparation.push('Adversário é agressivo - mantenha a calma');
      strategy.gameplan.push('Use a agressividade dele contra ele (contra-ataques)');
      strategy.techniques.push('Preparar contra-ataques e transições rápidas');
    }

    if (opponentCalm > CALM_THRESHOLD) {
      strategy.mentalPreparation.push('Adversário é controlador - seja proativo');
      strategy.gameplan.push('Não deixe o adversário ditar o ritmo');
      strategy.priorities.push('Tome iniciativa desde o início');
    }

    // Baseado em pontos fracos do adversário
    const opponentWeak = opponentProfile.weakPositions || [];
    if (opponentWeak.length > 0) {
      strategy.priorities.push(`Explorar pontos fracos: ${opponentWeak.join(', ')}`);
      
      const weaknessMap = {
        guarda: 'Trabalhe passagens de guarda variadas',
        queda: 'Invista em quedas e takedowns',
        raspagem: 'Cuidado ao jogar por cima - boa base'
      };

      opponentWeak.forEach((weakness) => {
        const weakLower = weakness.toLowerCase();
        Object.entries(weaknessMap).forEach(([key, technique]) => {
          if (weakLower.includes(key)) {
            strategy.techniques.push(technique);
          }
        });
      });
    }

    // Evitar pontos fortes do adversário
    const opponentStrong = opponentProfile.strongPositions || [];
    if (opponentStrong.length > 0) {
      strategy.avoid.push(`Evitar: ${opponentStrong.join(', ')}`);
    }

    // Comparação de condicionamento
    if (athlete.cardio && opponent.cardio) {
      const cardioDiff = athlete.cardio - opponent.cardio;
      
      if (cardioDiff > CARDIO_DIFFERENCE) {
        strategy.gameplan.push('Você tem melhor condicionamento - aumente o ritmo');
        strategy.mentalPreparation.push('Mantenha pressão constante para cansar adversário');
      } else if (cardioDiff < -CARDIO_DIFFERENCE) {
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
        const { advantages, disadvantages } = comparison.matchupAnalysis;
        
        matchups.push({
          athlete: {
            id: athlete.id,
            name: athlete.name,
            belt: athlete.belt,
          },
          score: advantages.length - disadvantages.length,
          advantages: advantages.length,
          disadvantages: disadvantages.length,
        });
      } catch (error) {
        // Silenciosamente pula atletas com dados incompletos
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

  /**
   * Consolida múltiplas análises de um lutador em um único resumo técnico
   * usando IA para detectar padrões, evolução e tendências consistentes
   * 
   * @param {string} personId - ID do atleta ou adversário
   * @param {string|null} customModel - Modelo Gemini customizado (opcional)
   * @returns {Promise<Object>} { resumo: string, technical_stats: Object, analysesCount: number, model: string }
   */
  static async consolidateAnalyses(personId, customModel = null) {
    // Buscar todas as análises da pessoa
    const analyses = await FightAnalysis.getByPersonId(personId);
    
    if (!analyses || analyses.length === 0) {
      return {
        resumo: 'Nenhuma análise disponível para este lutador.',
        technical_stats: null,
        analysesCount: 0,
        model: null
      };
    }

    // Se houver apenas 1 análise, retornar dados diretamente
    if (analyses.length === 1) {
      return {
        resumo: analyses[0].summary || 'Resumo não disponível.',
        technical_stats: analyses[0].technical_stats || null,
        analysesCount: 1,
        model: null // Sem uso de IA
      };
    }

    // Múltiplas análises: consolidar usando IA
    const summaries = analyses
      .map(a => a.summary)
      .filter(Boolean)
      .slice(0, 10); // Limitar a 10 análises mais recentes para evitar prompts enormes

    // Consolidar technical_stats de todas as análises
    const consolidatedStats = this.consolidateTechnicalStats(analyses);

    if (summaries.length === 0) {
      return {
        resumo: 'Análises encontradas, mas sem resumos técnicos disponíveis.',
        technical_stats: consolidatedStats,
        analysesCount: analyses.length,
        model: null
      };
    }

    // Preparar prompt de consolidação
    const consolidationPrompt = `Você é um Analista Tático de Jiu-Jitsu de alto nível.

Você recebeu ${summaries.length} análises técnicas de um mesmo lutador, coletadas em diferentes lutas.

Sua tarefa é CONSOLIDAR essas análises em um ÚNICO RESUMO TÉCNICO UNIFICADO.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ANÁLISES INDIVIDUAIS (${summaries.length} lutas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${summaries.map((s, i) => `LUTA ${i + 1}:\n${s}\n`).join('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 INSTRUÇÕES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analise TODAS as lutas acima e gere um resumo consolidado que identifique:

1. **PADRÕES CONSISTENTES**: Comportamentos que aparecem em MÚLTIPLAS lutas
2. **EVOLUÇÃO TÉCNICA**: Mudanças no estilo ao longo do tempo (se houver progressão visível)
3. **TENDÊNCIAS DOMINANTES**: Técnicas, posições e estratégias mais frequentes
4. **PONTOS FORTES RECORRENTES**: O que ele faz bem consistentemente
5. **FRAQUEZAS REPETIDAS**: Erros ou limitações que aparecem em várias lutas
6. **ESTILO GERAL**: Caracterização do perfil técnico geral do lutador

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 FORMATO DE SAÍDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Retorne APENAS texto puro, SEM formatação markdown, SEM JSON.

Escreva um parágrafo único e coeso (200-300 palavras) que sintetize o perfil técnico consolidado.

Seja específico, objetivo e baseado em evidências das múltiplas análises.

PROIBIDO: 
- Usar markdown (**negrito**, \`code\`, listas numeradas)
- Mencionar "Luta 1", "Luta 2" explicitamente
- Repetir informações redundantes
- Generalizações vazias

OBRIGATÓRIO:
- Texto corrido em parágrafo único
- Foco em padrões que aparecem em múltiplas lutas
- Síntese inteligente das tendências dominantes
- Linguagem técnica e precisa`;

    try {
      const modelToUse = customModel || 'gemini-2.0-flash';
      const model = geminiService.getModel ? geminiService.getModel(modelToUse) : null;
      
      if (!model) {
        // Fallback: se IA não disponível, concatenar resumos
        return {
          resumo: summaries.join(' '),
          analysesCount: summaries.length,
          model: null
        };
      }

      const result = await model.generateContent(consolidationPrompt);
      const consolidatedResumo = result.response.text().trim();

      return {
        resumo: consolidatedResumo,
        technical_stats: consolidatedStats,
        analysesCount: summaries.length,
        model: modelToUse,
        usage: {
          promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: result.response.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      console.error('❌ Erro ao consolidar análises:', error);
      
      // Fallback em caso de erro: concatenar resumos
      return {
        resumo: summaries.join(' '),
        technical_stats: consolidatedStats,
        analysesCount: summaries.length,
        model: null,
        error: error.message
      };
    }
  }

  /**
   * Consolida technical_stats de múltiplas análises
   * Calcula médias e totais de dados quantitativos reais
   * @param {Array} analyses - Array de análises
   * @returns {Object} Stats consolidados
   */
  static consolidateTechnicalStats(analyses) {
    const validAnalyses = analyses.filter(a => a.technical_stats);
    
    if (validAnalyses.length === 0) {
      return null;
    }

    const consolidated = {
      sweeps: {
        quantidade_total: 0,
        quantidade_media: 0,
        efetividade_percentual_media: 0
      },
      guard_passes: {
        quantidade_total: 0,
        quantidade_media: 0
      },
      submissions: {
        tentativas_total: 0,
        tentativas_media: 0,
        ajustadas_total: 0,
        ajustadas_media: 0,
        concluidas_total: 0,
        concluidas_media: 0,
        taxa_sucesso_percentual: 0,
        finalizacoes_mais_usadas: []
      },
      back_takes: {
        quantidade_total: 0,
        quantidade_media: 0,
        percentual_com_finalizacao: 0
      },
      total_analises: validAnalyses.length
    };

    // Somar totais
    validAnalyses.forEach(analysis => {
      const stats = analysis.technical_stats;
      
      if (stats.sweeps) {
        consolidated.sweeps.quantidade_total += stats.sweeps.quantidade || 0;
        consolidated.sweeps.efetividade_percentual_media += stats.sweeps.efetividade_percentual || 0;
      }
      
      if (stats.guard_passes) {
        consolidated.guard_passes.quantidade_total += stats.guard_passes.quantidade || 0;
      }
      
      if (stats.submissions) {
        consolidated.submissions.tentativas_total += stats.submissions.tentativas || 0;
        consolidated.submissions.ajustadas_total += stats.submissions.ajustadas || 0;
        consolidated.submissions.concluidas_total += stats.submissions.concluidas || 0;
        
        if (stats.submissions.detalhes && Array.isArray(stats.submissions.detalhes)) {
          consolidated.submissions.finalizacoes_mais_usadas.push(...stats.submissions.detalhes);
        }
      }
      
      if (stats.back_takes) {
        consolidated.back_takes.quantidade_total += stats.back_takes.quantidade || 0;
        if (stats.back_takes.tentou_finalizar) {
          consolidated.back_takes.percentual_com_finalizacao += 1;
        }
      }
    });

    // Calcular médias
    const count = validAnalyses.length;
    consolidated.sweeps.quantidade_media = Math.round(consolidated.sweeps.quantidade_total / count * 10) / 10;
    consolidated.sweeps.efetividade_percentual_media = Math.round(consolidated.sweeps.efetividade_percentual_media / count);
    
    consolidated.guard_passes.quantidade_media = Math.round(consolidated.guard_passes.quantidade_total / count * 10) / 10;
    
    consolidated.submissions.tentativas_media = Math.round(consolidated.submissions.tentativas_total / count * 10) / 10;
    consolidated.submissions.ajustadas_media = Math.round(consolidated.submissions.ajustadas_total / count * 10) / 10;
    consolidated.submissions.concluidas_media = Math.round(consolidated.submissions.concluidas_total / count * 10) / 10;
    
    if (consolidated.submissions.tentativas_total > 0) {
      consolidated.submissions.taxa_sucesso_percentual = Math.round(
        (consolidated.submissions.concluidas_total / consolidated.submissions.tentativas_total) * 100
      );
    }
    
    consolidated.back_takes.quantidade_media = Math.round(consolidated.back_takes.quantidade_total / count * 10) / 10;
    consolidated.back_takes.percentual_com_finalizacao = Math.round(
      (consolidated.back_takes.percentual_com_finalizacao / count) * 100
    );

    // Contar finalizações mais usadas
    const submissionCount = {};
    consolidated.submissions.finalizacoes_mais_usadas.forEach(sub => {
      submissionCount[sub] = (submissionCount[sub] || 0) + 1;
    });
    
    consolidated.submissions.finalizacoes_mais_usadas = Object.entries(submissionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ tecnica: name, quantidade: count }));

    return consolidated;
  }

  /**
   * Retorna a quantidade de análises disponíveis para um lutador
   * @param {string} personId - ID do atleta ou adversário
   * @returns {Promise<number>} Número de análises
   */
  static async getAnalysesCount(personId) {
    const analyses = await FightAnalysis.getByPersonId(personId);
    return analyses ? analyses.length : 0;
  }

  /**
   * Gera estratégia tática usando resumos consolidados de TODAS as análises
   * @param {string} athleteId - ID do atleta
   * @param {string} opponentId - ID do adversário
   * @param {string|null} userId - ID do usuário (para validação)
   * @param {string|null} customModel - Modelo Gemini customizado (opcional)
   * @returns {Promise<Object>} Estratégia tática gerada pela IA
   */
  static async generateStrategy(athleteId, opponentId, userId = null, customModel = null) {
    // Buscar dados básicos
    const athlete = await Athlete.getById(athleteId, userId);
    const opponent = await Opponent.getById(opponentId, userId);

    if (!athlete || !opponent) {
      throw new Error('Atleta ou adversário não encontrado');
    }

    // Consolidar análises de ambos os lutadores
    const [athleteConsolidation, opponentConsolidation] = await Promise.all([
      this.consolidateAnalyses(athleteId, customModel),
      this.consolidateAnalyses(opponentId, customModel)
    ]);

    // Preparar dados para a IA (resumo narrativo + dados quantitativos)
    const athleteData = {
      name: athlete.name,
      resumo: athleteConsolidation.resumo,
      technical_stats: athleteConsolidation.technical_stats
    };

    const opponentData = {
      name: opponent.name,
      resumo: opponentConsolidation.resumo,
      technical_stats: opponentConsolidation.technical_stats
    };

    // Gerar estratégia usando geminiService
    const strategyResult = await geminiService.generateTacticalStrategy(
      athleteData,
      opponentData,
      customModel
    );

    return {
      strategy: strategyResult.strategy,
      metadata: {
        athlete: {
          id: athleteId,
          name: athlete.name,
          analysesCount: athleteConsolidation.analysesCount,
          consolidationModel: athleteConsolidation.model
        },
        opponent: {
          id: opponentId,
          name: opponent.name,
          analysesCount: opponentConsolidation.analysesCount,
          consolidationModel: opponentConsolidation.model
        },
        strategyModel: customModel || 'gemini-2.0-flash',
        usage: strategyResult.usage,
        generatedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = StrategyService;
