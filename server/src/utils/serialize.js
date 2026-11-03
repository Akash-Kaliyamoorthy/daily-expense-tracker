'use strict';

/**
 * Turns DB rows into API objects. NUMERIC columns arrive from `pg` as strings
 * ("1250.50"); here they become plain JSON numbers via exact integer-paise
 * conversion. Field names stay snake_case.
 */
const { toPaise, toRupees } = require('./money');

const OTHER_COLOR = '#64748b';

const num = (value) => (value === null || value === undefined ? null : toRupees(toPaise(value)));

const user = (row) => ({ id: row.id, name: row.name, email: row.email });

const budget = (row) => ({
  id: row.id,
  month: row.month,
  salary: num(row.salary),
  other_income: num(row.other_income),
  other_income_note: row.other_income_note,
  savings_goal: num(row.savings_goal),
  savings_goal_type: row.savings_goal_type,
});

const loan = (row) => ({
  id: row.id,
  budget_id: row.budget_id,
  name: row.name,
  emi_amount: num(row.emi_amount),
  due_day: row.due_day,
  remaining_months: row.remaining_months,
  lender: row.lender,
});

const fixedExpense = (row) => ({
  id: row.id,
  budget_id: row.budget_id,
  name: row.name,
  amount: num(row.amount),
  category_id: row.category_id,
  category_name: row.category_name ?? null,
  category_color: row.category_color ?? null,
  due_day: row.due_day,
});

const expense = (row) => ({
  id: row.id,
  amount: num(row.amount),
  expense_date: row.expense_date,
  category_id: row.category_id,
  category_name: row.category_name ?? 'Other',
  category_color: row.category_color ?? OTHER_COLOR,
  payment_method: row.payment_method,
  note: row.note,
  recurring_id: row.recurring_id,
  created_at: row.created_at,
});

const recurring = (row) => ({
  id: row.id,
  amount: num(row.amount),
  category_id: row.category_id,
  category_name: row.category_name ?? 'Other',
  category_color: row.category_color ?? OTHER_COLOR,
  payment_method: row.payment_method,
  frequency: row.frequency,
  next_date: row.next_date,
  note: row.note,
  active: row.active,
});

const category = (row) => ({
  id: row.id,
  name: row.name,
  color: row.color,
  is_default: row.is_default,
  monthly_limit: num(row.monthly_limit),
});

module.exports = { num, user, budget, loan, fixedExpense, expense, recurring, category };
