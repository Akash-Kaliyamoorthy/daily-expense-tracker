import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MONTH_RE, addMonths, currentMonth } from '../utils/format';

/**
 * The month being viewed, kept in the URL (?month=2026-10) so a refresh, a
 * bookmark or the browser's Back button all keep the same month. When the
 * param is missing or invalid it falls back to the current month.
 */
export default function useMonth() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('month');
  const now = currentMonth();
  const month = raw && MONTH_RE.test(raw) ? raw : now;

  const setMonth = useCallback(
    (next) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          if (next === currentMonth()) updated.delete('month');
          else updated.set('month', next);
          return updated;
        },
        { replace: true },
      ),
    [setParams],
  );

  return {
    month,
    setMonth,
    prevMonth: addMonths(month, -1),
    nextMonth: addMonths(month, 1),
    goPrev: () => setMonth(addMonths(month, -1)),
    goNext: () => setMonth(addMonths(month, 1)),
    isCurrent: month === now,
  };
}
