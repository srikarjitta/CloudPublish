const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tag name is required'],
      unique: true,
      trim: true,
      minlength: [1, 'Tag name must be at least 1 character long'],
      maxlength: [40, 'Tag name cannot exceed 40 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Tag slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Tag description cannot exceed 200 characters'],
    },
    articleCount: {
      type: Number,
      default: 0,
      min: [0, 'Article count cannot be negative'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for taxonomy lookups
TagSchema.index({ articleCount: -1, name: 1 });

module.exports = mongoose.model('Tag', TagSchema);
