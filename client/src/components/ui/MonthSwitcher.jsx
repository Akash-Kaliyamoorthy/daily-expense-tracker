import { monthLabel } from '../../utils/format';
import Icon from './Icon';

/**
 * The month heading with previous / next buttons. It is the page title, in the
 * display face, like the date written at the top of a ledger page.
 */
export default function MonthSwitcher({ month, onPrev, onNext, onToday, isCurrent, eyebrow }) {
  const arrow =
    'flex h-10 w-10 items-center justify-center rounded-control border border-ink-200 text-ink-700 hover:bg-ink-100 dark:border-night-line dark:text-ink-100 dark:hover:bg-ink-900';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrev} className={arrow} aria-label="Previous month">
          <Icon name="chevronLeft" />
        </button>
        <button type="button" onClick={onNext} className={arrow} aria-label="Next month">
          <Icon name="chevronRight" />
        </button>
      </div>
      <h1 className="text-3xl font-semibold leading-tight sm:text-4xl" aria-live="polite">
        {monthLabel(month)}
      </h1>
      {!isCurrent && onToday && (
        <button
          type="button"
          onClick={onToday}
          className="rounded-control px-3 py-2 text-sm font-medium text-ink-600 underline underline-offset-4 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-900"
        >
          Back to this month
        </button>
      )}
      {eyebrow}
    </div>
  );
}
