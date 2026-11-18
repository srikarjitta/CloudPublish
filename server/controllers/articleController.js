const articleService = require('../services/articleService');

class ArticleController {
  async getArticles(req, res, next) {
    try {
      const result = await articleService.getArticles(req.query, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getArticleBySlug(req, res, next) {
    try {
      const article = await articleService.getArticleBySlug(req.params.slug, req.user);
      res.status(200).json({
        success: true,
        data: article,
      });
    } catch (err) {
      next(err);
    }
  }

  async createArticle(req, res, next) {
    try {
      const article = await articleService.createArticle(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Article created successfully',
        data: article,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateArticle(req, res, next) {
    try {
      const article = await articleService.updateArticle(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: 'Article updated successfully',
        data: article,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteArticle(req, res, next) {
    try {
      const result = await articleService.deleteArticle(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async publishArticle(req, res, next) {
    try {
      const article = await articleService.updateArticle(
        req.params.id,
        { status: 'published' },
        req.user
      );
      res.status(200).json({
        success: true,
        message: 'Article published successfully',
        data: article,
      });
    } catch (err) {
      next(err);
    }
  }

  async unpublishArticle(req, res, next) {
    try {
      const article = await articleService.updateArticle(
        req.params.id,
        { status: 'draft' },
        req.user
      );
      res.status(200).json({
        success: true,
        message: 'Article moved back to drafts',
        data: article,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ArticleController();

