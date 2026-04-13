const mongoose = require('mongoose');
const AppError  = require('../utils/AppError');
const logger    = require('../utils/logger');

/* ── Helpers ──────────────────────────────────────────────────────────── */
const sendError = (res, { status, message, code, details, stack }) => {
  const body = { success: false, message, code: code || 'ERROR' };
  if (details) body.details = details;
  if (process.env.NODE_ENV === 'development' && stack) body.stack = stack;
  res.status(status).json(body);
};

/* ── Specific error converters ───────────────────────────────────────── */
const handleMongooseDuplicate = (err) => {
  const field   = Object.keys(err.keyValue || {})[0] || 'field';
  const value   = err.keyValue?.[field];
  return AppError.conflict(`${field} '${value}' is already taken`);
};

const handleMongooseValidation = (err) => {
  const details = Object.values(err.errors).map((e) => ({
    field:   e.path,
    message: e.message,
  }));
  const msg = details[0]?.message || 'Validation failed';
  const ae  = AppError.unprocessable(msg);
  ae.details = details;
  return ae;
};

const handleMongooseCastError = (err) => {
  return AppError.badRequest(`Invalid value '${err.value}' for field '${err.path}'`);
};

const handleJwtExpired   = () => AppError.unauthorized('Your session has expired. Please log in again.');
const handleJwtInvalid   = () => AppError.unauthorized('Invalid authentication token.');

/* ── Global error handler (register LAST in express) ────────────────── */
module.exports = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  let error = err;

  // Convert known library errors to AppError
  if (err.code === 11000)                            error = handleMongooseDuplicate(err);
  else if (err.name === 'ValidationError')           error = handleMongooseValidation(err);
  else if (err.name === 'CastError')                 error = handleMongooseCastError(err);
  else if (err.name === 'TokenExpiredError')         error = handleJwtExpired();
  else if (err.name === 'JsonWebTokenError')         error = handleJwtInvalid();
  else if (err.name === 'MulterError') {
    error = err.code === 'LIMIT_FILE_SIZE'
      ? AppError.badRequest('File is too large')
      : AppError.badRequest(err.message);
  }

  // Operational errors are safe to expose to client
  if (error instanceof AppError) {
    if (error.statusCode >= 500) logger.error(`[${error.statusCode}] ${error.message}`);
    return sendError(res, {
      status:  error.statusCode,
      message: error.message,
      code:    error.code,
      details: error.details,
    });
  }

  // Unknown / programming error — log full stack, hide details from client
  logger.error('Unhandled error:', err);
  sendError(res, {
    status:  500,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    stack:   err.stack,
  });
};
