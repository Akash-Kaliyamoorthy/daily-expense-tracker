'use strict';

const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const { findBudget, getMonthSetup } = require('../utils/monthData');

const MONTH_EXISTS = 'A budget already exists for this month. Update it instead.';

/** GET /budgets/:month - the month's setup (income, loans, fixed expenses, live totals). */
const get = asyncHandler(async (req, res) => {
  const setup = await getMonthSetup(db, req.user.id, req.params.month);
  return sendSuccess(res, setup);
});

/** POST /budgets/:month - create the month's income / savings setup. */
const create = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { month } = req.params;
  const d = req.body;

  if (await findBudget(db, userId, month)) throw ApiError.conflict(MONTH_EXISTS);

  try {
    await db.query(
      `INSERT INTO monthly_budgets
         (user_id, month, salary, other_income, other_income_note, savings_goal, savings_goal_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        month,
        d.salary,
        d.other_income,
        d.other_income_note,
        d.savings_goal,
        d.savings_goal_type,
      ],
    );
  } catch (err) {
    if (err.code === '23505') throw ApiError.conflict(MONTH_EXISTS);
    throw err;
  }
  return sendCreated(res, await getMonthSetup(db, userId, month), 'Monthly budget saved');
});

const UPDATABLE = [
  'salary',
  'other_income',
  'other_income_note',
  'savings_goal',
  'savings_goal_type',
];

/** PUT /budgets/:month - change any of the income / savings fields. */
const update = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { month } = req.params;
  const d = req.body;

  const existing = await findBudget(db, userId, month);
  if (!existing) throw ApiError.notFound('No budget for this month yet. Create it first.');

  // The validator can't see the stored values, so check the percent rule on the merged result.
  const type = d.savings_goal_type ?? existing.savings_goal_type;
  const goal = d.savings_goal ?? existing.savings_goal;
  if (type === 'percent' && Number(goal) > 100) {
    throw ApiError.badRequest('A percentage goal cannot be more than 100', [
      { in: 'body', field: 'savings_goal', message: 'A percentage goal cannot be more than 100' },
    ]);
  }

  const sets = [];
  const values = [];
  for (const column of UPDATABLE) {
    if (d[column] !== undefined) {
      values.push(d[column]);
      sets.push(`${column} = $${values.length}`); // column names come from the fixed list above
    }
  }
  values.push(existing.id);
  await db.query(
    `UPDATE monthly_budgets SET ${sets.join(', ')} WHERE id = $${values.length}`,
    values,
  );

  return sendSuccess(res, await getMonthSetup(db, userId, month), 'Monthly budget updated');
});

/**
 * POST /budgets/:month/copy-from/:prevMonth - one-click pre-fill.
 *  - Copies salary, savings goal, fixed expenses and loans.
 *  - other_income is NOT copied (bonuses / freelance rarely repeat).
 *  - A loan's remaining_months drops by one; a loan whose last EMI was in the
 *    source month (remaining_months <= 1) is not carried over.
 *  - Refuses if the target month already has loans or fixed expenses, so
 *    nothing is duplicated or silently overwritten.
 */
const copyFromPrevious = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { month, prevMonth } = req.params;

  const copied = await db.withTransaction(async (client) => {
    const source = await findBudget(client, userId, prevMonth);
    if (!source) throw ApiError.notFound(`No budget found for ${prevMonth} to copy from.`);

    const target = await findBudget(client, userId, month);
    if (target) {
      const { rows } = await client.query(
        `SELECT (SELECT COUNT(*) FROM loans WHERE budget_id = $1)
              + (SELECT COUNT(*) FROM fixed_expenses WHERE budget_id = $1) AS n`,
        [target.id],
      );
      if (rows[0].n > 0) {
        throw ApiError.conflict(
          `${month} already has loans or fixed expenses. Remove them first, or edit them directly.`,
        );
      }
    }

    const { rows: budgetRows } = await client.query(
      `INSERT INTO monthly_budgets
         (user_id, month, salary, other_income, other_income_note, savings_goal, savings_goal_type)
       VALUES ($1, $2, $3, 0, NULL, $4, $5)
       ON CONFLICT (user_id, month) DO UPDATE SET
         salary = EXCLUDED.salary, other_income = 0, other_income_note = NULL,
         savings_goal = EXCLUDED.savings_goal, savings_goal_type = EXCLUDED.savings_goal_type
       RETURNING id`,
      [userId, month, source.salary, source.savings_goal, source.savings_goal_type],
    );
    const targetId = budgetRows[0].id;

    const loansResult = await client.query(
      `INSERT INTO loans (user_id, budget_id, name, emi_amount, due_day, remaining_months, lender)
       SELECT user_id, $2, name, emi_amount, due_day,
              CASE WHEN remaining_months IS NULL THEN NULL ELSE remaining_months - 1 END, lender
         FROM loans
        WHERE budget_id = $1 AND (remaining_months IS NULL OR remaining_months > 1)`,
      [source.id, targetId],
    );
    const fixedResult = await client.query(
      `INSERT INTO fixed_expenses (user_id, budget_id, name, amount, category_id, due_day)
       SELECT user_id, $2, name, amount, category_id, due_day
         FROM fixed_expenses WHERE budget_id = $1`,
      [source.id, targetId],
    );
    const { rows: totalLoans } = await client.query(
      'SELECT COUNT(*) AS n FROM loans WHERE budget_id = $1',
      [source.id],
    );

    return {
      loans: loansResult.rowCount,
      fixed_expenses: fixedResult.rowCount,
      skipped_loans: totalLoans[0].n - loansResult.rowCount,
    };
  });

  const setup = await getMonthSetup(db, userId, month);
  return sendCreated(res, { ...setup, copied }, `Copied setup from ${prevMonth}`);
});

module.exports = { get, create, update, copyFromPrevious };
