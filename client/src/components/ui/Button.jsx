import { forwardRef } from 'react';

const VARIANTS = {
  primary:
    'bg-ink-800 text-white hover:bg-ink-700 dark:bg-ink-200 dark:text-ink-950 dark:hover:bg-white',
  secondary:
    'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50 dark:border-night-line dark:bg-night-card dark:text-ink-50 dark:hover:bg-ink-900',
  danger: 'bg-bad-600 text-white hover:bg-bad-700',
  ghost: 'text-ink-600 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-900',
};

const SIZES = {
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-11 gap-2 px-4 text-sm',
  icon: 'h-10 w-10',
};

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Buttons say exactly what they do ("Save changes", not "Submit").
 * `loading` shows a spinner and blocks double-submits.
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export default Button;
