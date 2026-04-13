/**
 * Operational error class.
 * Throw this for known, expected errors (validation failures,
 * not-found, unauthorized, etc.). The global error handler
 * distinguishes operational errors from programming bugs.
 */
class AppError extends Error {
  /**
   * @param {string}  message     - Human-readable message sent to client
   * @param {number}  statusCode  - HTTP status (default 500)
   * @param {string}  code        - Machine-readable error code
   * @param {Array}   details     - Optional validation details array
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.code       = code;
    this.details    = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  /* Factory helpers ──────────────────────────────────── */
  static badRequest(msg, code = 'BAD_REQUEST', details = null) {
    return new AppError(msg, 400, code, details);
  }
  static unauthorized(msg = 'Authentication required') {
    return new AppError(msg, 401, 'UNAUTHORIZED');
  }
  static forbidden(msg = 'You do not have permission') {
    return new AppError(msg, 403, 'FORBIDDEN');
  }
  static notFound(resource = 'Resource') {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
  }
  static conflict(msg, code = 'CONFLICT') {
    return new AppError(msg, 409, code);
  }
  static unprocessable(msg, details = null) {
    return new AppError(msg, 422, 'VALIDATION_ERROR', details);
  }
  static tooMany(msg = 'Too many requests') {
    return new AppError(msg, 429, 'RATE_LIMITED');
  }
  static planLimit(feature) {
    return new AppError(
      `Your current plan does not allow: ${feature}. Please upgrade.`,
      403,
      'PLAN_LIMIT_EXCEEDED'
    );
  }
}

module.exports = AppError;
