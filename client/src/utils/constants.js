export const PAYMENT_METHODS = ['UPI', 'Cash', 'Card', 'Net Banking'];

export const FREQUENCIES = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

export const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

/** Colours offered when creating a custom category. */
export const CATEGORY_COLORS = [
  '#e4572e',
  '#f2b92b',
  '#2f8f5b',
  '#17a2b8',
  '#3b6fd4',
  '#6f4ab8',
  '#c2409b',
  '#64748b',
];

/** Budget status -> label + Tailwind classes (text, soft background, bar fill). */
export const STATUS = {
  green: {
    label: 'On track',
    text: 'text-ok-700 dark:text-ok-500',
    soft: 'bg-ok-50 dark:bg-ok-500/15',
    bar: 'bg-ok-500',
  },
  amber: {
    label: 'Getting close',
    text: 'text-warn-700 dark:text-warn-500',
    soft: 'bg-warn-50 dark:bg-warn-500/15',
    bar: 'bg-warn-500',
  },
  red: {
    label: 'Over budget',
    text: 'text-bad-700 dark:text-bad-500',
    soft: 'bg-bad-50 dark:bg-bad-500/15',
    bar: 'bg-bad-500',
  },
};

export const THEME_STORAGE_KEY = 'det-theme';
