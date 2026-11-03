'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const serialize = require('../utils/serialize');
const { sumPaise, toRupees } = require('../utils/money');
const { findBudget, ensureBudget, listLoans } = require('../utils/monthData');

/** GET /loans?month=YYYY-MM */
const list = asyncHandler(async (req, res) => {
  const budget = await findBudget(db, req.user.id, req.query.month);
  const rows = budget ? await listLoans(db, budget.id) : [];
  return sendSuccess(res, {
    items: rows.map(serialize.loan),
    total: toRupees(sumPaise(rows, 'emi_amount')),
  });
});

/** POST /loans - attaches the loan to that month's budget (created empty if needed). */
const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { month, name, emi_amount, due_day, remaining_months, lender } = req.body;

  const budget = await ensureBudget(db, userId, month);
  const { rows } = await db.query(
    `INSERT INTO loans (user_id, budget_id, name, emi_amount, due_day, remaining_months, lender)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, budget.id, name, emi_amount, due_day, remaining_months ?? null, lender],
  );
  return sendCreated(res, serialize.loan(rows[0]), 'Loan added');
});

/** PUT /loans/:id */
const update = asyncHandler(async (req, res) => {
  const { name, emi_amount, due_day, remaining_months, lender } = req.body;
  const { rows } = await db.query(
    `UPDATE loans
        SET name = $1, emi_amount = $2, due_day = $3, remaining_months = $4, lender = $5
      WHERE id = $6 AND user_id = $7
      RETURNING *`,
    [name, emi_amount, due_day, remaining_months ?? null, lender, req.params.id, req.user.id],
  );
  if (!rows[0]) throw ApiError.notFound('Loan not found');
  return sendSuccess(res, serialize.loan(rows[0]), 'Loan updated');
});

/** DELETE /loans/:id */
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM loans WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (rowCount === 0) throw ApiError.notFound('Loan not found');
  return sendSuccess(res, null, 'Loan deleted');
});

module.exports = { list, create, update, remove };
