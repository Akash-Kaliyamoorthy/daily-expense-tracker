import Icon from './Icon';

/** An empty screen is an invitation to act: say what is missing and offer the next step. */
export default function EmptyState({ icon = 'list', title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-600 dark:bg-ink-900 dark:text-ink-200">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="muted mt-1 max-w-sm text-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
