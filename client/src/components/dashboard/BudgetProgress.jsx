import { formatINR } from '../../utils/format';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

/** How much of the month's spendable money is used: green under 70%, amber to 100%, red over. */
export default function BudgetProgress({ summary: s }) {
  const nothingToSpend = s.disposable <= 0;
  // With nothing available, any spending is "over": show a full red bar.
  const value = nothingToSpend ? (s.spent > 0 ? 100 : 0) : (s.used_pct ?? 0);

  return (
    <Card
      title="Monthly budget"
      subtitle="Money available to spend, after bills and your savings goal"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-2xl font-semibold">
          {formatINR(s.spent)}
          <span className="muted text-base font-normal">
            {' '}
            spent of {formatINR(Math.max(0, s.disposable))}
          </span>
        </p>
      </div>
      <ProgressBar value={value} status={s.budget_status} label="Share of monthly budget used" />
      {nothingToSpend && (
        <p className="muted mt-3 text-sm leading-relaxed">
          Nothing is left to spend after your bills, EMIs and savings goal. Lower the savings goal
          or adjust your bills in Monthly setup.
        </p>
      )}
    </Card>
  );
}
