'use strict';

/**
 * Auto-migration: applies db/schema.sql (idempotent) and seeds default data.
 * Runs on every server boot, and can be run by hand with `npm run migrate`.
 *
 * A Postgres advisory lock makes sure two instances starting at the same time
 * (e.g. during a Render deploy) cannot run the migration concurrently.
 */
const fs = require('fs');
const path = require('path');
const { pool, closePool } = require('../config/db');
const { seedDefaultCategories } = require('./seed');

const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');
const MIGRATION_LOCK_KEY = 727_274_001; // arbitrary constant shared by all instances

async function migrate() {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    try {
      // Hide the harmless "already exists, skipping" notices.
      await client.query('SET client_min_messages TO WARNING');
      await client.query(sql);
      await seedDefaultCategories(client);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}

module.exports = { migrate };

// Allow `node src/db/migrate.js` / `npm run migrate`.
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Database migration complete.');
      return closePool();
    })
    .catch((err) => {
      console.error('Database migration failed:', err);
      process.exit(1);
    });
}
