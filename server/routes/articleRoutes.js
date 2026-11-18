const express = require('express');
const router = express.Router();

const articleController = require('../controllers/articleController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

// Public / Authenticated Article Feed Queries
router.get('/', optionalAuth, articleController.getArticles);
router.get('/:slug', optionalAuth, articleController.getArticleBySlug);

// Protected Author & Publishing Actions
router.post('/', requireAuth, articleController.createArticle);
router.put('/:id', requireAuth, articleController.updateArticle);
router.delete('/:id', requireAuth, articleController.deleteArticle);
router.patch('/:id/publish', requireAuth, articleController.publishArticle);
router.patch('/:id/unpublish', requireAuth, articleController.unpublishArticle);

module.exports = router;
