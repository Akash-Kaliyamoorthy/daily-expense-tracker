'use strict';

/**
 * Entry point: migrate the database -> create due recurring expenses ->
 * start the scheduler -> listen on process.env.PORT.
 */
const env = require('./src/config/env');
const { closePool } = require('./src/config/db');
const { migrate } = require('./src/db/migrate');
const { processDueRecurring, startRecurringScheduler } = require('./src/utils/recurring');
const app = require('./src/app');

const MIGRATION_ATTEMPTS = 5;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The database can take a few seconds to accept connections right after a deploy. */
async function migrateWithRetry() {
  for (let attempt = 1; attempt <= MIGRATION_ATTEMPTS; attempt += 1) {
    try {
      await migrate();
      console.log('Database migration complete.');
      return;
    } catch (err) {
      if (attempt === MIGRATION_ATTEMPTS) throw err;
      console.warn(
        `Migration attempt ${attempt}/${MIGRATION_ATTEMPTS} failed (${err.message}). Retrying...`,
      );
      await wait(attempt * 2000);
    }
  }
}

async function main() {
  await migrateWithRetry();

  const created = await processDueRecurring();
  if (created > 0) console.log(`Created ${created} due recurring expense(s).`);
  startRecurringScheduler();

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Daily Expense Tracker listening on port ${env.port} (${env.nodeEnv})`);
  });

  // Render sends SIGTERM on every deploy: finish in-flight requests, then exit.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await closePool().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
