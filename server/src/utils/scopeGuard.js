// @ts-check
const { MissingScopeError } = require('./errors');

/**
 * Normaliza e EXIGE o escopo de posse numa chamada de model (spec 006).
 *
 * Antes desta spec, a posse do dado era uma *convenção de chamada*: métodos
 * como `FightAnalysis.update(id, dados)` aceitavam qualquer ID, e o sistema
 * só era seguro enquanto todo controller lembrasse de filtrar. Seis endpoints
 * não lembraram. Este guard move a exigência para a assinatura: quem chama
 * sem escopo recebe um erro, não um vazamento.
 *
 * Aceita array (`resolveScope`) ou escalar (um único `user_id`) e devolve
 * sempre um array, para uso direto em `.in('user_id', ids)`.
 *
 * Rejeita array vazio e array com elemento falsy — este último é o caso
 * perigoso na prática: `[undefined]` é o que chega quando o chamador passa
 * uma variável inexistente, e sem esta verificação a query `.in('user_id',
 * [undefined])` simplesmente não casaria linha nenhuma, parecendo
 * "não encontrado" em vez de bug.
 *
 * @param {string|string[]} scope - escopo de posse
 * @param {string} context - nome do método, para a mensagem de erro
 * @returns {string[]} IDs normalizados
 * @throws {MissingScopeError} quando o escopo está ausente ou inválido
 */
function requireScope(scope, context) {
  const ids = Array.isArray(scope) ? scope : (scope ? [scope] : []);

  if (ids.length === 0 || ids.some(id => !id)) {
    throw new MissingScopeError(context);
  }

  return ids;
}

module.exports = { requireScope };
