/**
 * Utilitário para gerenciamento de versões de análises e perfis
 */

const AnalysisVersion = require('../models/AnalysisVersion');
const ProfileVersion = require('../models/ProfileVersion');

/**
 * Garante que existe uma versão original da análise antes de criar novas versões
 *
 * O 3º parâmetro era `userId` e era **recebido e ignorado** — a evidência do
 * vazamento AZ-3. A spec 006 o transformou no escopo de posse, que agora
 * atravessa até o model e é obrigatório lá.
 *
 * @param {string} analysisId - ID da análise
 * @param {Object} currentData - Dados atuais da análise
 * @param {string|string[]} allowedUserIds - escopo de posse do ator
 * @returns {number} Número da próxima versão
 */
async function ensureOriginalVersion(analysisId, currentData, allowedUserIds) {
  try {
    const existingVersions = await AnalysisVersion.getByAnalysisId(analysisId, 'fight', allowedUserIds);

    if (!existingVersions || existingVersions.length === 0) {
      const versionData = {
        analysisId,
        analysisType: 'fight',
        versionNumber: 1,
        content: {
          summary: currentData.summary,
          charts: currentData.charts,
          // `currentData` vem de parseAnalysisFromDB, que produz camelCase.
          // Lia-se `technical_stats` aqui, sempre undefined — as versões
          // salvas perdiam as estatísticas técnicas (spec 007, defeito 4).
          technicalStats: currentData.technicalStats
        },
        editedBy: 'user',
        editReason: 'Versão original (análise de vídeo)',
        isCurrent: false,
        allowedUserIds
      };

      await AnalysisVersion.create(versionData);
      return 2; // Próxima versão será 2
    }

    return (existingVersions.length || 0) + 1;
  } catch (error) {
    console.error('❌ Erro ao garantir versão original:', error.message);
    console.error('Stack:', error.stack);
    throw error; // Propagar erro em vez de silenciar
  }
}

/**
 * Cria uma nova versão da análise
 * @param {Object} params - Parâmetros
 * @param {string} params.analysisId - ID da análise
 * @param {number} params.versionNumber - Número da versão
 * @param {Object} params.analysis - Dados da análise
 * @param {string} params.editReason - Razão da edição
 * @param {string|string[]} params.allowedUserIds - escopo de posse do ator
 * @returns {Object|null} Versão criada ou null
 */
async function createAnalysisVersion({ analysisId, versionNumber, analysis, editReason, allowedUserIds }) {
  try {
    const version = await AnalysisVersion.create({
      analysisId,
      analysisType: 'fight',
      versionNumber,
      content: {
        summary: analysis.summary,
        charts: analysis.charts,
        // idem: `analysis` vem de FightAnalysis.update → parseAnalysisFromDB
        technicalStats: analysis.technicalStats
      },
      editedBy: 'ai', // Edição aceita pela IA
      editReason,
      isCurrent: false,
      allowedUserIds
    });
    
    console.log(`✅ Versão ${versionNumber} da análise criada`);
    return version;
  } catch (error) {
    console.error('❌ Erro ao criar versão da análise:', error.message);
    throw error; // Propagar erro
  }
}

/**
 * Salva uma versão do perfil (atleta ou adversário)
 * @param {Object} params
 * @param {string} params.personId - ID da pessoa
 * @param {string} params.personType - Tipo ('athlete' ou 'opponent')
 * @param {string} params.userId - ID do usuário
 * @param {string} params.currentSummary - Resumo atual (será salvo como versão)
 * @param {string} params.editedBy - Quem editou ('user' ou 'ai')
 * @param {string} params.editReason - Motivo da edição
 * @returns {Object|null} Versão criada ou null
 */
// ✅ CORRIGIDO na spec 007 (decisão P5: corrigir, não remover da UI).
//
// Estava quebrado desde 2026-01-16 (commit 2b13a64): esta função chamava
// ProfileVersion.create com chaves snake_case (person_id, summary,
// change_description, created_by) enquanto create() desestrutura camelCase
// (personId, content, editedBy, userId). Todos os campos chegavam undefined,
// o insert violava os NOT NULL da migration 013 e o erro morria num
// console.warn + return null — a UI mostrava o histórico vazio e parecia
// "nunca editei".
//
// Duas mudanças além do contrato:
//  - o erro AGORA PROPAGA. Uma versão que não gravou não pode devolver 200.
//  - `versionNumber` deixou de ser passado: quem o calcula é o próprio
//    ProfileVersion.create (MAX + 1), e o valor daqui era ignorado.
async function saveProfileVersion({ personId, personType, userId, currentSummary, editedBy = 'user', editReason = 'Edição manual' }) {
  // Nada a versionar: a pessoa ainda não tinha resumo. NÃO é falha — é
  // ausência de conteúdo anterior, e `content` é NOT NULL na migration 013.
  // Este caminho é o comum na PRIMEIRA edição de um perfil, e é justamente
  // por isso que precisa ser explícito: sem ele, propagar o erro
  // transformaria a primeira edição de todo perfil num 500.
  if (!currentSummary) {
    console.log('ℹ️ Sem resumo anterior para versionar —', personType, personId);
    return null;
  }

  const existingVersions = await ProfileVersion.getByPersonId(personId, personType, userId);
  const isFirst = !existingVersions || existingVersions.length === 0;

  // `profile_versions` guarda os estados ANTERIORES; o valor vivo fica em
  // `athletes.technical_summary`. Por isso o que se grava aqui é o resumo
  // atual, antes de ser sobrescrito.
  const version = await ProfileVersion.create({
    personId,
    personType,
    userId,
    content: currentSummary,
    editedBy,
    editReason: isFirst ? 'Versão original' : editReason
  });

  console.log(`✅ Versão ${version.versionNumber} do perfil criada —`, personType, personId);
  return version;
}

module.exports = {
  ensureOriginalVersion,
  createAnalysisVersion,
  saveProfileVersion
};
