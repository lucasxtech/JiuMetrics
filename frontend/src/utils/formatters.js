/**
 * Converte um objeto de estratégia em texto legível
 * @param {Object} obj - Objeto para converter
 * @returns {string} Texto formatado
 */
export const formatObjectToText = (obj) => {
  if (!obj || typeof obj !== 'object') return String(obj || '');
  
  // Plano tático faseado
  if (obj.em_pe_standup || obj.jogo_de_passagem_top || obj.jogo_de_guarda_bottom) {
    let text = '';
    if (obj.em_pe_standup) {
      text += `**Em Pé:** ${obj.em_pe_standup.acao_recomendada || ''}\n`;
      if (obj.em_pe_standup.como_executar) text += `Como executar: ${obj.em_pe_standup.como_executar}\n`;
    }
    if (obj.jogo_de_passagem_top) {
      text += `\n**Passagem:** ${obj.jogo_de_passagem_top.estilo_recomendado || ''}\n`;
      if (obj.jogo_de_passagem_top.passo_a_passo) text += `Passo a passo: ${obj.jogo_de_passagem_top.passo_a_passo}\n`;
    }
    if (obj.jogo_de_guarda_bottom) {
      text += `\n**Guarda:** ${obj.jogo_de_guarda_bottom.guarda_ideal || ''}\n`;
      if (obj.jogo_de_guarda_bottom.momento_de_atacar) text += `Momento de atacar: ${obj.jogo_de_guarda_bottom.momento_de_atacar}\n`;
    }
    return text.trim();
  }
  
  // Cronologia
  if (obj.primeiro_minuto || obj.minutos_2_a_4 || obj.minutos_finais || obj.inicio || obj.meio || obj.final) {
    let text = '';
    text += `**0-1min:** ${obj.primeiro_minuto || obj.inicio || ''}\n\n`;
    text += `**2-4min:** ${obj.minutos_2_a_4 || obj.meio || ''}\n\n`;
    text += `**5min+:** ${obj.minutos_finais || obj.final || ''}`;
    return text.trim();
  }
  
  // Matchup
  if (obj.vantagem_critica || obj.risco_oculto || obj.fator_chave) {
    let text = '';
    if (obj.vantagem_critica) text += `**Vantagem:** ${obj.vantagem_critica}\n\n`;
    if (obj.risco_oculto) text += `**Risco:** ${obj.risco_oculto}\n\n`;
    if (obj.fator_chave) text += `**Fator Chave:** ${obj.fator_chave}`;
    return text.trim();
  }
  
  // Array
  if (Array.isArray(obj)) {
    return obj.map((item, i) => `${i + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('\n');
  }
  
  // Fallback: converter para texto legível (não JSON)
  return Object.entries(obj)
    .map(([key, value]) => `**${key.replace(/_/g, ' ')}:** ${typeof value === 'object' ? formatObjectToText(value) : value}`)
    .join('\n');
};
