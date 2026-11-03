import { Link } from 'react-router-dom';
import { formatINR } from '../../utils/format';
import Card from '../ui/Card';
import Dot from '../ui/Dot';
import ProgressBar from '../ui/ProgressBar';

// A category limit's status maps onto the same colours as the monthly budget.
const LIMIT_STATUS = { ok: 'green', near: 'amber', exceeded: 'red' };

/** Spending against each category's monthly limit (only categories that have a limit). */
export default function CategoryLimits({ limits = [] }) {
  return (
    <Card title="Category limits" subtitle="Your monthly limit for each category">
      {limits.length === 0 ? (
        <p className="muted text-sm leading-relaxed">
          No limits yet. Set one on the{' '}
          <Link to="/categories" className="underline underline-offset-4">
            Categories page
          </Link>{' '}
          to get an alert when a category goes over.
        </p>
      ) : (
        <ul className="space-y-5">
          {limits.map((c) => {
            const pct =
              c.monthly_limit > 0 ? (c.spent / c.monthly_limit) * 100 : c.spent > 0 ? 100 : 0;
            return (
              <li key={c.category_id}>
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <Dot color={c.color} />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <span className="muted">
                    {formatINR(c.spent)} of {formatINR(c.monthly_limit)}
                  </span>
                </div>
                <ProgressBar
                  value={pct}
                  status={LIMIT_STATUS[c.limit_status] || 'green'}
                  label={`${c.name} spending against its limit`}
                  height="h-2"
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
