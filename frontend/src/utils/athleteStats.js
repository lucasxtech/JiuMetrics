/**
 * Processa análises de um atleta/adversário e retorna dados estatísticos
 * @param {Array} analyses - Array de análises do perfil
 * @param {Object} person - Objeto do atleta/adversário
 * @returns {Object} Objeto com radarData, attacksData, stats e textos de insights
 */
export const processPersonAnalyses = (analyses, person) => {
  if (!analyses || analyses.length === 0 || !person) {
    return {
      radarData: [
        { name: 'Condicionamento', value: person?.cardio || 50 },
        { name: 'Técnica', value: 50 },
        { name: 'Agressividade', value: 50 },
        { name: 'Defesa', value: 50 },
        { name: 'Movimentação', value: 50 },
      ],
      attacksData: [
        { name: 'Sem dados', value: 0 },
      ],
      stats: {},
      strongAttacksText: 'Aguardando análises',
      weaknessesText: 'Aguardando análises',
    };
  }

  // Variáveis para acumular dados
  const techniquesMap = {};
  let totalSweeps = 0;
  let totalSubmissions = 0;
  let totalBackTakes = 0;
  let completedSweeps = 0;
  let totalActions = 0;
  let totalPositions = 0;

  analyses.forEach((analysis) => {
    // Processar technical_stats
    const stats = analysis.technical_stats || {};
    
    if (stats.sweeps?.quantidade) {
      totalSweeps += stats.sweeps.quantidade;
      completedSweeps += stats.sweeps.concluidas || 0;
      totalActions += stats.sweeps.quantidade;
    }
    
    if (stats.submissions?.tentativas) {
      totalSubmissions += stats.submissions.tentativas;
      totalActions += stats.submissions.tentativas;
    }
    
    if (stats.back_takes?.quantidade) {
      totalBackTakes += stats.back_takes.quantidade;
      totalActions += stats.back_takes.quantidade;
    }

    // Processar CHARTS - principal fonte de dados
    if (analysis.charts && Array.isArray(analysis.charts)) {
      analysis.charts.forEach((chart) => {
        const data = chart.data || [];

        data.forEach(item => {
          const label = (item.label || '').toLowerCase();
          const value = parseFloat(item.value) || 0;

          if (value > 0) {
            totalPositions += value;

            // Adicionar ao mapa de técnicas para o gráfico de barras
            const techniqueName = item.label || 'Desconhecido';
            
            // Categorizar e acumular
            if (label.includes('raspagem') || label.includes('sweep')) {
              techniquesMap['Raspagens'] = (techniquesMap['Raspagens'] || 0) + value;
              totalActions += value;
            } else if (label.includes('finalização') || label.includes('finaliza') || 
                       label.includes('submission') || label.includes('armlock') || 
                       label.includes('kimura') || label.includes('triangulo') ||
                       label.includes('estrangulamento')) {
              techniquesMap['Finalizações'] = (techniquesMap['Finalizações'] || 0) + value;
              totalActions += value;
            } else if (label.includes('passagem') || label.includes('pass')) {
              techniquesMap['Passagens de Guarda'] = (techniquesMap['Passagens de Guarda'] || 0) + value;
              totalActions += value;
            } else if (label.includes('costas') || label.includes('back')) {
              techniquesMap['Pegadas de Costas'] = (techniquesMap['Pegadas de Costas'] || 0) + value;
              totalActions += value;
            } else if (label.includes('guarda')) {
              // Tipos de guarda específicos
              if (!label.includes('passagem') && !label.includes('tempo')) {
                techniquesMap[techniqueName] = (techniquesMap[techniqueName] || 0) + value;
              }
            } else if (label.includes('defesa') || label.includes('escape')) {
              techniquesMap['Defesas/Escapes'] = (techniquesMap['Defesas/Escapes'] || 0) + value;
              totalActions += value;
            } else if (value >= 5) {
              // Outras técnicas com valores significativos
              techniquesMap[techniqueName] = (techniquesMap[techniqueName] || 0) + value;
            }
          }
        });
      });
    }
  });

  // CÁLCULO DOS ATRIBUTOS - ajustado para dados reais e maior diferenciação
  
  // 1. CONDICIONAMENTO - baseado em volume total de ações por análise
  const avgActionsPerAnalysis = analyses.length > 0 ? (totalActions / analyses.length) : 0;
  const condicionamento = person.cardio || 
    Math.min(100, Math.max(20, Math.round(avgActionsPerAnalysis * 4 + (totalPositions / analyses.length || 0) * 2)));

  // 2. TÉCNICA - variedade e volume de técnicas normalizado
  const techniqueVariety = Object.keys(techniquesMap).length;
  const totalTechniqueVolume = Object.values(techniquesMap).reduce((sum, val) => sum + val, 0);
  const avgTechniqueVolume = analyses.length > 0 ? (totalTechniqueVolume / analyses.length) : 0;
  const tecnica = Math.min(100, Math.max(15, 
    Math.round((techniqueVariety * 8) + (avgTechniqueVolume * 3))
  ));

  // 3. AGRESSIVIDADE - finalizações e ações ofensivas normalizado por análise
  const avgSubmissions = analyses.length > 0 ? (totalSubmissions / analyses.length) : 0;
  const avgSweeps = analyses.length > 0 ? (totalSweeps / analyses.length) : 0;
  const avgBackTakes = analyses.length > 0 ? (totalBackTakes / analyses.length) : 0;
  const agressividade = Math.min(100, Math.max(10,
    Math.round(
      (avgSubmissions * 20) + 
      (avgSweeps * 8) + 
      (avgBackTakes * 15) +
      (totalSubmissions > 0 ? 10 : 0) // Bônus por ter tentativas
    )
  ));

  // 4. DEFESA - taxa de sucesso e ações defensivas
  const sweepSuccessRate = totalSweeps > 0 ? (completedSweeps / totalSweeps) : 0;
  const defensiveValue = (techniquesMap['Defesas/Escapes'] || 0);
  const avgDefensive = analyses.length > 0 ? (defensiveValue / analyses.length) : 0;
  const defesa = Math.min(100, Math.max(15,
    Math.round((sweepSuccessRate * 40) + (avgDefensive * 6) + 20)
  ));

  // 5. MOVIMENTAÇÃO - mudanças de posição e transições
  const movimentacao = Math.min(100, Math.max(10,
    Math.round(
      (avgBackTakes * 18) + 
      (avgSweeps * 10) + 
      (techniqueVariety * 4) +
      (totalPositions > 50 ? 15 : 0) // Bônus por alta mobilidade
    )
  ));

  const radarData = [
    { name: 'Condicionamento', value: Math.round(condicionamento) },
    { name: 'Técnica', value: Math.round(tecnica) },
    { name: 'Agressividade', value: Math.round(agressividade) },
    { name: 'Defesa', value: Math.round(defesa) },
    { name: 'Movimentação', value: Math.round(movimentacao) },
  ];

  // Converter técnicas para array e ordenar
  const attacksData = Object.entries(techniquesMap)
    .map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value: Math.round(value)
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 técnicas

  // Gerar insights de Golpes Fortes e Pontos Fracos
  const strongAttacks = [];
  const weaknesses = [];

  // Identificar golpes fortes (técnicas mais usadas com sucesso)
  if (totalSubmissions > 5) {
    strongAttacks.push(`Finalização (${totalSubmissions} tentativas)`);
  }
  if (totalSweeps > 8) {
    strongAttacks.push(`Raspagens (${totalSweeps} execuções)`);
  }
  if (totalBackTakes > 3) {
    strongAttacks.push(`Pegadas de costas (${totalBackTakes} vezes)`);
  }
  
  // Adicionar técnicas específicas do topo
  attacksData.slice(0, 3).forEach(tech => {
    if (tech.value > 10 && !strongAttacks.some(s => s.includes(tech.name))) {
      strongAttacks.push(`${tech.name} (${tech.value})`);
    }
  });

  // Identificar pontos fracos baseados em baixa taxa de sucesso
  if (totalSweeps > 0 && completedSweeps / totalSweeps < 0.5) {
    weaknesses.push('Taxa de conclusão de raspagens abaixo de 50%');
  }
  if (totalSubmissions > 0 && totalSubmissions < 3) {
    weaknesses.push('Poucas tentativas de finalização');
  }
  if (totalBackTakes === 0 && totalSweeps > 5) {
    weaknesses.push('Não demonstrou pegadas de costas nos vídeos');
  }
  if (techniqueVariety < 3) {
    weaknesses.push('Pouca variedade técnica observada');
  }
  if (defensiveValue === 0) {
    weaknesses.push('Poucas ações defensivas/escapes identificadas');
  }

  const strongAttacksText = strongAttacks.length > 0 
    ? strongAttacks.join(', ')
    : person.strongAttacks || 'Aguardando mais análises para identificar padrões';

  const weaknessesText = weaknesses.length > 0
    ? weaknesses.join('. ')
    : person.weaknesses || 'Nenhum ponto fraco significativo identificado';

  return {
    radarData,
    attacksData,
    strongAttacksText,
    weaknessesText,
    stats: {
      totalSubmissions,
      totalSweeps,
      completedSweeps,
      totalBackTakes,
      totalActions,
      totalPositions,
      techniqueVariety,
      topTechniques: attacksData.slice(0, 5).map(t => t.name),
      attributes: {
        condicionamento: Math.round(condicionamento),
        tecnica: Math.round(tecnica),
        agressividade: Math.round(agressividade),
        defesa: Math.round(defesa),
        movimentacao: Math.round(movimentacao),
      }
    }
  };
};
