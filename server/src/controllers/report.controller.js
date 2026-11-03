'use strict';

const db = require('../config/db');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { toCsv } = require('../utils/csv');
const { toPaise, toRupees, sumPaise, computeBudgetSummary } = require('../utils/money');
const { lastNMonths, monthRange, todayISO, currentMonth } = require('../utils/dates');

/**
 * GET /reports/trend?months=6 - month-over-month comparison, oldest first.
 * Each month: variable spending, commitments, income, and what was left.
 */
const trend = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const months = lastNMonths(currentMonth(env.timezone), req.query.months);
  const first = monthRange(months[0]).start;
  const last = monthRange(months[months.length - 1]).end;

  const [spentRes, budgetRes, loanRes, fixedRes] = await Promise.all([
    db.query(
      `SELECT to_char(expense_date, 'YYYY-MM') AS month, SUM(amount) AS spent
         FROM expenses
        WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3
        GROUP BY 1`,
      [userId, first, last],
    ),
    db.query('SELECT * FROM monthly_budgets WHERE user_id = $1 AND month = ANY($2)', [
      userId,
      months,
    ]),
    db.query(
      `SELECT b.month, l.emi_amount FROM loans l
         JOIN monthly_budgets b ON b.id = l.budget_id
        WHERE l.user_id = $1 AND b.month = ANY($2)`,
      [userId, months],
    ),
    db.query(
      `SELECT b.month, f.amount FROM fixed_expenses f
         JOIN monthly_budgets b ON b.id = f.budget_id
        WHERE f.user_id = $1 AND b.month = ANY($2)`,
      [userId, months],
    ),
  ]);

  const spentBy = new Map(spentRes.rows.map((r) => [r.month, r.spent]));
  const budgetBy = new Map(budgetRes.rows.map((r) => [r.month, r]));
  const today = todayISO(env.timezone);

  const items = months.map((month) => {
    const budget = budgetBy.get(month);
    const calc = computeBudgetSummary({
      month,
      today,
      salary: budget?.salary ?? 0,
      other_income: budget?.other_income ?? 0,
      savings_goal: budget?.savings_goal ?? 0,
      savings_goal_type: budget?.savings_goal_type ?? 'amount',
      loans: loanRes.rows.filter((r) => r.month === month),
      fixed_expenses: fixedRes.rows.filter((r) => r.month === month),
      spent_total: spentBy.get(month) ?? 0,
      spent_today: 0,
    });
    return {
      month,
      has_budget: Boolean(budget),
      income: calc.total_income,
      commitments: calc.total_commitments,
      spent: calc.spent,
      savings_goal: calc.savings_goal,
      remaining_balance: calc.remaining_balance,
      budget_status: calc.budget_status,
    };
  });

  const totalSpent = toRupees(
    sumPaise(
      items.map((i) => ({ v: toPaise(i.spent) })),
      'v',
    ),
  );
  return sendSuccess(res, {
    items,
    average_spent: toRupees(Math.round(toPaise(totalSpent) / items.length)),
  });
});

/** GET /export/csv?from=&to= - the user's expenses in a date range as a download. */
const exportCsv = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const { rows } = await db.query(
    `SELECT e.expense_date, e.amount, COALESCE(c.name, 'Other') AS category,
            e.payment_method, e.note,
            CASE WHEN e.recurring_id IS NULL THEN 'No' ELSE 'Yes' END AS recurring
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = $1 AND e.expense_date BETWEEN $2 AND $3
      ORDER BY e.expense_date, e.id`,
    [req.user.id, from, to],
  );

  const csv = toCsv(rows, [
    { key: 'expense_date', header: 'Date' },
    { key: 'amount', header: 'Amount (INR)' },
    { key: 'category', header: 'Category' },
    { key: 'payment_method', header: 'Payment Method' },
    { key: 'note', header: 'Note' },
    { key: 'recurring', header: 'Recurring' },
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="expenses_${from}_to_${to}.csv"`);
  res.send(csv);
});

module.exports = { trend, exportCsv };
