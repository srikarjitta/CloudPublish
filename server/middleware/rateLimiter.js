const rateLimit = require('express-rate-limit');

/**
 * Sensitive Authentication Endpoint Rate Limiter
 * Restricts brute-force password guessing and registration spam
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per windowMs per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

module.exports = {
  authLimiter,
};
