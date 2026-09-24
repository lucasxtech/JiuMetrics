/**
 * Ponto único de decisão de autorização (SPEC-005).
 *
 * `actor` é um objeto simples `{ id, role, profile, tenantId }` — nunca o
 * `req` do Express. Este módulo não importa Express e nunca lê `req`; a
 * extração do ator a partir do request é responsabilidade do middleware de
 * auth (`middleware/auth.js`, que popula `req.actor`).
 *
 * `tenantId` existe no shape mas não é usado pela implementação atual —
 * `resolveScope` resolve o grupo a partir de `actor.id` via
 * `models/User.getGroupUserIds`, exatamente como o `getScopeIds` que este
 * módulo substitui. O campo fica reservado para as dimensões futuras
 * (relacionamento, escopo de campo — ver JIU_METRICS_REFACTORING_PLAN.md §6
 * e o ADR desta spec). O papel profissional, que era a outra dimensão
 * reservada aqui, entrou como `profile` na spec 014 (ver abaixo).
 *
 * Única dependência de domínio permitida: `models/User` (precisa compor o
 * grupo/tenant). Este módulo nunca importa controller nem outro model.
 */
const User = require('../models/User');

const PROFILES = ['atleta', 'professor', 'nutricionista', 'fisioterapeuta', 'preparador_fisico'];
const STAFF_PROFILES = ['professor', 'nutricionista', 'fisioterapeuta', 'preparador_fisico'];

/**
 * Devolve os `user_id` que o ator alcança:
 * - `role === 'admin'` OU `profile` em `STAFF_PROFILES`: todos os IDs do
 *   grupo (mesmo tenant) — spec 014, staff vê o tenant como o admin.
 * - qualquer outro caso (incluindo ausência de role/profile): apenas o
 *   próprio id.
 *
 * @param {{id: string, role?: string, profile?: string, tenantId?: string|null}} actor
 * @returns {Promise<string[]>}
 */
async function resolveScope(actor) {
  if (!actor || !actor.id) return [];
  if (actor.role === 'admin' || STAFF_PROFILES.includes(actor.profile)) {
    return User.getGroupUserIds(actor.id);
  }
  return [actor.id];
}

/**
 * Perfis de saúde/performance com regra própria em `training:write` — mais
 * restrita que `STAFF_PROFILES` (que inclui `professor`, sem acesso de
 * escrita a dados de treino/saúde de terceiros).
 */
const HEALTH_STAFF = ['nutricionista', 'fisioterapeuta', 'preparador_fisico'];

/**
 * Tabela de capacidades por ação (spec 014 §Autorização, R8) — a matriz é a
 * fonte de verdade; cada função aqui é a tradução literal de uma linha dela.
 *
 * Cada regra recebe `{ actor, resource, scope, isOwn, inScope }` (o contexto
 * comum montado por `can`) e devolve um boolean (ou `Promise<boolean>` —
 * `can` sempre dá `await` no retorno da regra):
 * - `isOwn`: o recurso é da própria conta (`resource.accountUserId === actor.id`).
 * - `inScope`: o dono/gestor do recurso (`resource.userId`) está no escopo
 *   do ator (`resolveScope`) — para `atleta`/`professor`-fora-de-staff isso
 *   é só o próprio id; para `role=admin` e `STAFF_PROFILES` é o tenant inteiro.
 *
 * `competition:team-event:write` é a única regra que não basta com
 * `inScope`: um `atleta` cria evento de equipe (recurso de tenant) para
 * qualquer colega, mas o escopo de um `atleta` é só `[id]` — por isso essa
 * regra sozinha faz sua própria consulta de tenant via
 * `User.getGroupUserIds`, em vez de usar o escopo padrão. Não generalize
 * esse padrão para as outras ações: o custo de uma consulta extra por
 * decisão é proposital só aqui.
 *
 * Ação não listada aqui é NEGADA — `can` devolve `false` sem lançar.
 *
 * @type {Object<string, (ctx: {actor: {id: string, role?: string, profile?: string, tenantId?: string|null}, resource: {userId?: string, accountUserId?: string}, scope: string[], isOwn: boolean, inScope: boolean}) => (boolean|Promise<boolean>)>}
 */
const CAPABILITIES = {
  'person:read': ({ inScope }) => inScope,
  'person:write': ({ inScope }) => inScope,
  'own-athlete:write': ({ isOwn }) => isOwn,
  'training:read': ({ actor, isOwn, inScope }) => isOwn || (STAFF_PROFILES.includes(actor.profile) && inScope),
  'training:write': ({ actor, isOwn, inScope }) => isOwn || (HEALTH_STAFF.includes(actor.profile) && inScope),
  'schedule:write': ({ actor, inScope }) => actor.profile === 'professor' && inScope,
  // `isOwn` sozinho superestimaria: daria 1 para o "próprio" recurso de
  // qualquer perfil (inclusive nutricionista/fisio/preparador), e a matriz
  // exige 0 para esses três mesmo no próprio recurso — só atleta e
  // professor escrevem competição, cada um por um caminho diferente
  // (atleta: a própria inscrição; professor: qualquer um no escopo).
  'competition:write': ({ actor, isOwn, inScope }) =>
    (actor.profile === 'atleta' && isOwn) || (actor.profile === 'professor' && inScope),
  'competition:team-event:write': async ({ actor, resource }) =>
    (actor.profile === 'atleta' || actor.profile === 'professor') &&
    (await User.getGroupUserIds(actor.id)).includes(resource.userId),
  'health:read': ({ actor, isOwn, inScope }) => isOwn || (STAFF_PROFILES.includes(actor.profile) && inScope),
  'health:write': ({ actor, isOwn, inScope }) => isOwn || (STAFF_PROFILES.includes(actor.profile) && inScope),
  'users:manage': ({ actor }) => actor.role === 'admin',
};

/**
 * Ponto único de decisão de autorização por ação/recurso (spec 014 R8).
 *
 * Resolve o escopo do ator (`resolveScope`) e monta o contexto comum
 * (`isOwn`, `inScope`) uma vez, depois consulta `CAPABILITIES[action]` e
 * aplica essa regra a esse contexto. Ação sem regra cadastrada, ou ator sem
 * `id`, é negada — nunca lança.
 *
 * @param {{id: string, role?: string, profile?: string, tenantId?: string|null}} actor
 * @param {string} action - chave de `CAPABILITIES`; ação desconhecida é negada
 * @param {{userId?: string, accountUserId?: string}} [resource] - recurso avaliado
 * @returns {Promise<boolean>}
 */
async function can(actor, action, resource = {}) {
  const rule = CAPABILITIES[action];
  if (!rule || !actor || !actor.id) return false;
  const scope = await resolveScope(actor);
  const isOwn = Boolean(resource.accountUserId) && resource.accountUserId === actor.id;
  const inScope = Boolean(resource.userId) && scope.includes(resource.userId);
  return Boolean(await rule({ actor, resource, scope, isOwn, inScope }));
}

/**
 * Assinatura estável para decisões de autorização por ação/recurso —
 * mantida para compatibilidade com a spec 005; desde a spec 014 (R8) é um
 * alias direto de `can` (nenhum chamador de produção dependia do
 * comportamento antigo "só escopo, ação ignorada" — verificado por grep).
 *
 * @param {{id: string, role?: string, profile?: string, tenantId?: string|null}} actor
 * @param {string} action - chave de `CAPABILITIES`
 * @param {{userId?: string, accountUserId?: string}} [resource]
 * @returns {Promise<boolean>}
 */
async function authorize(actor, action, resource) {
  return can(actor, action, resource);
}

module.exports = { resolveScope, authorize, can, CAPABILITIES, PROFILES, STAFF_PROFILES };
