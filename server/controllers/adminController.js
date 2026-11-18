const { Article, User, Tag } = require('../models');

class AdminController {
  /**
   * Retrieve real-time dashboard telemetry and aggregated CMS analytics
   */
  async getDashboardStats(req, res, next) {
    try {
      const isAuthorOnly = req.user.role === 'AUTHOR';
      const baseMatch = isAuthorOnly ? { author: req.user._id } : {};

      const [
        statusStats,
        wordStats,
        categoryStats,
        recentArticles,
        userCount,
        tagCount,
      ] = await Promise.all([
        // 1. Group articles by status
        Article.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // 2. Sum cumulative word count
        Article.aggregate([
          { $match: baseMatch },
          { $group: { _id: null, totalWords: { $sum: '$wordCount' } } },
        ]),

        // 3. Category distribution histogram
        Article.aggregate([
          { $match: baseMatch },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // 4. Recent 5 edited/published articles
        Article.find(baseMatch)
          .populate('author', 'name email role')
          .sort({ updatedAt: -1 })
          .limit(5)
          .lean(),

        // 5. Total users count (Admin only)
        isAuthorOnly ? Promise.resolve(0) : User.countDocuments(),

        // 6. Total tags count
        Tag.countDocuments(),
      ]);

      // Map status counts
      const counts = {
        total: 0,
        published: 0,
        draft: 0,
        archived: 0,
      };

      statusStats.forEach((s) => {
        if (counts[s._id] !== undefined) {
          counts[s._id] = s.count;
        }
        counts.total += s.count;
      });

      const totalWords = wordStats.length > 0 ? wordStats[0].totalWords : 0;

      res.status(200).json({
        success: true,
        data: {
          articles: counts,
          totalWords,
          categories: categoryStats.map((c) => ({
            category: c._id || 'Uncategorized',
            count: c.count,
          })),
          recentArticles,
          totalUsers: userCount,
          totalTags: tagCount,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve all platform user accounts (Admin Only)
   */
  async getAllUsers(req, res, next) {
    try {
      const users = await User.find()
        .select('-passwordHash')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
