/**
 * Converte um objeto de estratégia em texto legível
 * @param {Object} obj - Objeto para converter
 * @returns {string} Texto formatado
 */
export const formatObjectToText = (obj) => {
  if (!obj || typeof obj !== 'object') return String(obj || '');
  
  // Formato IA simplificado: fazer/nao_fazer
  if (obj.fazer || obj.nao_fazer) {
    let text = '';
    
    if (obj.fazer?.length) {
      text += '**✅ O que FAZER:**\n';
      obj.fazer.forEach((item, i) => {
        const itemText = typeof item === 'string' ? item : item.descricao || item.acao || JSON.stringify(item);
        text += `${i + 1}. ${itemText}\n`;
      });
      text += '\n';
    }
    
    if (obj.nao_fazer?.length) {
      text += '**❌ O que NÃO FAZER:**\n';
      obj.nao_fazer.forEach((item, i) => {
        const itemText = typeof item === 'string' ? item : item.descricao || item.acao || JSON.stringify(item);
        text += `${i + 1}. ${itemText}\n`;
      });
      text += '\n';
    }
    
    if (obj.se_estiver_perdendo) {
      text += `**🚨 Se Estiver Perdendo:**\n${obj.se_estiver_perdendo}`;
    }
    
    return text.trim();
  }
  
  // Checklist Tático (oportunidades_de_pontos, armadilhas_dele, protocolo_de_emergencia)
  if (obj.oportunidades_de_pontos || obj.armadilhas_dele || obj.protocolo_de_emergencia || obj.protocolo_de_seguranca) {
    let text = '';
    
    // Oportunidades de pontos
    if (obj.oportunidades_de_pontos?.length) {
      text += '**✅ Oportunidades de Pontos:**\n';
      obj.oportunidades_de_pontos.forEach((item, i) => {
        text += `${i + 1}. **${item.tecnica}** (+${item.pontos}pts, ${item.probabilidade})\n`;
        if (item.situacao) text += `   Situação: ${item.situacao}\n`;
        if (item.por_que_funciona) text += `   Por que funciona: ${item.por_que_funciona}\n`;
      });
      text += '\n';
    }
    
    // Armadilhas dele
    if (obj.armadilhas_dele?.length) {
      text += '**⚠️ Armadilhas Dele:**\n';
      obj.armadilhas_dele.forEach((item, i) => {
        text += `${i + 1}. **${item.situacao}**\n`;
        if (item.como_evitar) text += `   Como evitar: ${item.como_evitar}\n`;
        if (item.o_que_ele_faz) text += `   O que ele faz: ${item.o_que_ele_faz}\n`;
      });
      text += '\n';
    }
    
    // Protocolo de emergência
    const protocolo = obj.protocolo_de_emergencia || obj.protocolo_de_seguranca;
    if (protocolo) {
      text += '**🚨 Protocolo de Emergência:**\n';
      if (protocolo.posicao_perigosa || protocolo.jamais_fazer) {
        text += `   Posição Perigosa: ${protocolo.posicao_perigosa || protocolo.jamais_fazer}\n`;
      }
      if (protocolo.como_escapar || protocolo.saida_de_emergencia) {
        text += `   Como Escapar: ${protocolo.como_escapar || protocolo.saida_de_emergencia}\n`;
      }
    }
    
    return text.trim();
  }
  
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
  
  // Array genérico
  if (Array.isArray(obj)) {
    return obj.map((item, i) => {
      if (typeof item === 'object') {
        // Tentar extrair campos principais
        const mainField = item.tecnica || item.situacao || item.titulo || item.nome || '';
        const desc = item.descricao || item.como_evitar || item.por_que_funciona || '';
        return `${i + 1}. ${mainField}${desc ? ` - ${desc}` : ''}`;
      }
      return `${i + 1}. ${item}`;
    }).join('\n');
  }
  
  // Fallback: converter para texto legível (não JSON)
  return Object.entries(obj)
    .map(([key, value]) => `**${key.replace(/_/g, ' ')}:** ${typeof value === 'object' ? formatObjectToText(value) : value}`)
    .join('\n');
};
