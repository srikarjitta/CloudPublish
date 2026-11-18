const { verifyToken, COOKIE_NAME } = require('../utils/jwt');
const { User } = require('../models');

/**
 * Authentication Middleware: Enforces valid JWT token
 */
async function requireAuth(req, res, next) {
  try {
    let token = null;

    // 1. Extract from HTTP-only cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    // 2. Extract from Authorization header (Bearer token)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to proceed.',
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
    }

    // Verify user exists and is active
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed',
      error: err.message,
    });
  }
}

/**
 * Optional Authentication: Attaches req.user if valid token present, otherwise proceeds
 */
async function optionalAuth(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
  } catch {
    // Proceed without error if unauthenticated
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
};
