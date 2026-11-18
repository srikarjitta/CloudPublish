const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Article slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Excerpt cannot exceed 300 characters'],
    },
    content: {
      type: String,
      required: [true, 'Article content (Markdown) is required'],
    },
    renderedHtml: {
      type: String,
      default: '',
    },
    featuredImage: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'archived'],
        message: '{VALUE} is not a valid article status. Allowed: draft, published, archived',
      },
      default: 'draft',
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Article author is required'],
      index: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
      index: true,
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    wordCount: {
      type: Number,
      default: 0,
      min: [0, 'Word count cannot be negative'],
    },
    readTimeMinutes: {
      type: Number,
      default: 1,
      min: [1, 'Read time must be at least 1 minute'],
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound and text indexes for search, filtering & feed retrieval
ArticleSchema.index({ status: 1, publishedAt: -1 });
ArticleSchema.index({ author: 1, status: 1, updatedAt: -1 });
ArticleSchema.index({ category: 1, status: 1 });
ArticleSchema.index({ tags: 1, status: 1 });
ArticleSchema.index(
  { title: 'text', excerpt: 'text', content: 'text' },
  { weights: { title: 10, excerpt: 5, content: 1 }, name: 'ArticleTextSearchIndex' }
);

/**
 * Pre-save calculations for wordCount, readTime, excerpt, and publication date
 */
ArticleSchema.pre('save', function (next) {
  // 1. Calculate wordCount & readTimeMinutes on content modification
  if (this.isModified('content') && this.content) {
    const plainWords = this.content.trim().split(/\s+/).filter(Boolean);
    this.wordCount = plainWords.length;
    this.readTimeMinutes = Math.max(1, Math.ceil(this.wordCount / 200));

    // Auto-derive clean excerpt if empty
    if (!this.excerpt) {
      const stripped = this.content
        .replace(/[#*`_~>[\]()-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      this.excerpt = stripped.slice(0, 150) + (stripped.length > 150 ? '...' : '');
    }
  }

  // 2. Manage publishedAt timestamp
  if (this.isModified('status')) {
    if (this.status === 'published' && !this.publishedAt) {
      this.publishedAt = new Date();
    }
  }

  next();
});

module.exports = mongoose.model('Article', ArticleSchema);
