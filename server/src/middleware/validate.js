const { ZodError } = require('zod');

/**
 * Validação de corpo de requisição na borda (spec 007, item 4).
 *
 * Antes desta spec **não havia validação de schema em nenhum endpoint** — só
 * `if (!campo)` ad hoc espalhado pelos controllers. Foi isso que permitiu
 * `athlete-summary` aceitar corpo arbitrário direto no prompt (AZ-7) e
 * `analyze-link` aceitar `videos[]` sem limite.
 *
 * Decisão P3: **zod**. Registrada em `docs/decisions/012-zod-para-validacao-de-entrada.md`.
 *
 * Duas propriedades importantes de como isto é aplicado:
 *
 * 1. **`req.body` é substituído pelo dado validado.** O zod remove campos não
 *    declarados (`strip`, o padrão para objetos), então nada que o schema não
 *    conheça alcança o controller. É a defesa contra a classe "campo
 *    inesperado no body" (AZ-17).
 * 2. **A resposta de erro não vaza interno.** Devolve o caminho do campo e a
 *    mensagem da regra, nunca stack nem detalhe de banco.
 *
 * ⚠️ Cuidado ao declarar um schema: um campo que o controller usa e o schema
 * não declara vira `undefined` **em silêncio** — exatamente a classe de falha
 * que esta spec existe para eliminar. O payload real do frontend foi mapeado
 * antes de cada schema (ver os comentários em `schemas/requests/`).
 *
 * @param {import('zod').ZodType} schema
 * @returns {Function} middleware do Express
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        issues: formatIssues(result.error)
      });
    }

    req.body = result.data;
    return next();
  };
}

/**
 * Converte o erro do zod em algo estável para o cliente.
 * @param {ZodError} error
 * @returns {Array<{campo: string, mensagem: string}>}
 */
function formatIssues(error) {
  if (!(error instanceof ZodError)) return [];
  return error.issues.map((issue) => ({
    campo: issue.path.join('.') || '(corpo)',
    mensagem: issue.message
  }));
}

module.exports = { validateBody, formatIssues };
