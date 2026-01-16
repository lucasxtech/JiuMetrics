/**
 * Utilitários para manipulação de dados de estratégia
 */

/**
 * Chaves que identificam conteúdo real de estratégia (não wrappers)
 */
export const STRATEGY_CONTENT_KEYS = [
  'resumo_rapido',
  'tese_da_vitoria',
  'analise_de_matchup',
  'plano_tatico_faseado',
  'cronologia_inteligente',
  'checklist_tatico',
  'matchup_vantagem_critica'
];

/**
 * Extrai o conteúdo real da estratégia, removendo wrappers duplicados
 * @param {Object} data - Dados da estratégia (pode ter wrappers aninhados)
 * @returns {Object} Conteúdo limpo da estratégia
 */
export const extractStrategyContent = (data) => {
  if (!data) return {};
  
  const keys = Object.keys(data);
  const hasContent = keys.some(k => STRATEGY_CONTENT_KEYS.includes(k));
  
  if (hasContent) {
    // Já tem conteúdo real no nível atual, remover "strategy" se existir
    const { strategy: _, ...rest } = data;
    return rest;
  } else if (data.strategy) {
    // Tentar extrair de dentro do wrapper
    return extractStrategyContent(data.strategy);
  }
  
  return data;
};

/**
 * Normaliza a estrutura de estratégia para o formato esperado pela API
 * @param {Object} content - Conteúdo da estratégia
 * @returns {Object} Estrutura normalizada { strategy: content }
 */
export const normalizeStrategyStructure = (content) => {
  // Remover qualquer chave "strategy" residual
  const cleanContent = { ...content };
  if (cleanContent.strategy) {
    delete cleanContent.strategy;
  }
  
  return { strategy: cleanContent };
};

/**
 * Atualiza um campo específico na estratégia
 * @param {Object} currentStrategy - Estratégia atual
 * @param {string} section - Seção a ser atualizada (ex: 'matchup_vantagem_critica')
 * @param {string} newValue - Novo valor
 * @returns {Object} Estratégia atualizada
 */
export const updateStrategyField = (currentStrategy, section, newValue) => {
  let updatedContent;
  
  if (section === 'resumo_como_vencer') {
    updatedContent = {
      ...currentStrategy,
      resumo_rapido: {
        ...currentStrategy.resumo_rapido,
        como_vencer: newValue
      }
    };
  } else if (section.startsWith('resumo_prioridade_')) {
    const idx = parseInt(section.replace('resumo_prioridade_', ''), 10);
    const prioridades = [...(currentStrategy.resumo_rapido?.tres_prioridades || [])];
    prioridades[idx] = newValue;
    updatedContent = {
      ...currentStrategy,
      resumo_rapido: {
        ...currentStrategy.resumo_rapido,
        tres_prioridades: prioridades
      }
    };
  } else if (section.startsWith('matchup_')) {
    const field = section.replace('matchup_', '');
    updatedContent = {
      ...currentStrategy,
      analise_de_matchup: {
        ...currentStrategy.analise_de_matchup,
        [field]: newValue
      }
    };
  } else if (section.startsWith('cronologia_')) {
    const field = section.replace('cronologia_', '');
    updatedContent = {
      ...currentStrategy,
      cronologia_inteligente: {
        ...currentStrategy.cronologia_inteligente,
        [field]: newValue
      }
    };
  } else if (section.startsWith('plano_')) {
    const field = section.replace('plano_', '');
    updatedContent = {
      ...currentStrategy,
      plano_tatico_faseado: {
        ...currentStrategy.plano_tatico_faseado,
        [field]: newValue
      }
    };
  } else if (section.startsWith('checklist_')) {
    const field = section.replace('checklist_', '');
    const currentProtocolo = currentStrategy.checklist_tatico?.protocolo_de_emergencia || 
                              currentStrategy.checklist_tatico?.protocolo_de_seguranca || {};
    updatedContent = {
      ...currentStrategy,
      checklist_tatico: {
        ...currentStrategy.checklist_tatico,
        protocolo_de_emergencia: {
          ...currentProtocolo,
          [field]: newValue
        }
      }
    };
  } else {
    // Fallback para outros campos
    updatedContent = {
      ...currentStrategy,
      [section]: newValue
    };
  }
  
  return updatedContent;
};
