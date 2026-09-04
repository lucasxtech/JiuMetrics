/**
 * Controller ÚNICO de atletas e adversários (spec 012).
 *
 * `athleteController.js` e `opponentController.js` eram cópias de 138 linhas
 * cuja única diferença eram os rótulos das mensagens. O corpo já chega
 * validado e coerçado pelo schema (`schemas/requests/person.js`), então não
 * há mais `Number(age)`, `|| 50` nem defaults fabricados aqui — campo omitido
 * é `null`.
 *
 * Padrão de autorização (CLAUDE.md): `resolveScope` → `getById` com escopo →
 * 404 se não achou → escrita com o `userId` REAL do registro.
 */
const { handleError } = require('../utils/errorHandler');
const { resolveScope } = require('../services/authorization');

/**
 * @param {ReturnType<import('../models/personModel').createPersonModel>} Model
 * @param {{ singular: string, plural: string }} labels - ex.: { singular: 'Atleta', plural: 'atletas' }
 */
function createPersonController(Model, { singular, plural }) {
  const notFound = (res) => res.status(404).json({
    success: false,
    error: `${singular} não encontrado`,
  });

  return {
    /** GET / */
    async getAll(req, res) {
      try {
        const allowedUserIds = await resolveScope(req.actor);
        const rows = await Model.getAll(allowedUserIds);
        res.json({ success: true, data: rows, count: rows.length });
      } catch (error) {
        handleError(res, `buscar ${plural}`, error);
      }
    },

    /** GET /:id */
    async getById(req, res) {
      try {
        const allowedUserIds = await resolveScope(req.actor);
        const row = await Model.getById(req.params.id, allowedUserIds);
        if (!row) return notFound(res);
        res.json({ success: true, data: row });
      } catch (error) {
        handleError(res, `buscar ${singular.toLowerCase()}`, error);
      }
    },

    /** POST / — `req.body` já validado por `createPersonSchema` */
    async create(req, res) {
      try {
        const created = await Model.create(req.body, req.userId);
        res.status(201).json({
          success: true,
          message: `${singular} criado com sucesso`,
          data: created,
        });
      } catch (error) {
        handleError(res, `criar ${singular.toLowerCase()}`, error);
      }
    },

    /** PUT /:id — `req.body` já validado por `updatePersonSchema` */
    async update(req, res) {
      try {
        const allowedUserIds = await resolveScope(req.actor);
        const existing = await Model.getById(req.params.id, allowedUserIds);
        if (!existing) return notFound(res);

        const updated = await Model.update(req.params.id, req.body, existing.userId);
        res.json({
          success: true,
          message: `${singular} atualizado com sucesso`,
          data: updated,
        });
      } catch (error) {
        handleError(res, `atualizar ${singular.toLowerCase()}`, error);
      }
    },

    /** DELETE /:id */
    async delete(req, res) {
      try {
        const allowedUserIds = await resolveScope(req.actor);
        const existing = await Model.getById(req.params.id, allowedUserIds);
        if (!existing) return notFound(res);

        const deleted = await Model.delete(req.params.id, existing.userId);
        res.json({
          success: true,
          message: `${singular} deletado com sucesso`,
          data: deleted,
        });
      } catch (error) {
        handleError(res, `deletar ${singular.toLowerCase()}`, error);
      }
    },
  };
}

module.exports = { createPersonController };
