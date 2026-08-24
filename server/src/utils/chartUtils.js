// @ts-check
/**
 * Utilitários de gráficos.
 *
 * NOTA (Fase 1): extractJson/cleanMarkdown foram removidos — a saída da IA
 * agora é estruturada via responseSchema na camada services/llm.js, então
 * não existe mais parse manual de texto livre. Sobrou apenas a
 * normalização de valores de gráfico (regra de negócio, não de parse).
 */

/**
 * Normaliza os valores de um gráfico para somar exatamente 100%
 * @param {Array} data - Array de {label, value}
 * @returns {Array} Array normalizado
 */
function normalizeChartData(data) {
  if (!Array.isArray(data) || data.length === 0) return data;

  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  // Se total é 0, não há dados - retorna como está
  if (total === 0) return data;

  // Se total já é 100, retorna como está
  if (total === 100) return data;

  // Normalizar para somar 100
  const factor = 100 / total;
  let normalized = data.map(item => ({
    ...item,
    value: Math.round((Number(item.value) || 0) * factor)
  }));

  // Ajustar arredondamento para garantir soma exata de 100
  const newTotal = normalized.reduce((sum, item) => sum + item.value, 0);
  if (newTotal !== 100) {
    const diff = 100 - newTotal;
    // Adiciona/subtrai a diferença do maior valor não-zero
    const maxIndex = normalized.reduce((iMax, item, i, arr) =>
      item.value > arr[iMax].value ? i : iMax, 0
    );
    normalized[maxIndex].value += diff;
  }

  return normalized;
}

module.exports = { normalizeChartData };
