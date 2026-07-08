const { logger } = require('./logger');

class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, _next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message
    });
  }
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Internal server error'
  });
}

module.exports = { errorHandler, AppError };
