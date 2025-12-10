/**
 * Utilitário para processar análises e calcular atributos
 * Versão backend - espelhando a lógica do frontend
 */

/**
 * Processa análises de lutas e retorna atributos calculados
 * @param {Array} analyses - Array de análises de lutas
 * @param {Object} person - Objeto atleta/adversário
 * @returns {Object} Atributos calculados
 */
function processPersonAnalyses(analyses, person) {
  if (!analyses || analyses.length === 0) {
    return {
      condicionamento: 50,
      tecnica: 50,
      agressividade: 50,
      defesa: 50,
      movimentacao: 50
    };
  }

  // Agregação de dados de todas as análises
  let totalActions = 0;
  let totalPositions = 0;
  let totalSubmissions = 0;
  let totalSweeps = 0;
  let completedSweeps = 0;
  let totalBackTakes = 0;
  const techniquesMap = {};

  analyses.forEach(analysis => {
    const data = analysis.data || analysis;

    // Somar ações
    if (data.actions) totalActions += data.actions.length;

    // Somar posições
    if (data.positions) totalPositions += data.positions.length;

    // Somar submissões
    if (data.submissions) {
      totalSubmissions += data.submissions.length;
    }

    // Somar sweeps
    if (data.sweeps) {
      totalSweeps += data.sweeps.length;
      completedSweeps += data.sweeps.filter(s => s.completed).length;
    }

    // Somar pegadas de costas
    if (data.backTakes) {
      totalBackTakes += data.backTakes.length;
    }

    // Mapear técnicas
    if (data.techniques && Array.isArray(data.techniques)) {
      data.techniques.forEach(tech => {
        const category = tech.category || tech.type || 'Outros';
        techniquesMap[category] = (techniquesMap[category] || 0) + 1;
      });
    }
  });

  // CÁLCULO DOS ATRIBUTOS - mesma lógica do frontend

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

  return {
    condicionamento: Math.round(condicionamento),
    tecnica: Math.round(tecnica),
    agressividade: Math.round(agressividade),
    defesa: Math.round(defesa),
    movimentacao: Math.round(movimentacao)
  };
}

module.exports = { processPersonAnalyses };
