/** A grey pulsing placeholder shown while data loads. Size it with className. */
export default function Skeleton({ className = 'h-4 w-full' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-control bg-ink-100 dark:bg-ink-900 ${className}`}
    />
  );
}

/** Placeholder for a whole page while its code or data loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Placeholder rows for a list or table. */
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
