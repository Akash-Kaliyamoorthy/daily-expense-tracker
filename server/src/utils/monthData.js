'use strict';

/**
 * Shared data access for "one month's setup": the budget row plus its loans
 * and fixed expenses. `db` is anything with a `.query(text, params)` method:
 * the config/db module (pool) or a transaction client.
 */
const serialize = require('./serialize');
const { computeBudgetSummary, sumPaise, toRupees } = require('./money');
const { todayISO } = require('./dates');
const env = require('../config/env');

async function findBudget(db, userId, month) {
  const { rows } = await db.query(
    'SELECT * FROM monthly_budgets WHERE user_id = $1 AND month = $2',
    [userId, month],
  );
  return rows[0] || null;
}

/** Find-or-create the (empty) budget row for a month. Safe under concurrent calls. */
async function ensureBudget(db, userId, month) {
  const { rows } = await db.query(
    `INSERT INTO monthly_budgets (user_id, month) VALUES ($1, $2)
     ON CONFLICT (user_id, month) DO UPDATE SET month = EXCLUDED.month
     RETURNING *`,
    [userId, month],
  );
  return rows[0];
}

async function listLoans(db, budgetId) {
  const { rows } = await db.query(
    'SELECT * FROM loans WHERE budget_id = $1 ORDER BY due_day, lower(name), id',
    [budgetId],
  );
  return rows;
}

async function listFixedExpenses(db, budgetId) {
  const { rows } = await db.query(
    `SELECT f.*, c.name AS category_name, c.color AS category_color
       FROM fixed_expenses f
       LEFT JOIN categories c ON c.id = f.category_id
      WHERE f.budget_id = $1
      ORDER BY f.due_day, lower(f.name), f.id`,
    [budgetId],
  );
  return rows;
}

/** Budget row (or null) with its loans and fixed expenses (raw DB rows). */
async function loadMonthData(db, userId, month) {
  const budget = await findBudget(db, userId, month);
  if (!budget) return { budget: null, loans: [], fixed_expenses: [] };
  const loans = await listLoans(db, budget.id);
  const fixed_expenses = await listFixedExpenses(db, budget.id);
  return { budget, loans, fixed_expenses };
}

/** The API shape of a month's setup, with live calculations for the form. */
async function getMonthSetup(db, userId, month) {
  const { budget, loans, fixed_expenses } = await loadMonthData(db, userId, month);
  const calc = computeBudgetSummary({
    month,
    today: todayISO(env.timezone),
    salary: budget?.salary ?? 0,
    other_income: budget?.other_income ?? 0,
    savings_goal: budget?.savings_goal ?? 0,
    savings_goal_type: budget?.savings_goal_type ?? 'amount',
    loans,
    fixed_expenses,
    spent_total: 0,
    spent_today: 0,
  });

  return {
    month,
    exists: Boolean(budget),
    salary: budget ? serialize.num(budget.salary) : 0,
    other_income: budget ? serialize.num(budget.other_income) : 0,
    other_income_note: budget ? budget.other_income_note : null,
    savings_goal: budget ? serialize.num(budget.savings_goal) : 0,
    savings_goal_type: budget ? budget.savings_goal_type : 'amount',
    loans: loans.map(serialize.loan),
    fixed_expenses: fixed_expenses.map(serialize.fixedExpense),
    totals: {
      loans_total: toRupees(sumPaise(loans, 'emi_amount')),
      fixed_total: toRupees(sumPaise(fixed_expenses, 'amount')),
      total_commitments: calc.total_commitments,
      total_income: calc.total_income,
      savings_goal_amount: calc.savings_goal,
      disposable: calc.disposable,
      daily_budget: calc.daily_budget,
      days_in_month: calc.days_in_month,
      is_over_committed: calc.is_over_committed,
    },
  };
}

module.exports = {
  findBudget,
  ensureBudget,
  listLoans,
  listFixedExpenses,
  loadMonthData,
  getMonthSetup,
};
