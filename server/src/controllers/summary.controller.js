'use strict';

/**
 * GET /summary/:month - every dashboard number in a single call.
 * All arithmetic goes through utils/money.js; this file only fetches data.
 */
const db = require('../config/db');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const serialize = require('../utils/serialize');
const { computeBudgetSummary, toPaise, toRupees } = require('../utils/money');
const { monthRange, todayISO, upcomingDues, daysInMonth } = require('../utils/dates');
const { processDueRecurring } = require('../utils/recurring');
const { loadMonthData } = require('../utils/monthData');

const pct = (part, whole) => (whole > 0 ? Math.round((part * 1000) / whole) / 10 : null);

/** Spending per category for the month, with the user's limit and alert level. */
async function categoryBreakdown(userId, start, end) {
  const { rows } = await db.query(
    `SELECT c.id, COALESCE(c.name, 'Other') AS name, COALESCE(c.color, '#64748b') AS color,
            CASE WHEN c.user_id IS NULL THEN cl.monthly_limit ELSE c.monthly_limit END AS monthly_limit,
            SUM(e.amount) AS spent, COUNT(*)::int AS count
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
       LEFT JOIN category_limits cl ON cl.category_id = c.id AND cl.user_id = e.user_id
      WHERE e.user_id = $1 AND e.expense_date BETWEEN $2 AND $3
      GROUP BY c.id, c.name, c.color, c.user_id, cl.monthly_limit, c.monthly_limit
      ORDER BY SUM(e.amount) DESC, name`,
    [userId, start, end],
  );
  return rows.map((row) => {
    const spent = toPaise(row.spent);
    const limit = row.monthly_limit === null ? null : toPaise(row.monthly_limit);
    let limitStatus = null;
    if (limit !== null && limit > 0) {
      limitStatus = spent > limit ? 'exceeded' : spent * 100 >= limit * 80 ? 'near' : 'ok';
    } else if (limit === 0) {
      limitStatus = spent > 0 ? 'exceeded' : 'ok';
    }
    return {
      category_id: row.id,
      name: row.name,
      color: row.color,
      spent: toRupees(spent),
      count: row.count,
      monthly_limit: limit === null ? null : toRupees(limit),
      limit_status: limitStatus,
      _paise: spent,
    };
  });
}

/** Categories that have a limit but no spending yet still need a row on the limits panel. */
async function limitsWithoutSpending(userId, spentIds) {
  const { rows } = await db.query(
    `SELECT c.id, c.name, c.color,
            CASE WHEN c.user_id IS NULL THEN cl.monthly_limit ELSE c.monthly_limit END AS monthly_limit
       FROM categories c
       LEFT JOIN category_limits cl ON cl.category_id = c.id AND cl.user_id = $1
      WHERE (c.user_id IS NULL OR c.user_id = $1)
        AND CASE WHEN c.user_id IS NULL THEN cl.monthly_limit ELSE c.monthly_limit END IS NOT NULL
        AND NOT (c.id = ANY($2::bigint[]))`,
    [userId, spentIds],
  );
  return rows.map((row) => ({
    category_id: row.id,
    name: row.name,
    color: row.color,
    spent: 0,
    count: 0,
    monthly_limit: serialize.num(row.monthly_limit),
    limit_status: 'ok',
    _paise: 0,
  }));
}

const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { month } = req.params;
  const today = todayISO(env.timezone);
  const { start, end } = monthRange(month);

  // Lazily create any recurring entries that came due while the server slept.
  await processDueRecurring({ userId, today });

  const { budget, loans, fixed_expenses } = await loadMonthData(db, userId, month);

  const spentRes = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS spent_total,
            COALESCE(SUM(amount) FILTER (WHERE expense_date = $4), 0) AS spent_today,
            COUNT(*)::int AS expense_count
       FROM expenses
      WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3`,
    [userId, start, end, today],
  );
  const spentRow = spentRes.rows[0];

  const calc = computeBudgetSummary({
    month,
    today,
    salary: budget?.salary ?? 0,
    other_income: budget?.other_income ?? 0,
    savings_goal: budget?.savings_goal ?? 0,
    savings_goal_type: budget?.savings_goal_type ?? 'amount',
    loans,
    fixed_expenses,
    spent_total: spentRow.spent_total,
    spent_today: spentRow.spent_today,
  });

  // ---- charts & reports ----
  const dailyRes = await db.query(
    `SELECT expense_date, SUM(amount) AS total
       FROM expenses
      WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3
      GROUP BY expense_date`,
    [userId, start, end],
  );
  const byDate = new Map(dailyRes.rows.map((row) => [row.expense_date, toPaise(row.total)]));
  const days = daysInMonth(month);
  const daily = Array.from({ length: days }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { date, day: i + 1, total: toRupees(byDate.get(date) || 0) };
  });
  let highestDay = null;
  for (const [date, paise] of byDate) {
    if (!highestDay || paise > highestDay._paise) highestDay = { date, _paise: paise };
  }

  const categories = await categoryBreakdown(userId, start, end);
  const spentIds = categories.map((c) => c.category_id).filter((id) => id !== null);
  const limitOnly = await limitsWithoutSpending(userId, spentIds);
  const totalSpentPaise = categories.reduce((sum, c) => sum + c._paise, 0);
  const strip = ({ _paise, ...rest }) => rest;

  const categoryRows = categories.map((c) => ({
    ...strip(c),
    share_pct: pct(c._paise, totalSpentPaise),
  }));
  const limits = [...categories, ...limitOnly]
    .filter((c) => c.monthly_limit !== null)
    .map(strip)
    .sort((a, b) => b.spent / (b.monthly_limit || 1) - a.spent / (a.monthly_limit || 1));

  // ---- upcoming dues: only meaningful for the current month ----
  const todayMonth = today.slice(0, 7);
  let dues = [];
  if (month === todayMonth) {
    const items = [
      ...loans.map((l) => ({
        type: 'loan',
        name: l.name,
        amount: serialize.num(l.emi_amount),
        due_day: l.due_day,
      })),
      ...fixed_expenses.map((f) => ({
        type: 'fixed',
        name: f.name,
        amount: serialize.num(f.amount),
        due_day: f.due_day,
      })),
    ];
    dues = upcomingDues(items, today, 7);
  }

  // Limit alerts become banners next to the budget ones.
  const warnings = [...calc.warnings];
  for (const c of limits) {
    if (c.limit_status === 'exceeded') {
      warnings.push({
        code: 'CATEGORY_LIMIT_EXCEEDED',
        level: 'warning',
        message: `${c.name} spending is over its monthly limit.`,
      });
    }
  }

  return sendSuccess(res, {
    ...calc,
    warnings,
    has_budget: Boolean(budget),
    today,
    expense_count: spentRow.expense_count,
    average_per_day: toRupees(
      Math.round(totalSpentPaise / (calc.month_state === 'current' ? calc.day_of_month : days)),
    ),
    // Income vs expenses vs savings for the monthly summary page.
    overview: {
      income: calc.total_income,
      commitments: calc.total_commitments,
      variable_spending: calc.spent,
      total_outflow: toRupees(toPaise(calc.total_commitments) + toPaise(calc.spent)),
      savings_goal: calc.savings_goal,
      actual_savings: calc.remaining_balance,
    },
    categories: categoryRows,
    top_categories: categoryRows.slice(0, 5),
    category_limits: limits,
    daily,
    highest_day: highestDay ? { date: highestDay.date, total: toRupees(highestDay._paise) } : null,
    upcoming_dues: dues,
    loans: loans.map(serialize.loan),
    fixed_expenses: fixed_expenses.map(serialize.fixedExpense),
  });
});

module.exports = { getSummary };
