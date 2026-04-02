const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminMiddleware');
const userController = require('../controllers/userController');

// All routes require authentication + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// User management
router.get('/users', userController.listUsers);
router.post('/users', userController.createUser);
router.patch('/users/:id', userController.updateUser);
router.patch('/users/:id/role', userController.changeRole);
router.delete('/users/:id', userController.deactivateUser);
router.post('/users/:id/reactivate', userController.reactivateUser);

module.exports = router;
