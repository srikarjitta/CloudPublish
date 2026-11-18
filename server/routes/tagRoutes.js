const express = require('express');
const router = express.Router();

const tagController = require('../controllers/tagController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public taxonomy query
router.get('/', tagController.getTags);

// Admin taxonomy management
router.post('/', requireAuth, requireRole('ADMIN'), tagController.createTag);
router.delete('/:id', requireAuth, requireRole('ADMIN'), tagController.deleteTag);

module.exports = router;
