// @ts-check
/**
 * Implementação ÚNICA de acesso a dados para atletas e adversários (spec 013).
 *
 * `models/Athlete.js` e `models/Opponent.js` eram cópias de ~195 linhas com
 * duas únicas diferenças: o nome da tabela e o rótulo nas mensagens. Toda
 * correção precisava ser feita duas vezes — e a spec 007 provou que isso não
 * acontecia: `Athlete.updateTechnicalProfile` tinha um bug de chave que
 * `Opponent.updateTechnicalProfile` não tinha.
 *
 * Esta factory NÃO é a unificação de entidades do ADR-007 (que é de banco e
 * segue como último item da spec 011). É o passo que o ADR listou como
 * alternativa insuficiente para o problema de MODELAGEM, mas que resolve o
 * problema de MANUTENÇÃO agora, sem tocar em dado: as duas tabelas continuam
 * existindo; só a implementação passou a ser uma.
 *
 * Contrato preservado: cada módulo continua exportando um objeto com os
 * mesmos seis métodos estáticos (`getAll`, `getById`, `create`, `update`,
 * `delete`, `updateTechnicalProfile`), então `require('../models/Athlete')`
 * e `jest.mock('../models/Athlete')` funcionam como antes.
 */
const { supabase } = require('../config/supabase');
const { parseAthleteFromDB, parseAthletesFromDB } = require('../utils/dbParsers');
const { requireScope } = require('./../utils/scopeGuard');
const { NotFoundError } = require('../utils/errors');

/**
 * @typedef {Object} PersonModelConfig
 * @property {'athletes'|'opponents'} table - tabela no Postgres
 * @property {'athlete'|'opponent'} personType - valor de `person_type` em `fight_analyses`
 * @property {string} label - nome do model, usado no contexto do `requireScope` (ex.: 'Athlete')
 * @property {string} notFoundLabel - rótulo humano para o `NotFoundError` (ex.: 'Atleta')
 */

/**
 * @typedef {Object} PersonWriteData
 * @property {string} [name]
 * @property {string|null} [belt]
 * @property {number|null} [weight]
 * @property {number|null} [height]
 * @property {number|null} [age]
 * @property {string|null} [style]
 * @property {string|null} [strongAttacks]
 * @property {string|null} [weaknesses]
 * @property {string|null} [videoUrl]
 * @property {number|null} [cardio]
 * @property {Object} [technicalProfile]
 * @property {string|null} [technicalSummary]
 * @property {string|null} [technicalSummaryUpdatedAt]
 */

/**
 * @param {PersonModelConfig} config
 */
function createPersonModel({ table, personType, label, notFoundLabel }) {
  const Model = {
    /**
     * Busca todas as pessoas dentro do grupo permitido, com `creatorName` e
     * `analysesCount` agregados.
     * @param {string[]} allowedUserIds - IDs do grupo (tenant)
     */
    async getAll(allowedUserIds) {
      requireScope(allowedUserIds, `${label}.getAll`);

      const { data: rows, error } = await supabase
        .from(table)
        .select('*')
        .in('user_id', allowedUserIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (rows.length === 0) return [];

      const [creatorMap, countsMap] = await Promise.all([
        (async () => {
          /** @type {Record<string, string>} */
          const map = {};
          if (allowedUserIds.length > 1) {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, name')
              .in('id', allowedUserIds);
            if (usersData) usersData.forEach(u => { map[u.id] = u.name; });
          }
          return map;
        })(),
        (async () => {
          /** @type {Record<string, number>} */
          const map = {};
          // `person_id` é polimórfico: o mesmo UUID poderia, em tese, existir
          // nas duas tabelas. Filtrar por `person_type` conta só o que é desta.
          const { data: analysesCounts, error: countError } = await supabase
            .from('fight_analyses')
            .select('person_id')
            .in('person_id', rows.map(r => r.id))
            .eq('person_type', personType);
          if (analysesCounts && !countError) {
            analysesCounts.forEach(a => {
              map[a.person_id] = (map[a.person_id] || 0) + 1;
            });
          }
          return map;
        })()
      ]);

      return parseAthletesFromDB(rows.map(row => ({
        ...row,
        creator_name: creatorMap[row.user_id] || null,
        analyses_count: countsMap[row.id] || 0
      })));
    },

    /**
     * Busca uma pessoa por ID dentro do grupo permitido.
     * @param {string} id
     * @param {string|string[]} userIdOrAllowed - userId único OU array de allowedUserIds
     */
    async getById(id, userIdOrAllowed) {
      // Exigir o escopo (spec 007) fecha a variante silenciosa deste método:
      // chamado sem ele, filtrava `.in('user_id', [undefined])`, não achava
      // nada e devolvia `null` — indistinguível de "não existe".
      const ids = requireScope(userIdOrAllowed, `${label}.getById`);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .in('user_id', ids)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      if (!data) return null;
      return parseAthleteFromDB({ ...data, creator_name: null });
    },

    /**
     * Cria uma pessoa. Devolve o registro já em camelCase — antes desta spec
     * devolvia a linha crua do banco (snake_case), o único método do model
     * fora do contrato, e só não quebrava porque os chamadores liam apenas
     * `.id`.
     * @param {PersonWriteData & {name: string}} personData
     * @param {string} userId - dono do registro
     */
    async create(personData, userId) {
      requireScope(userId, `${label}.create`);
      const { data, error } = await supabase
        .from(table)
        .insert([{
          user_id: userId,
          name: personData.name,
          belt: personData.belt ?? null,
          weight: personData.weight ?? null,
          height: personData.height ?? null,
          age: personData.age ?? null,
          style: personData.style ?? null,
          strong_attacks: personData.strongAttacks ?? null,
          weaknesses: personData.weaknesses ?? null,
          video_url: personData.videoUrl ?? null,
          cardio: personData.cardio ?? null,
          technical_profile: personData.technicalProfile || {},
        }])
        .select()
        .single();

      if (error) throw error;
      return parseAthleteFromDB(data);
    },

    /**
     * Atualiza uma pessoa. Allow-list explícita de colunas: o controller pode
     * passar o corpo inteiro e nada fora desta lista chega ao banco
     * (defesa em profundidade, preservar ao refatorar).
     * @param {string} id
     * @param {PersonWriteData} personData
     * @param {string} userId - owner REAL do registro, não o requisitante
     */
    async update(id, personData, userId) {
      requireScope(userId, `${label}.update`);
      /** @type {Record<string, unknown>} */
      const updateData = {};

      if (personData.name !== undefined) updateData.name = personData.name;
      if (personData.belt !== undefined) updateData.belt = personData.belt;
      if (personData.weight !== undefined) updateData.weight = personData.weight;
      if (personData.height !== undefined) updateData.height = personData.height;
      if (personData.age !== undefined) updateData.age = personData.age;
      if (personData.style !== undefined) updateData.style = personData.style;
      if (personData.strongAttacks !== undefined) updateData.strong_attacks = personData.strongAttacks;
      if (personData.weaknesses !== undefined) updateData.weaknesses = personData.weaknesses;
      if (personData.videoUrl !== undefined) updateData.video_url = personData.videoUrl;
      if (personData.cardio !== undefined) updateData.cardio = personData.cardio;
      if (personData.technicalProfile !== undefined) updateData.technical_profile = personData.technicalProfile;
      if (personData.technicalSummary !== undefined) updateData.technical_summary = personData.technicalSummary;
      if (personData.technicalSummaryUpdatedAt !== undefined) updateData.technical_summary_updated_at = personData.technicalSummaryUpdatedAt;

      const { data, error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return parseAthleteFromDB(data);
    },

    /**
     * Hard delete. As `fight_analyses` da pessoa NÃO são apagadas em cascata
     * (não há FK) — dívida registrada em docs/modules/athletes-opponents.md.
     * @param {string} id
     * @param {string} userId - owner REAL do registro
     */
    async delete(id, userId) {
      requireScope(userId, `${label}.delete`);

      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return parseAthleteFromDB(data);
    },

    /**
     * Faz merge de `analysisData` no `technical_profile` existente.
     * @param {string} id
     * @param {Object} analysisData
     * @param {string|string[]} allowedUserIds
     */
    async updateTechnicalProfile(id, analysisData, allowedUserIds) {
      const person = await Model.getById(id, allowedUserIds);
      if (!person) {
        // LANÇA em vez de devolver null (spec 007): o chamador não tinha como
        // distinguir "não encontrei" de "atualizei".
        throw new NotFoundError(notFoundLabel);
      }

      // `getById` devolve camelCase; ler `technical_profile` aqui era o bug
      // que só existia na cópia de Athlete (spec 007).
      const updatedProfile = {
        ...person.technicalProfile,
        ...analysisData,
      };

      // A escrita usa o owner REAL do registro, não o escopo — permite ao
      // admin atualizar o perfil de um membro do grupo sem transferir a posse.
      return Model.update(id, { technicalProfile: updatedProfile }, person.userId);
    }
  };

  return Model;
}

module.exports = { createPersonModel };
