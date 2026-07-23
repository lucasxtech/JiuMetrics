/**
 * Validação de shape para edições de estratégia aplicadas via chat
 * (prompt chat-strategy.txt) ou edição manual.
 *
 * O chat de estratégia instrui a IA a devolver { field, newValue, reason },
 * onde "field" identifica qual seção do JSON da estratégia deve ser
 * substituída. Antes de persistir, validamos que o valor mesclado em
 * strategy_data realmente tem o formato esperado dessa seção — o prompt
 * já teve exemplos com schema errado (ex.: plano_tatico_faseado com chaves
 * fase_inicial/meio_da_luta/final_da_luta que não existem no schema real),
 * o que corrompia a análise salva quando o usuário aceitava a sugestão.
 */

// Mapa: nome do campo (e seus aliases usados no frontend) -> caminho dentro
// do objeto de estratégia + validador de shape.
const SECTION_SCHEMAS = {
  como_vencer: {
    aliases: ['tese_da_vitoria', 'strategy'],
    path: ['resumo_rapido', 'como_vencer'],
    validate: (value) => typeof value === 'string' && value.trim().length > 0,
    expected: 'string não vazia em resumo_rapido.como_vencer',
  },
  analise_de_matchup: {
    aliases: ['matchup'],
    path: ['analise_de_matchup'],
    validate: (value) =>
      !!value &&
      typeof value === 'object' &&
      ['vantagem_critica', 'risco_oculto', 'fator_chave'].every((key) => key in value),
    expected: 'objeto com vantagem_critica, risco_oculto e fator_chave',
  },
  plano_tatico_faseado: {
    aliases: ['plano_tatico'],
    path: ['plano_tatico_faseado'],
    validate: (value) =>
      !!value &&
      typeof value === 'object' &&
      ['em_pe_standup', 'jogo_de_passagem_top', 'jogo_de_guarda_bottom'].every((key) => key in value),
    expected: 'objeto com em_pe_standup, jogo_de_passagem_top e jogo_de_guarda_bottom',
  },
  cronologia_inteligente: {
    aliases: ['cronologia'],
    path: ['cronologia_inteligente'],
    validate: (value) =>
      !!value &&
      typeof value === 'object' &&
      ['primeiro_minuto', 'minutos_2_a_4', 'minutos_finais'].every((key) => key in value),
    expected: 'objeto com primeiro_minuto, minutos_2_a_4 e minutos_finais',
  },
  checklist_tatico: {
    aliases: [],
    path: ['checklist_tatico'],
    validate: (value) =>
      !!value &&
      typeof value === 'object' &&
      ['oportunidades_de_pontos', 'armadilhas_dele', 'protocolo_de_emergencia'].every((key) => key in value),
    expected: 'objeto com oportunidades_de_pontos, armadilhas_dele e protocolo_de_emergencia',
  },
};

// Resolve aliases (ex.: 'matchup' -> 'analise_de_matchup') para a chave canônica.
const ALIAS_TO_CANONICAL = Object.entries(SECTION_SCHEMAS).reduce((acc, [canonical, schema]) => {
  schema.aliases.forEach((alias) => { acc[alias] = canonical; });
  return acc;
}, {});

function resolveCanonicalField(field) {
  if (SECTION_SCHEMAS[field]) return field;
  return ALIAS_TO_CANONICAL[field] || null;
}

function getByPath(obj, path) {
  return path.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/**
 * Valida se strategyData tem o shape esperado para o campo editado.
 * @param {string} field - Nome do campo (canônico ou alias) reportado pelo chat/edição manual
 * @param {Object} strategyData - Estratégia completa após a mesclagem do newValue
 * @returns {{ valid: boolean, message?: string }}
 */
function validateStrategyField(field, strategyData) {
  if (!field) return { valid: true }; // sem campo informado — não há o que validar

  const canonicalField = resolveCanonicalField(field);
  if (!canonicalField) return { valid: true }; // campo não reconhecido — fora do escopo desta validação

  const schema = SECTION_SCHEMAS[canonicalField];

  // strategy_data pode vir com o objeto de estratégia direto na raiz ou
  // aninhado em `.strategy` (ambos os formatos circulam no frontend hoje).
  const root = strategyData?.strategy || strategyData || {};
  const value = getByPath(root, schema.path);

  if (!schema.validate(value)) {
    return {
      valid: false,
      message: `Campo "${field}" inválido: esperado ${schema.expected}.`,
    };
  }

  return { valid: true };
}

module.exports = { SECTION_SCHEMAS, validateStrategyField };
