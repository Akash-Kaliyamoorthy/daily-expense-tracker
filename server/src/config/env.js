'use strict';

/**
 * Central, validated environment configuration.
 * Every other module reads settings from here, never from process.env directly.
 */
const path = require('path');
const dotenv = require('dotenv');

// Load the repo-root .env, then server/.env. Real environment variables
// (e.g. those set on Render) always win; dotenv never overrides them.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

// Tests TRUNCATE tables, so they must never fall back to the real DATABASE_URL.
const databaseUrl = isTest ? required('TEST_DATABASE_URL') : required('DATABASE_URL');

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 16) {
  throw new Error('JWT_SECRET must be at least 16 characters long.');
}
if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long in production.');
}

// "Today" depends on the user's timezone, but Render servers run in UTC.
const timezone = process.env.APP_TIMEZONE || 'Asia/Kolkata';
try {
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
} catch {
  throw new Error(`APP_TIMEZONE "${timezone}" is not a valid IANA time zone.`);
}

const jwtExpiresDays = Number(process.env.JWT_EXPIRES_DAYS) || 7;

const env = Object.freeze({
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,
  databaseUrl,
  // Render Postgres requires SSL. Override with DATABASE_SSL=false/true if needed.
  dbSsl: process.env.DATABASE_SSL ? process.env.DATABASE_SSL === 'true' : isProduction,
  jwtSecret,
  jwtExpiresDays,
  cookieName: 'det_token',
  cookieMaxAgeMs: jwtExpiresDays * 24 * 60 * 60 * 1000,
  // Comma-separated list of allowed browser origins for CORS.
  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  timezone,
  bcryptRounds: isTest ? 4 : 12,
});

module.exports = env;
