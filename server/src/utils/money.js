'use strict';

/**
 * money.js - the ONE place where all money math lives.
 *
 * Rules:
 *  - Pure module: no DB, no I/O, no globals. Easy to unit test.
 *  - Amounts are converted to INTEGER PAISE (1 rupee = 100 paise) before any
 *    arithmetic, so binary floating point can never produce 0.1 + 0.2 errors.
 *  - The database stores NUMERIC(12,2); `pg` hands those back as strings like
 *    "1234.50", which `toPaise` understands.
 */

const { daysInMonth } = require('./dates');

/** NUMERIC(12,2) maximum, in paise: 9,999,999,999.99 rupees. */
const MAX_PAISE = 999_999_999_999;

/**
 * Strictly parse user-supplied money (non-negative, at most 2 decimals) into
 * integer paise. Returns null when the input is not a valid amount.
 */
function parsePaiseStrict(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    value = String(value);
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
}

/**
 * Lenient conversion of a DB value (string / number / null) to integer paise.
 * Accepts negatives and rounds half-up if more than 2 decimals are present.
 */
function toPaise(value) {
  if (value === null || value === undefined || value === '') return 0;
  const text = typeof value === 'number' ? value.toFixed(2) : String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new TypeError(`Invalid money value: ${value}`);
  const fraction = (match[3] || '').padEnd(3, '0');
  let paise = Number(match[2]) * 100 + Number(fraction.slice(0, 2));
  if (Number(fraction[2]) >= 5) paise += 1;
  return match[1] === '-' ? -paise : paise;
}

/** Integer paise -> exact 2-decimal string, e.g. 123450 -> "1234.50". */
function fromPaise(paise) {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Integer paise -> rupees as a plain number (for JSON responses / charts). */
const toRupees = (paise) => paise / 100;

/** Sum `key` across a list of rows (DB strings) and return integer paise. */
function sumPaise(items, key) {
  return (items || []).reduce((total, item) => total + toPaise(item[key]), 0);
}

/** `percent` % of an amount in paise, rounded to the nearest paisa. */
const percentOfPaise = (paise, percent) => Math.round((paise * Number(percent)) / 100);

/** Savings goal in paise. A 'percent' goal is a percentage of the salary. */
function savingsGoalPaise({ salaryPaise, goal, type }) {
  return type === 'percent' ? percentOfPaise(salaryPaise, goal) : toPaise(goal);
}

/**
 * Where `today` sits relative to `month`.
 *  - past:    whole month is over      -> daysLeft 0
 *  - current: counts today as a day left -> daysLeft = days - dayOfMonth + 1
 *  - future:  month hasn't started      -> daysLeft = all days
 */
function monthPosition(month, today) {
  const days = daysInMonth(month);
  const todayMonth = today.slice(0, 7);
  if (month < todayMonth) return { state: 'past', days, dayOfMonth: days, daysLeft: 0 };
  if (month > todayMonth) return { state: 'future', days, dayOfMonth: 0, daysLeft: days };
  const dayOfMonth = Number(today.slice(8, 10));
  return { state: 'current', days, dayOfMonth, daysLeft: days - dayOfMonth + 1 };
}

/** green < 70% used, amber 70-100%, red over budget. */
function budgetStatus(spentPaise, disposablePaise) {
  if (disposablePaise <= 0) return spentPaise > 0 ? 'red' : 'green';
  const ratio = spentPaise / disposablePaise;
  if (ratio > 1) return 'red';
  if (ratio >= 0.7) return 'amber';
  return 'green';
}

/**
 * Compute every dashboard number for one month.
 *
 * Inputs are DB-style values (NUMERIC strings or numbers):
 *   month 'YYYY-MM', today 'YYYY-MM-DD', salary, other_income, savings_goal,
 *   savings_goal_type ('amount'|'percent'), loans [{emi_amount}],
 *   fixed_expenses [{amount}], spent_total, spent_today.
 *
 * Formulas (all in integer paise):
 *   total_income         = salary + other_income
 *   total_commitments    = sum(EMIs) + sum(fixed expenses)
 *   disposable           = total_income - total_commitments - savings_goal   (may be negative)
 *   daily_budget         = disposable / days_in_month                        (0 if disposable <= 0)
 *   remaining_daily      = (disposable - spent_before_today) / days_left     (current month)
 *   remaining_balance    = total_income - total_commitments - spent_total    (cash still in hand)
 *   remaining_disposable = disposable - spent_total
 */
function computeBudgetSummary(input) {
  const { month, today } = input;
  const salary = toPaise(input.salary);
  const otherIncome = toPaise(input.other_income);
  const loansTotal = sumPaise(input.loans, 'emi_amount');
  const fixedTotal = sumPaise(input.fixed_expenses, 'amount');
  const spentTotal = toPaise(input.spent_total);
  const spentToday = toPaise(input.spent_today);

  const totalIncome = salary + otherIncome;
  const commitments = loansTotal + fixedTotal;
  const savingsGoal = savingsGoalPaise({
    salaryPaise: salary,
    goal: input.savings_goal,
    type: input.savings_goal_type,
  });

  const disposable = totalIncome - commitments - savingsGoal;
  const pos = monthPosition(month, today);
  const dailyBudget = disposable > 0 ? Math.round(disposable / pos.days) : 0;

  // Daily allowance that adapts to what has already been spent.
  let remainingDailyBudget;
  if (pos.state === 'current') {
    const availableToday = disposable - (spentTotal - spentToday); // before today's spending
    remainingDailyBudget = availableToday > 0 ? Math.round(availableToday / pos.daysLeft) : 0;
  } else if (pos.state === 'future') {
    remainingDailyBudget = dailyBudget;
  } else {
    remainingDailyBudget = 0;
  }

  const remainingDisposable = disposable - spentTotal;
  const remainingBalance = totalIncome - commitments - spentTotal;
  const usedPct = disposable > 0 ? Math.round((spentTotal * 1000) / disposable) / 10 : null;

  // Savings still "protected": how much of the goal the unspent money covers.
  const savingsSecured = Math.min(savingsGoal, Math.max(0, remainingBalance));
  const savingsProgressPct =
    savingsGoal > 0 ? Math.round((savingsSecured * 100) / savingsGoal) : null;

  // ---- Warning banners (server decides; client just renders) ----
  const warnings = [];
  if (totalIncome === 0) {
    warnings.push({
      code: 'NO_INCOME',
      level: 'info',
      message: 'Set your salary for this month to see your daily budget.',
    });
  } else {
    if (disposable < 0) {
      warnings.push({
        code: 'OVER_COMMITTED',
        level: 'danger',
        message: 'Your commitments and savings goal are more than your income this month.',
      });
    }
    const exceeded = disposable > 0 ? spentTotal > disposable : spentTotal > 0;
    if (exceeded) {
      warnings.push({
        code: 'MONTH_EXCEEDED',
        level: 'danger',
        message: 'You have exceeded your monthly disposable amount.',
      });
    } else if (disposable > 0 && spentTotal / disposable >= 0.8) {
      warnings.push({
        code: 'MONTH_80',
        level: 'warning',
        message: `You have used ${Math.floor(usedPct)}% of your monthly disposable amount.`,
      });
    }
    if (pos.state === 'current' && spentToday > remainingDailyBudget) {
      warnings.push({
        code: 'TODAY_EXCEEDED',
        level: 'warning',
        message: "You have exceeded today's budget.",
      });
    }
  }

  return {
    month,
    days_in_month: pos.days,
    day_of_month: pos.dayOfMonth,
    days_left: pos.daysLeft,
    month_state: pos.state,
    salary: toRupees(salary),
    other_income: toRupees(otherIncome),
    total_income: toRupees(totalIncome),
    loans_total: toRupees(loansTotal),
    fixed_total: toRupees(fixedTotal),
    total_commitments: toRupees(commitments),
    savings_goal: toRupees(savingsGoal),
    disposable: toRupees(disposable),
    daily_budget: toRupees(dailyBudget),
    remaining_daily_budget: toRupees(remainingDailyBudget),
    spent: toRupees(spentTotal),
    spent_today: toRupees(spentToday),
    remaining_disposable: toRupees(remainingDisposable),
    remaining_balance: toRupees(remainingBalance),
    used_pct: usedPct,
    budget_status: budgetStatus(spentTotal, disposable),
    savings_secured: toRupees(savingsSecured),
    savings_progress_pct: savingsProgressPct,
    is_over_committed: disposable < 0,
    warnings,
  };
}

module.exports = {
  MAX_PAISE,
  parsePaiseStrict,
  toPaise,
  fromPaise,
  toRupees,
  sumPaise,
  percentOfPaise,
  savingsGoalPaise,
  monthPosition,
  budgetStatus,
  computeBudgetSummary,
};
