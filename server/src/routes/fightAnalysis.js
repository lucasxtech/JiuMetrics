// Rotas para Análises de Lutas
const express = require('express');
const router = express.Router();
const fightAnalysisController = require('../controllers/fightAnalysisController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// ⚠️ DEBUG TEMPORÁRIO - Buscar análises SEM filtro de usuário
router.get('/debug/all', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      total: data.length,
      withUserId: data.filter(a => a.user_id).length,
      withoutUserId: data.filter(a => !a.user_id).length,
      data: data.map(a => ({
        id: a.id,
        person_id: a.person_id,
        person_type: a.person_type,
        user_id: a.user_id,
        created_at: a.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar todas as análises
router.get('/', fightAnalysisController.getAllAnalyses);

// ⚠️ ROTAS ESPECÍFICAS DEVEM VIR ANTES DAS ROTAS DINÂMICAS
// Listar análises de uma pessoa (atleta ou adversário)
router.get('/person/:personId', fightAnalysisController.getAnalysesByPerson);

// Buscar análise por ID (deve vir depois de /person/:personId)
router.get('/:id', fightAnalysisController.getAnalysisById);

// Criar nova análise
router.post('/', fightAnalysisController.createAnalysis);

// Deletar análise
router.delete('/:id', fightAnalysisController.deleteAnalysis);

module.exports = router;
