const express = require('express');
const router = express.Router();
const { isDBConnected } = require('../config/db');

/**
 * @route   GET /api/health
 * @desc    Backend and database health check
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbConnected = isDBConnected();

  if (dbConnected) {
    return res.status(200).json({
      success: true,
      message: 'CloudPublish backend is running',
      database: 'connected',
    });
  }

  return res.status(503).json({
    success: false,
    message: 'CloudPublish backend is running',
    database: 'disconnected',
  });
});

module.exports = router;
