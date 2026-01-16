// Serviço de Comparação e Estratégia Tática
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const FightAnalysis = require('../models/FightAnalysis');
const geminiService = require('./geminiService');

class StrategyService {

  /**
   * Converte gráficos consolidados em texto narrativo para enriquecer o resumo
   * @param {Array} charts - Array de gráficos consolidados
   * @returns {string} Texto narrativo descrevendo o perfil comportamental
   */
  static formatChartsAsNarrative(charts) {
    if (!charts || charts.length === 0) {
      return '';
    }

    const narratives = [];

    charts.forEach(chart => {
      if (!chart.data || chart.data.length === 0) return;

      // Ordenar por valor decrescente
      const sortedData = [...chart.data].sort((a, b) => b.value - a.value);
      
      // Pegar os top 3 (ou menos se não houver)
      const topItems = sortedData.filter(item => item.value > 0).slice(0, 3);
      
      if (topItems.length === 0) return;

      switch (chart.title) {
        case 'Personalidade Geral': {
          const traits = topItems.map(item => {
            if (item.value >= 70) return `predominantemente ${item.label}`;
            if (item.value >= 40) return `tendência ${item.label}`;
            return `levemente ${item.label}`;
          });
          narratives.push(`Perfil psicológico: ${traits.join(', ')}.`);
          break;
        }
        
        case 'Comportamento Inicial': {
          const primary = topItems[0];
          if (primary.value >= 80) {
            narratives.push(`No início das lutas, SEMPRE ${primary.label}.`);
          } else if (primary.value >= 50) {
            narratives.push(`Tendência inicial: ${primary.label} na maioria das vezes.`);
          } else {
            narratives.push(`Comportamento inicial variado, com preferência por ${primary.label}.`);
          }
          break;
        }
        
        case 'Jogo de Guarda': {
          const guards = topItems.map(item => item.label);
          if (topItems[0].value >= 70) {
            narratives.push(`Jogo de guarda focado em ${guards[0]}.`);
          } else {
            narratives.push(`Jogo de guarda: utiliza principalmente ${guards.join(', ')}.`);
          }
          break;
        }
        
        case 'Jogo de Passagem': {
          const passes = topItems.map(item => item.label);
          if (topItems.length > 0) {
            narratives.push(`Estilo de passagem: ${passes.join(', ')}.`);
          }
          break;
        }
        
        case 'Tentativas de Finalização': {
          const subs = topItems.map(item => item.label);
          if (topItems.length > 0) {
            narratives.push(`Finalizações preferidas: ${subs.join(', ')}.`);
          }
          break;
        }
      }
    });

    return narratives.length > 0 
      ? '\n\nPERFIL COMPORTAMENTAL (baseado nos gráficos):\n' + narratives.join(' ')
      : '';
  }

  /**
   * Formata technical_stats como texto narrativo
   * @param {Object} stats - Stats consolidados
   * @returns {string} Texto narrativo
   */
  static formatStatsAsNarrative(stats) {
    if (!stats) return '';

    const narratives = [];

    if (stats.sweeps && stats.sweeps.quantidade_total > 0) {
      narratives.push(`Raspagens: ${stats.sweeps.quantidade_total} no total (média de ${stats.sweeps.quantidade_media} por luta, ${stats.sweeps.efetividade_percentual_media}% de efetividade).`);
    }

    if (stats.guard_passes && stats.guard_passes.quantidade_total > 0) {
      narratives.push(`Passagens de guarda: ${stats.guard_passes.quantidade_total} no total (média de ${stats.guard_passes.quantidade_media} por luta).`);
    }

    if (stats.submissions && stats.submissions.tentativas_total > 0) {
      let subText = `Finalizações: ${stats.submissions.tentativas_total} tentativas`;
      if (stats.submissions.concluidas_total > 0) {
        subText += `, ${stats.submissions.concluidas_total} concluídas (${stats.submissions.taxa_sucesso_percentual}% de sucesso)`;
      }
      if (stats.submissions.finalizacoes_mais_usadas?.length > 0) {
        const topSubs = stats.submissions.finalizacoes_mais_usadas.slice(0, 3).map(f => f.tecnica);
        subText += `. Preferência: ${topSubs.join(', ')}`;
      }
      narratives.push(subText + '.');
    }

    if (stats.back_takes && stats.back_takes.quantidade_total > 0) {
      narratives.push(`Tomadas de costas: ${stats.back_takes.quantidade_total} no total. Finaliza após pegar costas em ${stats.back_takes.percentual_com_finalizacao}% das vezes.`);
    }

    return narratives.length > 0 
      ? '\n\nDADOS QUANTITATIVOS (baseado nas análises):\n' + narratives.join(' ')
      : '';
  }

  /**
   * Consolida gráficos de múltiplas análises (média dos valores)
   * @param {Array} analyses - Array de análises
   * @returns {Array} Gráficos consolidados
   */
  static consolidateCharts(analyses) {
    const validAnalyses = analyses.filter(a => a.charts && Array.isArray(a.charts));
    
    if (validAnalyses.length === 0) {
      return [];
    }

    // Estrutura para acumular valores por título e label
    const chartData = {};

    validAnalyses.forEach(analysis => {
      analysis.charts.forEach(chart => {
        if (!chart.title || !chart.data) return;
        
        if (!chartData[chart.title]) {
          chartData[chart.title] = {};
        }
        
        chart.data.forEach(item => {
          const label = item.label || item.name;
          const value = Number(item.value) || 0;
          
          if (!chartData[chart.title][label]) {
            chartData[chart.title][label] = [];
          }
          chartData[chart.title][label].push(value);
        });
      });
    });

    // Converter para array de gráficos com médias
    const consolidatedCharts = [];
    
    for (const title in chartData) {
      const data = [];
      for (const label in chartData[title]) {
        const values = chartData[title][label];
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        if (avg > 0) {
          data.push({ label, value: avg });
        }
      }
      
      if (data.length > 0) {
        // Ordenar por valor decrescente
        data.sort((a, b) => b.value - a.value);
        consolidatedCharts.push({ title, data });
      }
    }

    return consolidatedCharts;
  }

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
   * ENRIQUECIDO com gráficos e stats convertidos em texto narrativo
   * 
   * @param {string} personId - ID do atleta ou adversário
   * @param {string|null} userId - ID do usuário (para filtrar análises)
   * @param {string|null} customModel - Modelo Gemini customizado (opcional)
   * @returns {Promise<Object>} { resumo: string, technical_stats: Object, charts: Array, analysesCount: number, model: string }
   */
  static async consolidateAnalyses(personId, userId = null, customModel = null) {
    // Buscar todas as análises da pessoa
    const analyses = await FightAnalysis.getByPersonId(personId, userId);
    
    if (!analyses || analyses.length === 0) {
      return {
        resumo: 'Nenhuma análise disponível para este lutador.',
        technical_stats: null,
        charts: null,
        analysesCount: 0,
        model: null
      };
    }

    // Consolidar technical_stats de todas as análises
    const consolidatedStats = this.consolidateTechnicalStats(analyses);
    
    // Consolidar gráficos de todas as análises
    const consolidatedCharts = this.consolidateCharts(analyses);

    // Se houver apenas 1 análise, retornar dados diretamente (sem precisar de IA)
    if (analyses.length === 1) {
      const chartsNarrative = this.formatChartsAsNarrative(analyses[0].charts || []);
      const statsNarrative = this.formatStatsAsNarrative(consolidatedStats);
      
      return {
        resumo: (analyses[0].summary || 'Resumo não disponível.') + chartsNarrative + statsNarrative,
        technical_stats: consolidatedStats,
        charts: analyses[0].charts || null,
        analysesCount: 1,
        model: null // Sem uso de IA
      };
    }

    // Múltiplas análises: consolidar usando IA
    const summaries = analyses
      .map(a => a.summary)
      .filter(Boolean)
      .slice(0, 10); // Limitar a 10 análises mais recentes para evitar prompts enormes

    // Converter gráficos e stats em texto narrativo para o prompt
    const chartsNarrative = this.formatChartsAsNarrative(consolidatedCharts);
    const statsNarrative = this.formatStatsAsNarrative(consolidatedStats);

    if (summaries.length === 0) {
      return {
        resumo: 'Análises encontradas, mas sem resumos técnicos disponíveis.' + chartsNarrative + statsNarrative,
        technical_stats: consolidatedStats,
        charts: consolidatedCharts,
        analysesCount: analyses.length,
        model: null
      };
    }

    // Preparar prompt de consolidação ENRIQUECIDO
    const consolidationPrompt = `Você é um Analista Tático de Jiu-Jitsu de alto nível.

Você recebeu ${summaries.length} análises técnicas de um mesmo lutador, coletadas em diferentes lutas.
Além disso, você tem dados comportamentais e quantitativos consolidados.

Sua tarefa é criar um PERFIL TÉCNICO COMPLETO E UNIFICADO que será usado para gerar estratégias de luta.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ANÁLISES INDIVIDUAIS (${summaries.length} lutas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${summaries.map((s, i) => `LUTA ${i + 1}:\n${s}\n`).join('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')}

${chartsNarrative}

${statsNarrative}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 INSTRUÇÕES PARA O RESUMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Crie um PERFIL TÉCNICO COMPLETO que inclua:

1. ESTILO DE LUTA: Guardeiro ou passador? Agressivo ou estratégico? Explosivo ou grinder?
2. COMPORTAMENTO INICIAL: O que ele faz logo após o "combate"? Puxa guarda? Busca queda?
3. JOGO DE GUARDA: Quais guardas ele usa? Como ele ataca de baixo?
4. JOGO DE PASSAGEM: Como ele passa? Pressão? Velocidade? Se não passa, diga isso.
5. FINALIZAÇÕES: Quais são as armas dele? Onde ele é perigoso?
6. PONTOS FORTES: O que ele faz muito bem?
7. PONTOS FRACOS: Onde ele pode ser explorado?
8. COMO VENCÊ-LO: Resumo tático de como um adversário deveria lutar contra ele.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 FORMATO DE SAÍDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Retorne APENAS texto puro, SEM formatação markdown, SEM JSON.

Escreva um texto técnico em PARÁGRAFOS (pode ter múltiplos parágrafos para organização).
Entre 250-400 palavras.

Seja específico, use os dados fornecidos, e foque no que é ÚTIL para criar estratégias.

PROIBIDO: 
- Usar markdown (**negrito**, \`code\`, listas numeradas, cabeçalhos #)
- Mencionar "Luta 1", "Luta 2" explicitamente
- Generalizações vazias como "é um bom lutador"

OBRIGATÓRIO:
- Texto corrido em parágrafos
- Informações concretas baseadas nos dados
- Linguagem técnica de Jiu-Jitsu
- Incluir os dados quantitativos quando relevantes`;

    try {
      const modelToUse = customModel || 'gemini-2.0-flash';
      const model = geminiService.getModel ? geminiService.getModel(modelToUse) : null;
      
      if (!model) {
        // Fallback: se IA não disponível, concatenar resumos + narrativas
        return {
          resumo: summaries.join(' ') + chartsNarrative + statsNarrative,
          technical_stats: consolidatedStats,
          charts: consolidatedCharts,
          analysesCount: summaries.length,
          model: null
        };
      }

      const result = await model.generateContent(consolidationPrompt);
      const consolidatedResumo = result.response.text().trim();

      return {
        resumo: consolidatedResumo,
        technical_stats: consolidatedStats,
        charts: consolidatedCharts,
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
      
      // Fallback em caso de erro: concatenar resumos + narrativas
      return {
        resumo: summaries.join(' ') + chartsNarrative + statsNarrative,
        technical_stats: consolidatedStats,
        charts: consolidatedCharts,
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
   * @param {string|null} userId - ID do usuário (para filtrar análises)
   * @returns {Promise<number>} Número de análises
   */
  static async getAnalysesCount(personId, userId = null) {
    const analyses = await FightAnalysis.getByPersonId(personId, userId);
    return analyses ? analyses.length : 0;
  }

  /**
   * Gera estratégia tática usando resumos consolidados de TODAS as análises
   * OTIMIZADO: Usa technical_summary salvo no banco quando disponível
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

    // Contar análises para validação
    const [athleteAnalysesCount, opponentAnalysesCount] = await Promise.all([
      this.getAnalysesCount(athleteId, userId),
      this.getAnalysesCount(opponentId, userId)
    ]);

    // Validar que há análises suficientes
    if (athleteAnalysesCount === 0) {
      throw new Error(`O atleta ${athlete.name} não possui análises de luta. Adicione pelo menos uma análise antes de gerar estratégia.`);
    }

    if (opponentAnalysesCount === 0) {
      throw new Error(`O adversário ${opponent.name} não possui análises de luta. Adicione pelo menos uma análise antes de gerar estratégia.`);
    }

    // Usar technical_summary salvo no banco OU consolidar se não existir
    let athleteResumo, opponentResumo;
    let athleteStats, opponentStats;
    
    // Atleta: usar resumo salvo ou consolidar
    if (athlete.technicalSummary) {
      console.log(`📋 Usando resumo técnico salvo do atleta ${athlete.name}`);
      athleteResumo = athlete.technicalSummary;
      // Buscar stats consolidados
      const athleteConsolidation = await this.consolidateAnalyses(athleteId, userId, null);
      athleteStats = athleteConsolidation.technical_stats;
    } else {
      console.log(`🔄 Consolidando análises do atleta ${athlete.name} (sem resumo salvo)`);
      const athleteConsolidation = await this.consolidateAnalyses(athleteId, userId, customModel);
      athleteResumo = athleteConsolidation.resumo;
      athleteStats = athleteConsolidation.technical_stats;
    }
    
    // Adversário: usar resumo salvo ou consolidar
    if (opponent.technicalSummary) {
      console.log(`📋 Usando resumo técnico salvo do adversário ${opponent.name}`);
      opponentResumo = opponent.technicalSummary;
      // Buscar stats consolidados
      const opponentConsolidation = await this.consolidateAnalyses(opponentId, userId, null);
      opponentStats = opponentConsolidation.technical_stats;
    } else {
      console.log(`🔄 Consolidando análises do adversário ${opponent.name} (sem resumo salvo)`);
      const opponentConsolidation = await this.consolidateAnalyses(opponentId, userId, customModel);
      opponentResumo = opponentConsolidation.resumo;
      opponentStats = opponentConsolidation.technical_stats;
    }

    // Preparar dados para a IA (resumo narrativo + dados quantitativos + faixa)
    const athleteData = {
      name: athlete.name,
      belt: athlete.belt || null,
      resumo: athleteResumo,
      technical_stats: athleteStats
    };

    const opponentData = {
      name: opponent.name,
      belt: opponent.belt || null,
      resumo: opponentResumo,
      technical_stats: opponentStats
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
          belt: athlete.belt,
          analysesCount: athleteAnalysesCount,
          usedSavedSummary: !!athlete.technicalSummary
        },
        opponent: {
          id: opponentId,
          name: opponent.name,
          belt: opponent.belt,
          analysesCount: opponentAnalysesCount,
          usedSavedSummary: !!opponent.technicalSummary
        },
        strategyModel: customModel || 'gemini-2.0-flash',
        usage: strategyResult.usage,
        generatedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = StrategyService;
