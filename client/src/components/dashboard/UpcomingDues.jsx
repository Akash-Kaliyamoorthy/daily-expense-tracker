import { Link } from 'react-router-dom';
import { daysAwayLabel, formatDayMonth, formatINR } from '../../utils/format';
import Card from '../ui/Card';
import Icon from '../ui/Icon';

/** EMIs and fixed bills that fall due in the next 7 days. */
export default function UpcomingDues({ dues = [], isCurrentMonth, month }) {
  return (
    <Card title="Due this week" subtitle="EMIs and bills in the next 7 days">
      {!isCurrentMonth ? (
        <p className="muted text-sm leading-relaxed">
          Due dates are shown for the current month. Switch back to this month to see them.
        </p>
      ) : dues.length === 0 ? (
        <p className="muted text-sm leading-relaxed">
          Nothing is due in the next 7 days.{' '}
          <Link to={`/setup?month=${month}`} className="underline underline-offset-4">
            Review your bills
          </Link>
        </p>
      ) : (
        <ul className="-my-1">
          {dues.map((d) => (
            <li
              key={`${d.type}-${d.name}-${d.due_date}`}
              className="rule flex items-center gap-3 py-3"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  d.days_away <= 1
                    ? 'bg-warn-50 text-warn-700 dark:bg-warn-500/15 dark:text-warn-500'
                    : 'bg-ink-100 text-ink-600 dark:bg-ink-900 dark:text-ink-200'
                }`}
              >
                <Icon name={d.type === 'loan' ? 'wallet' : 'calendar'} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.name}</p>
                <p className="muted text-sm">
                  {daysAwayLabel(d.days_away)}, {formatDayMonth(d.due_date)}
                </p>
              </div>
              <p className="font-semibold">{formatINR(d.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
