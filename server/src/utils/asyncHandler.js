'use strict';

/**
 * Wraps an async route handler so a rejected promise reaches the global error
 * handler instead of crashing the request (Express 4 doesn't do this itself).
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
