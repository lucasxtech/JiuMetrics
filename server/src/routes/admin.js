const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminMiddleware');
const userController = require('../controllers/userController');

// Rate limiter para rotas de admin — previne brute force e abuso
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,                  // máx 100 requests por IP por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' }
});

// All routes require authentication + admin role
router.use(adminLimiter);
router.use(authMiddleware);
router.use(adminMiddleware);

// User management
router.get('/users', userController.listUsers);
router.post('/users', userController.createUser);
router.patch('/users/:id', userController.updateUser);
router.patch('/users/:id/role', userController.changeRole);
router.delete('/users/:id', userController.deactivateUser);
router.delete('/users/:id/permanent', userController.deleteUser);
router.post('/users/:id/reactivate', userController.reactivateUser);

module.exports = router;
