'use strict';

/**
 * Authentication middleware + token helpers.
 *
 * The JWT travels in an httpOnly cookie (JavaScript on the page can't read it,
 * which blunts XSS token theft). `Authorization: Bearer <token>` is also
 * accepted so the API can be used from tools like Postman or a mobile app.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const JWT_ALGORITHM = 'HS256';

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: `${env.jwtExpiresDays}d`,
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction, // HTTPS only in production (Render serves HTTPS)
    sameSite: 'lax', // blocks cross-site POST/PUT/DELETE: basic CSRF defence
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(env.cookieName, token, { ...cookieOptions(), maxAge: env.cookieMaxAgeMs });
}

function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, cookieOptions());
}

function extractToken(req) {
  if (req.cookies && req.cookies[env.cookieName]) return req.cookies[env.cookieName];
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme && scheme.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * Requires a valid session. On success sets req.user = { id, name, email }.
 * The user is re-loaded from the DB on every request so a deleted account
 * stops working immediately.
 */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: [JWT_ALGORITHM] });
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please log in again.');
  }

  const { rows } = await query('SELECT id, name, email FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0]) throw ApiError.unauthorized('Account not found. Please log in again.');

  req.user = rows[0];
  next();
});

module.exports = { requireAuth, signToken, setAuthCookie, clearAuthCookie };
