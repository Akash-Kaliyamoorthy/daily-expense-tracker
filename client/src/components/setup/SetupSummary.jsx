import { formatINR } from '../../utils/format';
import Banner from '../ui/Banner';

function Line({ label, value, sign = '', strong = false, tone }) {
  const color = tone === 'bad' ? 'text-bad-700 dark:text-bad-500' : '';
  return (
    <div className="rule flex items-baseline justify-between gap-4 py-2.5">
      <dt className={strong ? 'font-medium' : 'muted'}>{label}</dt>
      <dd className={`${strong ? 'text-lg font-semibold' : ''} ${color}`}>
        {sign}
        {value}
      </dd>
    </div>
  );
}

/**
 * The month worked out line by line, so the rules are visible:
 * income - EMIs - fixed bills - savings goal = what you can spend, divided by the days.
 * All numbers come from the server's calculation.
 */
export default function SetupSummary({ setup }) {
  const t = setup.totals;
  return (
    <section className="panel p-4 sm:p-5" aria-label="Monthly summary">
      <h2 className="text-lg font-semibold">How this month adds up</h2>
      <dl className="mt-2">
        <Line label="Salary" value={formatINR(setup.salary)} />
        {setup.other_income > 0 && (
          <Line label="Other income" value={formatINR(setup.other_income)} sign="+" />
        )}
        <Line label="EMIs" value={formatINR(t.loans_total)} sign="−" />
        <Line label="Fixed expenses" value={formatINR(t.fixed_total)} sign="−" />
        <Line label="Savings goal" value={formatINR(t.savings_goal_amount)} sign="−" />
        <Line
          label="Left to spend"
          value={formatINR(t.disposable)}
          strong
          tone={t.disposable < 0 ? 'bad' : undefined}
        />
        <Line
          label={`Per day, over ${t.days_in_month} days`}
          value={formatINR(t.daily_budget)}
          strong
        />
      </dl>
      {t.is_over_committed && (
        <Banner level="danger" className="mt-4">
          Your EMIs, bills and savings goal add up to more than your income. Lower the savings goal
          or review your bills.
        </Banner>
      )}
      {!t.is_over_committed && setup.salary === 0 && setup.other_income === 0 && (
        <p className="muted mt-4 text-sm leading-relaxed">
          Enter your salary below. These numbers update as soon as you save.
        </p>
      )}
    </section>
  );
}
