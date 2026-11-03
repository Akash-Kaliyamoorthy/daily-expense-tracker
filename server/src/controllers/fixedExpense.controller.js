'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const serialize = require('../utils/serialize');
const { sumPaise, toRupees } = require('../utils/money');
const { findBudget, ensureBudget, listFixedExpenses } = require('../utils/monthData');
const { assertCategoryAccessible } = require('./category.controller');

async function findOne(userId, id) {
  const { rows } = await db.query(
    `SELECT f.*, c.name AS category_name, c.color AS category_color
       FROM fixed_expenses f
       LEFT JOIN categories c ON c.id = f.category_id
      WHERE f.id = $1 AND f.user_id = $2`,
    [id, userId],
  );
  return rows[0] || null;
}

/** GET /fixed-expenses?month=YYYY-MM */
const list = asyncHandler(async (req, res) => {
  const budget = await findBudget(db, req.user.id, req.query.month);
  const rows = budget ? await listFixedExpenses(db, budget.id) : [];
  return sendSuccess(res, {
    items: rows.map(serialize.fixedExpense),
    total: toRupees(sumPaise(rows, 'amount')),
  });
});

/** POST /fixed-expenses */
const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { month, name, amount, category_id, due_day } = req.body;
  await assertCategoryAccessible(db, userId, category_id);

  const budget = await ensureBudget(db, userId, month);
  const { rows } = await db.query(
    `INSERT INTO fixed_expenses (user_id, budget_id, name, amount, category_id, due_day)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, budget.id, name, amount, category_id, due_day],
  );
  return sendCreated(
    res,
    serialize.fixedExpense(await findOne(userId, rows[0].id)),
    'Fixed expense added',
  );
});

/** PUT /fixed-expenses/:id */
const update = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, amount, category_id, due_day } = req.body;
  await assertCategoryAccessible(db, userId, category_id);

  const { rowCount } = await db.query(
    `UPDATE fixed_expenses
        SET name = $1, amount = $2, category_id = $3, due_day = $4
      WHERE id = $5 AND user_id = $6`,
    [name, amount, category_id, due_day, req.params.id, userId],
  );
  if (rowCount === 0) throw ApiError.notFound('Fixed expense not found');
  return sendSuccess(
    res,
    serialize.fixedExpense(await findOne(userId, req.params.id)),
    'Fixed expense updated',
  );
});

/** DELETE /fixed-expenses/:id */
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM fixed_expenses WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (rowCount === 0) throw ApiError.notFound('Fixed expense not found');
  return sendSuccess(res, null, 'Fixed expense deleted');
});

module.exports = { list, create, update, remove };
