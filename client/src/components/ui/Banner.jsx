import Icon from './Icon';

const LEVELS = {
  info: {
    icon: 'info',
    box: 'border-ink-200 bg-ink-50 text-ink-800 dark:border-night-line dark:bg-ink-900 dark:text-ink-100',
  },
  success: {
    icon: 'check',
    box: 'border-ok-500/40 bg-ok-50 text-ok-700 dark:bg-ok-500/15 dark:text-ok-500',
  },
  warning: {
    icon: 'alert',
    box: 'border-warn-500/50 bg-warn-50 text-warn-700 dark:bg-warn-500/15 dark:text-warn-500',
  },
  danger: {
    icon: 'alert',
    box: 'border-bad-500/50 bg-bad-50 text-bad-700 dark:bg-bad-500/15 dark:text-bad-500',
  },
};

/** An inline message bar. Levels match the `warnings` returned by the summary API. */
export default function Banner({ level = 'info', children, onDismiss, className = '' }) {
  const style = LEVELS[level] || LEVELS.info;
  return (
    <div
      role={level === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-control border px-4 py-3 text-sm ${style.box} ${className}`}
    >
      <Icon name={style.icon} className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 leading-relaxed">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="-mr-1 rounded-control p-1 opacity-70 hover:opacity-100"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
