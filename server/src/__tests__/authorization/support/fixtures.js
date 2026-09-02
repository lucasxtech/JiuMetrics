/**
 * Fixtures de 2 tenants × 2 usuários (1 admin + 1 comum cada) com dados de
 * domínio completos, para a rede de testes de autorização da SPEC-004.
 *
 * R4 da spec: reutilizável pelas specs 005/006. Mantenha os nomes e o
 * formato de `seedRows` estáveis — specs futuras devem poder importar
 * `buildFixtures` sem reescrevê-la.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function id() {
  return crypto.randomUUID();
}

function buildTenant(label) {
  const now = new Date().toISOString();
  const adminId = id();
  const userId = id();

  const admin = {
    id: adminId,
    name: `Admin ${label}`,
    email: `admin.${label.toLowerCase()}@fixture.jiumetrics.test`,
    role: 'admin',
    is_active: true,
    tenant_id: adminId, // admin é raiz do próprio tenant
    token_version: 0,
    created_by: null,
    created_at: now,
  };

  const user = {
    id: userId,
    name: `Usuário ${label}`,
    email: `user.${label.toLowerCase()}@fixture.jiumetrics.test`,
    role: 'user',
    is_active: true,
    tenant_id: adminId, // mesmo grupo do admin
    token_version: 0,
    created_by: adminId,
    created_at: now,
  };

  const athlete = {
    id: id(),
    user_id: userId, // dono é o usuário comum, não o admin — prova B2/B4 de verdade
    name: `Atleta ${label}`,
    belt: 'Roxa',
    weight: 78,
    height: 178,
    age: 24,
    style: 'Guardeiro',
    strong_attacks: 'Triângulo',
    weaknesses: 'Passagem de guarda',
    video_url: '',
    cardio: 60,
    technical_profile: {},
    technical_summary: null,
    technical_summary_updated_at: null,
    created_at: now,
  };

  const opponent = {
    id: id(),
    user_id: userId,
    name: `Adversário ${label}`,
    belt: 'Roxa',
    weight: 82,
    height: 182,
    age: 27,
    style: 'Passador',
    strong_attacks: 'Passagem torreando',
    weaknesses: 'Cansa no terceiro round',
    video_url: '',
    cardio: 55,
    technical_profile: {},
    technical_summary: null,
    technical_summary_updated_at: null,
    created_at: now,
  };

  const fightAnalysis = {
    id: id(),
    person_id: athlete.id,
    person_type: 'athlete',
    user_id: userId,
    video_url: `https://youtube.com/watch?v=fixture-${label.toLowerCase()}`,
    charts: [],
    summary: `Resumo original do tenant ${label}`,
    technical_profile: '',
    technical_stats: null,
    frames_analyzed: 1,
    current_version: 1,
    is_edited: false,
    original_summary: null,
    original_charts: null,
    created_at: now,
  };

  const version = {
    id: id(),
    analysis_id: fightAnalysis.id,
    analysis_type: 'fight',
    version_number: 1,
    content: { summary: fightAnalysis.summary, charts: [], technical_stats: null },
    edited_by: 'user',
    edit_reason: 'Versão original (fixture)',
    is_current: true,
    chat_session_id: null,
    created_at: now,
  };

  const chatSession = {
    id: id(),
    user_id: userId,
    context_type: 'analysis',
    context_id: fightAnalysis.id,
    context_snapshot: { summary: fightAnalysis.summary },
    messages: [],
    title: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  // Dado de estratégia mínimo — não exercitado pelos 11 testes desta spec,
  // mas a spec exige fixtures reutilizáveis (R4) e o Scope pede o dado
  // presente em cada tenant.
  const tacticalAnalysis = {
    id: id(),
    user_id: userId,
    athlete_id: athlete.id,
    opponent_id: opponent.id,
    strategy: `Estratégia fixture do tenant ${label}`,
    created_at: now,
  };

  return { admin, user, athlete, opponent, fightAnalysis, version, chatSession, tacticalAnalysis };
}

function buildFixtures() {
  const tenantA = buildTenant('A');
  const tenantB = buildTenant('B');

  const seedRows = {
    users: [tenantA.admin, tenantA.user, tenantB.admin, tenantB.user],
    athletes: [tenantA.athlete, tenantB.athlete],
    opponents: [tenantA.opponent, tenantB.opponent],
    fight_analyses: [tenantA.fightAnalysis, tenantB.fightAnalysis],
    analysis_versions: [tenantA.version, tenantB.version],
    ai_chat_sessions: [tenantA.chatSession, tenantB.chatSession],
    tactical_analyses: [tenantA.tacticalAnalysis, tenantB.tacticalAnalysis],
  };

  return { tenantA, tenantB, seedRows };
}

/**
 * Emite um JWT no mesmo formato de `authController.js` (jwt.sign({ userId,
 * role, tokenVersion }, ...)), para autenticar como um dos usuários fixture.
 */
function tokenFor(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, tokenVersion: user.token_version },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function authHeader(user) {
  return `Bearer ${tokenFor(user)}`;
}

module.exports = { buildFixtures, tokenFor, authHeader };
