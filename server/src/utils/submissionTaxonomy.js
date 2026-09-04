// @ts-check
/**
 * Taxonomia de finalizações — agrupamento por família canônica.
 *
 * POR QUE ISTO EXISTE
 *
 * `submissions.detalhes[].tecnica` é string livre no `responseSchema`, e isso
 * é DELIBERADO: a IA escreve nomes mais específicos que a lista canônica de
 * `CHART_LABELS.submissions` ("triângulo invertido", "chave de pé reta",
 * "triângulo voador"). Fechar um enum ali resolveria a agregação jogando fora
 * informação correta — o nome específico é justamente o que tem valor tático.
 *
 * O defeito estava na AGREGAÇÃO: `StrategyService.consolidateTechnicalStats`
 * contava por string exata, então três variantes de triângulo viravam três
 * técnicas distintas de 1× cada. A lista "Preferidas" que chega no prompt de
 * estratégia — a única forma de o modelo saber a arma preferida do adversário —
 * saía fragmentada. Medido em 3 das 8 análises do pipeline atual (2026-09-02).
 *
 * A REGRA, deliberadamente conservadora (fundir demais destrói informação
 * tanto quanto não fundir):
 *   1. bate exatamente com um rótulo canônico  → é ele mesmo;
 *   2. contém rótulo(s) canônico(s) como palavra inteira → o MAIS LONGO;
 *   3. não contém nenhum → fica como está (`chave de joelho` não vira
 *      `chave de pé`; `toe hold` continua `toe hold`).
 *
 * Comparação sem acento e sem caixa, porque o modelo alterna entre
 * "triangulo" e "triângulo" na mesma sessão.
 */

const { CHART_LABELS } = require('../config/ai');

/**
 * Normaliza para comparação: minúsculas, sem acento, espaços colapsados.
 * @param {string} texto
 * @returns {string}
 */
function fold(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Rótulos canônicos ordenados do mais longo para o mais curto, para que a
// regra 2 encontre "mata leão no pé" antes de "mata leão".
const CANONICAL = [...CHART_LABELS.submissions].sort((a, b) => b.length - a.length);
const CANONICAL_FOLDED = CANONICAL.map((label) => ({ label, folded: fold(label) }));

/**
 * Resolve uma técnica para sua família canônica, preservando o nome original
 * quando ele não pertence a nenhuma.
 *
 * @param {unknown} tecnica - Nome da técnica como a IA escreveu
 * @returns {string|null} Rótulo canônico, o próprio nome normalizado, ou null
 */
function canonicalizeSubmission(tecnica) {
  if (typeof tecnica !== 'string') return null;

  const alvo = fold(tecnica);
  if (!alvo) return null;

  const exato = CANONICAL_FOLDED.find((c) => c.folded === alvo);
  if (exato) return exato.label;

  // Palavra inteira: evita que "baratoplata" case com "omoplata".
  const contido = CANONICAL_FOLDED.find((c) =>
    new RegExp(`(^|\\s)${c.folded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`).test(alvo)
  );
  if (contido) return contido.label;

  return tecnica.trim().toLowerCase();
}

/**
 * @typedef {Object} FinalizacaoAgrupada
 * @property {string} tecnica - Família canônica (ou o nome original)
 * @property {number} quantidade - Total de ocorrências na família
 * @property {string[]} variantes - Nomes específicos observados, sem repetir a família
 */

/**
 * Agrupa `detalhes[]` por família e ordena por frequência.
 *
 * Aceita tanto o formato canônico (`{ tecnica, resultado }`) quanto o legado
 * (string solta) — os dois existem no banco, e tratar só um deles foi o que
 * gerou a chave "[object Object]" no histórico.
 *
 * @param {unknown} detalhes - Array de `{tecnica}` ou de strings
 * @returns {FinalizacaoAgrupada[]}
 */
function groupSubmissions(detalhes) {
  if (!Array.isArray(detalhes)) return [];

  /** @type {Map<string, {quantidade: number, variantes: Set<string>}>} */
  const familias = new Map();

  for (const item of detalhes) {
    const bruta = typeof item === 'string' ? item : /** @type {any} */ (item)?.tecnica;
    const familia = canonicalizeSubmission(bruta);
    if (!familia) continue;

    if (!familias.has(familia)) {
      familias.set(familia, { quantidade: 0, variantes: new Set() });
    }
    const entrada = /** @type {{quantidade: number, variantes: Set<string>}} */ (familias.get(familia));
    entrada.quantidade += 1;

    const especifica = String(bruta).trim().toLowerCase();
    if (fold(especifica) !== fold(familia)) entrada.variantes.add(especifica);
  }

  return [...familias.entries()]
    .map(([tecnica, { quantidade, variantes }]) => ({
      tecnica,
      quantidade,
      variantes: [...variantes],
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

module.exports = { canonicalizeSubmission, groupSubmissions };
