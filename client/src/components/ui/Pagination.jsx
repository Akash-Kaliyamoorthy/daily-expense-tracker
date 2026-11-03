import Icon from './Icon';

/** Page numbers to show: always first and last, plus a window around the current page. */
function pageList(page, totalPages) {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

const btn =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-control px-2 text-sm font-medium transition-colors';

export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="muted text-sm">
        Showing {from}–{to} of {total}
      </p>
      <ul className="flex items-center gap-1">
        <li>
          <button
            type="button"
            className={`${btn} text-ink-700 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-100 dark:hover:bg-ink-900`}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
        </li>
        {pageList(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} className="muted px-1" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                className={`${btn} ${
                  p === page
                    ? 'bg-ink-800 text-white dark:bg-ink-200 dark:text-ink-950'
                    : 'text-ink-700 hover:bg-ink-100 dark:text-ink-100 dark:hover:bg-ink-900'
                }`}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={`${btn} text-ink-700 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-100 dark:hover:bg-ink-900`}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
