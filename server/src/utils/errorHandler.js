/**
 * Utilitário centralizado para tratamento de erros em controllers
 */

/**
 * Trata erros de forma padronizada em controllers
 * @param {Object} res - Objeto response do Express
 * @param {string} operation - Descrição da operação que falhou
 * @param {Error} error - Erro capturado
 * @param {number} statusCode - Código HTTP (opcional, usa error.statusCode ou 500)
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

module.exports = { handleError, asyncHandler, errorDetails };
