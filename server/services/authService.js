const { User } = require('../models');
const { signToken } = require('../utils/jwt');

class AuthService {
  /**
   * Register a new user
   */
  async register({ name, email, password, role = 'AUTHOR' }) {
    if (!name || !email || !password) {
      const err = new Error('Name, email, and password are required');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    // First user registered automatically receives ADMIN role
    const totalUsers = await User.countDocuments();
    const assignedRole = totalUsers === 0 ? 'ADMIN' : (role === 'ADMIN' ? 'ADMIN' : 'AUTHOR');

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: password, // Pre-save hook hashes with bcrypt
      role: assignedRole,
      isActive: true,
    });

    await newUser.save();

    const token = signToken({
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });

    return {
      user: newUser.toSafeObject(),
      token,
    };
  }

  /**
   * Authenticate user credentials
   */
  async login({ email, password }) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Explicitly select passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('Account has been deactivated. Please contact an administrator.');
      err.statusCode = 403;
      throw err;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: user.toSafeObject(),
      token,
    };
  }

  /**
   * Retrieve active user profile
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      const err = new Error('User not found or account deactivated');
      err.statusCode = 404;
      throw err;
    }
    return user.toSafeObject();
  }
}

module.exports = new AuthService();
