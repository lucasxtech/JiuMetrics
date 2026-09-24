const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminMiddleware');
const userController = require('../controllers/userController');
const { validateBody } = require('../middleware/validate');
const S = require('../schemas/requests/users');

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
router.post('/users', validateBody(S.createUserSchema), userController.createUser);
router.patch('/users/:id', validateBody(S.updateUserSchema), userController.updateUser);
router.patch('/users/:id/role', validateBody(S.changeRoleSchema), userController.changeRole);
router.patch('/users/:id/profile', validateBody(S.changeProfileSchema), userController.changeProfile);
router.patch('/users/:id/athlete', validateBody(S.linkAthleteSchema), userController.linkAthlete);
router.delete('/users/:id', userController.deactivateUser);
router.delete('/users/:id/permanent', validateBody(S.deleteUserSchema), userController.deleteUser);
router.post('/users/:id/reactivate', userController.reactivateUser);

module.exports = router;
