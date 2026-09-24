const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const { changePasswordSchema } = require('../schemas/requests/users');

router.use(authLimiter);

// Rota de registro
router.post('/register', authController.register);

// Rota de login
router.post('/login', authController.login);

// Troca de senha do usuário autenticado (spec 014, R10)
router.post('/change-password', authMiddleware, validateBody(changePasswordSchema), authController.changePassword);

// Rota de validação de token (protegida)
router.get('/validate', authMiddleware, (req, res) => {
  // Se chegou aqui, o token é válido
  res.json({
    success: true,
    userId: req.userId,
    role: req.user.role,
    profile: req.user.profile,
    mustChangePassword: req.user.mustChangePassword,
    message: 'Token válido'
  });
});

module.exports = router;
