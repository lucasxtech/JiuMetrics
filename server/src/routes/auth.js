const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Rota de registro
router.post('/register', authController.register);

// Rota de login
router.post('/login', authController.login);

// Rota de validação de token (protegida)
router.get('/validate', authMiddleware, (req, res) => {
  // Se chegou aqui, o token é válido
  res.json({ 
    success: true, 
    userId: req.userId,
    message: 'Token válido' 
  });
});

module.exports = router;
