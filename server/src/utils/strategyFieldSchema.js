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

/**
 * Checa conteúdo real, não apenas presença da chave — `key in value` passa
 * até para `{ key: null }` ou `{ key: undefined }`, o que derrotava o
 * propósito desta validação (uma sugestão da IA com as chaves certas mas
 * valores nulos passava e corrompia a estratégia salva silenciosamente).
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

// Mapa: nome do campo (e seus aliases usados no frontend) -> caminho dentro
// do objeto de estratégia + validador de shape.
const SECTION_SCHEMAS = {
  como_vencer: {
    aliases: ['tese_da_vitoria', 'strategy'],
    path: ['resumo_rapido', 'como_vencer'],
    validate: (value) => isNonEmptyString(value),
    expected: 'string não vazia em resumo_rapido.como_vencer',
  },
  analise_de_matchup: {
    aliases: ['matchup'],
    path: ['analise_de_matchup'],
    validate: (value) =>
      isNonEmptyObject(value) &&
      ['vantagem_critica', 'risco_oculto', 'fator_chave'].every((key) => isNonEmptyString(value[key])),
    expected: 'objeto com vantagem_critica, risco_oculto e fator_chave preenchidos (não vazios)',
  },
  plano_tatico_faseado: {
    aliases: ['plano_tatico'],
    path: ['plano_tatico_faseado'],
    validate: (value) =>
      isNonEmptyObject(value) &&
      ['em_pe_standup', 'jogo_de_passagem_top', 'jogo_de_guarda_bottom'].every((key) => isNonEmptyObject(value[key])),
    expected: 'objeto com em_pe_standup, jogo_de_passagem_top e jogo_de_guarda_bottom, cada um não vazio',
  },
  cronologia_inteligente: {
    aliases: ['cronologia'],
    path: ['cronologia_inteligente'],
    validate: (value) =>
      isNonEmptyObject(value) &&
      ['primeiro_minuto', 'minutos_2_a_4', 'minutos_finais'].every((key) => isNonEmptyString(value[key])),
    expected: 'objeto com primeiro_minuto, minutos_2_a_4 e minutos_finais preenchidos (não vazios)',
  },
  checklist_tatico: {
    aliases: [],
    path: ['checklist_tatico'],
    validate: (value) =>
      isNonEmptyObject(value) &&
      isNonEmptyArray(value.oportunidades_de_pontos) &&
      isNonEmptyArray(value.armadilhas_dele) &&
      isNonEmptyObject(value.protocolo_de_emergencia) &&
      isNonEmptyString(value.protocolo_de_emergencia.posicao_perigosa) &&
      isNonEmptyString(value.protocolo_de_emergencia.como_escapar),
    expected: 'objeto com oportunidades_de_pontos e armadilhas_dele (arrays não vazios) e protocolo_de_emergencia preenchido',
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
