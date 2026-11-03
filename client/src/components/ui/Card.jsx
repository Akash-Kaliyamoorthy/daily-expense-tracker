/**
 * A flat bordered panel with an optional heading row.
 * `action` is placed at the right of the heading (a button or link).
 */
export default function Card({ title, subtitle, action, children, className = '', padded = true }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold leading-tight">{title}</h2>}
            {subtitle && <p className="muted mt-0.5 text-sm">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-4 sm:p-5' : ''}>{children}</div>
    </section>
  );
}
