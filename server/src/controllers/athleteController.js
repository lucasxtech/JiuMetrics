// Controlador de Atletas
const Athlete = require('../models/Athlete');

/**
 * GET /api/athletes - Retorna todos os atletas
 */
exports.getAll = (req, res) => {
  const athletes = Athlete.getAll();
  res.json({
    success: true,
    data: athletes,
    count: athletes.length,
  });
};

/**
 * GET /api/athletes/:id - Retorna um atleta específico
 */
exports.getById = (req, res) => {
  const { id } = req.params;
  const athlete = Athlete.getById(id);

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
};

/**
 * POST /api/athletes - Cria um novo atleta
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

  const newAthlete = Athlete.create({
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
};

/**
 * PUT /api/athletes/:id - Atualiza um atleta
 */
exports.update = (req, res) => {
  const { id } = req.params;
  const athlete = Athlete.getById(id);

  if (!athlete) {
    return res.status(404).json({
      success: false,
      error: 'Atleta não encontrado',
    });
  }

  const updatedAthlete = Athlete.update(id, req.body);

  res.json({
    success: true,
    message: 'Atleta atualizado com sucesso',
    data: updatedAthlete,
  });
};

/**
 * DELETE /api/athletes/:id - Deleta um atleta
 */
exports.delete = (req, res) => {
  const { id } = req.params;
  const athlete = Athlete.getById(id);

  if (!athlete) {
    return res.status(404).json({
      success: false,
      error: 'Atleta não encontrado',
    });
  }

  const deletedAthlete = Athlete.delete(id);

  res.json({
    success: true,
    message: 'Atleta deletado com sucesso',
    data: deletedAthlete,
  });
};
