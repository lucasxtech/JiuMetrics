// Controlador de Adversários
const Opponent = require('../models/Opponent');

/**
 * GET /api/opponents - Retorna todos os adversários
 */
exports.getAll = (req, res) => {
  const opponents = Opponent.getAll();
  res.json({
    success: true,
    data: opponents,
    count: opponents.length,
  });
};

/**
 * GET /api/opponents/:id - Retorna um adversário específico
 */
exports.getById = (req, res) => {
  const { id } = req.params;
  const opponent = Opponent.getById(id);

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
};

/**
 * POST /api/opponents - Cria um novo adversário
 */
exports.create = (req, res) => {
  const { name, age, weight, belt, style, strongAttacks, weaknesses, cardio, videoUrl } = req.body;

  // Validação básica
  if (!name || !age || !weight) {
    return res.status(400).json({
      success: false,
      error: 'Nome, idade e peso são obrigatórios',
    });
  }

  const newOpponent = Opponent.create({
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
};

/**
 * PUT /api/opponents/:id - Atualiza um adversário
 */
exports.update = (req, res) => {
  const { id } = req.params;
  const opponent = Opponent.getById(id);

  if (!opponent) {
    return res.status(404).json({
      success: false,
      error: 'Adversário não encontrado',
    });
  }

  const updatedOpponent = Opponent.update(id, req.body);

  res.json({
    success: true,
    message: 'Adversário atualizado com sucesso',
    data: updatedOpponent,
  });
};

/**
 * DELETE /api/opponents/:id - Deleta um adversário
 */
exports.delete = (req, res) => {
  const { id } = req.params;
  const opponent = Opponent.getById(id);

  if (!opponent) {
    return res.status(404).json({
      success: false,
      error: 'Adversário não encontrado',
    });
  }

  const deletedOpponent = Opponent.delete(id);

  res.json({
    success: true,
    message: 'Adversário deletado com sucesso',
    data: deletedOpponent,
  });
};
