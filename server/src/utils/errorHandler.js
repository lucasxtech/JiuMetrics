// @ts-check
/**
 * Utilitário centralizado para tratamento de erros em controllers
 */

/**
 * Trata erros de forma padronizada em controllers
 * @param {Object} res - Objeto response do Express
 * @param {string} operation - Descrição da operação que falhou
 * @param {Error & {statusCode?: number}} error - Erro capturado (AppError tem `statusCode`; erro cru não)
 * @param {number} [statusCode] - Código HTTP (opcional, usa error.statusCode ou 500)
 */
function handleError(res, operation, error, statusCode = null) {
  const status = statusCode || error.statusCode || 500;

  console.error(`❌ Erro ao ${operation}:`, error.message);

  res.status(status).json({
    success: false,
    error: `Erro ao ${operation}`,
    ...errorDetails(error)
  });
}

/**
 * Detalhe do erro para a resposta — **só fora de produção** (spec 007).
 *
 * `details: error.message` era devolvido ao cliente em ~30 handlers, expondo
 * mensagens cruas do PostgREST/Postgres: nome de coluna, constraint violada,
 * estrutura de tabela. O `.github/copilot-instructions.md` já **proibia** esse
 * padrão — o código violava a regra escrita nele mesmo.
 *
 * Em produção a resposta fica com a mensagem genérica; o detalhe continua no
 * log do servidor, onde a equipe alcança e o cliente não.
 *
 * @param {Error} error
 * @returns {{details?: string}} objeto para espalhar na resposta
 */
function errorDetails(error) {
  if (process.env.NODE_ENV === 'production') return {};
  return { details: error.message };
}

/**
 * Wrapper para funções async em rotas Express
 * Captura erros e passa para o middleware de erro
 * @param {Function} fn - Função async do controller
 * @returns {Function} Função wrapped
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Registra uma falha DELIBERADAMENTE tolerada (spec 007, item 3 e R6).
 *
 * Há lugares onde engolir o erro é a decisão certa: registrar custo de IA não
 * deve derrubar a análise que o usuário já pagou, e a estratégia precisa ser
 * entregue mesmo se o histórico falhar. O problema nunca foi tolerar — foi
 * tolerar de forma **invisível**, num `console.warn` indistinguível de ruído.
 *
 * Esta função existe para dar a essas falhas uma forma única e localizável:
 * `grep "FALHA TOLERADA"` encontra todas. É deliberadamente simples — logging
 * estruturado (nível, request id, PII redigida) é spec própria, e este é o
 * ponto de costura onde ele vai entrar sem tocar os 4 call sites.
 *
 * ⚠️ Limitação declarada: continua sendo stdout. Em serverless isso vai para o
 * log da Vercel, sem alerta e sem agregação — observável se alguém procurar,
 * não se ninguém procurar.
 *
 * @param {string} context - o que falhou, em termos de domínio
 * @param {Error} error
 * @param {Object} [metadata] - identificadores para achar o registro afetado
 */
function logToleratedFailure(context, error, metadata = {}) {
  console.error(
    `⚠️ [FALHA TOLERADA] ${context}:`,
    error?.message || error,
    Object.keys(metadata).length ? JSON.stringify(metadata) : ''
  );
}

module.exports = { handleError, asyncHandler, errorDetails, logToleratedFailure };
