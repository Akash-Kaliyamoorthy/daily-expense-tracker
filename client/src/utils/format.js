/**
 * Formatting + calendar helpers. Dates are 'YYYY-MM-DD' strings and months
 * are 'YYYY-MM' strings everywhere (same as the API), and are only turned into
 * Date objects LOCALLY here, so a day can never shift because of a timezone.
 */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
const inrWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** 125000 -> "₹1,25,000"; 99.5 -> "₹99.50". Safe for null / undefined / NaN. */
export function formatINR(amount, { paise = false } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  if (paise) return inrWithPaise.format(n);
  // Show paise only when there are some, so whole rupees stay clean.
  return inr.format(Number.isInteger(n) ? n : Math.round(n * 100) / 100);
}

/** 125000 -> "1.3L" (for chart axes). */
export const formatCompact = (amount) => compact.format(Number(amount) || 0);

/** 125000 -> "1,25,000" (no currency symbol, for form fields). */
export const formatNumber = (amount) => plain.format(Number(amount) || 0);

export function formatPercent(value) {
  if (value === null || value === undefined) return '–';
  return `${Math.round(value * 10) / 10}%`;
}

const pad2 = (n) => String(n).padStart(2, '0');

/** Parse 'YYYY-MM-DD' as a LOCAL date (never UTC). */
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export const todayISO = () => toISODate(new Date());
export const currentMonth = () => todayISO().slice(0, 7);

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad2((total % 12) + 1)}`;
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export const monthStart = (month) => `${month}-01`;
export const monthEnd = (month) => `${month}-${pad2(daysInMonth(month))}`;

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** '2026-11' -> "November 2026" */
export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
}

/** '2026-11' -> "Nov" (chart labels) */
export function monthShort(month) {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(y, m - 1, 1));
}

/** '2026-11-02' -> "02 Nov 2026" */
export function formatDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parseISODate(iso));
}

/** '2026-11-02' -> "2 Nov" */
export function formatDayMonth(iso) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
    parseISODate(iso),
  );
}

/** '2026-11-02' -> "Today" / "Yesterday" / "Tomorrow" / "02 Nov 2026" */
export function friendlyDate(iso) {
  const today = todayISO();
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  return formatDate(iso);
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd" */
export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

/** "in 3 days" / "today" / "tomorrow" for due dates. */
export function daysAwayLabel(days) {
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}
