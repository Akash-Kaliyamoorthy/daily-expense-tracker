'use strict';

/**
 * Recurring expenses: turns active rules into real expense rows.
 *
 * Render's free tier sleeps, so a cron job can't be trusted. Instead this
 * runs with CATCH-UP logic: for each rule whose next_date has arrived, it
 * creates one expense per missed occurrence (while next_date <= today), then
 * advances next_date. It is called on boot, every few hours, and lazily when a
 * user opens their dashboard.
 *
 * Safe under concurrency: rows are locked with FOR UPDATE SKIP LOCKED, and a
 * unique index on (recurring_id, expense_date) makes double-inserts impossible.
 */
const env = require('../config/env');
const { withTransaction } = require('../config/db');
const { nextOccurrence, todayISO } = require('./dates');

// Upper bound per rule per run, so a daily rule left untouched for years
// cannot generate an unbounded burst of rows in one go.
const MAX_CATCHUP_PER_RULE = 400;
const SCHEDULE_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

/**
 * Create all due recurring expenses.
 * @param {{ userId?: number, today?: string }} [options] limit to one user / override "today"
 * @returns {Promise<number>} number of expense rows created
 */
async function processDueRecurring({ userId = null, today = todayISO(env.timezone) } = {}) {
  return withTransaction(async (client) => {
    const { rows: rules } = await client.query(
      `SELECT id, user_id, amount, category_id, payment_method, frequency,
              next_date, anchor_day, note
         FROM recurring_expenses
        WHERE active
          AND next_date <= $1::date
          AND ($2::bigint IS NULL OR user_id = $2)
        ORDER BY id
          FOR UPDATE SKIP LOCKED`,
      [today, userId],
    );

    let created = 0;
    for (const rule of rules) {
      let next = rule.next_date;
      let steps = 0;
      while (next <= today && steps < MAX_CATCHUP_PER_RULE) {
        const result = await client.query(
          `INSERT INTO expenses
             (user_id, category_id, amount, expense_date, payment_method, note, recurring_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (recurring_id, expense_date) WHERE recurring_id IS NOT NULL DO NOTHING`,
          [
            rule.user_id,
            rule.category_id,
            rule.amount,
            next,
            rule.payment_method,
            rule.note,
            rule.id,
          ],
        );
        created += result.rowCount;
        next = nextOccurrence(rule.frequency, next, rule.anchor_day);
        steps += 1;
      }
      await client.query('UPDATE recurring_expenses SET next_date = $1 WHERE id = $2', [
        next,
        rule.id,
      ]);
    }
    return created;
  });
}

/** Start the periodic background run. The timer never keeps the process alive. */
function startRecurringScheduler() {
  const run = () =>
    processDueRecurring().catch((err) => console.error('Recurring processor failed:', err.message));
  const timer = setInterval(run, SCHEDULE_INTERVAL_MS);
  timer.unref();
  return timer;
}

module.exports = { processDueRecurring, startRecurringScheduler, MAX_CATCHUP_PER_RULE };
