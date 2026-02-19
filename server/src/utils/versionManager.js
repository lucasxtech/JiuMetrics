/**
 * Utilitário para gerenciamento de versões de análises e perfis
 */

const AnalysisVersion = require('../models/AnalysisVersion');
const ProfileVersion = require('../models/ProfileVersion');

/**
 * Garante que existe uma versão original da análise antes de criar novas versões
 * @param {string} analysisId - ID da análise
 * @param {Object} currentData - Dados atuais da análise
 * @param {string} userId - ID do usuário
 */
async function ensureOriginalVersion(analysisId, currentData, userId) {
  try {
    const existingVersions = await AnalysisVersion.getByAnalysisId(analysisId);
    
    if (!existingVersions || existingVersions.length === 0) {
      await AnalysisVersion.create({
        analysis_id: analysisId,
        version_number: 1,
        charts: currentData.charts,
        summary: currentData.summary,
        technical_stats: currentData.technical_stats,
        change_description: 'Versão original (análise de vídeo)',
        created_by: userId
      });
      console.log('✅ Versão original da análise criada');
    }
  } catch (error) {
    console.warn('⚠️ Erro ao garantir versão original:', error.message);
  }
}

/**
 * Cria uma nova versão da análise
 * @param {string} analysisId - ID da análise
 * @param {Object} newData - Novos dados da análise
 * @param {string} changeDescription - Descrição da mudança
 * @param {string} userId - ID do usuário
 * @returns {Object|null} Versão criada ou null
 */
async function createAnalysisVersion(analysisId, newData, changeDescription, userId) {
  try {
    const existingVersions = await AnalysisVersion.getByAnalysisId(analysisId);
    const nextVersion = (existingVersions?.length || 0) + 1;
    
    const version = await AnalysisVersion.create({
      analysis_id: analysisId,
      version_number: nextVersion,
      charts: newData.charts,
      summary: newData.summary,
      technical_stats: newData.technical_stats,
      change_description: changeDescription,
      created_by: userId
    });
    
    console.log(`✅ Versão ${nextVersion} da análise criada`);
    return version;
  } catch (error) {
    console.warn('⚠️ Erro ao criar versão da análise:', error.message);
    return null;
  }
}

/**
 * Salva uma versão do perfil (atleta ou adversário)
 * @param {string} personId - ID da pessoa
 * @param {string} personType - Tipo ('athlete' ou 'opponent')
 * @param {string} previousSummary - Resumo anterior
 * @param {string} newSummary - Novo resumo
 * @param {string} changeDescription - Descrição da mudança
 * @param {string} userId - ID do usuário
 * @returns {Object|null} Versão criada ou null
 */
async function saveProfileVersion(personId, personType, previousSummary, newSummary, changeDescription, userId) {
  try {
    const existingVersions = await ProfileVersion.getByPersonId(personId, personType);
    
    // Se não tem versões, criar a original primeiro
    if (!existingVersions || existingVersions.length === 0) {
      await ProfileVersion.create({
        person_id: personId,
        person_type: personType,
        version_number: 1,
        summary: previousSummary,
        change_description: 'Versão original',
        created_by: userId
      });
    }
    
    const nextVersion = (existingVersions?.length || 0) + 2;
    
    const version = await ProfileVersion.create({
      person_id: personId,
      person_type: personType,
      version_number: nextVersion,
      summary: newSummary,
      change_description: changeDescription,
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
