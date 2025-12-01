// Controlador para Análises de Lutas
const FightAnalysis = require('../models/FightAnalysis');
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');

/**
 * GET /api/fight-analysis - Lista todas as análises
 */
exports.getAllAnalyses = async (req, res) => {
  try {
    const analyses = FightAnalysis.getAll();
    res.json({ success: true, data: analyses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fight-analysis/:id - Busca análise por ID
 */
exports.getAnalysisById = async (req, res) => {
  try {
    const analysis = FightAnalysis.getById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Análise não encontrada' });
    }
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/fight-analysis/person/:personId - Lista análises de um atleta/adversário
 */
exports.getAnalysesByPerson = async (req, res) => {
  try {
    const analyses = FightAnalysis.getByPersonId(req.params.personId);
    res.json({ success: true, data: analyses });
  } catch (error) {
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
      const athlete = Athlete.getById(personId);
      if (!athlete) {
        return res.status(404).json({ success: false, error: 'Atleta não encontrado' });
      }
    } else if (personType === 'opponent') {
      const opponent = Opponent.getById(personId);
      if (!opponent) {
        return res.status(404).json({ success: false, error: 'Adversário não encontrado' });
      }
    }

    // Processar dados dos gráficos para perfil técnico
    const technicalProfile = extractTechnicalProfile(charts);

    // Criar análise
    const analysis = FightAnalysis.create({
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
      Athlete.updateTechnicalProfile(personId, technicalProfile);
    } else if (personType === 'opponent') {
      Opponent.updateTechnicalProfile(personId, technicalProfile);
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
    const deleted = FightAnalysis.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Análise não encontrada' });
    }
    res.json({ success: true, message: 'Análise deletada', data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Extrai perfil técnico dos dados de gráficos da análise Gemini
 */
function extractTechnicalProfile(charts) {
  if (!charts || !Array.isArray(charts)) {
    return {};
  }

  const profile = {};

  charts.forEach((chart) => {
    const title = chart.title;
    const data = chart.data;

    if (!data || !Array.isArray(data)) return;

    // Criar objeto com valores
    const values = {};
    data.forEach((item) => {
      values[item.label] = item.value;
    });

    // Mapear para estrutura do perfil técnico
    if (title.includes('Personalidade')) {
      profile.personality = values;
    } else if (title.includes('Comportamento Inicial')) {
      profile.initialBehavior = values;
    } else if (title.includes('Jogo de Guarda')) {
      profile.guardGame = values;
    } else if (title.includes('Jogo de Passagem')) {
      profile.passingGame = values;
    }
  });

  return profile;
}

module.exports = exports;
