'use strict';

/**
 * Global error handler - the last middleware in the chain.
 * Always responds with { success: false, data: null, message [, errors] } and
 * NEVER leaks stack traces or SQL details in production.
 */
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/** Translate common PostgreSQL errors into friendly client errors. */
function fromPgError(err) {
  switch (err.code) {
    case '23505': // unique_violation
      return ApiError.conflict('That record already exists.');
    case '23503': // foreign_key_violation
      return ApiError.badRequest('A related record does not exist.');
    case '23514': // check_violation
      return ApiError.badRequest('One of the values is outside the allowed range.');
    case '23502': // not_null_violation
      return ApiError.badRequest('A required value is missing.');
    case '22P02': // invalid_text_representation
    case '22003': // numeric_value_out_of_range
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return ApiError.badRequest('One of the values has an invalid format.');
    default:
      return null;
  }
}

// Express requires the 4-argument signature to treat this as an error handler.
function errorHandler(err, _req, res, _next) {
  let apiError = null;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err && err.type === 'entity.parse.failed') {
    apiError = ApiError.badRequest('Request body is not valid JSON.');
  } else if (err && err.type === 'entity.too.large') {
    apiError = new ApiError(413, 'Request body is too large.');
  } else if (err && typeof err.code === 'string') {
    apiError = fromPgError(err);
  }

  if (apiError) {
    const body = { success: false, data: null, message: apiError.message };
    if (apiError.errors) body.errors = apiError.errors;
    return res.status(apiError.statusCode).json(body);
  }

  // Unexpected error: log everything server-side, reveal nothing to the client.
  if (!env.isTest) console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    data: null,
    message: env.isProduction ? 'Something went wrong on our side.' : err.message,
  });
}

module.exports = errorHandler;
