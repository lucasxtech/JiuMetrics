// Controlador para Análises de Lutas
const FightAnalysis = require('../models/FightAnalysis');
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const { extractTechnicalProfile } = require('../utils/profileUtils');

/**
 * GET /api/fight-analysis - Lista todas as análises
 */
exports.getAllAnalyses = async (req, res) => {
  try {
    const analyses = await FightAnalysis.getAll();
    res.json({ success: true, data: analyses });
  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fight-analysis/:id - Busca análise por ID
 */
exports.getAnalysisById = async (req, res) => {
  try {
    const analysis = await FightAnalysis.getById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Análise não encontrada' });
    }
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Erro ao buscar análise:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fight-analysis/person/:personId - Lista análises de um atleta/adversário
 */
exports.getAnalysesByPerson = async (req, res) => {
  try {
    const analyses = await FightAnalysis.getByPersonId(req.params.personId);
    res.json({ success: true, data: analyses });
  } catch (error) {
    console.error('Erro ao buscar análises da pessoa:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/fight-analysis - Cria nova análise (após análise de vídeo)
 */
exports.createAnalysis = async (req, res) => {
  try {
    const { personId, personType, videoUrl, videoName, charts, summary, framesAnalyzed } = req.body;

    if (!personId || !personType) {
      return res.status(400).json({
        success: false,
        error: 'personId e personType são obrigatórios',
      });
    }

    // Validar se pessoa existe
    if (personType === 'athlete') {
      const athlete = await Athlete.getById(personId);
      if (!athlete) {
        return res.status(404).json({ success: false, error: 'Atleta não encontrado' });
      }
    } else if (personType === 'opponent') {
      const opponent = await Opponent.getById(personId);
      if (!opponent) {
        return res.status(404).json({ success: false, error: 'Adversário não encontrado' });
      }
    }

    // Processar dados dos gráficos para perfil técnico
    const technicalProfile = extractTechnicalProfile(charts);

    // Criar análise
    const analysis = await FightAnalysis.create({
      personId,
      personType,
      videoUrl,
      videoName,
      charts,
      summary,
      technicalProfile,
      framesAnalyzed,
    });

    // Atualizar perfil técnico da pessoa
    if (personType === 'athlete') {
      await Athlete.updateTechnicalProfile(personId, technicalProfile);
    } else if (personType === 'opponent') {
      await Opponent.updateTechnicalProfile(personId, technicalProfile);
    }

    res.status(201).json({
      success: true,
      message: 'Análise criada e perfil técnico atualizado',
      data: analysis,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/fight-analysis/:id - Deleta uma análise
 */
exports.deleteAnalysis = async (req, res) => {
  try {
    const deleted = await FightAnalysis.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Análise não encontrada' });
    }
    res.json({ success: true, message: 'Análise deletada', data: deleted });
  } catch (error) {
    console.error('Erro ao deletar análise:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = exports;

