'use strict';

const bcrypt = require('bcryptjs');
const env = require('../config/env');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const serialize = require('../utils/serialize');
const { signToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');

// Compared against when the email is unknown so login takes the same time
// whether or not the account exists (prevents user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.bcryptRounds);

const EMAIL_TAKEN = 'An account with this email already exists.';

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await db.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
  if (existing.rowCount > 0) throw ApiError.conflict(EMAIL_TAKEN);

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  let row;
  try {
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash],
    );
    row = result.rows[0];
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict(EMAIL_TAKEN); // lost a race
    throw err;
  }

  setAuthCookie(res, signToken(row.id));
  return sendCreated(res, { user: serialize.user(row) }, 'Account created');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await db.query(
    'SELECT id, name, email, password_hash FROM users WHERE lower(email) = lower($1)',
    [email],
  );
  const row = rows[0];
  const passwordOk = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !passwordOk) throw ApiError.unauthorized('Invalid email or password');

  setAuthCookie(res, signToken(row.id));
  return sendSuccess(res, { user: serialize.user(row) }, 'Logged in');
});

const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  return sendSuccess(res, null, 'Logged out');
});

const me = asyncHandler(async (req, res) => sendSuccess(res, { user: serialize.user(req.user) }));

module.exports = { register, login, logout, me };
