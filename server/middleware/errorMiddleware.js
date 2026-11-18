/**
 * Centralized Error Handling Middleware
 */

/**
 * Handle 404 Unknown Routes
 */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global centralized error handler
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Invalid JSON payload from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload received';
  }

  // Handle Mongoose / MongoDB errors
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid database resource identifier: ${err.value}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {}).map((e) => e.message).join(', ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}`;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message,
    ...(!isProduction && { stack: err.stack }),
  });
}

module.exports = {
  notFound,
  errorHandler,
};
