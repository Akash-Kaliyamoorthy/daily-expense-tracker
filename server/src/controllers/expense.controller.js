'use strict';

const db = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const serialize = require('../utils/serialize');
const { toPaise, toRupees } = require('../utils/money');
const { todayISO, nextOccurrence } = require('../utils/dates');
const { processDueRecurring } = require('../utils/recurring');
const { assertCategoryAccessible } = require('./category.controller');

const EXPENSE_SELECT = `
  SELECT e.*, c.name AS category_name, c.color AS category_color
    FROM expenses e
    LEFT JOIN categories c ON c.id = e.category_id`;

// Whitelisted ORDER BY clauses - user input never reaches the SQL text.
const SORT_SQL = {
  date_desc: 'e.expense_date DESC, e.id DESC',
  date_asc: 'e.expense_date ASC, e.id ASC',
  amount_desc: 'e.amount DESC, e.id DESC',
  amount_asc: 'e.amount ASC, e.id ASC',
};

async function findOne(userId, id) {
  const { rows } = await db.query(`${EXPENSE_SELECT} WHERE e.id = $1 AND e.user_id = $2`, [
    id,
    userId,
  ]);
  return rows[0] || null;
}

/** Escape LIKE wildcards so searching for "50%" matches literally. */
const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

/**
 * GET /expenses?from&to&category&method&q&page&limit&sort
 * Returns { items, page, limit, total, total_pages, total_amount }.
 */
const list = asyncHandler(async (req, res) => {
  const { from, to, category, method, q, page, limit, sort } = req.query;

  const where = ['e.user_id = $1'];
  const params = [req.user.id];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (from) add('e.expense_date >= ?', from);
  if (to) add('e.expense_date <= ?', to);
  if (category === 'none') where.push('e.category_id IS NULL');
  else if (category) add('e.category_id = ?', Number(category));
  if (method) add('e.payment_method = ?', method);
  if (q) add("e.note ILIKE ? ESCAPE '\\'", `%${escapeLike(q)}%`);

  const whereSql = where.join(' AND ');

  const totals = await db.query(
    `SELECT COUNT(*)::int AS total, COALESCE(SUM(e.amount), 0) AS total_amount
       FROM expenses e WHERE ${whereSql}`,
    params,
  );
  const total = totals.rows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const { rows } = await db.query(
    `${EXPENSE_SELECT}
      WHERE ${whereSql}
      ORDER BY ${SORT_SQL[sort]}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit],
  );

  return sendSuccess(res, {
    items: rows.map(serialize.expense),
    page,
    limit,
    total,
    total_pages: totalPages,
    total_amount: toRupees(toPaise(totals.rows[0].total_amount)),
  });
});

/** GET /expenses/:id */
const get = asyncHandler(async (req, res) => {
  const row = await findOne(req.user.id, req.params.id);
  if (!row) throw ApiError.notFound('Expense not found');
  return sendSuccess(res, serialize.expense(row));
});

/**
 * POST /expenses
 * With `recurring_frequency` it also stores a rule; this entry counts as the
 * first occurrence and the rule's next_date is the following one.
 */
const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const d = req.body;
  const date = d.expense_date || todayISO(env.timezone);
  await assertCategoryAccessible(db, userId, d.category_id);

  const id = await db.withTransaction(async (client) => {
    let recurringId = null;
    if (d.recurring_frequency) {
      const anchorDay = Number(date.slice(8, 10));
      const { rows } = await client.query(
        `INSERT INTO recurring_expenses
           (user_id, amount, category_id, payment_method, frequency, next_date, anchor_day, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          userId,
          d.amount,
          d.category_id,
          d.payment_method,
          d.recurring_frequency,
          nextOccurrence(d.recurring_frequency, date, anchorDay),
          anchorDay,
          d.note,
        ],
      );
      recurringId = rows[0].id;
    }
    const { rows } = await client.query(
      `INSERT INTO expenses
         (user_id, category_id, amount, expense_date, payment_method, note, recurring_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, d.category_id, d.amount, date, d.payment_method, d.note, recurringId],
    );
    return rows[0].id;
  });

  // A back-dated recurring entry may already have later occurrences due.
  if (d.recurring_frequency) await processDueRecurring({ userId });

  return sendCreated(res, serialize.expense(await findOne(userId, id)), 'Expense added');
});

/** PUT /expenses/:id */
const update = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const d = req.body;
  await assertCategoryAccessible(db, userId, d.category_id);

  const { rowCount } = await db.query(
    `UPDATE expenses
        SET amount = $1, expense_date = $2, category_id = $3, payment_method = $4, note = $5
      WHERE id = $6 AND user_id = $7`,
    [d.amount, d.expense_date, d.category_id, d.payment_method, d.note, req.params.id, userId],
  );
  if (rowCount === 0) throw ApiError.notFound('Expense not found');
  return sendSuccess(
    res,
    serialize.expense(await findOne(userId, req.params.id)),
    'Expense updated',
  );
});

/** DELETE /expenses/:id */
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (rowCount === 0) throw ApiError.notFound('Expense not found');
  return sendSuccess(res, null, 'Expense deleted');
});

// ---------------------------------------------------------------------------
// Recurring rules
// ---------------------------------------------------------------------------

const RECURRING_SELECT = `
  SELECT r.*, c.name AS category_name, c.color AS category_color
    FROM recurring_expenses r
    LEFT JOIN categories c ON c.id = r.category_id`;

/** GET /recurring - the user's rules. */
const listRecurring = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `${RECURRING_SELECT} WHERE r.user_id = $1 ORDER BY r.active DESC, r.next_date, r.id`,
    [req.user.id],
  );
  return sendSuccess(res, { items: rows.map(serialize.recurring) });
});

/** PATCH /recurring/:id - pause or resume. Resuming never back-fills the paused gap. */
const updateRecurring = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { active } = req.body;
  const { rows: found } = await db.query(
    'SELECT next_date, frequency, anchor_day FROM recurring_expenses WHERE id = $1 AND user_id = $2',
    [req.params.id, userId],
  );
  if (!found[0]) throw ApiError.notFound('Recurring expense not found');

  let nextDate = found[0].next_date;
  if (active) {
    const today = todayISO(env.timezone);
    while (nextDate < today) {
      nextDate = nextOccurrence(found[0].frequency, nextDate, found[0].anchor_day);
    }
  }
  await db.query('UPDATE recurring_expenses SET active = $1, next_date = $2 WHERE id = $3', [
    active,
    nextDate,
    req.params.id,
  ]);
  const { rows } = await db.query(`${RECURRING_SELECT} WHERE r.id = $1`, [req.params.id]);
  return sendSuccess(
    res,
    serialize.recurring(rows[0]),
    active ? 'Recurring expense resumed' : 'Recurring expense paused',
  );
});

/** DELETE /recurring/:id - stops the rule; expenses it already created are kept. */
const removeRecurring = asyncHandler(async (req, res) => {
  const { rowCount } = await db.query(
    'DELETE FROM recurring_expenses WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id],
  );
  if (rowCount === 0) throw ApiError.notFound('Recurring expense not found');
  return sendSuccess(res, null, 'Recurring expense deleted');
});

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  listRecurring,
  updateRecurring,
  removeRecurring,
};
