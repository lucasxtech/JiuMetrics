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
          technical_stats: currentData.technical_stats
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
        technical_stats: analysis.technical_stats
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
// 🐛 BUG ATIVO — `editedBy` é recebido e IGNORADO.
// Evidência DIRETA do defeito descrito na spec 007: esta função chama
// ProfileVersion.create com chaves snake_case (person_id, summary,
// change_description, created_by) enquanto create() desestrutura camelCase
// (personId, content, editedBy, userId). Todos os campos chegam undefined, o
// insert viola NOT NULL e o erro morre no catch abaixo.
// Quebrado desde 2026-01-16 (commit 2b13a64) — verificado na spec 002.
// NÃO prefixe com _ nem remova: o parâmetro precisa continuar visível até a
// spec 007 corrigir o contrato.
// eslint-disable-next-line no-unused-vars
async function saveProfileVersion({ personId, personType, userId, currentSummary, editedBy = 'user', editReason = 'Edição manual' }) {
  try {
    const existingVersions = await ProfileVersion.getByPersonId(personId, personType);
    
    // Se não tem versões, criar a original primeiro
    if (!existingVersions || existingVersions.length === 0) {
      await ProfileVersion.create({
        person_id: personId,
        person_type: personType,
        version_number: 1,
        summary: currentSummary,
        change_description: 'Versão original',
        created_by: userId
      });
      console.log('✅ Versão original do perfil criada');
      return null; // Não há versão nova a criar, só salvou a original
    }
    
    const nextVersion = existingVersions.length + 1;
    
    const version = await ProfileVersion.create({
      person_id: personId,
      person_type: personType,
      version_number: nextVersion,
      summary: currentSummary,
      change_description: editReason,
      created_by: userId
    });
    
    console.log(`✅ Versão ${nextVersion} do perfil criada`);
    return version;
  } catch (error) {
    console.warn('⚠️ Erro ao salvar versão do perfil:', error.message);
    return null;
  }
}

module.exports = {
  ensureOriginalVersion,
  createAnalysisVersion,
  saveProfileVersion
};
