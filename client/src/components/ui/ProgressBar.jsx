import { STATUS } from '../../utils/constants';

/**
 * Budget progress. Colour = status (green under 70%, amber 70-100%, red over),
 * but the percentage and the status word are always printed too, so the
 * meaning never depends on colour alone.
 *
 * `value` is the percent used and may exceed 100 (the bar then stays full).
 */
export default function ProgressBar({
  value = 0,
  status = 'green',
  label,
  height = 'h-3',
  showText = true,
}) {
  const pct = Math.max(0, Number.isFinite(value) ? value : 0);
  const style = STATUS[status] || STATUS.green;

  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(pct))}
        aria-valuetext={`${Math.round(pct)}% used, ${style.label}`}
        className={`w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-900 ${height}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${style.bar}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {showText && (
        <p className={`mt-1.5 text-sm font-medium ${style.text}`}>
          {Math.round(pct)}% used · {style.label}
        </p>
      )}
    </div>
  );
}
