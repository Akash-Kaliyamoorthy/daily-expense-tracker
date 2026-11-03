import { formatINR } from '../../utils/format';

function Cell({ label, value, note, tone }) {
  const color =
    tone === 'bad'
      ? 'text-bad-700 dark:text-bad-500'
      : tone === 'good'
        ? 'text-ok-700 dark:text-ok-500'
        : '';
  return (
    <div className="p-4 sm:p-5">
      <dt className="muted text-sm">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold ${color}`}>{value}</dd>
      {note && <dd className="muted mt-1 text-xs leading-snug">{note}</dd>}
    </div>
  );
}

/**
 * The six key numbers, set as one ruled sheet (a summary page), not six
 * separate cards. Cells are divided by hairlines.
 */
export default function StatCards({ summary: s }) {
  const hasGoal = s.savings_goal > 0;
  const todayBudget = s.month_state === 'current' ? s.remaining_daily_budget : s.daily_budget;

  return (
    <dl className="panel grid grid-cols-2 divide-x divide-y divide-dashed divide-ink-200 overflow-hidden lg:grid-cols-3 dark:divide-night-line [&>div:nth-child(-n+2)]:border-t-0 lg:[&>div:nth-child(-n+3)]:border-t-0">
      <Cell
        label="Salary and income"
        value={formatINR(s.total_income)}
        note={s.other_income > 0 ? `Includes ${formatINR(s.other_income)} extra` : 'This month'}
      />
      <Cell
        label="Bills and EMIs"
        value={formatINR(s.total_commitments)}
        note={`EMIs ${formatINR(s.loans_total)}, fixed ${formatINR(s.fixed_total)}`}
      />
      <Cell
        label="Spent so far"
        value={formatINR(s.spent)}
        note={`${s.expense_count} ${s.expense_count === 1 ? 'entry' : 'entries'}`}
      />
      <Cell
        label="Money left"
        value={formatINR(s.remaining_balance)}
        tone={s.remaining_balance < 0 ? 'bad' : undefined}
        note="Income, minus bills, minus spending"
      />
      <Cell
        label="Savings protected"
        value={hasGoal ? formatINR(s.savings_secured) : 'No goal'}
        tone={hasGoal && s.savings_progress_pct >= 100 ? 'good' : undefined}
        note={
          hasGoal
            ? `${s.savings_progress_pct}% of your ${formatINR(s.savings_goal)} goal`
            : 'Set one in Monthly setup'
        }
      />
      <Cell
        label={s.month_state === 'current' ? 'Spent today' : 'Daily budget'}
        value={s.month_state === 'current' ? formatINR(s.spent_today) : formatINR(s.daily_budget)}
        tone={s.month_state === 'current' && s.spent_today > todayBudget ? 'bad' : undefined}
        note={
          s.month_state === 'current'
            ? `Today’s budget is ${formatINR(todayBudget)}`
            : `Over ${s.days_in_month} days`
        }
      />
    </dl>
  );
}
