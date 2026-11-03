'use strict';

/**
 * An error that is safe to show to the client. Anything that is NOT an
 * ApiError is treated as an unexpected 500 by the global error handler.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} message    human-readable message (shown in toasts)
   * @param {Array<{field?: string, message: string}>} [errors] per-field details
   */
  constructor(statusCode, message, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message = 'Bad request', errors = null) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Please log in to continue') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to do that') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
