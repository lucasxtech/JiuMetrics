/**
 * Normalização na fronteira HTTP (spec 010, R3).
 *
 * Os 12 services deste projeto eram wrappers finos de axios, **sem uma única
 * transformação**. O resultado é o defeito que esta função corrige: o produto
 * **escondia dado que possuía**.
 *
 * O caminho do bug:
 *
 * | Origem | Campo entregue |
 * |---|---|
 * | resposta imediata de `POST /api/ai/analyze-link` | `technical_stats` (snake — vem da consolidação da IA) |
 * | leitura do banco (`GET /api/fight-analysis/...`) | `technicalStats` (camel — `parseAnalysisFromDB`) |
 *
 * E `VideoAnalysisCard`, que renderiza o histórico, lia `technical_stats`.
 * Então as estatísticas apareciam na tela logo depois de analisar e
 * **nunca** apareciam no histórico: o usuário analisou o vídeo, os números
 * foram extraídos e salvos, e a tela não os mostrava.
 *
 * **O shape canônico é camelCase**, e isso não é arbitrário: os componentes já
 * leem `createdAt`, `framesAnalyzed`, `videoUrl` e `summary` em camelCase —
 * `technical_stats` era o único fora do padrão, resquício de quando o dado só
 * vinha da resposta imediata da IA.
 *
 * ⚠️ As chaves INTERNAS de `technicalStats` (`sweeps.quantidade`,
 * `back_takes.quantidade`, `submissions.tentativas`) continuam como a IA as
 * produz. Elas são o conteúdo do JSONB, não a fronteira, e renomeá-las
 * exigiria migrar o dado já salvo.
 */

/**
 * Garante o shape canônico de uma análise de luta, seja ela vinda da resposta
 * imediata da IA ou de leitura do banco.
 *
 * @param {Object|null|undefined} raw
 * @returns {Object|null|undefined} mesma análise, com `technicalStats` sempre
 *   no lugar canônico (e `technical_stats` preservado por compatibilidade)
 */
export function normalizeAnalysis(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const technicalStats = raw.technicalStats ?? raw.technical_stats ?? null;

  return {
    ...raw,
    technicalStats,
    // Mantido de propósito: há telas que ainda leem o nome antigo, e remover o
    // campo aqui trocaria "dado invisível" por "tela quebrada". Some quando o
    // último leitor for migrado.
    technical_stats: technicalStats
  };
}

/**
 * @param {Array|null|undefined} lista
 * @returns {Array} análises normalizadas
 */
export function normalizeAnalyses(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(normalizeAnalysis);
}

/**
 * Normaliza uma resposta `{ success, data }` da API, aplicando
 * `normalizeAnalysis` em `data` — objeto único ou array.
 *
 * @param {Object} response
 * @returns {Object} resposta com `data` normalizado
 */
export function normalizeAnalysisResponse(response) {
  if (!response || typeof response !== 'object') return response;
  if (Array.isArray(response.data)) {
    return { ...response, data: normalizeAnalyses(response.data) };
  }
  if (response.data && typeof response.data === 'object') {
    return { ...response, data: normalizeAnalysis(response.data) };
  }
  return response;
}
