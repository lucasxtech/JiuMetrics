// Controlador de Adversários
const Opponent = require('../models/Opponent');

/**
 * GET /api/opponents - Retorna todos os adversários
 */
exports.getAll = async (req, res) => {
  try {
    const opponents = await Opponent.getAll();
    res.json({
      success: true,
      data: opponents,
      count: opponents.length,
    });
  } catch (error) {
    console.error('Erro ao buscar adversários:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar adversários',
      details: error.message,
    });
  }
};

/**
 * GET /api/opponents/:id - Retorna um adversário específico
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const opponent = await Opponent.getById(id);

    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'Adversário não encontrado',
      });
    }

    res.json({
      success: true,
      data: opponent,
    });
  } catch (error) {
    console.error('Erro ao buscar adversário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar adversário',
      details: error.message,
    });
  }
};

/**
 * POST /api/opponents - Cria um novo adversário
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

    const newOpponent = await Opponent.create({
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
      message: 'Adversário criado com sucesso',
      data: newOpponent,
    });
  } catch (error) {
    console.error('Erro ao criar adversário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar adversário',
      details: error.message,
    });
  }
};

/**
 * PUT /api/opponents/:id - Atualiza um adversário
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const opponent = await Opponent.getById(id);

    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'Adversário não encontrado',
      });
    }

    const updatedOpponent = await Opponent.update(id, req.body);

    res.json({
      success: true,
      message: 'Adversário atualizado com sucesso',
      data: updatedOpponent,
    });
  } catch (error) {
    console.error('Erro ao atualizar adversário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar adversário',
      details: error.message,
    });
  }
};

/**
 * DELETE /api/opponents/:id - Deleta um adversário
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const opponent = await Opponent.getById(id);

    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'Adversário não encontrado',
      });
    }

    const deletedOpponent = await Opponent.delete(id);

    res.json({
      success: true,
      message: 'Adversário deletado com sucesso',
      data: deletedOpponent,
    });
  } catch (error) {
    console.error('Erro ao deletar adversário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar adversário',
      details: error.message,
    });
  }
};
