/**
 * Controller ÚNICO de atletas e adversários (spec 013).
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
const { handleError, logToleratedFailure } = require('../utils/errorHandler');
const { resolveScope } = require('../services/authorization');
const FightAnalysis = require('../models/FightAnalysis');
const AnalysisVersion = require('../models/AnalysisVersion');
const ProfileVersion = require('../models/ProfileVersion');

/**
 * Apaga o que dependia da pessoa (spec 013).
 *
 * Existe porque **o banco não tem FK** de `person_id` para `athletes`/
 * `opponents` — nada apaga em cascata, e antes desta spec excluir uma pessoa
 * deixava as análises de vídeo e o histórico de perfil apontando para um id
 * inexistente. A cascata é feita na aplicação, na ordem filho → pai.
 *
 * **`tactical_analyses` NÃO entra aqui, de propósito.** Uma estratégia é um
 * documento gerado, que o usuário pode ter exportado e ainda querer consultar;
 * apagá-la junto é decisão de produto, não consequência técnica. Ela guarda os
 * nomes dos lutadores desnormalizados (feature, ver spec 011), então continua
 * legível mesmo sem a pessoa.
 *
 * @returns {Promise<{analyses: number, versions: number, profileVersions: number}>}
 */
async function deleteRelated(personId, personType, allowedUserIds) {
  const analyses = await FightAnalysis.deleteByPerson(personId, personType, allowedUserIds);

  // As versões dependem das análises que acabaram de sair — o escopo já foi
  // aplicado ali (`analysis_versions` não tem `user_id`, decisão P4).
  const versions = await AnalysisVersion.deleteByAnalysisIds(analyses.map((a) => a.id), 'fight');

  const profileVersions = await ProfileVersion.deleteByPerson(personId, personType, allowedUserIds);

  return { analyses: analyses.length, versions, profileVersions };
}

/**
 * @param {ReturnType<import('../models/personModel').createPersonModel>} Model
 * @param {{ singular: string, plural: string }} labels - ex.: { singular: 'Atleta', plural: 'atletas' }
 */
function createPersonController(Model, { singular, plural, personType }) {
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

        // Cascata na aplicação — o banco não tem FK para fazê-la.
        //
        // Roda DEPOIS de a pessoa sair: se a ordem fosse a inversa e a exclusão
        // da pessoa falhasse, teríamos destruído as análises de alguém que
        // continua cadastrado. Nesta ordem o pior caso é o que já era o normal
        // antes desta spec — linhas órfãs —, e o cliente é informado disso em
        // vez de receber um sucesso que esconde metade do trabalho.
        let cascade = null;
        let cascadeFailed = false;
        try {
          cascade = await deleteRelated(req.params.id, personType, allowedUserIds);
        } catch (cascadeError) {
          cascadeFailed = true;
          logToleratedFailure('cascata de exclusão de pessoa', cascadeError, {
            personType,
            personId: req.params.id,
          });
        }

        res.json({
          success: true,
          message: cascadeFailed
            ? `${singular} deletado, mas a limpeza das análises falhou`
            : `${singular} deletado com sucesso`,
          data: deleted,
          deleted: cascade,
          cascadeFailed,
        });
      } catch (error) {
        handleError(res, `deletar ${singular.toLowerCase()}`, error);
      }
    },
  };
}

module.exports = { createPersonController };
