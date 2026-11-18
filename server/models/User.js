const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Omit from default queries to prevent accidental leakage
    },
    role: {
      type: String,
      enum: {
        values: ['ADMIN', 'AUTHOR'],
        message: '{VALUE} is not a valid role. Allowed roles: ADMIN, AUTHOR',
      },
      default: 'AUTHOR',
    },
    profileImage: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for role-based administrative filtering
UserSchema.index({ role: 1, isActive: 1 });

/**
 * Pre-save middleware: Automatically hashes passwordHash if modified
 */
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compares candidate plaintext password against stored bcrypt hash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('passwordHash field was not selected in query');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Sanitizes user document for public/client JSON representations
 */
UserSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    profileImage: this.profileImage,
    bio: this.bio,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
