const authService = require('../services/authService');
const { getCookieOptions, COOKIE_NAME } = require('../utils/jwt');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      const { user, token } = await authService.register({ name, email, password, role });

      res.cookie(COOKIE_NAME, token, getCookieOptions());
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login({ email, password });

      res.cookie(COOKIE_NAME, token, getCookieOptions());
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        path: '/',
      });
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        user: req.user.toSafeObject(),
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
