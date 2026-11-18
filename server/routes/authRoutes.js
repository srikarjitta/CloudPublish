const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public authentication routes (rate-limited)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);

// Protected session route
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
