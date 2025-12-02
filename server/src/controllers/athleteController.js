// Controlador de Atletas
const Athlete = require('../models/Athlete');

/**
 * GET /api/athletes - Retorna todos os atletas
 */
exports.getAll = async (req, res) => {
  try {
    const athletes = await Athlete.getAll();
    res.json({
      success: true,
      data: athletes,
      count: athletes.length,
    });
  } catch (error) {
    console.error('Erro ao buscar atletas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar atletas',
      details: error.message,
    });
  }
};

/**
 * GET /api/athletes/:id - Retorna um atleta específico
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const athlete = await Athlete.getById(id);

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Atleta não encontrado',
      });
    }

    res.json({
      success: true,
      data: athlete,
    });
  } catch (error) {
    console.error('Erro ao buscar atleta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar atleta',
      details: error.message,
    });
  }
};

/**
 * POST /api/athletes - Cria um novo atleta
 */
exports.create = async (req, res) => {
  try {
    const { name, age, weight, belt, style, strongAttacks, weaknesses, cardio, videoUrl } = req.body;

    // Validação básica
    if (!name || !age || !weight) {
      return res.status(400).json({
        success: false,
        error: 'Nome, idade e peso são obrigatórios',
      });
    }

    const newAthlete = await Athlete.create({
      name,
    age: Number(age),
    weight: Number(weight),
    belt: belt || 'Branca',
    style: style || 'Guarda',
    strongAttacks: strongAttacks || '',
    weaknesses: weaknesses || '',
    cardio: Number(cardio) || 50,
    videoUrl: videoUrl || '',
  });

  res.status(201).json({
    success: true,
    message: 'Atleta criado com sucesso',
    data: newAthlete,
  });
  } catch (error) {
    console.error('Erro ao criar atleta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar atleta',
      details: error.message,
    });
  }
};

/**
 * PUT /api/athletes/:id - Atualiza um atleta
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const athlete = await Athlete.getById(id);

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Atleta não encontrado',
      });
    }

    const updatedAthlete = await Athlete.update(id, req.body);

    res.json({
      success: true,
      message: 'Atleta atualizado com sucesso',
      data: updatedAthlete,
    });
  } catch (error) {
    console.error('Erro ao atualizar atleta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar atleta',
      details: error.message,
    });
  }
};

/**
 * DELETE /api/athletes/:id - Deleta um atleta
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const athlete = await Athlete.getById(id);

    if (!athlete) {
      return res.status(404).json({
        success: false,
      error: 'Atleta não encontrado',
    });
  }

  const deletedAthlete = await Athlete.delete(id);

  res.json({
    success: true,
    message: 'Atleta deletado com sucesso',
    data: deletedAthlete,
  });
  } catch (error) {
    console.error('Erro ao deletar atleta:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar atleta',
      details: error.message,
    });
  }
};
