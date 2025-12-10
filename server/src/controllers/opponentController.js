// Controlador de Adversários
const Opponent = require('../models/Opponent');

/**
 * Resposta padrão de erro
 */
const handleError = (res, operation, error) => {
  res.status(500).json({
    success: false,
    error: `Erro ao ${operation}`,
    details: error.message,
  });
};

/**
 * GET /api/opponents - Retorna todos os adversários
 */
exports.getAll = async (req, res) => {
  try {
    const opponents = await Opponent.getAll(req.userId);
    res.json({
      success: true,
      data: opponents,
      count: opponents.length,
    });
  } catch (error) {
    handleError(res, 'buscar adversários', error);
  }
};

/**
 * GET /api/opponents/:id - Retorna um adversário específico
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const opponent = await Opponent.getById(id, req.userId);

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
    handleError(res, 'buscar adversário', error);
  }
};

/**
 * POST /api/opponents - Cria um novo adversário
 */
exports.create = async (req, res) => {
  try {
    const { name, age, weight, belt, style, strongAttacks, weaknesses, cardio, videoUrl } = req.body;

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
    }, req.userId);

    res.status(201).json({
      success: true,
      message: 'Adversário criado com sucesso',
      data: newOpponent,
    });
  } catch (error) {
    handleError(res, 'criar adversário', error);
  }
};

/**
 * PUT /api/opponents/:id - Atualiza um adversário
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const opponent = await Opponent.getById(id, req.userId);

    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'Adversário não encontrado',
      });
    }

    const updatedOpponent = await Opponent.update(id, req.body, req.userId);

    res.json({
      success: true,
      message: 'Adversário atualizado com sucesso',
      data: updatedOpponent,
    });
  } catch (error) {
    handleError(res, 'atualizar adversário', error);
  }
};

/**
 * DELETE /api/opponents/:id - Deleta um adversário
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const opponent = await Opponent.getById(id, req.userId);

    if (!opponent) {
      return res.status(404).json({
        success: false,
        error: 'Adversário não encontrado',
      });
    }

    const deletedOpponent = await Opponent.delete(id, req.userId);

    res.json({
      success: true,
      message: 'Adversário deletado com sucesso',
      data: deletedOpponent,
    });
  } catch (error) {
    handleError(res, 'deletar adversário', error);
  }
};
