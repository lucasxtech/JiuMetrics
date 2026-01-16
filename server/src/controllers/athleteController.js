// Controlador de Atletas
const Athlete = require('../models/Athlete');
const { handleError } = require('../utils/errorHandler');

/**
 * GET /api/athletes - Retorna todos os atletas
 */
exports.getAll = async (req, res) => {
  try {
    const athletes = await Athlete.getAll(req.userId);
    res.json({
      success: true,
      data: athletes,
      count: athletes.length,
    });
  } catch (error) {
    handleError(res, 'buscar atletas', error);
  }
};

/**
 * GET /api/athletes/:id - Retorna um atleta específico
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const athlete = await Athlete.getById(id, req.userId);

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
    handleError(res, 'buscar atleta', error);
  }
};

/**
 * POST /api/athletes - Cria um novo atleta
 */
exports.create = async (req, res) => {
  try {
    const { name, age, weight, belt, style, strongAttacks, weaknesses, cardio, videoUrl } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nome é obrigatório',
      });
    }

    const newAthlete = await Athlete.create({
      name,
      age: age ? Number(age) : 25,
      weight: weight ? Number(weight) : 75,
      belt: belt || 'Branca',
      style: style || 'Guarda',
      strongAttacks: strongAttacks || '',
      weaknesses: weaknesses || '',
      cardio: Number(cardio) || 50,
      videoUrl: videoUrl || '',
    }, req.userId);

    res.status(201).json({
      success: true,
      message: 'Atleta criado com sucesso',
      data: newAthlete,
    });
  } catch (error) {
    handleError(res, 'criar atleta', error);
  }
};

/**
 * PUT /api/athletes/:id - Atualiza um atleta
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const athlete = await Athlete.getById(id, req.userId);

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Atleta não encontrado',
      });
    }

    const updatedAthlete = await Athlete.update(id, req.body, req.userId);

    res.json({
      success: true,
      message: 'Atleta atualizado com sucesso',
      data: updatedAthlete,
    });
  } catch (error) {
    handleError(res, 'atualizar atleta', error);
  }
};

/**
 * DELETE /api/athletes/:id - Deleta um atleta
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const athlete = await Athlete.getById(id, req.userId);

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Atleta não encontrado',
      });
    }

    const deletedAthlete = await Athlete.delete(id, req.userId);

    res.json({
      success: true,
      message: 'Atleta deletado com sucesso',
      data: deletedAthlete,
    });
  } catch (error) {
    handleError(res, 'deletar atleta', error);
  }
};
