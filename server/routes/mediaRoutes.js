const express = require('express');
const router = express.Router();

const mediaController = require('../controllers/mediaController');
const upload = require('../middleware/uploadMiddleware');
const { requireAuth } = require('../middleware/authMiddleware');

// Upload single article media asset
router.post('/upload', requireAuth, upload.single('file'), mediaController.uploadFile);

module.exports = router;
