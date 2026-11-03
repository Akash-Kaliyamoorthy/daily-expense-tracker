import { Link } from 'react-router-dom';
import { formatINR, monthLabel } from '../../utils/format';

/**
 * The one number the whole app exists to answer: how much can I still spend today?
 * Today's allowance = (what was available before today) / (days left, today included).
 * "Left today" subtracts what has already been spent today.
 */
export default function TodayHero({ summary, month }) {
  const s = summary;
  let label;
  let figure;
  let tone = 'good'; // good = marigold highlight, bad = red
  let detail;

  if (!s.has_budget) {
    return (
      <section className="rounded-panel bg-ink-800 p-6 text-white sm:p-8 dark:border dark:border-night-line dark:bg-ink-900">
        <p className="text-ink-200">No budget for {monthLabel(month)} yet</p>
        <h2 className="mt-1 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
          Add your salary and bills to see what you can spend each day.
        </h2>
        <Link
          to={`/setup?month=${month}`}
          className="mt-6 inline-flex h-11 items-center rounded-control bg-marigold-400 px-5 text-sm font-semibold text-ink-950 hover:bg-marigold-300"
        >
          Set up {monthLabel(month)}
        </Link>
      </section>
    );
  }

  if (s.month_state === 'current') {
    const left = s.remaining_daily_budget - s.spent_today;
    if (left >= 0) {
      label = 'You can spend today';
      figure = formatINR(left);
    } else {
      label = 'You are over today’s budget by';
      figure = formatINR(-left);
      tone = 'bad';
    }
    const monthLeft =
      s.remaining_disposable >= 0
        ? `${formatINR(s.remaining_disposable)} left to spend this month`
        : `${formatINR(-s.remaining_disposable)} over for the month`;
    detail = (
      <>
        <p>
          Today’s budget is {formatINR(s.remaining_daily_budget)}. You have spent{' '}
          {formatINR(s.spent_today)} so far.
        </p>
        <p>
          {monthLeft}, with {s.days_left} {s.days_left === 1 ? 'day' : 'days'} to go, today
          included.
        </p>
      </>
    );
  } else if (s.month_state === 'future') {
    label = 'Your daily budget once this month starts';
    figure = formatINR(s.daily_budget);
    detail = (
      <p>
        That is {formatINR(s.disposable)} spread over {s.days_in_month} days.
      </p>
    );
  } else {
    label = `Spent in ${monthLabel(month)}`;
    figure = formatINR(s.spent);
    tone = s.remaining_disposable < 0 ? 'bad' : 'good';
    detail = (
      <p>
        {s.remaining_disposable >= 0
          ? `${formatINR(s.remaining_disposable)} of your ${formatINR(s.disposable)} was left unspent.`
          : `${formatINR(-s.remaining_disposable)} more than the ${formatINR(s.disposable)} you had available.`}
      </p>
    );
  }

  return (
    <section
      aria-label="Today’s budget"
      className="rounded-panel bg-ink-800 p-6 text-white sm:p-8 dark:border dark:border-night-line dark:bg-ink-900"
    >
      <p className="text-ink-200">{label}</p>
      <p
        className={`mt-3 inline-block rounded-control px-4 py-1 text-5xl font-semibold tracking-tight sm:text-6xl ${
          tone === 'bad' ? 'bg-bad-500 text-white' : 'bg-marigold-400 text-ink-950'
        }`}
      >
        {figure}
      </p>
      <div className="mt-5 space-y-1 text-sm leading-relaxed text-ink-200">{detail}</div>
    </section>
  );
}
