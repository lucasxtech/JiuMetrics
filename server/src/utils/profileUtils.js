/**
 * Utilitário para extrair perfil técnico de dados de gráficos da análise Gemini
 */

/**
 * Extrai perfil técnico dos dados de gráficos
 * @param {Array} charts - Array de gráficos com dados de análise
 * @returns {Object} Perfil técnico estruturado
 */
function extractTechnicalProfile(charts) {
  if (!charts || !Array.isArray(charts)) {
    return {};
  }

  const profile = {};

  charts.forEach((chart) => {
    const title = chart.title;
    const data = chart.data;

    if (!data || !Array.isArray(data)) return;

    // Criar objeto com valores
    const values = {};
    data.forEach((item) => {
      values[item.label] = item.value;
    });

    // Mapear para estrutura do perfil técnico
    if (title.includes('Personalidade')) {
      profile.personality = values;
    } else if (title.includes('Comportamento Inicial')) {
      profile.initialBehavior = values;
    } else if (title.includes('Jogo de Guarda')) {
      profile.guardGame = values;
    } else if (title.includes('Jogo de Passagem')) {
      profile.passingGame = values;
    }
  });

  return profile;
}

module.exports = { extractTechnicalProfile };
