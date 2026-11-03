'use strict';

/**
 * PostgreSQL connection pool.
 * Always use parameterized queries ($1, $2, ...) - never string-concatenate user input.
 */
const { Pool, types } = require('pg');
const env = require('./env');

// BIGINT / BIGSERIAL (ids, COUNT) come back as strings by default; our values
// are far below 2^53, so parse them to plain numbers.
types.setTypeParser(20, (value) => parseInt(value, 10));
// DATE -> keep as 'YYYY-MM-DD' text. The default JS Date conversion shifts
// days when the server timezone differs from the user's.
types.setTypeParser(1082, (value) => value);
// NUMERIC (1700) is intentionally left as a string so no precision is lost;
// utils/money.js converts it to integer paise for any arithmetic.

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  // An idle client errored (e.g. the DB restarted). Log it; the pool recovers.
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/** Run a single parameterized query. */
const query = (text, params) => pool.query(text, params);

/**
 * Run `fn(client)` inside a transaction. Commits on success, rolls back and
 * rethrows on any error.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

const closePool = () => pool.end();

module.exports = { pool, query, withTransaction, closePool };
