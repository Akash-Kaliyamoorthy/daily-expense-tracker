'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

function buildLimiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: () => env.isTest, // don't throttle the automated test-suite
    handler: (_req, res) => res.status(429).json({ success: false, data: null, message }),
  });
}

/** General API protection: 300 requests / 15 min per IP. */
const apiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: 'Too many requests. Please slow down and try again shortly.',
});

/**
 * Strict limiter for register/login to slow down password guessing:
 * 20 FAILED attempts / 15 min per IP (successful logins are not counted).
 */
const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

module.exports = { apiLimiter, authLimiter };
