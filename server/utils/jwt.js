const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cloudpublish_default_dev_jwt_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = process.env.COOKIE_NAME || 'cp_token';

/**
 * Sign a new JWT token
 * @param {Object} payload - User claims to sign into the token
 * @returns {string} - Signed JWT
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify a JWT token string
 * @param {string} token - Raw JWT string
 * @returns {Object|null} - Decoded payload or null if invalid/expired
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Generates secure HTTP-only cookie configuration options
 * @returns {Object} - Express cookie options
 */
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  };
}

module.exports = {
  signToken,
  verifyToken,
  getCookieOptions,
  COOKIE_NAME,
};
