const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Dashboard statistics (Admin views global metrics; Author views own metrics)
router.get('/dashboard', requireAuth, adminController.getDashboardStats);

// User accounts management (Strictly ADMIN only)
router.get('/users', requireAuth, requireRole('ADMIN'), adminController.getAllUsers);

module.exports = router;
