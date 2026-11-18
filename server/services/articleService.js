const { Article, Tag } = require('../models');
const { generateUniqueSlug } = require('../utils/slugify');
const { compileMarkdown } = require('./markdownService');

class ArticleService {
  /**
   * Helper to resolve tag names into Tag ObjectIds
   */
  async resolveTags(tagNames = []) {
    if (!Array.isArray(tagNames) || tagNames.length === 0) return [];

    const tagIds = [];
    for (let rawName of tagNames) {
      if (!rawName || typeof rawName !== 'string') continue;
      const name = rawName.trim();
      if (!name) continue;

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let tag = await Tag.findOne({ slug });
      if (!tag) {
        tag = await Tag.create({ name, slug });
      }
      tagIds.push(tag._id);
    }
    return tagIds;
  }

  /**
   * Create a new article
   */
  async createArticle(data, authorId) {
    const { title, content, excerpt, category, status = 'draft', tags = [], featuredImage } = data;

    if (!title || !title.trim()) {
      const err = new Error('Article title is required');
      err.statusCode = 400;
      throw err;
    }

    if (!content) {
      const err = new Error('Markdown content is required');
      err.statusCode = 400;
      throw err;
    }

    // Auto-generate guaranteed unique slug
    const slug = await generateUniqueSlug(Article, title.trim());

    // Pre-compile markdown to clean sanitized HTML
    const renderedHtml = compileMarkdown(content);

    // Resolve tag references
    const tagIds = await this.resolveTags(tags);

    const article = new Article({
      title: title.trim(),
      slug,
      excerpt: excerpt ? excerpt.trim() : '',
      content,
      renderedHtml,
      featuredImage: featuredImage || '',
      category: category ? category.trim() : 'General',
      status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
      author: authorId,
      tags: tagIds,
      publishedAt: status === 'published' ? new Date() : null,
    });

    await article.save();

    // Increment articleCount on tags
    if (tagIds.length > 0) {
      await Tag.updateMany({ _id: { $in: tagIds } }, { $inc: { articleCount: 1 } });
    }

    return Article.findById(article._id)
      .populate('author', 'name email role profileImage')
      .populate('tags', 'name slug');
  }

  /**
   * Update an existing article
   */
  async updateArticle(articleId, updates, user) {
    const article = await Article.findById(articleId);
    if (!article) {
      const err = new Error('Article not found');
      err.statusCode = 404;
      throw err;
    }

    // Verify ownership or ADMIN role
    const isOwner = article.author.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const err = new Error('Forbidden: You do not have permission to modify this article');
      err.statusCode = 403;
      throw err;
    }

    // Update title & slug if title changed
    if (updates.title && updates.title.trim() !== article.title) {
      article.title = updates.title.trim();
      article.slug = await generateUniqueSlug(Article, article.title, article._id);
    }

    // Re-compile HTML if content changed
    if (typeof updates.content === 'string') {
      article.content = updates.content;
      article.renderedHtml = compileMarkdown(updates.content);
    }

    if (updates.excerpt !== undefined) {
      article.excerpt = updates.excerpt ? updates.excerpt.trim() : '';
    }

    if (updates.category) {
      article.category = updates.category.trim();
    }

    if (updates.featuredImage !== undefined) {
      article.featuredImage = updates.featuredImage;
    }

    // Handle tag synchronization
    if (Array.isArray(updates.tags)) {
      const oldTagIds = article.tags.map((t) => t.toString());
      const newTagIds = await this.resolveTags(updates.tags);
      article.tags = newTagIds;

      const removed = oldTagIds.filter((t) => !newTagIds.map((n) => n.toString()).includes(t));
      const added = newTagIds.filter((n) => !oldTagIds.includes(n.toString()));

      if (removed.length > 0) {
        await Tag.updateMany({ _id: { $in: removed } }, { $inc: { articleCount: -1 } });
      }
      if (added.length > 0) {
        await Tag.updateMany({ _id: { $in: added } }, { $inc: { articleCount: 1 } });
      }
    }

    // Handle publication status changes
    if (updates.status && ['draft', 'published', 'archived'].includes(updates.status)) {
      if (updates.status === 'published' && article.status !== 'published') {
        article.publishedAt = new Date();
      }
      article.status = updates.status;
    }

    await article.save();

    return Article.findById(article._id)
      .populate('author', 'name email role profileImage')
      .populate('tags', 'name slug');
  }

  /**
   * Delete an article
   */
  async deleteArticle(articleId, user) {
    const article = await Article.findById(articleId);
    if (!article) {
      const err = new Error('Article not found');
      err.statusCode = 404;
      throw err;
    }

    const isOwner = article.author.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const err = new Error('Forbidden: You do not have permission to delete this article');
      err.statusCode = 403;
      throw err;
    }

    // Decrement tag article counts
    if (article.tags && article.tags.length > 0) {
      await Tag.updateMany({ _id: { $in: article.tags } }, { $inc: { articleCount: -1 } });
    }

    await Article.findByIdAndDelete(articleId);
    return { success: true, message: 'Article permanently deleted' };
  }

  /**
   * Retrieve paginated articles with filtering & privacy enforcement
   */
  async getArticles(query = {}, currentUser = null) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      tag,
      status,
      author,
      sort = '-createdAt',
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Privacy & Status Filtering
    if (!currentUser) {
      // Public unauthenticated: strictly published articles only
      filter.status = 'published';
    } else if (currentUser.role === 'ADMIN') {
      // Administrator: can filter by status or view all
      if (status) {
        filter.status = status;
      }
    } else {
      // Author role:
      if (status === 'draft') {
        filter.status = 'draft';
        filter.author = currentUser._id;
      } else if (status === 'published') {
        filter.status = 'published';
      } else if (status === 'archived') {
        filter.status = 'archived';
        filter.author = currentUser._id;
      } else {
        filter.$or = [
          { status: 'published' },
          { author: currentUser._id },
        ];
      }
    }

    if (category && category !== 'all' && category !== 'All') {
      filter.category = category;
    }

    if (author) {
      filter.author = author;
    }

    if (tag) {
      const tagDoc = await Tag.findOne({ slug: tag.toLowerCase() });
      if (tagDoc) {
        filter.tags = tagDoc._id;
      } else {
        return {
          data: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
        };
      }
    }

    // MongoDB Text Search
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .populate('author', 'name email role profileImage')
        .populate('tags', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Article.countDocuments(filter),
    ]);

    return {
      data: articles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  /**
   * Retrieve a single article by slug or ObjectId with access control
   */
  async getArticleBySlug(slugOrId, currentUser = null) {
    const isObjectId = slugOrId && slugOrId.length === 24 && /^[0-9a-fA-F]{24}$/.test(slugOrId);
    const query = isObjectId ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] } : { slug: slugOrId };

    const article = await Article.findOne(query)
      .populate('author', 'name email role profileImage')
      .populate('tags', 'name slug');

    if (!article) {
      const err = new Error('Article not found');
      err.statusCode = 404;
      throw err;
    }

    // Published articles are public
    if (article.status === 'published') {
      return article;
    }

    // Draft or archived articles require owner or admin
    if (!currentUser) {
      const err = new Error('Article not found');
      err.statusCode = 404;
      throw err;
    }

    const isOwner = article.author._id.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const err = new Error('Article not found');
      err.statusCode = 404;
      throw err;
    }

    return article;
  }
}

module.exports = new ArticleService();
